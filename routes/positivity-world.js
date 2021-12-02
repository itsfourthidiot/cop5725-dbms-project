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
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `
    WITH Filtered(record_date, daily_tests, daily_positive_cases, country_id) AS
    (
      SELECT
          ccd.RECORD_DATE AS record_date,
          ccd.DAILY_TESTS AS daily_tests,
          ccd.DAILY_POSITIVE_CASES AS daily_positive_cases,
          ccd.COUNTRY_ID AS country_id
      FROM "N.SAOJI".COUNTRY_COVID_DATA ccd
      WHERE
          (ccd.DAILY_TESTS IS NOT NULL) AND
          (ccd.DAILY_POSITIVE_CASES IS NOT NULL) AND
          (ccd.DAILY_TESTS > ccd.DAILY_POSITIVE_CASES) AND
          (ccd.COUNTRY_ID IN (${id}))
    )
    SELECT
      f.record_date,
      f.daily_tests,
      f.daily_positive_cases,
      ROUND(((f.daily_positive_cases / f.daily_tests) * 100), 2) AS positivity_rate,
      c.id AS country_id,
      c.name AS country_name
    FROM Filtered f
    INNER JOIN "N.SAOJI".COUNTRY c 
    ON f.country_id = c.id
    WHERE (record_date BETWEEN \'${fromDate}' AND \'${toDate}')
    ORDER BY record_date
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

async function worldPositivitySummary (req, res) {
  let connection, result;
  try {
    // Parse user input
    let id = req.body.id;
    // Construct SQL statement
    let sql = `SELECT ftpc AS "Total Positive Cases", (ftpc/ftp)*1000000 AS "Percentage of Positive Cases per million people"
    FROM 
    (
        SELECT SUM(ts) AS ftpc, SUM(td) AS ftd, SUM(tp) AS ftp FROM 
        (
            SELECT c2.ID, SUM(ccd.DAILY_POSITIVE_CASES) AS ts, SUM(ccd.DAILY_DEATHS) AS td, SUM(c2.POPULATION) AS tp
            FROM "N.SAOJI".COUNTRY c2 , "N.SAOJI".COUNTRY_COVID_DATA ccd 
            WHERE c2.ID = ccd.COUNTRY_ID 
            GROUP BY c2.ID
        )
    )
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

router.post('/world-positivity-trend', function (req, res) {
  console.log("[INFO] POST /api/positivity-world/world-positivity-trend route...");
  worldPositivityTrend(req, res);
})

router.post('/world-positivity-summary', function (req, res) {
  console.log("[INFO] POST /api/positivity-world/world-positivity-summary route...");
  worldPositivitySummary(req, res);
})

module.exports = router;
