var express = require('express');
var router = express.Router();
const oracledb = require('oracledb')
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}

/////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 2: Community Transmission
/////////////////////////////////////////////////////////////////////////////////

async function community (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `
    WITH Filtered(id, record_date, daily_positive_cases, daily_deaths, county_id) AS
    (
        SELECT
            id,
            record_date,
            daily_positive_cases,
            daily_deaths,
            county_id
        FROM "N.SAOJI".County_covid_data
        WHERE
             county_id IN
            (
                SELECT id FROM "N.SAOJI".County
                WHERE state_id IN (${id})
            )
    )
    SELECT
        record_date,
        state_id,
        COUNT(county_id) AS num_of_high_risk_counties
    FROM
    (
        SELECT
            rs.record_date,
            rs.county_id,
            c.state_id,
            ROUND(((rs.sum_daily_positive_cases * c.population) / 100000), 2) AS transmission_risk
        FROM
        (
            SELECT
                f1.record_date,
                f1.daily_positive_cases,
                (
                    SELECT SUM(daily_positive_cases)
                    FROM Filtered f2
                    WHERE
                        f2.county_id = f1.county_id AND
                        (f2.record_date BETWEEN f1.record_date - 6 AND f1.record_date)
                ) AS sum_daily_positive_cases,
                f1.county_id
            FROM Filtered f1
        ) rs
        INNER JOIN "N.SAOJI".County c
        ON rs.county_id = c.id
    )
    WHERE
        transmission_risk >= 100 AND
        (record_date BETWEEN '${fromDate}' AND \'${toDate}')
    GROUP BY record_date, state_id
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

async function communitySummary (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `SELECT ftpc AS "Total Positive Cases", (ftpc/ftp)*1000000 AS "Percentage of Positive Cases per million people", ftd AS "Total Deaths", (ftd/ftp)*1000000 AS "Percentage of deaths per million people"
    FROM 
    (
        SELECT SUM(ts) AS ftpc, SUM(td) AS ftd, SUM(tp) AS ftp FROM 
        (
            SELECT s.ID, SUM(ccd.DAILY_POSITIVE_CASES) AS ts, SUM(ccd.DAILY_DEATHS) AS td, SUM(c.POPULATION) AS tp
            FROM "N.SAOJI".COUNTY_COVID_DATA ccd, "N.SAOJI".COUNTY c, "N.SAOJI".STATE s 
            WHERE ccd.COUNTY_ID = c.ID AND c.STATE_ID = s.ID 
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

router.post('/community-trend', function (req, res) {
  console.log("[INFO] POST /api/community-trend route...");
  community(req, res);
})

router.post('/community-summary', function (req, res) {
  console.log("[INFO] POST /api/community-summary route...");
  communitySummary(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
