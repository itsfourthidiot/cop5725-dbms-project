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

router.get('/hospitalization', function(req, res, next) {
  res.render('hospitalization', { title: 'Hospitalization Page' });
});

router.get('/positivity-world', function(req, res, next) {
  res.render('positivity-world', { title: 'Positivity rate Page' });
});

router.get('/usmortality-rate', function(req, res, next) {
  res.render('usmortality-rate', { title: 'US Mortality Rate Page' });
});


module.exports = router;
