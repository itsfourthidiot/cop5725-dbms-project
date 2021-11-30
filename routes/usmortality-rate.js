var express = require('express');
var router = express.Router();
const oracledb = require('oracledb')
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  US mortality trend
////////////////////////////////////////////////////////////////////////////////

async function usMortalityTrend (req, res) {
  let connection, result;
  try {
    // Parse user input
    let id = req.body.id;
    // Construct SQL statement
    let sql =  `
    WITH Filtered(record_date, state_daily_positive_cases, state_daily_deaths, state_id) AS
(
    SELECT
        f1.record_date,
        SUM(f1.daily_positive_cases) AS state_daily_positive_cases,
        SUM(f1.daily_deaths) AS state_daily_deaths,
        f2.state_id AS state_id
    FROM
    (
        SELECT
            record_date,
            daily_positive_cases,
            daily_deaths,
            county_id
        FROM County_covid_data
        WHERE
             county_id IN
            (
                SELECT id FROM County
                WHERE state_id IN (${id})
            )
    ) f1 INNER JOIN County f2
    ON f1.county_id = f2.id
    GROUP BY f1.record_date, f2.state_id
)
SELECT
    record_date,
    state_cumulative_positive_cases,
    state_cumulative_deaths,
    CASE
        WHEN state_cumulative_positive_cases=0 THEN 0
        ELSE ROUND((state_cumulative_deaths / state_cumulative_positive_cases) * 100, 2)
    END AS death_rate,
    state_id
FROM
(
    SELECT
        record_date,
        state_daily_positive_cases,
        NVL(SUM (state_daily_positive_cases) OVER (PARTITION BY state_id ORDER BY record_date), 0) AS state_cumulative_positive_cases,
        state_daily_deaths,
        NVL(SUM (state_daily_deaths) OVER (PARTITION BY state_id ORDER BY record_date), 0) AS state_cumulative_deaths,
        state_id
    FROM Filtered
)
ORDER BY state_id, record_date;`

    // Creat db connection
    connection = await oracledb.getConnection(config);
    result = await connection.execute(sql, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
  } catch (err) {
    // Display error message
    console.log('[Error] ', err);
    return res.json(err)
  } finally {
    // Display results
    if(connection) {
      await connection.close();
      return res.json(result.rows);
    }
  }
};

async function usMortalitySummary (req, res) {
  let connection, result;
  try {
    // Parse user input
    let id = req.body.id;
    // Construct SQL statement
    let sql =  `SELECT ftd AS "Total Deaths", (ftd/ftp)*1000000 AS "Percentage of deaths per million people"
    FROM 
    (
        SELECT SUM(ts) AS ftpc, SUM(td) AS ftd, SUM(tp) AS ftp FROM 
        (
            SELECT s.ID, SUM(ccd.DAILY_POSITIVE_CASES) AS ts, SUM(ccd.DAILY_DEATHS) AS td, SUM(c.POPULATION) AS tp
            FROM "N.SAOJI".COUNTY_COVID_DATA ccd, "N.SAOJI".COUNTY c, "N.SAOJI".STATE s 
            WHERE ccd.COUNTY_ID = c.ID AND c.STATE_ID = s.ID 
            GROUP BY s.ID
        )
    )`

    // Creat db connection
    connection = await oracledb.getConnection(config);
    result = await connection.execute(sql, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
  } catch (err) {
    // Display error message
    console.log('[Error] ', err);
    return res.json(err)
  } finally {
    // Display results
    if(connection) {
      await connection.close();
      return res.json(result.rows);
    }
  }
};

router.post('/us-mortality-trend', function (req, res) {
  console.log("[INFO] POST /api/mortality/us-mortality-trend route...");
  usMortalityTrend(req, res);
})

router.post('/us-mortality-summary', function (req, res) {
  console.log("[INFO] POST /api/mortality/us-mortality-summary route...");
  usMortalitySummary(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
