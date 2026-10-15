const db = require("../models/db");

function pad(num) {
  return num.toString().padStart(3, "0");
}

function getPriorityFlag(age, gender, divyang) {
  if (divyang === "Yes") return "P";

  if (age >= 60) return "P";

  if (gender === "Female" && age >= 50) return "P";

  return "N";
}

async function generateDailyToken(
  name,
  mobile,
  aadhaar_last4,
  date,
  age,
  gender,
  divyang,
  mode,
  tokenType,
  connection = db
) {
  const priority = getPriorityFlag(age, gender, divyang);

  const dayOfWeek = new Date(date).getDay();
  const [ruleRows] = await connection.execute(
    `SELECT tokens_per_hour FROM weekday_slot_rules WHERE weekday = ?`,
    [dayOfWeek]
  );

  const defaultTokensPerHour = ruleRows[0]?.tokens_per_hour ?? 30;

  await connection.execute(
    `
    INSERT IGNORE INTO daily_token_counters
    (
      date,
      last_token,
      tokens_per_hour
    )
    VALUES
    (
      ?,
      0,
      ?
    )
    `,
    [
      date,
      defaultTokensPerHour
    ]
  );


  const [updateResult] = await connection.execute(
    `
    UPDATE daily_token_counters
    SET last_token = LAST_INSERT_ID(last_token + 1)
    WHERE date = ?
    `,
    [date]
  );

  if (updateResult.affectedRows !== 1) {
    throw new Error("Failed to generate daily token sequence");
  }

  const [seqRows] = await connection.execute(
    `SELECT LAST_INSERT_ID() AS last_token`
  );

  const seq = Number(seqRows[0].last_token);

  const map = {
    AP: "ap_count",
    AN: "an_count",
    WP: "wp_count",
    WN: "wn_count",
    WL: "wn_count",
    AL: "al_count"
  };

  const col = map[tokenType];

  if (col) {
    await connection.execute(
      `
      UPDATE daily_token_counters
      SET ${col} = ${col} + 1
      WHERE date = ?
      `,
      [date]
    );
  }

  const padded = pad(seq);

  return {
    token: `${padded}-${tokenType}-${aadhaar_last4}`,
    token_seq: seq,
    priority
  };
}

module.exports = {
  generateDailyToken
};