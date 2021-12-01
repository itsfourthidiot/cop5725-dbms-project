const express = require('express');
const router = express.Router();
const dotenv = require('dotenv').config();
const oracledb = require('oracledb');
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}

// Get world countries to populate the select country(ies) dropdown
async function getTotalNumberOfRows(req, res) {
  let connection, result;
  try {
    let sql = `
      SELECT t1.cryc + t2.ccdcryc + t3.couc + t4.ccdcouc + t5.sc + t6.hc + t7.vc AS totalCount FROM 
      (SELECT COUNT(*) AS cryc FROM "N.SAOJI".COUNTRY c) t1, 
      (SELECT COUNT(*) AS ccdcryc FROM "N.SAOJI".COUNTRY_COVID_DATA ccd) t2,
      (SELECT COUNT(*) AS couc FROM "N.SAOJI".COUNTY c2) t3,
      (SELECT COUNT(*) AS ccdcouc FROM "N.SAOJI".COUNTY_COVID_DATA ccd2) t4,
      (SELECT COUNT(*) AS sc FROM "N.SAOJI".STATE s) t5,
      (SELECT COUNT(*) AS hc FROM "N.SAOJI".HOSPITALIZATION_DATA hd) t6,
      (SELECT COUNT(*) AS vc FROM "N.SAOJI".VACCINATION_DATA vd) t7
    `;
    connection = await oracledb.getConnection(config);
    result = await connection.execute(sql, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
  } catch (err) {
    console.log('[Error] ', err);
    return res.json(err);
  } finally {
    if (connection) {
      await connection.close();
      return res.json(result.rows);
    }
  }
}

router.get('/total-number-of-rows', function (req, res) {
  console.log("[INFO] GET /api/total-number-of-rows...");
  getTotalNumberOfRows(req, res);
})

// Get US states to populate the select state(s) dropdown
async function getUsStates(req, res) {
  let connection, result;
  try {
    let sql = `
      SELECT s.id, s.name FROM "N.SAOJI".State s
      INNER JOIN "N.SAOJI".Country c
      ON s.country_id=c.id
      WHERE c.name='United States'
    `;
    connection = await oracledb.getConnection(config);
    result = await connection.execute(sql, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
  } catch (err) {
    console.log('[Error] ', err);
    return res.json(err);
  } finally {
    if (connection) {
      await connection.close();
      return res.json(result.rows);
    }
  }
}

router.get('/us-states', function (req, res) {
  getUsStates(req, res);
})

// Get world countries to populate the select country(ies) dropdown
async function getWorldCountries(req, res) {
  let connection, result;
  try {
    let sql = `
      SELECT id, name FROM "N.SAOJI".Country
    `;
    connection = await oracledb.getConnection(config);
    result = await connection.execute(sql, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
  } catch (err) {
    console.log('[Error] ', err);
    return res.json(err);
  } finally {
    if (connection) {
      await connection.close();
      return res.json(result.rows);
    }
  }
}

router.get('/world-countries', function (req, res) {
  console.log("[INFO] GET /api/world-countries...");
  getWorldCountries(req, res);
})

module.exports = router;