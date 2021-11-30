var express = require('express');
var router = express.Router();
const oracledb = require('oracledb')
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  US vaccination trend
////////////////////////////////////////////////////////////////////////////////

async function worldVaccinationTrend (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `
    WITH Filtered(record_date, daily_vaccinations, country_id) AS
    (
        SELECT
            record_date,
            daily_vaccinations,
            country_id
        FROM "N.SAOJI".Country_covid_data
        WHERE country_id IN (${id})
    )
    SELECT
        record_date,
        cumulative_vaccinations,
        ((cumulative_vaccinations / population) * 100) AS cumulative_vaccinations_percentage,
        population,
        c.id AS country_id,
        c.name AS country_name
    FROM
    (
        SELECT
            record_date,
            daily_vaccinations,
            NVL(SUM(daily_vaccinations) OVER(PARTITION BY country_id ORDER BY record_date), 0) AS cumulative_vaccinations,
            country_id
        FROM Filtered
    ) t1 INNER JOIN "N.SAOJI".Country c
    ON t1.country_id = c.id
    WHERE record_date BETWEEN \'${fromDate}' AND \'${toDate}'
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

async function worldVaccinationSummary (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `SELECT ftv AS "Total Vaccinations", (ftv/ftp)*1000 AS "Percentage of Vaccinations per thousand people"
    FROM 
    (
        SELECT SUM(tv) AS ftv, SUM(tp) AS ftp FROM 
        (
            SELECT c2.ID, SUM(ccd.DAILY_VACCINATIONS) AS tv, SUM(c2.POPULATION) AS tp
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

router.post('/world-vaccination-trend', function (req, res) {
  console.log("[INFO] POST /api/vaccination-world/world-vaccination-trend route...");
  worldVaccinationTrend(req, res);
})

router.post('/world-vaccination-summary', function (req, res) {
  console.log("[INFO] POST /api/vaccination-world/world-vaccination-summary route...");
  worldVaccinationSummary(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
