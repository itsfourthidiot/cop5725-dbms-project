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

async function usVaccinationTrend (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `
    WITH Filtered(record_date, daily_first_doses, daily_fully_vaccinated, state_id) AS
    (
        SELECT
            record_date,
            daily_first_doses,
            daily_fully_vaccinated,
            state_id
        FROM "N.SAOJI".Vaccination_data
        WHERE state_id IN (${id})
    )
    SELECT
        TO_CHAR(t1.record_date, 'YYYY-MM-DD') AS record_date,
        t1.cumulative_first_doses,
        ROUND(((t1.cumulative_first_doses / t2.state_population) * 100), 2) AS cumulative_first_doses_percentage,
        t1.cumulative_fully_vaccinated,
        ROUND(((t1.cumulative_fully_vaccinated / t2.state_population) * 100), 2) AS cumulative_fully_vaccinated_percentage,
        t2.state_id,
        t2.state_name
    FROM
    (
        SELECT
            record_date,
            daily_first_doses,
            SUM (daily_first_doses) OVER (PARTITION BY state_id ORDER BY record_date) AS cumulative_first_doses,
            daily_fully_vaccinated,
            SUM (daily_fully_vaccinated) OVER (PARTITION BY state_id ORDER BY record_date) AS cumulative_fully_vaccinated,
            state_id
        FROM Filtered
    ) t1 INNER JOIN
    (
        SELECT
            s.id AS state_id,
            s.name AS state_name,
            SUM(c.population) AS state_population
        FROM "N.SAOJI".County c
        INNER JOIN "N.SAOJI".State s
        ON c.state_id = s.id
        GROUP BY s.id, s.name
    ) t2
    ON t1.state_id = t2.state_id
    WHERE (record_date BETWEEN \'${fromDate}' AND \'${toDate}')
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

async function usVaccinationSummary (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `SELECT fdfd AS "Total First Doses", (fdfd/ftp)*1000 AS "Percentage of first dose Vaccinations per thousand",
    fdfc AS "Total fully vaccinated", (fdfc/ftp)*1000 AS "Percentage of complete Vaccinations per thousand",
    f12 AS "12+ group Vaccinations", (f12/ftp)*1000 AS "Percentage of 12+ age group Vaccinations per thousand",
    f18 AS "18+ group Vaccinations", (f18/ftp)*1000 AS "Percentage of 18+ age group Vaccinations per thousand",
    f65 AS "65+ group Vaccinations", (f65/ftp)*1000 AS "Percentage of 65+ age group Vaccinations per thousand" 
    FROM 
    (
        SELECT SUM(dfd) AS fdfd, SUM(dfc) AS fdfc, SUM(dfc12) AS f12, SUM(dfc18) AS f18, SUM(dfc65) AS f65, SUM(tp) AS ftp FROM 
        (
            SELECT s.ID, SUM(vd.DAILY_FIRST_DOSES) AS dfd, SUM(vd.DAILY_FULLY_VACCINATED) AS dfc, SUM(vd.DAILY_FULLY_VACCINATED_12PLUS) AS dfc12, 
            SUM(vd.DAILY_FULLY_VACCINATED_18PLUS) AS dfc18, SUM(vd.DAILY_FULLY_VACCINATED_65PLUS) AS dfc65, SUM(c.POPULATION) AS tp
            FROM "N.SAOJI".STATE s , "N.SAOJI".VACCINATION_DATA vd, "N.SAOJI".COUNTY c 
            WHERE s.ID = vd.STATE_ID AND s.ID = c.STATE_ID 
            GROUP BY s.ID
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

router.post('/us-vaccination-trend', function (req, res) {
  console.log("[INFO] POST /api/vaccination/us-vaccination-trend route...");
  usVaccinationTrend(req, res);
})

router.post('/us-vaccination-summary', function (req, res) {
  console.log("[INFO] POST /api/vaccination/us-vaccination-summary route...");
  usVaccinationSummary(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
