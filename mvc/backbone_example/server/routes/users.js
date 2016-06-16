/**
 * Created by dmitry on 15.06.16.
 */

'use strict';

var express = require('express');
var router = express.Router();


var users = [];

users.push({
    id: 1,
    username: 'test'
});
users.push({
    id: 2,
    username: 'test1'
});

router.get('/', function(req, res, next) {
    res
        .status(200)
        .send(users);
});

module.exports = router;