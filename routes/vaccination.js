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
        ((t1.cumulative_first_doses / t2.state_population) * 100) AS cumulative_first_doses_percentage,
        t1.cumulative_fully_vaccinated,
        ((t1.cumulative_fully_vaccinated / t2.state_population) * 100) AS cumulative_fully_vaccinated_percentage,
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

router.post('/us-vaccination-trend', function (req, res) {
  console.log("[INFO] POST /api/vaccination/us-vaccination-trend route...");
  usVaccinationTrend(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
