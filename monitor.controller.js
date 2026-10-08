const { getPool, getAllPools, getMonitorPool, REGIONS, REGION_LABELS, REGION_STATES } = require("../models/db");
const { getISTDateString } = require("../utils/date.utils");

async function queryRegions(sql, params, targetRegions) {
  const regions = targetRegions || REGIONS;
  const results = await Promise.allSettled(
    regions.map(async (region) => {
      const pool = getPool(region);
      if (!pool) return { region, rows: [] };
      const [rows] = await pool.execute(sql, params);
      return { region, rows };
    })
  );
  return results.filter(r => r.status === "fulfilled").map(r => r.value);
}

function getTargetRegions(regionParam) {
  if (!regionParam || regionParam === "all") return REGIONS;
  if (REGIONS.includes(regionParam)) return [regionParam];
  return REGIONS;
}

function getDateRange(from, to) {
  const today = getISTDateString();
  return { dateFrom: from || "2020-01-01", dateTo: to || today };
}

exports.getKPISummary = async (req, res) => {
  try {
    const { region, from, to } = req.query;
    const targetRegions = getTargetRegions(region);
    const { dateFrom, dateTo } = getDateRange(from, to);
    
const sql = `
    SELECT
        COUNT(*) AS total_tokens,

        SUM(visited) AS total_visits,

        SUM(
            CASE
                WHEN visited = 0 THEN 1
                ELSE 0
            END
        ) AS not_visited,

        SUM(
            CASE
                WHEN mode = 'A' THEN 1
                ELSE 0
            END
        ) AS appointment_tokens,

        SUM(
            CASE
                WHEN mode = 'W' THEN 1
                ELSE 0
            END
        ) AS walkin_tokens,

        SUM(
            CASE
                WHEN gender = 'Male' THEN 1
                ELSE 0
            END
        ) AS male_count,

        SUM(
            CASE
                WHEN gender = 'Female' THEN 1
                ELSE 0
            END
        ) AS female_count

    FROM tokens

    WHERE date BETWEEN ? AND ?
`;
const othersSql = `
    SELECT COUNT(*) AS others_count
    FROM physical_reference_entries
    WHERE DATE(created_at) BETWEEN ? AND ?
`;
    
const results = await queryRegions(
    sql,
    [dateFrom, dateTo],
    targetRegions
);

const othersResults = await queryRegions(
    othersSql,
    [dateFrom, dateTo],
    targetRegions
);
    
    const summary = {
      total_tokens: 0, total_visits: 0, not_visited: 0, appointment_tokens: 0, walkin_tokens: 0, male_count: 0, female_count: 0, others_count: 0, visit_rate: 0
    };
    
    const per_region = [];
    
results.forEach(r => {

    const row = r.rows[0] || {};

    const otherRow =
        othersResults.find(x => x.region === r.region)?.rows[0] || {};

    const regionData = {
        region: r.region,
        label: REGION_LABELS[r.region],

        // ONLY normal tokens
        total_tokens: Number(row.total_tokens || 0),

        total_visits: Number(row.total_visits || 0),
        not_visited: Number(row.not_visited || 0),

        appointment_tokens:
            Number(row.appointment_tokens || 0),

        walkin_tokens:
            Number(row.walkin_tokens || 0),

        male_count:
            Number(row.male_count || 0),

        female_count:
            Number(row.female_count || 0),

        // ONLY PT/RT/PwD
        others_count:
            Number(otherRow.others_count || 0)
    };

    per_region.push(regionData);

    summary.total_tokens += regionData.total_tokens;
    summary.total_visits += regionData.total_visits;
    summary.not_visited += regionData.not_visited;
    summary.appointment_tokens += regionData.appointment_tokens;
    summary.walkin_tokens += regionData.walkin_tokens;
    summary.male_count += regionData.male_count;
    summary.female_count += regionData.female_count;
    summary.others_count += regionData.others_count;
});
    
    summary.visit_rate = summary.total_tokens > 0 ? summary.total_visits / summary.total_tokens : 0;
    
    res.json({ data: summary, per_region });
  } catch (error) {
    console.error("getKPISummary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function normalizeServiceType(serviceType) {
    const type = String(serviceType ?? "").trim();

    if (
        !type ||
        /^--\s*select\s*option\s*--$/i.test(type)
    ) {
        return "Others";
    }

    if (
        /\bdob\b/i.test(type) ||
        /date\s*of\s*birth/i.test(type) ||
        /जन्मतिथि/i.test(type)
    ) {
        return "DoB";
    }

    if (
        /cancel/i.test(type) ||
        /suspend/i.test(type) ||
        /निलंबित/i.test(type)
    ) {
        return "Cancelled / Suspended";
    }

    if (
        /biometric/i.test(type) ||
        /\bmbu\b/i.test(type) ||
        /mdd\s*or\s*bio\s*mix/i.test(type)
    ) {
        return "Biometric Issue";
    }

    if (
        /^name$/i.test(type) ||
        /name\s*change/i.test(type) ||
        /^नाम$/i.test(type)
    ) {
        return "Name";
    }

    // 6. Others / General / Grievance / None of the above
if (
    /^other(s)?$/i.test(type) ||
    /^general$/i.test(type) ||
    /general\s+grievance/i.test(type) ||
    /none\s+of\s+the\s+above/i.test(type) ||
    /उपरोक्त\s+में\s+से\s+कोई\s+नहीं/i.test(type) ||
    /इनमें\s+से\s+कोई\s+भी\s+नहीं/i.test(type)
) {
    return "Others";
}


    const knownServices = new Set([
        "Lock Aadhaar",
        "Lost Aadhaar",
        "New Enrolment",
        "Gender",
        "Advised to visit RO",
        "General Grievance"
    ]);

    if (knownServices.has(type)) {
        return type;
    }

    if (/[\u0900-\u097F]/.test(type)) {
        return "Others";
    }

    return "Others";
}

exports.getServiceBreakdown = async (req, res) => {
  try {
    const { region, from, to } = req.query;
    const targetRegions = getTargetRegions(region);
    const { dateFrom, dateTo } = getDateRange(from, to);
    
    const sql = `
    SELECT
        service_type,
        COUNT(*) AS count

    FROM (

        SELECT
            service_type

        FROM tokens

        WHERE date BETWEEN ? AND ?

        UNION ALL

        SELECT
            service_type

        FROM physical_reference_entries

        WHERE DATE(created_at) BETWEEN ? AND ?

    ) AS combined_tokens

    GROUP BY service_type
    ORDER BY count DESC
`;
    const results = await queryRegions(
    sql,
    [dateFrom, dateTo, dateFrom, dateTo],
    targetRegions
);
    
    const serviceMap = {};
    results.forEach(r => {
      r.rows.forEach(row => {
        const type = normalizeServiceType(row.service_type);
        serviceMap[type] = (serviceMap[type] || 0) + Number(row.count);
      });
    });
    
    const data = Object.keys(serviceMap).map(k => ({ service_type: k, count: serviceMap[k] })).sort((a, b) => b.count - a.count);
    res.json({ data });
  } catch (error) {
    console.error("getServiceBreakdown error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
exports.getServiceBreakdownRaw = async (req, res) => {
    try {
        const { region, from, to } = req.query;

        const targetRegions = getTargetRegions(region);
        const { dateFrom, dateTo } = getDateRange(from, to);

        const sql = `
            SELECT
                service_type,
                COUNT(*) AS count
            FROM (
                SELECT
                    service_type
                FROM tokens
                WHERE date BETWEEN ? AND ?

                UNION ALL

                SELECT
                    service_type
                FROM physical_reference_entries
                WHERE DATE(created_at) BETWEEN ? AND ?
            ) AS combined_tokens
            GROUP BY service_type
            ORDER BY count DESC
        `;

        const results = await queryRegions(
            sql,
            [dateFrom, dateTo, dateFrom, dateTo],
            targetRegions
        );

        const rawMap = {};

        results.forEach(r => {
            r.rows.forEach(row => {
                const type = row.service_type == null
                    ? "[NULL]"
                    : String(row.service_type);

                rawMap[type] =
                    (rawMap[type] || 0) + Number(row.count);
            });
        });

        const data = Object.entries(rawMap)
            .map(([service_type, count]) => ({
                service_type,
                count
            }))
            .sort((a, b) => b.count - a.count);

        res.json({
            date_from: dateFrom,
            date_to: dateTo,
            data
        });

    } catch (error) {
        console.error("getServiceBreakdownRaw error:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
};
exports.getDistrictBreakdown = async (req, res) => {
    try {
        const {
            region,
            from,
            to,
            visit_status = "all",
            entry_status = "all"
        } = req.query;

        const targetRegions = getTargetRegions(region);

        const { dateFrom, dateTo } =
            getDateRange(from, to);


        /*
         * ------------------------------------------------------------
         * TOKEN FILTERS
         * ------------------------------------------------------------
         */

        const tokenConditions = [
            "date BETWEEN ? AND ?"
        ];

        const tokenParams = [
            dateFrom,
            dateTo
        ];


        /*
         * Visit status
         */

        if (visit_status === "visited") {

            tokenConditions.push(
                "visited = 1"
            );

        } else if (visit_status === "not_visited") {

            tokenConditions.push(
                "visited = 0"
            );

        }


        /*
         * Entry status
         */

        if (entry_status === "entered") {

            tokenConditions.push(
                "entry_marked = 1"
            );

        } else if (entry_status === "not_entered") {

            tokenConditions.push(
                "entry_marked = 0"
            );

        }


        /*
         * ------------------------------------------------------------
         * PHYSICAL / REFERENCE ENTRIES
         *
         * These are treated as:
         *
         *     Visited = YES
         *     Entered = YES
         *
         * Therefore they are excluded when the selected filter
         * explicitly asks for Not Visited or Not Entered.
         * ------------------------------------------------------------
         */

        const includePhysical =
            visit_status !== "not_visited" &&
            entry_status !== "not_entered";


        /*
         * ------------------------------------------------------------
         * BUILD DISTRICT QUERY
         * ------------------------------------------------------------
         */

        let sql = `
            SELECT
                district,
                COUNT(*) AS count

            FROM (

                SELECT
                    district

                FROM tokens

                WHERE ${tokenConditions.join(" AND ")}
        `;

        const params = [...tokenParams];


        /*
         * Add physical/reference entries when applicable
         */

        if (includePhysical) {

            sql += `
                UNION ALL

                SELECT
                    district

                FROM physical_reference_entries

                WHERE DATE(created_at) BETWEEN ? AND ?
            `;

            params.push(
                dateFrom,
                dateTo
            );

        }


        sql += `
            ) AS combined_tokens

            GROUP BY district

            ORDER BY count DESC
        `;


        /*
         * ------------------------------------------------------------
         * QUERY ALL TARGET REGIONS
         * ------------------------------------------------------------
         */

        const results = await queryRegions(
            sql,
            params,
            targetRegions
        );


        /*
         * ------------------------------------------------------------
         * COMBINE DISTRICTS
         * ------------------------------------------------------------
         */

        const districtMap = {};

        let total = 0;


        results.forEach(r => {

            r.rows.forEach(row => {

                const dist =
                    row.district || "Unknown";

                const count =
                    Number(row.count || 0);

                districtMap[dist] =
                    (districtMap[dist] || 0) + count;

                total += count;

            });

        });


        /*
         * ------------------------------------------------------------
         * RESPONSE
         * ------------------------------------------------------------
         */

        const data =
            Object.keys(districtMap)
                .map(k => ({

                    district: k,

                    count:
                        districtMap[k],

                    percentage:
                        total > 0
                            ? (districtMap[k] / total) * 100
                            : 0

                }))
                .sort(
                    (a, b) =>
                        b.count - a.count
                );


        res.json({
            data
        });

    } catch (error) {

        console.error(
            "getDistrictBreakdown error:",
            error
        );

        res.status(500).json({
            error: "Internal server error"
        });

    }
};

exports.getHourlyDistribution = async (req, res) => {
  try {
    const { region, from, to } = req.query;
    const targetRegions = getTargetRegions(region);
    const { dateFrom, dateTo } = getDateRange(from, to);
    
    const sql = `
    SELECT
        hour,
        COUNT(*) AS count

    FROM (

        SELECT
            HOUR(created_at) AS hour

        FROM tokens

        WHERE date BETWEEN ? AND ?

        UNION ALL

        SELECT
            HOUR(created_at) AS hour

        FROM physical_reference_entries

        WHERE DATE(created_at) BETWEEN ? AND ?

    ) AS combined_tokens

    GROUP BY hour
    ORDER BY hour
`;
    const results = await queryRegions(
    sql,
    [dateFrom, dateTo, dateFrom, dateTo],
    targetRegions
);
    
    const hourMap = {};
    for (let i = 0; i < 24; i++) hourMap[i] = 0;
    
    results.forEach(r => {
      r.rows.forEach(row => {
        if (row.hour !== null) {
          hourMap[row.hour] += Number(row.count);
        }
      });
    });
    
    const data = Object.keys(hourMap).map(k => ({ hour: Number(k), count: hourMap[k] })).sort((a, b) => a.hour - b.hour);
    res.json({ data });
  } catch (error) {
    console.error("getHourlyDistribution error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getModeBreakdown = async (req, res) => {
    try {
        const { region, from, to } = req.query;

        const targetRegions = getTargetRegions(region);

        const { dateFrom, dateTo } = getDateRange(from, to);

        const sql = `
            SELECT
                token_group,
                COUNT(*) AS count

            FROM (

                SELECT
                    CASE
                        WHEN mode = 'A' THEN 'A'
                        WHEN mode = 'W' THEN 'W'
                        ELSE 'OTHER'
                    END AS token_group

                FROM tokens

                WHERE date BETWEEN ? AND ?

                UNION ALL

                SELECT
                    'OTHER' AS token_group

                FROM physical_reference_entries

                WHERE DATE(created_at) BETWEEN ? AND ?

            ) AS combined_tokens

            GROUP BY token_group
        `;

        const results = await queryRegions(
            sql,
            [dateFrom, dateTo, dateFrom, dateTo],
            targetRegions
        );

        const modeMap = {
            A: 0,
            W: 0,
            OTHER: 0
        };

        results.forEach(r => {
            r.rows.forEach(row => {
                if (modeMap[row.token_group] !== undefined) {
                    modeMap[row.token_group] += Number(row.count || 0);
                }
            });
        });

        const data = [
            {
                mode: "A",
                label: "Appointment",
                count: modeMap.A
            },
            {
                mode: "W",
                label: "Walk-in",
                count: modeMap.W
            },
            {
                mode: "OTHER",
                label: "Others (PT/RT/PwD)",
                count: modeMap.OTHER
            }
        ];

        res.json({ data });

    } catch (error) {
        console.error("getModeBreakdown error:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
};

exports.getAgeGenderBreakdown = async (req, res) => {
  try {
    const { region, from, to } = req.query;
    const targetRegions = getTargetRegions(region);
    const { dateFrom, dateTo } = getDateRange(from, to);
    
const sql = `
    SELECT
        CASE
            WHEN age < 5 THEN 'Under 5'
            WHEN age BETWEEN 5 AND 17 THEN '5-17'
            WHEN age BETWEEN 18 AND 30 THEN '18-30'
            WHEN age BETWEEN 31 AND 45 THEN '31-45'
            WHEN age BETWEEN 46 AND 60 THEN '46-60'
            ELSE 'Above 60'
        END AS age_group,

        gender,

        COUNT(*) AS count

    FROM (

        SELECT
            age,
            gender

        FROM tokens

        WHERE date BETWEEN ? AND ?

        UNION ALL

        SELECT
            age,
            gender

        FROM physical_reference_entries

        WHERE DATE(created_at) BETWEEN ? AND ?

    ) AS combined_tokens

    WHERE age IS NOT NULL

    GROUP BY age_group, gender
`;
    const results = await queryRegions(
    sql,
    [dateFrom, dateTo, dateFrom, dateTo],
    targetRegions
);
    
    const agMap = {};
    results.forEach(r => {
      r.rows.forEach(row => {
        const key = `${row.age_group}_${row.gender}`;
        agMap[key] = (agMap[key] || 0) + Number(row.count);
      });
    });
    
    const data = Object.keys(agMap).map(k => {
      const [age_group, gender] = k.split('_');
      return { age_group, gender, count: agMap[k] };
    });
    res.json({ data });
  } catch (error) {
    console.error("getAgeGenderBreakdown error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getDailyTrend = async (req, res) => {
  try {
    const { region, from, to } = req.query;
    const targetRegions = getTargetRegions(region);
    const { dateFrom, dateTo } = getDateRange(from, to);
    
    const sql = `
    SELECT
        date,
        COUNT(*) AS count

    FROM (

        SELECT
            date

        FROM tokens

        WHERE date BETWEEN ? AND ?

        UNION ALL

        SELECT
            DATE(created_at) AS date

        FROM physical_reference_entries

        WHERE DATE(created_at) BETWEEN ? AND ?

    ) AS combined_tokens

    GROUP BY date
    ORDER BY date
`;
    const results = await queryRegions(sql, [dateFrom, dateTo, dateFrom, dateTo], targetRegions);
    
    const dateMap = {};
    results.forEach(r => {
      r.rows.forEach(row => {
        const d = row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date;
        dateMap[d] = (dateMap[d] || 0) + Number(row.count);
      });
    });
    
    const data = Object.keys(dateMap).map(k => ({ date: k, count: dateMap[k] })).sort((a, b) => a.date.localeCompare(b.date));
    res.json({ data });
  } catch (error) {
    console.error("getDailyTrend error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getGeoHeatmap = async (req, res) => {

    try {

        const {
            region,
            from,
            to,
            visit_status = "all",
            entry_status = "all"
        } = req.query;

        const targetRegions = getTargetRegions(region);

        const { dateFrom, dateTo } =
            getDateRange(from, to);


        /*
         * ------------------------------------------------------------
         * TOKEN FILTERS
         * ------------------------------------------------------------
         */

        const tokenConditions = [
            "date BETWEEN ? AND ?"
        ];

        const tokenParams = [
            dateFrom,
            dateTo
        ];


        /*
         * Visit status
         */

        if (visit_status === "visited") {

            tokenConditions.push(
                "visited = 1"
            );

        } else if (visit_status === "not_visited") {

            tokenConditions.push(
                "visited = 0"
            );

        }


        /*
         * Entry status
         */

        if (entry_status === "entered") {

            tokenConditions.push(
                "entry_marked = 1"
            );

        } else if (entry_status === "not_entered") {

            tokenConditions.push(
                "entry_marked = 0"
            );

        }


        /*
         * ------------------------------------------------------------
         * PHYSICAL / REFERENCE ENTRIES
         *
         * Existing heatmap treats these as entered + visited.
         * Therefore:
         *
         *   All + All
         *   Visited + All
         *   All + Entered
         *   Visited + Entered
         *
         * include them.
         *
         * They are excluded whenever the requested filter requires
         * a token with visited=0 or entry_marked=0.
         * ------------------------------------------------------------
         */

        const includePhysical =
            visit_status !== "not_visited" &&
            entry_status !== "not_entered";


        /*
         * ------------------------------------------------------------
         * BUILD QUERY
         * ------------------------------------------------------------
         */

        let sql = `
            SELECT COUNT(*) AS count
            FROM (
                SELECT id
                FROM tokens
                WHERE ${tokenConditions.join(" AND ")}
        `;

        const params = [...tokenParams];


        if (includePhysical) {

            sql += `
                UNION ALL

                SELECT id
                FROM physical_reference_entries
                WHERE DATE(created_at) BETWEEN ? AND ?
            `;

            params.push(
                dateFrom,
                dateTo
            );

        }


        sql += `
            ) AS combined_tokens
        `;


        const results = await queryRegions(
            sql,
            params,
            targetRegions
        );


        const regionsData = results.map(r => ({

            region: r.region,

            state: REGION_STATES[r.region],

            total_tokens:
                Number(r.rows[0]?.count || 0),

            label:
                REGION_LABELS[r.region]

        }));


        res.json({
            regions: regionsData
        });


    } catch (error) {

        console.error(
            "getGeoHeatmap error:",
            error
        );

        res.status(500).json({
            error: "Internal server error"
        });

    }

};

exports.getSlotStatus = async (req, res) => {
  try {
    const { region } = req.query;
    const targetRegions = getTargetRegions(region);
    const today = getISTDateString();
    
    const sql = `SELECT date, appointment_total, appointment_booked, walkin_total, walkin_booked FROM daily_slots WHERE date = ?`;
    const results = await queryRegions(sql, [today], targetRegions);
    
    const data = results.map(r => {
      const row = r.rows[0] || {};
      return {
        region: r.region,
        label: REGION_LABELS[r.region],
        date: today,
        appointment_total: Number(row.appointment_total || 0),
        appointment_booked: Number(row.appointment_booked || 0),
        walkin_total: Number(row.walkin_total || 0),
        walkin_booked: Number(row.walkin_booked || 0)
      };
    });
    
    res.json({ data });
  } catch (error) {
    console.error("getSlotStatus error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getVisitAnalysis = async (req, res) => {
  try {
    const { region, from, to } = req.query;
    const targetRegions = getTargetRegions(region);
    const { dateFrom, dateTo } = getDateRange(from, to);
    
    const sql = `
    SELECT
        month,

        SUM(
            CASE
                WHEN visited = 1 THEN 1
                ELSE 0
            END
        ) AS visited,

        SUM(
            CASE
                WHEN visited = 0 THEN 1
                ELSE 0
            END
        ) AS not_visited

    FROM (

        SELECT
            DATE_FORMAT(date, '%Y-%m') AS month,
            visited

        FROM tokens

        WHERE date BETWEEN ? AND ?

        UNION ALL

        SELECT
            DATE_FORMAT(created_at, '%Y-%m') AS month,
            1 AS visited

        FROM physical_reference_entries

        WHERE DATE(created_at) BETWEEN ? AND ?

    ) AS combined_tokens

    GROUP BY month
    ORDER BY month
`;
    const results = await queryRegions(sql, [dateFrom, dateTo, dateFrom, dateTo], targetRegions);
    
    const monthMap = {};
    results.forEach(r => {
      r.rows.forEach(row => {
        const m = row.month;
        if (!monthMap[m]) monthMap[m] = { visited: 0, not_visited: 0 };
        monthMap[m].visited += Number(row.visited || 0);
        monthMap[m].not_visited += Number(row.not_visited || 0);
      });
    });
    
    const data = Object.keys(monthMap).map(k => ({
      month: k,
      visited: monthMap[k].visited,
      not_visited: monthMap[k].not_visited
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    res.json({ data });
  } catch (error) {
    console.error("getVisitAnalysis error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getRegionCompare = async (req, res) => {
  try {
    const { from, to } = req.query;
    // Always get all regions for comparison
    const targetRegions = REGIONS;
    const { dateFrom, dateTo } = getDateRange(from, to);
    
    const sql = `
    SELECT
        COUNT(*) AS count

    FROM (

        SELECT id
        FROM tokens

        WHERE date BETWEEN ? AND ?

        UNION ALL

        SELECT id
        FROM physical_reference_entries

        WHERE DATE(created_at) BETWEEN ? AND ?

    ) AS combined_tokens
`;
    const results = await queryRegions(sql, [dateFrom, dateTo, dateFrom, dateTo], targetRegions);
    
    const data = results.map(r => ({
      region: r.region,
      label: REGION_LABELS[r.region],
      total_tokens: Number(r.rows[0]?.count || 0)
    })).sort((a, b) => b.total_tokens - a.total_tokens);
    
    res.json({ data });
  } catch (error) {
    console.error("getRegionCompare error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
