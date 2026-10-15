
const db = require("../models/db");
const {
  withSlotMutationLock
}=require("../services/slot.service");
const {
getISTDateString
}=require("../utils/date.utils");
const bcrypt = require("bcrypt");
const MASTER_SERVICES = [
  "DoB",
  "Name",
  "Aadhaar Suspended",
  "Advised to visit RO",
  "Gender",
  "None of the above",
  "Lost Aadhaar",
  "Biometric Issue",
  "Lock Aadhaar"
];


exports.getDashboardFieldSettings = async (req, res) => {

    const dashboard =
        String(req.params.dashboard || "")
        .trim()
        .toUpperCase();

    const allowed = [
        "MANAGER",
        "GUARD",
        "GUARD2"
    ];

    if (!allowed.includes(dashboard)) {

        return res.status(400).json({
            message: "Invalid dashboard"
        });

    }

    try {
    const [rows] = await db.execute(
        `
        SELECT
            id,
            dashboard,
            field_key,
            visible,
            display_order
        FROM dashboard_field_settings
        WHERE dashboard = ?
        ORDER BY display_order ASC, field_key ASC
        `,
        [dashboard]
    );

            res.json(rows);

    } catch(err) {

                console.error(
                    "GET DASHBOARD FIELD SETTINGS ERROR:",
                    err.message
                );

                return res.status(500).json({
                    message: "DB error"
                });

    }

};
exports.updateDashboardFieldSettings = async (req, res) => {

    const {
        dashboard,
        fields
    } = req.body;

    const dashboardName =
        String(dashboard || "")
        .trim()
        .toUpperCase();

    const allowed = [
        "MANAGER",
        "GUARD",
        "GUARD2"
    ];

    if (!allowed.includes(dashboardName)) {

        return res.status(400).json({
            message: "Invalid dashboard"
        });

    }

    if (!Array.isArray(fields)) {

        return res.status(400).json({
            message: "fields must be an array"
        });

    }

    try {

        for (const field of fields) {

            const visible =
                Number(field.visible) === 1
                ? 1
                : 0;

            await db.execute(
                `
                UPDATE dashboard_field_settings

                SET
                    visible = ?

                WHERE
                    dashboard = ?
                    AND field_key = ?
                `,
                [
                    visible,
                    dashboardName,
                    field.field_key
                ]
            );

        }

            res.json({
                success: true
            });

    } catch(err) {

                console.error(
                    "UPDATE DASHBOARD FIELD SETTINGS ERROR:",
                    err.message
                );

                return res.status(500).json({
                    message: "Update failed"
                });

    }

};
exports.getWeekdayRules=async (req,res)=>{

try {
const [rows] = await db.execute(
`
SELECT *
FROM weekday_slot_rules
ORDER BY weekday
`
);

res.json(rows);

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.updateWeekdayRule=async (req,res)=>{
const {
 weekday,
 appointment_total,
 walkin_total,
 tokens_per_hour,
 work_start_time
}=req.body;

try {
await db.execute(
`
UPDATE weekday_slot_rules

SET 
appointment_total=?,
walkin_total=?,
tokens_per_hour=?,
work_start_time=?

WHERE weekday=?

`,
[
appointment_total,
walkin_total,
tokens_per_hour,
work_start_time,
weekday
]
);
        const mysqlDow = Number(weekday) + 1;

        await db.execute(
            `UPDATE daily_token_counters
             SET tokens_per_hour = ?
             WHERE date >= CURDATE()
               AND DAYOFWEEK(date) = ?`,
            [tokens_per_hour, mysqlDow]
        );

        await db.execute(
            `UPDATE daily_slots
             SET appointment_total = GREATEST(?, appointment_booked),
                 walkin_total = GREATEST(?, walkin_booked)
             WHERE date >= CURDATE()
               AND DAYOFWEEK(date) = ?`,
            [appointment_total, walkin_total, mysqlDow]
        );


res.json({
success:true
});

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.getDistricts = async (req,res)=>{

try {
const [rows] = await db.execute(
`
SELECT *
FROM districts
ORDER BY state, english_name
`
);

res.json(rows);

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.addDistrict = async (req,res)=>{

const {
state,
english_name,
hindi_name
}=req.body;

if(!state || !english_name || !hindi_name){

return res.status(400).json({
message:"State, English name and Hindi name required"
});

}

try {
await db.execute(
`
INSERT INTO districts
(
state,
english_name,
hindi_name
)

VALUES(?,?,?)
`,
[
state,
english_name,
hindi_name
]
);

res.json({
success:true
});

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.deleteDistrict=async (req,res)=>{

const id=req.params.id;

try {
await db.execute(
`
DELETE FROM districts
WHERE id=?
`,
[id]
);

res.json({
success:true
});

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.uploadGeojson = async (req,res)=>{

    if(!req.file){

        return res.status(400).json({
            message:"No file uploaded"
        });

    }

    const state =
        req.body.state;
        if(!state){

        return res.status(400).json({
            message:"State required"
        });

    }

    const fileName =
        req.file.filename;

    const filePath =
        "/js/geojson/" + fileName;

    try {
    await db.execute(
`
INSERT INTO geojson_settings
(
state,
file_name,
file_path
)

VALUES
(?,?,?)

ON DUPLICATE KEY UPDATE

file_name=VALUES(file_name),
file_path=VALUES(file_path),
updated_at=NOW()

`,
[
state,
fileName,
filePath
]
);

res.json({
message:"GeoJSON uploaded successfully"
});

    } catch(err) {

return res.status(500).json({
message:"DB error"
});

    }

};
exports.getGeojson = async (req,res)=>{

    const { state } = req.query;

    try {

    if(!state){

        const [rows] = await db.execute(
        `
        SELECT
            file_name,
            file_path
        FROM geojson_settings
        `
        );

            return res.json(rows);

    }

    const [rows] = await db.execute(
    `
    SELECT
        file_name,
        file_path
    FROM geojson_settings
    WHERE state=?
    `,
    [state]
    );

        return res.json(rows[0]);

    } catch(err) {

            return res.status(500).json({
                message:"DB error"
            });

    }

};
async function getDefaultTokensPerHour(date){

const day =
new Date(date).getDay();

const [rows] = await db.execute(
`
SELECT tokens_per_hour
FROM weekday_slot_rules
WHERE weekday=?
`,
[day]
);

return rows[0]?.tokens_per_hour ?? 30;

}

exports.getUsers = async (req, res) => {

    try {
    const [rows] = await db.execute(
        `
        SELECT
            id,
            username,
            role,
            is_active
        FROM users
        ORDER BY id
        `
    );

            res.json(rows);

    } catch(err) {

                return res.status(500).json({
                    message: "Database error"
                });

    }

};
exports.updateUser = async (req, res) => {

    const id = req.params.id;

    const {
        username,
        password,
        is_active
    } = req.body;

    try {

        const [rows] = await db.execute(
            `
            SELECT *
            FROM users
            WHERE id = ?
            `,
            [id]
        );

        const user = rows[0];

                if(user.role==="MANAGER" && is_active==0)
                  {
                  return res.status(400).json({
                  message:"Manager cannot be disabled"
                  });
                  }

                if (!user) {

                    return res.status(404).json({
                        message: "User not found"
                    });

                }

                let newUsername =
                    username?.trim() ||
                    user.username;

                let newPassword =
                    user.password;

                if (
                    password &&
                    password.trim() !== ""
                ) {

                    newPassword =
                        await bcrypt.hash(
                            password,
                            10
                        );

                }

                await db.execute(

                    `
                    UPDATE users
                    SET
                        username = ?,
                        password = ?,
                        is_active = ?
                    WHERE id = ?
                    `,

                    [
                        newUsername,
                        newPassword,
                        is_active,
                        id
                    ]

                );

                        res.json({
                            success: true
                            
                        });

    }

    catch(err) {

        res.status(500).json({
            message: "Server error"
        });

    }

};

function getPreviousWorkingDate(date, daysBack, holidays = []) {

  const d = new Date(date);

  let count = 0;

  while (count < daysBack) {

    d.setDate(d.getDate() - 1);

    const iso = d.toISOString().split("T")[0];

    const day = d.getDay();

    const isWeekend =
      day === 0 || day === 6;

    const isHoliday =
      holidays.includes(iso);

    if (!isWeekend && !isHoliday) {
      count++;
    }
  }

  return d;
}

exports.exportRangeCSV = async (req, res) => {

  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      message: "From and To dates required"
    });
  }

  try {
  const [rows] = await db.execute(
    `
    SELECT
    id,
    token,
    name,
    mobile,
    aadhaar_last4,
    age,
    gender,
    divyang,
    state,
    district,
    service_type,
    qrc,
    date,
    mode,
    priority,
    created_at,
    device_id,
    token_type,
    visited,
    visited_at,
    distance_meters,
    token_seq,
    entry_marked,
    entry_time,
    eid,
    identity_type,
    sid,
    hardware_fp,

    service_other AS reference_of

FROM tokens

WHERE date BETWEEN ? AND ?

UNION ALL

SELECT
    id,
    token,
    name,
    mobile,
    aadhaar_last4,
    age,
    gender,

    NULL AS divyang,
    state,

    district,
    service_type,

    NULL AS qrc,

    DATE(created_at) AS date,

    NULL AS mode,
    NULL AS priority,

    created_at,

    NULL AS device_id,

    CASE
    WHEN token_type='Reference'
    THEN 'RT'
    
    WHEN token_type='Physical Token'
    THEN 'PT'
    
    WHEN token_type='Specially Abled'
    THEN 'PwD'
    
    ELSE token_type
    END AS token_type,

    NULL AS visited,

    created_at AS visited_at,

    NULL AS distance_meters,
    NULL AS token_seq,
    NULL AS entry_marked,

    created_at AS entry_time,

    eid,
    NULL AS identity_type,
    NULL AS sid,
    NULL AS hardware_fp,

    reference_of

FROM physical_reference_entries

WHERE DATE(created_at) BETWEEN ? AND ?

ORDER BY date ASC, created_at ASC
    `,
    [from, to, from, to]
  );

      let csv = "";

      if (rows.length > 0) {

        csv +=
          Object.keys(rows[0]).join(",") + "\n";

        rows.forEach(row => {

          const formattedRow =
            Object.entries(row).map(([key, value]) => {

              if (
                (key === "eid" || key === "sid")
                && value
              ) {
                return `"=""${value}"""`;
              }

              return `"${String(value ?? "")
                .replace(/"/g, '""')}"`;
            });

          csv += formattedRow.join(",") + "\n";
        });
      }

      res.header(
        "Content-Type",
        "text/csv"
      );

      res.attachment(
        `tokens_${from}_to_${to}.csv`
      );

      return res.send(csv);

  } catch(err) {

      return res.status(500).json({
        message: "DB error"
      });

  }
};
exports.saveNotice = async (req, res) => {
  const { date, message } = req.body;

  if (!date || !message) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
  await db.execute(
    `
    INSERT INTO notices (date, message)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE message = VALUES(message)
    `,
    [date, message]
  );

      res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }
};
exports.getAllNotices = async (req, res) => {

const today =
getISTDateString();

  try {
  const [rows] = await db.execute(
    `SELECT date, message 
     FROM notices 
     WHERE date >= ?
     ORDER BY date ASC`,
    [today]
  );

      res.json(rows);
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }
};
exports.deleteNotice = async (req, res) => {

  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  try {
  await db.execute(
    `DELETE FROM notices WHERE date = ?`,
    [date]
  );

      res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }
};
exports.getTodayPhysicalReferenceEntries =
  async (req, res) => {

    try {

    const today = getISTDateString();

    const [rows] = await db.execute(
      `
      SELECT *
      FROM physical_reference_entries
      WHERE DATE(created_at) = ?
      `,
      [today]
    );

        res.json(rows);

    } catch(err) {
          return res.status(500).json({
            message: "DB error"
          });
    }
};

exports.updatePriorityRules = async (req,res)=>{

  const {
    child_age_limit,
    senior_age_limit,
    female_priority_age,
    default_appointment_slots,
    default_walkin_slots,
    appointment_days_visible,
    walkin_start_hour,
    walkin_end_hour,
    today_appointment_cutoff_hour,
    geo_start_1,
    geo_end_1,
    geo_start_2,
    geo_end_2,
    geofence_distance_meters,
    office_latitude,
    office_longitude,
    manager_previous_days,
    manager_future_days,
    office_open_saturday,
    office_open_sunday,
    default_tokens_per_hour,
    office_display_en,
    office_display_hi,
    office_short_name,
    watermark_text,
    gazette_office_address
} = req.body;

  const queries = [
    ["child_age_limit", child_age_limit],
    ["senior_age_limit", senior_age_limit],
    ["female_priority_age", female_priority_age],
    ["default_appointment_slots", default_appointment_slots],
    ["default_walkin_slots", default_walkin_slots],
    ["appointment_days_visible", appointment_days_visible],
    ["walkin_start_hour", walkin_start_hour],
    ["walkin_end_hour", walkin_end_hour],
    ["today_appointment_cutoff_hour", today_appointment_cutoff_hour],
    ["geo_start_1", geo_start_1],
    ["geo_end_1", geo_end_1],
    ["geo_start_2", geo_start_2],
    ["geo_end_2", geo_end_2],
    ["geofence_distance_meters", geofence_distance_meters],
    ["office_latitude", office_latitude],
    ["office_longitude", office_longitude],
    ["manager_previous_days", manager_previous_days],
    ["manager_future_days", manager_future_days],
    ["office_open_saturday", office_open_saturday],
    ["office_open_sunday", office_open_sunday],
    ["default_tokens_per_hour", default_tokens_per_hour],
    ["office_display_en", office_display_en],
    ["office_display_hi", office_display_hi],
    ["office_short_name",office_short_name],
    ["watermark_text",watermark_text],
    ["gazette_office_address", gazette_office_address]
];

  try {
  for (const q of queries) {
    await db.execute(
      `UPDATE priority_rules SET rule_value=? WHERE rule_key=?`,
      [q[1],q[0]]
    );
  }

  res.json({success:true});
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }

};

exports.addPriorityDistrict = async (req,res)=>{

  const {state, district} = req.body;
  if(!state || !district){

return res.status(400).json({
message:"State and district required"
});

}

  try {
  await db.execute(
    `INSERT INTO priority_districts(state, district) VALUES(?,?)`,
    [state, district]
  );

      res.json({success:true});
  } catch(err) {
    return res.status(500).json({message:"DB error"});
  }

};

exports.deletePriorityDistrict = async (req,res)=>{

  const {state,district} = req.body;

  try {
  await db.execute(
    `DELETE FROM priority_districts WHERE state=? AND district=?`,
    [state, district]
  );

      res.json({success:true});
  } catch(err) {
    return res.status(500).json({message:"DB error"});
  }

};


exports.addHoliday = async (req, res) => {
  const { date, reason} = req.body;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  try {
  await db.execute(
    `REPLACE INTO holidays (date, reason)
     VALUES (?, ?)`,
    [date, reason || "Declared Holiday"]
  );

      res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }
};


exports.getWeekdaySlots = async (req,res)=>{

try {
const [rows] = await db.execute(
`
SELECT *
FROM weekday_slot_rules
ORDER BY weekday
`
);

res.json(rows);

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.updateWeekdaySlots=async (req,res)=>{

const {
 weekday,
 appointment_total,
 walkin_total,
 tokens_per_hour,
 work_start_time
}=req.body;

try {
await db.execute(
`
UPDATE weekday_slot_rules

SET 
appointment_total=?,
walkin_total=?,
tokens_per_hour=?,
work_start_time=?

WHERE weekday=?

`,
[
 appointment_total,
 walkin_total,
 tokens_per_hour,
 work_start_time,
 weekday
]
);
        const mysqlDow = Number(weekday) + 1;

        await db.execute(
            `UPDATE daily_token_counters
             SET tokens_per_hour = ?
             WHERE date >= CURDATE()
               AND DAYOFWEEK(date) = ?`,
            [tokens_per_hour, mysqlDow]
        );

        await db.execute(
            `UPDATE daily_slots
             SET appointment_total = GREATEST(?, appointment_booked),
                 walkin_total = GREATEST(?, walkin_booked)
             WHERE date >= CURDATE()
               AND DAYOFWEEK(date) = ?`,
            [appointment_total, walkin_total, mysqlDow]
        );


res.json({
success:true
});

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.addWorkingDay = async (req, res) => {

  const { date, reason } = req.body;

  if (!date) {

    return res.status(400).json({
      message: "Date required"
    });

  }

  try {
  await db.execute(
    `
    REPLACE INTO working_days
    (date, reason)
    VALUES (?,?)
    `,
    [
      date,
      reason || "Working Day"
    ]
  );

      res.json({
        success: true
      });

  } catch(err) {
        return res.status(500).json({
          message: "DB error"
        });
  }

};

exports.deleteWorkingDay = async (req,res)=>{

    const { date } = req.body;

    try {
    await db.execute(
        `
        DELETE FROM working_days
        WHERE date=?
        `,
        [date]
    );

            res.json({
                success:true
            });

    } catch(err) {
                return res.status(500).json({
                    message:"DB error"
                });
    }

};

exports.deleteHoliday = async (req, res) => {
  const { date } = req.body;

  try {
  await db.execute(
    `DELETE FROM holidays WHERE date = ?`,
    [date]
  );

      res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }
};

exports.getHolidays = async (req, res) => {

const today =
getISTDateString();

  try {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM holidays
    WHERE date >= ?
    ORDER BY date ASC
    LIMIT 3
    `,
    [today]
  );

      res.json(rows);
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }
};

exports.getWorkingDays = async (req, res) => {

  try {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM working_days
    ORDER BY date ASC
    `
  );

      res.json(rows);

  } catch(err) {
        return res.status(500).json({
          message: "DB error"
        });
  }

};


exports.getTokensByDate = async (req, res) => {

  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      message: "Date required"
    });
  }

  try {
  const [tokenRows] = await db.execute(
    `
SELECT
 *,
 service_other AS reference_of,
 'normal' AS source_type
FROM tokens
WHERE date = ?
    `,
    [date]
  );

      const [physicalRows] = await db.execute(
        `
        SELECT
          id,
          token,
          DATE(created_at) AS date,
          name,
          mobile,
          aadhaar_last4,
          eid,
          gender,
          age,
          state,
          district,
          service_type,
          token_type,
          reference_of,

          created_at,

          created_at AS entry_time,
          created_at AS visited_at,

          'physical_reference' AS source_type

        FROM physical_reference_entries

        WHERE DATE(created_at) = ?
        `,
        [date]
      );

          const merged = [
            ...tokenRows,
            ...physicalRows
          ];

          res.json(merged);

  } catch(err) {
      return res.status(500).json({
        message: "DB error"
      });
  }

};

exports.managerLogin = async (req, res) => {

    const { username, password } = req.body;

    try {
    const [rows] = await db.execute(

        `
        SELECT *
        FROM users
        WHERE username = ?
        AND role = 'MANAGER'
        `,

        [username]
    );

    const user = rows[0];

            if (!user) {

                return res.status(401).json({
                    message: "Invalid credentials"
                });

            }

            const ok =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!ok) {

                return res.status(401).json({
                    message: "Invalid credentials"
                });

            }

            res.json({

                success: true,

                token: user.session_name,

                page: user.page

            });

    } catch(err) {
        return res.status(500).json({
            message: "DB error"
        });
    }

};

exports.getCalendarOverview = async (req, res) => {

  const today = new Date();

  try {

  const [ruleRows] = await db.execute(

    `
    SELECT rule_key,
       rule_value
FROM priority_rules
WHERE rule_key IN
(
'manager_previous_days',
'manager_future_days'
)`

  );

const settings = {};

ruleRows.forEach(r => {

    settings[r.rule_key] =
        Number(r.rule_value);

});

const previousDays =
    settings.manager_previous_days || 2;

const futureDays =
    settings.manager_future_days || 12;

  const [holidayRows] = await db.execute(
    `SELECT date FROM holidays`
  );

      const holidays =
        holidayRows.map(h => h.date);

      const start =
        getPreviousWorkingDate(
          today,
          previousDays,
          holidays
        );

const end = new Date(today);

end.setDate(
    end.getDate() + 120
);

      const startDate =
        start.toISOString().split("T")[0];

      const endDate =
        end.toISOString().split("T")[0];

const [rows] = await db.execute(
`
SELECT
    ds.date,
    ds.appointment_booked,
    ds.appointment_total,
    ds.walkin_booked,
    ds.walkin_total,
    dtc.tokens_per_hour AS tokens_per_hour

FROM daily_slots ds

LEFT JOIN daily_token_counters dtc
ON ds.date = dtc.date

LEFT JOIN holidays h
ON ds.date = h.date

WHERE ds.date BETWEEN ? AND ?

AND h.date IS NULL

AND DAYOFWEEK(ds.date)
NOT IN (1,7)

UNION

SELECT
    wd.date,
    0 AS appointment_booked,
    0 AS appointment_total,
    0 AS walkin_booked,
    0 AS walkin_total,
    NULL AS tokens_per_hour

FROM working_days wd

WHERE wd.date BETWEEN ? AND ?

AND (
    DAYOFWEEK(wd.date) IN (1,7)
    OR EXISTS (
        SELECT 1
        FROM holidays h2
        WHERE h2.date = wd.date
    )
)

ORDER BY date ASC
`,
[
 startDate,
 endDate,
 startDate,
 endDate
]
);

const calendarRows =
await Promise.all(
  rows.map(async r => {

    const weekdayTokens =
      await getDefaultTokensPerHour(r.date);

    return {
      ...r,

      tokens_per_hour:
        r.tokens_per_hour ??
        weekdayTokens
    };

  })
);

res.json(
  calendarRows.slice(
    0,
    previousDays + futureDays + 1
  )
);

  } catch(err) {
    return res.status(500).json({
      message: "DB error"
    });
  }
};

exports.updateTokensPerHour = async (req, res) => {
  const { date, tokens_per_hour } = req.body;

  if (!date || !tokens_per_hour) {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
  await db.execute(
    `
    INSERT INTO daily_token_counters (date, tokens_per_hour)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE tokens_per_hour = VALUES(tokens_per_hour)
    `,
    [date, tokens_per_hour]
  );

      res.json({ success: true });
  } catch(err) {
    return res.status(500).json({ message: "DB error" });
  }
};

exports.updateSlots = (req, res) => withSlotMutationLock(async () => {
  const { date, appointment_total, walkin_total } = req.body;

  if (!date) {
    res.status(400).json({ message: "Date required" });
    return;
  }

  const appointmentTotal = Number(appointment_total);
  const walkinTotal = Number(walkin_total);

  if (
    !Number.isInteger(appointmentTotal) ||
    appointmentTotal < 0 ||
    !Number.isInteger(walkinTotal) ||
    walkinTotal < 0
  ) {
    res.status(400).json({ message: "Slot totals must be non-negative integers" });
    return;
  }

  try {
  const [result] = await db.execute(
    `
    UPDATE daily_slots
    SET appointment_total = ?,
        walkin_total = ?,
        carry_forward_done = 0
    WHERE date = ?
          AND appointment_booked <= ?
      AND walkin_booked <= ?
      AND (
        SELECT COUNT(*)
        FROM tokens
        WHERE date = ?
          AND mode = 'A'
      ) <= ?
      AND (
        SELECT COUNT(*)
        FROM tokens
        WHERE date = ?
          AND mode = 'W'
      ) <= ?
    `,
        [
      appointmentTotal,
      walkinTotal,
      date,
      appointmentTotal,
      walkinTotal,
      date,
      appointmentTotal,
      date,
      walkinTotal
    ]
  );

      if (result.affectedRows === 0) {
        res.status(409).json({
          message: "Slot totals cannot be lower than existing bookings"
        });
        return;
      }

      res.json({ success: true });
  } catch(err) {
    res.status(500).json({ message: "DB error" });
  }
});
function formatHour(h) {
  const hour = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour} ${ampm}`;
}

exports.getDateDashboard = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }
  const summaryQuery = `
    SELECT
      mode,
      COUNT(*) AS total,
      SUM(CASE WHEN entry_marked = 1 THEN 1 ELSE 0 END) AS visited,
      SUM(CASE WHEN entry_marked = 0 THEN 1 ELSE 0 END) AS not_visited
    FROM tokens
    WHERE date = ?
    GROUP BY mode
  `;

const genderQuery = `

SELECT
  gender,

  SUM(total) AS total,
  SUM(visited) AS visited,
  SUM(not_visited) AS not_visited

FROM (

  SELECT
    gender,
    COUNT(*) AS total,

    SUM(
      CASE WHEN entry_marked = 1
      THEN 1 ELSE 0 END
    ) AS visited,

    SUM(
      CASE WHEN entry_marked = 0
      THEN 1 ELSE 0 END
    ) AS not_visited

  FROM tokens

  WHERE date = ?

  GROUP BY gender

  UNION ALL

  SELECT
    gender,
    COUNT(*) AS total,

    COUNT(*) AS visited,

    0 AS not_visited

  FROM physical_reference_entries

  WHERE DATE(created_at) = ?

  GROUP BY gender

) t

GROUP BY gender
ORDER BY gender

`;

const ageQuery = `

SELECT

  SUM(CASE WHEN age BETWEEN 0 AND 5 THEN 1 ELSE 0 END) AS age_0_5,
  SUM(CASE WHEN age BETWEEN 0 AND 5 AND visited = 1 THEN 1 ELSE 0 END) AS age_0_5_visited,
  SUM(CASE WHEN age BETWEEN 0 AND 5 AND visited = 0 THEN 1 ELSE 0 END) AS age_0_5_not,

  SUM(CASE WHEN age BETWEEN 6 AND 15 THEN 1 ELSE 0 END) AS age_6_15,
  SUM(CASE WHEN age BETWEEN 6 AND 15 AND visited = 1 THEN 1 ELSE 0 END) AS age_6_15_visited,
  SUM(CASE WHEN age BETWEEN 6 AND 15 AND visited = 0 THEN 1 ELSE 0 END) AS age_6_15_not,

  SUM(CASE WHEN age BETWEEN 16 AND 23 THEN 1 ELSE 0 END) AS age_16_23,
  SUM(CASE WHEN age BETWEEN 16 AND 23 AND visited = 1 THEN 1 ELSE 0 END) AS age_16_23_visited,
  SUM(CASE WHEN age BETWEEN 16 AND 23 AND visited = 0 THEN 1 ELSE 0 END) AS age_16_23_not,

  SUM(CASE WHEN age >= 24 THEN 1 ELSE 0 END) AS age_24_plus,
  SUM(CASE WHEN age >= 24 AND visited = 1 THEN 1 ELSE 0 END) AS age_24_plus_visited,
  SUM(CASE WHEN age >= 24 AND visited = 0 THEN 1 ELSE 0 END) AS age_24_plus_not

FROM (

  SELECT
    age,
    entry_marked AS visited
  FROM tokens
  WHERE date = ?

  UNION ALL

  SELECT
    age,
    1 AS visited
  FROM physical_reference_entries
  WHERE DATE(created_at) = ?

) t

`;

const serviceQuery = `

SELECT
  service_type,

  SUM(total) AS total,
  SUM(visited) AS visited,
  SUM(not_visited) AS not_visited

FROM (

  SELECT

    TRIM(
      SUBSTRING_INDEX(service_type, '/', 1)
    ) AS service_type,

    COUNT(*) AS total,

    SUM(
      CASE WHEN entry_marked = 1
      THEN 1 ELSE 0 END
    ) AS visited,

    SUM(
      CASE WHEN entry_marked = 0
      THEN 1 ELSE 0 END
    ) AS not_visited

  FROM tokens

  WHERE date = ?

  GROUP BY service_type

  UNION ALL

  SELECT

    service_type,

    COUNT(*) AS total,

    COUNT(*) AS visited,

    0 AS not_visited

  FROM physical_reference_entries

  WHERE DATE(created_at) = ?

  GROUP BY service_type

) t

GROUP BY service_type
ORDER BY service_type

`;

  
  
  const districtQuery = `
    SELECT
  state,
  COUNT(*) AS total
FROM tokens
WHERE date = ?
AND entry_marked = 1
GROUP BY state
ORDER BY total DESC

  `;

const tokenTypeQuery = `

SELECT
  token_type,

  SUM(total) AS total,
  SUM(visited) AS visited,
  SUM(not_visited) AS not_visited

FROM (

  SELECT
    token_type,
    COUNT(*) AS total,

    SUM(
      CASE WHEN entry_marked = 1
      THEN 1 ELSE 0 END
    ) AS visited,

    SUM(
      CASE WHEN entry_marked = 0
      THEN 1 ELSE 0 END
    ) AS not_visited

  FROM tokens

  WHERE date = ?

  GROUP BY token_type

  UNION ALL

  SELECT
      CASE
  WHEN token_type = 'Reference'
    THEN 'RT'

  WHEN token_type = 'Physical Token'
    THEN 'PT'

  WHEN token_type = 'Specially Abled'
    THEN 'PwD'

  ELSE token_type
END AS token_type,
    COUNT(*) AS total,

    COUNT(*) AS visited,

    0 AS not_visited

  FROM physical_reference_entries

  WHERE DATE(created_at) = ?

  GROUP BY token_type

) t

GROUP BY token_type

ORDER BY token_type

`;

  try {

  const [summaryRows] = await db.execute(summaryQuery, [date]);
  const [genderRows] = await db.execute(genderQuery, [date, date]);
  const [ageRows] = await db.execute(ageQuery, [date, date]);
  const ageRow = ageRows[0];
  const [serviceRows] = await db.execute(serviceQuery, [date, date]);
  const [districtRows] = await db.execute(districtQuery, [date]);
  const [tokenTypeRows] = await db.execute(tokenTypeQuery, [date, date]);
  const [tphRows] = await db.execute(
    `SELECT tokens_per_hour FROM daily_token_counters WHERE date = ?`,
    [date]
  );
  const tphRow = tphRows[0];

                    const defaultTokensPerHour =
  await getDefaultTokensPerHour(date);

const tokensPerHour =
  tphRow?.tokens_per_hour ??
  defaultTokensPerHour;
         
                  const cleanedServices = serviceRows.map(row => {
  const english = row.service_type
    ? row.service_type.split("/")[0].trim()
    : "";

  return {
    service_type: english,
    total: Number(row.total) || 0,
    visited: Number(row.visited) || 0,
    not_visited: Number(row.not_visited) || 0
  };
});

          const [visitedRows] = await db.execute(
`
SELECT
    entry_time AS visited_at
FROM tokens
WHERE date = ?
AND entry_marked = 1
AND entry_time IS NOT NULL

UNION ALL

SELECT
    created_at AS visited_at
FROM physical_reference_entries
WHERE DATE(created_at)=?
`,
[date, date]
);

    const brackets = {
      before_12: { label: "9 AM to 12 PM", visited: 0 },
      between_12_3: { label: "12 PM to 3 PM", visited: 0 },
      after_3: { label: "3 PM to 6 PM", visited: 0 }
    };

    visitedRows.forEach(row => {

const va = row.visited_at;
let h;
if (va instanceof Date) {
  h = va.getHours();
} else {
  h = Number(
    String(va).split(" ")[1]?.split(":")[0] || String(va).split("T")[1]?.split(":")[0] || 0
  );
}

      if (h < 12) {
        brackets.before_12.visited++;
      } else if (h >= 12 && h < 15) {
        brackets.between_12_3.visited++;
      } else {
        brackets.after_3.visited++;
      }
    });

const bracketArray = Object.values(brackets);

const normalizedSummary = summaryRows.map(row => ({
  ...row,
  total: Number(row.total) || 0,
  visited: Number(row.visited) || 0,
  not_visited: Number(row.not_visited) || 0
}));

const normalizedGender = genderRows.map(row => ({
  ...row,
  total: Number(row.total) || 0,
  visited: Number(row.visited) || 0,
  not_visited: Number(row.not_visited) || 0
}));

const normalizedAge = ageRow
  ? Object.fromEntries(
      Object.entries(ageRow).map(([key, value]) => [
        key,
        Number(value) || 0
      ])
    )
  : {};

const normalizedDistricts = districtRows.map(row => ({
  ...row,
  total: Number(row.total) || 0
}));

const normalizedTokenTypes = tokenTypeRows.map(row => ({
  ...row,
  total: Number(row.total) || 0,
  visited: Number(row.visited) || 0,
  not_visited: Number(row.not_visited) || 0
}));

res.json({
  summary: normalizedSummary,
  gender: normalizedGender,
  age: normalizedAge,
  services: cleanedServices,
  districts: normalizedDistricts,
  tokenTypes: normalizedTokenTypes,
  tokensPerHour: Number(tokensPerHour) || 0,
  hourlyStats: bracketArray
});

  } catch(err) {
    console.error("[getDateDashboard] Error:", err.message);
    return res.status(500).json({ message: "DB error" });
  }
};

exports.resetPassword = async (req, res) => {

    const {

        username,

        recoveryCode,

        newPassword

    } = req.body;

    if (
        !username ||
        !recoveryCode ||
        !newPassword
    ) {

        return res.status(400).json({

            message:
                "All fields are required."

        });

    }

    try {

    const [rows] = await db.execute(

        `
        SELECT
            id,
            recovery_code
        FROM users
        WHERE username = ?
        `,

        [username]
    );

    const user = rows[0];

            if (!user) {

                return res.status(404).json({

                    message:
                        "Username not found."

                });

            }

            if (
                user.recovery_code !==
                recoveryCode
            ) {

                return res.status(401).json({

                    message:
                        "Invalid Recovery Code."

                });

            }

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            await db.execute(

                `
                UPDATE users
                SET password = ?
                WHERE id = ?
                `,

                [

                    hashedPassword,

                    user.id

                ]

            );

                    res.json({

                        success: true,

                        message:
                            "Password changed successfully."

                    });

    } catch(err) {

                        return res.status(500).json({

                            message:
                                "Password update failed."

                        });

    }

};
exports.getFormSettings = async (req,res)=>{

try {
const [rows] = await db.execute(
`
SELECT *
FROM form_settings
ORDER BY display_order
`
);

res.json(rows);

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};

exports.updateFormSetting = async (req,res)=>{

const field_key = req.params.fieldKey;

const {
    enabled,
    mandatory
}=req.body;

try {
await db.execute(
`
UPDATE form_settings
SET enabled=?,
mandatory=?
WHERE field_key=?
`,
[
enabled,
mandatory,
field_key
]
);

res.json({
success:true
});

} catch(err) {
return res.status(500).json({
message:"DB error"
});
}

};


exports.addServiceType = async (req, res) => {

    const {
        english_name,
        hindi_name
    } = req.body;

    if (!english_name || !hindi_name) {

        return res.status(400).json({
            message: "English and Hindi service names are required"
        });

    }

    try {

        const [insertResult] = await db.execute(
            `
            INSERT INTO service_types
            (
                english_name,
                hindi_name,
                requires_identity,
                active
            )
            VALUES (?, ?, 0, 1)
            `,
            [
                english_name.trim(),
                hindi_name.trim()
            ]
        );

                const serviceId = insertResult.insertId;

                const [fields] = await db.execute(
                    `
                    SELECT
                        field_key
                    FROM form_settings
                    ORDER BY display_order
                    `
                );

                        for (const field of fields) {

                            await db.execute(
                                `
                                INSERT INTO service_form_settings
                                (
                                    service_type_id,
                                    field_key,
                                    enabled,
                                    mandatory
                                )
                                VALUES (?, ?, 1, 1)
                                `,
                                [
                                    serviceId,
                                    field.field_key
                                ]
                            );

                        }

                            res.json({
                                success: true,
                                service_id: serviceId
                            });

    } catch(err) {

                    console.log(
                        "SERVICE TYPE INSERT ERROR:",
                        err.message
                    );

                    return res.status(500).json({
                        message: "Insert failed"
                    });

    }

};
exports.updateServiceFormSettings = async (req,res)=>{


const {
service_type_id,
fields
}=req.body;

try {

for (const f of fields) {

await db.execute(

`

UPDATE service_form_settings

SET

enabled=?,

mandatory=?

WHERE service_type_id=?

AND field_key=?

`,
[
f.enabled,
f.mandatory,
service_type_id,
f.field_key
]

);

}


res.json({

success:true

});

} catch(err) {
  return res.status(500).json({ message: "DB error" });
}


};

exports.deleteServiceType=async (req,res)=>{

const id=req.params.id;

try {
await db.execute(
`
DELETE FROM service_types
WHERE id=?
`,
[id]
);

res.json({
success:true
});

} catch(err) {
return res.status(500).json({
message:"Delete failed"
});
}

};

