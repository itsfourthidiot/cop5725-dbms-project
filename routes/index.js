var express = require('express');
var router = express.Router();
// Get sensitive information from environment file
const dotenv = require('dotenv').config();

// Oracle db
const oracledb = require('oracledb')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
