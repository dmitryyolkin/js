'use strict';

var express = require('express');
var auth = require('../auth');

var router = express.Router();

/* GET home page. */
router.get('/', auth.isUserLoggedIn, function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
