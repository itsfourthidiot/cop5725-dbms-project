var express = require('express');
var router = express.Router();
const oracledb = require('oracledb')
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}

////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// Query 1:  US Hospitalization trend
////////////////////////////////////////////////////////////////////////////////

async function usHospitalizationTrend (req, res) {
  let connection, result;
  try {
    // Parse user input
    let fromDate = req.body.fromDate;
    let toDate = req.body.toDate;
    let id = req.body.id;
    // Construct SQL statement
    let sql = `
    SELECT fsid AS "State ID", fsn AS "State Name", tab AS "Total Beds", cbo AS "Covid ICU Bed Occupancy", tpc AS "Total Positive Cases", td AS "Total Deaths", dt AS "Date"
FROM 
(
    WITH bedinfo (sid, rd, tb, coib) AS
    (
        SELECT hd.STATE_ID, hd.RECORD_DATE, SUM(hd.TOTAL_BEDS), SUM(hd.COVID_OCCUPIED_ICU_BEDS) FROM "N.SAOJI".HOSPITALIZATION_DATA hd, "N.SAOJI".STATE s 
        WHERE hd.STATE_ID = s.ID
        GROUP BY hd.STATE_ID, hd.RECORD_DATE
    ),
    deathinfo (sid2, rd2, dpc, dd) AS
    (
        SELECT s.ID, ccd.RECORD_DATE, SUM(ccd.DAILY_POSITIVE_CASES), SUM(ccd.DAILY_DEATHS) FROM "N.SAOJI".STATE s, "N.SAOJI".COUNTY c , "N.SAOJI".COUNTY_COVID_DATA ccd 
        WHERE s.ID = c.STATE_ID AND c.ID = ccd.COUNTY_ID
        GROUP BY s.ID , ccd.RECORD_DATE 
    )
    SELECT s2.ID AS fsid, s2.NAME AS fsn, bi.tb AS tab, bi.coib AS cbo, di.dpc AS tpc, di.dd AS td, bi.rd AS dt
    FROM "N.SAOJI".STATE s2, bedinfo bi, deathinfo di
    WHERE s2.ID = bi.sid AND bi.sid = di.sid2 AND bi.rd = di.rd2
)
WHERE dt BETWEEN \'${fromDate}' AND \'${toDate}' AND fsn IN (${id})
ORDER BY fsn ASC, dt ASC;`
    
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

router.post('/us-hospitalization-trend', function (req, res) {
  console.log("[INFO] POST /api/hospitalization/us-hospitalization-trend route...");
  usHospitalizationTrend(req, res);
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = router;
