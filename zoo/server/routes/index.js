'use strict';

var express = require('express');
var auth = require('../auth');

var router = express.Router();

/* GET home page. */
router.get('/', auth.isUserLoggedIn, function(req, res, next) {
  res.render('index', {
    data: {
      requireLogin: false, //auth is passed in isUserLoggedIn() function
      user: {}
    }
  });
});

module.exports = router;
