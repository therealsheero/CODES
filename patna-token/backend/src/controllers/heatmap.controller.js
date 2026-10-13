const db = require("../models/db");


exports.getSlotSummary = async (req, res) => {

    const {
        from,
        to,
        day
    } = req.query;

    const sql = `
        SELECT
            d.date,

            CASE DAYOFWEEK(d.date)
                WHEN 1 THEN 'Sunday'
                WHEN 2 THEN 'Monday'
                WHEN 3 THEN 'Tuesday'
                WHEN 4 THEN 'Wednesday'
                WHEN 5 THEN 'Thursday'
                WHEN 6 THEN 'Friday'
                WHEN 7 THEN 'Saturday'
            END AS day,

            d.appointment_total,
            d.appointment_booked,
            d.walkin_total,
            d.walkin_booked,

            (
                SELECT COUNT(*)
                FROM tokens t
                WHERE t.date = d.date
                  AND t.mode = 'A'
                  AND t.visited = 1
            ) AS appointment_footfall,

            (
                SELECT COUNT(*)
                FROM tokens t
                WHERE t.date = d.date
                  AND t.mode = 'W'
                  AND t.visited = 1
            ) AS walkin_footfall,

            (
                SELECT COUNT(*)
                FROM physical_reference_entries p
                WHERE DATE(p.created_at) = d.date
            ) AS physical_count

        FROM daily_slots d

        WHERE d.date BETWEEN ?
        AND ?

        AND (
            ? = ''
            OR
            CASE DAYOFWEEK(d.date)
                WHEN 1 THEN 'Sunday'
                WHEN 2 THEN 'Monday'
                WHEN 3 THEN 'Tuesday'
                WHEN 4 THEN 'Wednesday'
                WHEN 5 THEN 'Thursday'
                WHEN 6 THEN 'Friday'
                WHEN 7 THEN 'Saturday'
            END = ?
        )

        ORDER BY d.date DESC
    `;

    try {

        const [rows] = await db.execute(
            sql,
            [
                from,
                to,
                day || "",
                day || ""
            ]
        );

        const finalRows = rows.map(r => ({
            date: r.date,
            day: r.day,

            appointment_released:
                r.appointment_total,

            appointment_booked:
                r.appointment_booked,

            appointment_footfall:
                r.appointment_footfall,

            walkin_released:
                r.walkin_total,

            walkin_booked:
                r.walkin_booked,

            walkin_footfall:
                r.walkin_footfall,

            physical_count:
                r.physical_count,

            total:
                Number(r.appointment_footfall) +
                Number(r.walkin_footfall) +
                Number(r.physical_count)
        }));

        res.json(finalRows);

    } catch (err) {

        console.log(
            "SLOT SUMMARY ERROR MESSAGE:",
            err.message
        );

        return res.status(500).json({
            message: err.message
        });
    }
};


exports.getPhysicalDistrictResidents = async (req, res) => {

    const {
        district,
        from,
        to
    } = req.query;

    const sql = `
        SELECT
            token,
            name,
            mobile,
            age,
            gender,
            district,
            service_type,
            token_type,
            created_at,
            reference_of

        FROM physical_reference_entries

        WHERE
            LOWER(district)
            LIKE LOWER(?)

            AND DATE(created_at)
            BETWEEN ?
            AND ?

        ORDER BY created_at DESC
    `;

    try {

        const [rows] = await db.execute(
            sql,
            [
                district + "%",
                from,
                to
            ]
        );

        res.json(rows);

    } catch (err) {

        console.log(
            "SLOT SUMMARY ERROR MESSAGE:",
            err.message
        );

        return res.status(500).json({
            message: err.message
        });
    }
};


exports.getDistrictResidents = async (req, res) => {

    const {
        district,
        from,
        to,
        type,
        visit_status = "all",
        entry_status = "all"
    } = req.query;

    let whereClause = `
        LOWER(district) LIKE LOWER(?)
        AND date BETWEEN ? AND ?
    `;

    // Visit filter
    if (visit_status === "visited") {
        whereClause += ` AND visited = 1`;
    } else if (visit_status === "not_visited") {
        whereClause += ` AND visited = 0`;
    }

    // Entry filter
    if (entry_status === "entered") {
        whereClause += ` AND entry_marked = 1`;
    } else if (entry_status === "not_entered") {
        whereClause += ` AND entry_marked = 0`;
    }

    // Existing sheet-type filters
    if (type === "appointment") {
        whereClause += ` AND mode = 'A'`;
    } else if (type === "walkin") {
        whereClause += ` AND mode = 'W'`;
    } else if (type === "eid") {
        whereClause += `
            AND (
                (eid IS NOT NULL AND eid != '')
                OR
                (sid IS NOT NULL AND sid != '')
            )
        `;
    }

    const sql = `
        SELECT
            token,
            name,
            mobile,
            age,
            gender,
            service_type,
            mode,
            date,
            visited,
            entry_marked,
            district,
            eid
        FROM tokens
        WHERE ${whereClause}
        ORDER BY date DESC
    `;

    try {

        const [rows] = await db.execute(
            sql,
            [
                district + "%",
                from,
                to
            ]
        );

        res.json(rows);

    } catch (err) {

        console.log(
            "DISTRICT RESIDENTS ERROR:",
            err.message
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


exports.getHeatmapData = async (req, res) => {
    const {
        from,
        to,
        type,
        day,
        visit_status = "all",
        entry_status = "all"
    } = req.query;

    try {
        // Physical/reference entries have no visited or entry_marked
        // conditions in the supplied controller. Treat them as
        // visited + entered, consistent with the CEO heatmap logic.

        if (type === "physical") {
            if (
                visit_status === "not_visited" ||
                entry_status === "not_entered"
            ) {
                return res.json([]);
            }

            let whereClause = `
                DATE(created_at) BETWEEN ? AND ?
            `;

            const params = [from, to];

            if (day) {
                whereClause += `
                    AND CASE DAYOFWEEK(DATE(created_at))
                        WHEN 1 THEN 'Sunday'
                        WHEN 2 THEN 'Monday'
                        WHEN 3 THEN 'Tuesday'
                        WHEN 4 THEN 'Wednesday'
                        WHEN 5 THEN 'Thursday'
                        WHEN 6 THEN 'Friday'
                        WHEN 7 THEN 'Saturday'
                    END = ?
                `;

                params.push(day);
            }

            const sql = `
                SELECT
                    district,
                    COUNT(*) AS visits
                FROM physical_reference_entries
                WHERE ${whereClause}
                GROUP BY district
            `;

            const [rows] = await db.execute(sql, params);
            return res.json(rows);
        }

        // Normal token heatmap

        let whereClause = `
            date BETWEEN ? AND ?
        `;

        const params = [from, to];

        // Visit status
        if (visit_status === "visited") {
            whereClause += ` AND visited = 1`;
        } else if (visit_status === "not_visited") {
            whereClause += ` AND visited = 0`;
        }

        // Entry status
        if (entry_status === "entered") {
            whereClause += ` AND entry_marked = 1`;
        } else if (entry_status === "not_entered") {
            whereClause += ` AND entry_marked = 0`;
        }

        // Existing sheet-type filters
        if (type === "appointment") {
            whereClause += ` AND mode = 'A'`;
        } else if (type === "walkin") {
            whereClause += ` AND mode = 'W'`;
        } else if (type === "eid") {
            whereClause += `
                AND (
                    (eid IS NOT NULL AND eid != '')
                    OR
                    (sid IS NOT NULL AND sid != '')
                )
            `;
        }

        // Existing day filter
        if (day) {
            whereClause += `
                AND CASE DAYOFWEEK(date)
                    WHEN 1 THEN 'Sunday'
                    WHEN 2 THEN 'Monday'
                    WHEN 3 THEN 'Tuesday'
                    WHEN 4 THEN 'Wednesday'
                    WHEN 5 THEN 'Thursday'
                    WHEN 6 THEN 'Friday'
                    WHEN 7 THEN 'Saturday'
                END = ?
            `;

            params.push(day);
        }

        const sql = `
            SELECT
                district,
                COUNT(*) AS visits
            FROM tokens
            WHERE ${whereClause}
            GROUP BY district
        `;

        const [rows] = await db.execute(sql, params);
        return res.json(rows);

    } catch (err) {
        console.error("HEATMAP ERROR:", err.message);

        return res.status(500).json({
            message: "Failed to load heatmap data"
        });
    }
};
