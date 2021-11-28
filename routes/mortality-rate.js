var express = require('express');
var router = express.Router();
const oracledb = require('oracledb')
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  World mortality rate
////////////////////////////////////////////////////////////////////////////////

async function worldMortalityRate (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `
    WITH Filtered(record_date, country_daily_positive_cases, country_daily_deaths, country_id) AS
    (
        SELECT
            record_date,
            daily_positive_cases AS country_daily_positive_cases,
            daily_deaths AS country_daily_deaths,
            country_id
        FROM "N.SAOJI".Country_covid_data
        WHERE country_id IN (${id})
    )
    SELECT
        record_date,
        country_cumulative_positive_cases,
        country_cumulative_deaths,
        CASE
            WHEN country_cumulative_positive_cases=0 THEN 0
            ELSE ROUND((country_cumulative_deaths / country_cumulative_positive_cases) * 100, 2)
        END AS death_rate,
        country_id
    FROM
    (
        SELECT
            record_date,
            country_daily_positive_cases,
            NVL(SUM (country_daily_positive_cases) OVER (PARTITION BY country_id ORDER BY record_date), 0) AS country_cumulative_positive_cases,
            country_daily_deaths,
            NVL(SUM (country_daily_deaths) OVER (PARTITION BY country_id ORDER BY record_date), 0) AS country_cumulative_deaths,
            country_id
        FROM Filtered
    )
    WHERE record_date BETWEEN \'${fromDate}' AND \'${toDate}'
    ORDER BY country_id, record_date
    `
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

router.post('/world-mortality-rate-trend', function (req, res) {
  console.log("[INFO] POST /api/mortality-rate/world-mortality-rate-trend route...");
  worldMortalityRate(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
