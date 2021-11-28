const express = require('express');
const router = express.Router();
const dotenv = require('dotenv').config();
const oracledb = require('oracledb');
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING
}


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