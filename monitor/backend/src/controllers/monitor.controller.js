const { getPool, getAllPools, getMonitorPool, REGIONS, REGION_LABELS, REGION_STATES } = require("../models/db");
const { getISTDateString } = require("../utils/date.utils");
const roCoverage = require("../utils/ro_coverage.json");
const districtToState = require("../utils/district_to_state.json");

const canonicalStates = {
  "andaman and nicobar islands": "Andaman and Nicobar Islands",
  "andaman & nicobar": "Andaman and Nicobar Islands",
  "andhra pradesh": "Andhra Pradesh",
  "arunachal pradesh": "Arunachal Pradesh",
  "assam": "Assam",
  "bihar": "Bihar",
  "chandigarh": "Chandigarh",
  "chhattisgarh": "Chhattisgarh",
  "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dnh and dd": "Dadra and Nagar Haveli and Daman and Diu",
  "dddnh": "Dadra and Nagar Haveli and Daman and Diu",
  "delhi": "Delhi",
  "nct of delhi": "Delhi",
  "goa": "Goa",
  "gujarat": "Gujarat",
  "haryana": "Haryana",
  "himachal pradesh": "Himachal Pradesh",
  "jammu and kashmir": "Jammu and Kashmir",
  "jammu & kashmir": "Jammu and Kashmir",
  "jharkhand": "Jharkhand",
  "karnataka": "Karnataka",
  "kerala": "Kerala",
  "ladakh": "Ladakh",
  "lakshadweep": "Lakshadweep",
  "madhya pradesh": "Madhya Pradesh",
  "maharashtra": "Maharashtra",
  "manipur": "Manipur",
  "meghalaya": "Meghalaya",
  "mizoram": "Mizoram",
  "nagaland": "Nagaland",
  "odisha": "Odisha",
  "orissa": "Odisha",
  "puducherry": "Puducherry",
  "pondicherry": "Puducherry",
  "punjab": "Punjab",
  "rajasthan": "Rajasthan",
  "sikkim": "Sikkim",
  "tamil nadu": "Tamil Nadu",
  "tamilnadu": "Tamil Nadu",
  "telangana": "Telangana",
  "tripura": "Tripura",
  "uttar pradesh": "Uttar Pradesh",
  "uttarakhand": "Uttarakhand",
  "uttaranchal": "Uttarakhand",
  "west bengal": "West Bengal"
};

function resolveStateName(rawState, district, region) {
  if (rawState) {
    const key = String(rawState).trim().toLowerCase();
    if (canonicalStates[key]) return canonicalStates[key];
  }
  if (district) {
    const cleanDist = String(district).split("/")[0].trim().toLowerCase();
    if (districtToState[cleanDist]) {
      const s = districtToState[cleanDist];
      const key = s.trim().toLowerCase();
      if (canonicalStates[key]) return canonicalStates[key];
      return s;
    }
  }
  if (region && roCoverage[region] && roCoverage[region].length === 1) {
    return roCoverage[region][0];
  }
  if (region && REGION_STATES[region]) {
    return REGION_STATES[region];
  }
  return rawState || "Unknown";
}

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

function isValidISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function escapeIdentifier(identifier) {
    return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function csvEscape(value) {
    if (value === null || value === undefined) {
        return "";
    }

    let str;

    if (value instanceof Date) {
        str = value.toISOString();
    } else if (Buffer.isBuffer(value)) {
        str = value.toString("base64");
    } else if (typeof value === "object") {
        str = JSON.stringify(value);
    } else {
        str = String(value);
    }

    // Prevent spreadsheet formula injection.
    if (/^[\s]*[=+\-@]/.test(str)) {
        str = "'" + str;
    }

    return `"${str.replace(/"/g, '""')}"`;
}

async function getTableColumns(pool, tableName) {

    const [rows] = await pool.execute(
        `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
        `,
        [tableName]
    );

    return rows.map(row => row.COLUMN_NAME);
}
exports.exportBulkCSV = async (req, res) => {

    try {

        const { from, to, table } = req.query;

        const allowedTables = [
            "tokens",
            "physical_reference_entries"
        ];

        if (!allowedTables.includes(table)) {
            return res.status(400).json({
                error: "Invalid table selected"
            });
        }

        if (!isValidISODate(from) || !isValidISODate(to)) {
            return res.status(400).json({
                error: "Invalid date format. Use YYYY-MM-DD."
            });
        }

        if (from > to) {
            return res.status(400).json({
                error: "Start date cannot be after end date"
            });
        }

        const BATCH_SIZE = 1000;

        /*
         * STEP 1:
         * Inspect every regional database.
         */

        const databaseSchemas = [];

        for (const region of REGIONS) {

            const pool = getPool(region);

            if (!pool) {
                throw new Error(
                    `Database pool unavailable: ${region}`
                );
            }

            const columns = await getTableColumns(
                pool,
                table
            );

            // A missing table is skipped.
            if (columns.length === 0) {
                console.warn(
                    `[Bulk Export] Table ${table} missing in ${region}`
                );
                continue;
            }

            let dateColumn = null;

            if (columns.includes("created_at")) {
                dateColumn = "created_at";
            } else if (
                table === "tokens" &&
                columns.includes("date")
            ) {
                dateColumn = "date";
            }

            if (!dateColumn) {
                throw new Error(
                    `No supported date column in ${table} for ${region}`
                );
            }

            databaseSchemas.push({
                region,
                pool,
                columns,
                dateColumn
            });

        }

        /*
         * STEP 2:
         * Create a union of all columns.
         */

        const allColumns = [
            ...new Set(
                databaseSchemas.flatMap(db => db.columns)
            )
        ];

        // Add the originating regional office.
        const headers = [
    ...allColumns,
    "__export_region"
];

        /*
         * STEP 3:
         * Prepare CSV response.
         */

        const filename =
            `${table}_${from}_to_${to}.csv`;

        res.setHeader(
            "Content-Type",
            "text/csv; charset=utf-8"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        // UTF-8 BOM for Excel compatibility.
        res.write("\uFEFF");

        res.write(
            headers.map(csvEscape).join(",") + "\r\n"
        );

        /*
         * STEP 4:
         * Fetch data from every regional database.
         */

        for (const db of databaseSchemas) {

            if (res.destroyed) return;

            const selectColumns = allColumns.map(column => {

                if (db.columns.includes(column)) {
                    return escapeIdentifier(column);
                }

                return `NULL AS ${escapeIdentifier(column)}`;

            });

            

            const dateIdentifier = escapeIdentifier(
                db.dateColumn
            );

            const dateCondition =
                db.dateColumn === "created_at"
                    ? `${dateIdentifier} >= ? AND ${dateIdentifier} < DATE_ADD(?, INTERVAL 1 DAY)`
                    : `${dateIdentifier} BETWEEN ? AND ?`;

            let offset = 0;

            while (true) {

                if (res.destroyed) return;

                const sql = `
                    SELECT
                        ${selectColumns.join(", ")},
                        ? AS __export_region
                    FROM ${escapeIdentifier(table)}
                    WHERE ${dateCondition}
                    LIMIT ? OFFSET ?
                `;

                const [rows] = await db.pool.execute(
                    sql,
                    [
                        db.region,
                        from,
                        to,
                        BATCH_SIZE,
                        offset
                    ]
                );

                if (rows.length === 0) {
                    break;
                }

                for (const row of rows) {

                    const csvRow = headers.map(header =>
                        csvEscape(row[header])
                    ).join(",");

                    if (!res.write(csvRow + "\r\n")) {
                        await new Promise((resolve, reject) => {

                            const cleanup = () => {
                                res.off("drain", onDrain);
                                res.off("close", onClose);
                            };

                            const onDrain = () => {
                                cleanup();
                                resolve();
                            };

                            const onClose = () => {
                                cleanup();
                                reject(
                                    new Error("Client disconnected")
                                );
                            };

                            res.once("drain", onDrain);
                            res.once("close", onClose);

                        });
                    }

                }

                offset += rows.length;

                if (rows.length < BATCH_SIZE) {
                    break;
                }

            }

        }

        if (!res.destroyed) {
            res.end();
        }

    } catch (error) {

        console.error(
            "[Bulk Export Error]:",
            error
        );

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Bulk export failed",
                message: error.message
            });
        }

        res.destroy(error);

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
        const { dateFrom, dateTo } = getDateRange(from, to);

        const isAllRegions = !region || region === "all";

        /*
         * Filter conditions
         */
        const tokenConditions = ["date BETWEEN ? AND ?"];
        const tokenParams = [dateFrom, dateTo];

        if (visit_status === "visited") {
            tokenConditions.push("visited = 1");
        } else if (visit_status === "not_visited") {
            tokenConditions.push("visited = 0");
        }

        if (entry_status === "entered") {
            tokenConditions.push("entry_marked = 1");
        } else if (entry_status === "not_entered") {
            tokenConditions.push("entry_marked = 0");
        }

        const includePhysical =
            visit_status !== "not_visited" &&
            entry_status !== "not_entered";

        /*
         * ------------------------------------------------------------
         * CASE 1: SPECIFIC REGIONAL OFFICE SELECTED -> DISTRICT BREAKDOWN
         * ------------------------------------------------------------
         */
        if (!isAllRegions) {
            let sql = `
                SELECT
                    district,
                    COUNT(*) AS count
                FROM (
                    SELECT district
                    FROM tokens
                    WHERE ${tokenConditions.join(" AND ")}
            `;
            const params = [...tokenParams];

            if (includePhysical) {
                sql += `
                    UNION ALL
                    SELECT district
                    FROM physical_reference_entries
                    WHERE DATE(created_at) BETWEEN ? AND ?
                `;
                params.push(dateFrom, dateTo);
            }

            sql += `
                ) AS combined_tokens
                GROUP BY district
                ORDER BY count DESC
            `;

            const results = await queryRegions(sql, params, targetRegions);
            const districtMap = {};
            let total = 0;

            results.forEach(r => {
                r.rows.forEach(row => {
                    const dist = row.district || "Unknown";
                    const count = Number(row.count || 0);
                    districtMap[dist] = (districtMap[dist] || 0) + count;
                    total += count;
                });
            });

            const data = Object.keys(districtMap)
                .map(k => ({
                    area: k,
                    count: districtMap[k],
                    percentage: total > 0 ? (districtMap[k] / total) * 100 : 0
                }))
                .sort((a, b) => b.count - a.count);

            return res.json({
                mode: "district",
                data
            });
        }

        /*
         * ------------------------------------------------------------
         * CASE 2: ALL REGIONS SELECTED -> STATE-WISE BREAKDOWN
         * ------------------------------------------------------------
         */
        const stateMap = {};
        let total = 0;

        await Promise.allSettled(
            targetRegions.map(async (reg) => {
                const pool = getPool(reg);
                if (!pool) return;

                const isSingleState = roCoverage[reg] && roCoverage[reg].length === 1;
                const singleStateName = isSingleState ? roCoverage[reg][0] : null;

                if (isSingleState) {
                    // Single-state RO (Lucknow -> Uttar Pradesh, Patna -> Bihar, Bhopal -> Madhya Pradesh, etc.)
                    // All tokens belong 100% to this state.
                    let regTotal = 0;
                    try {
                        const [tokenRows] = await pool.execute(
                            `SELECT COUNT(*) AS count FROM tokens WHERE ${tokenConditions.join(" AND ")}`,
                            tokenParams
                        );
                        regTotal += Number(tokenRows[0]?.count || 0);
                    } catch (e) {
                        console.error(`[districtBreakdown] tokens count error for ${reg}:`, e.message);
                    }

                    if (includePhysical) {
                        try {
                            const [physRows] = await pool.execute(
                                `SELECT COUNT(*) AS count FROM physical_reference_entries WHERE DATE(created_at) BETWEEN ? AND ?`,
                                [dateFrom, dateTo]
                            );
                            regTotal += Number(physRows[0]?.count || 0);
                        } catch (e) {
                            console.error(`[districtBreakdown] physical count error for ${reg}:`, e.message);
                        }
                    }

                    if (regTotal > 0) {
                        stateMap[singleStateName] = (stateMap[singleStateName] || 0) + regTotal;
                        total += regTotal;
                    }
                } else {
                    // Multi-state RO (e.g. Bengaluru, Hyderabad, Mumbai, Guwahati, etc.)
                    // Query tokens with state & district
                    try {
                        let tokenRows = [];
                        try {
                            const [r] = await pool.execute(
                                `SELECT state, district, COUNT(*) AS count FROM tokens WHERE ${tokenConditions.join(" AND ")} GROUP BY state, district`,
                                tokenParams
                            );
                            tokenRows = r;
                        } catch (e) {
                            const [r] = await pool.execute(
                                `SELECT district, COUNT(*) AS count FROM tokens WHERE ${tokenConditions.join(" AND ")} GROUP BY district`,
                                tokenParams
                            );
                            tokenRows = r;
                        }

                        tokenRows.forEach(row => {
                            const count = Number(row.count || 0);
                            const st = resolveStateName(row.state, row.district, reg);
                            stateMap[st] = (stateMap[st] || 0) + count;
                            total += count;
                        });
                    } catch (e) {
                        console.error(`[districtBreakdown] multi-state tokens error for ${reg}:`, e.message);
                    }

                    if (includePhysical) {
                        try {
                            const [physRows] = await pool.execute(
                                `SELECT district, COUNT(*) AS count FROM physical_reference_entries WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY district`,
                                [dateFrom, dateTo]
                            );

                            physRows.forEach(row => {
                                const count = Number(row.count || 0);
                                const st = resolveStateName(null, row.district, reg);
                                stateMap[st] = (stateMap[st] || 0) + count;
                                total += count;
                            });
                        } catch (e) {
                            console.error(`[districtBreakdown] multi-state physical error for ${reg}:`, e.message);
                        }
                    }
                }
            })
        );

        const data = Object.keys(stateMap)
            .map(k => ({
                area: k,
                count: stateMap[k],
                percentage: total > 0 ? (stateMap[k] / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        res.json({
            mode: "state",
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
