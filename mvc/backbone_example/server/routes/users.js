/**
 * Created by dmitry on 15.06.16.
 */

'use strict';

var express = require('express');
var router = express.Router();
var _ = require('underscore');


var users = [];

users.push({
    id: 1,
    username: 'test'
});
users.push({
    id: 2,
    username: 'test1'
});

router.post('/', function(req, res, next){
    var body = req.body;
    var foundUser = _.find(users, function(user){
        return user.username = body.username;
    });

    if (foundUser == null){
        var newUser = users.push({
            id: _.max(users, function(element){
                return element.id;
            }) + 1,
            username: body.username
        });

        res
            .status(200)
            .send('User was added with id: ' + newUser.id);
    }else{
        res
            .status(400)
            .send('User already exists with id: ' + foundUser.id);
    }
});

router.get('/', function(req, res, next) {
    res
        .status(200)
        .send(users);
});

module.exports = router;