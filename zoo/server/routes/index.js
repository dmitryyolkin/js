'use strict';

var express = require('express');
var auth = require('../auth');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {});
});

module.exports = router;
