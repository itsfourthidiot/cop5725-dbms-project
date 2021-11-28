var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Home Page' });
});

router.get('/vaccination', function(req, res, next) {
  res.render('vaccination', { title: 'Vaccination Page' });
});

router.get('/community', function(req, res, next) {
  res.render('community', { title: 'Community Page' });
});

module.exports = router;
