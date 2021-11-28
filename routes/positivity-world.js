var express = require('express');
var router = express.Router();
const oracledb = require('oracledb')
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  World positivity trend
////////////////////////////////////////////////////////////////////////////////

async function worldPositivityTrend (req, res) {
  let connection, result;
  try {
    // Parse user input
    let id = req.body.id;
    // Construct SQL statement
    let sql = `
    WITH Filtered(record_date, daily_tests, daily_positive_cases, country_id) AS
(
    SELECT
        record_date,
        daily_tests,
        daily_positive_cases,
        country_id
    FROM Country_covid_data
    WHERE
        (daily_tests IS NOT NULL) AND
        (daily_positive_cases IS NOT NULL) AND
        (daily_tests > daily_positive_cases) AND
        (country_id IN (${id}))
)
SELECT
   f.record_date,
   f.daily_tests,
   f.daily_positive_cases,
   ROUND(((f.daily_positive_cases / f.daily_tests) * 100), 2) AS positivity_rate,
   c.id AS country_id,
   c.name
FROM Filtered f
INNER JOIN Country c
ON f.country_id = c.id;`
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

router.post('/world-positivity-trend', function (req, res) {
  console.log("[INFO] POST /api/positivity-world/world-positivity-trend route...");
  worldPositivityTrend(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
