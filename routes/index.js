var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Home Page' });
});

router.get('/vaccination', function(req, res, next) {
  res.render('vaccination', { title: 'Vaccination Page' });
});

router.get('/vaccination-world', function(req, res, next) {
  res.render('vaccination-world', { title: 'Vaccination World Page' });
});

router.get('/mortality-rate', function(req, res, next) {
  res.render('mortality-rate', { title: 'Mortality Rate Page' });
});

router.get('/community', function(req, res, next) {
  res.render('community', { title: 'Community Page' });
});

module.exports = router;
