/**
 * Created by dmitry on 15.06.16.
 */

'use strict';

var express = require('express');
var router = express.Router();
var _ = require('underscore');


var users = [];
for (var i = 1; i <=2; i++){
    users.push({
        id: i,
        username: 'test' + i
    });
}

router.post('/', function(req, res, next){
    var body = req.body;
    var foundUser = _.find(users, function(user){
        return user.username == body.username;
    });

    if (_.isNull(foundUser) || _.isUndefined(foundUser)){
        var newUser = {
            id: _.max(users, function(element){
                return element.id;
            }).id + 1,
            username: body.username
        };
        users.push(newUser);

        //it's very important to send JSON object in case of success
        //if you send some String then on client side it will be considered as error
        res
            .status(201)
            .send(newUser);
    }else{
        res
            .status(200)
            .send('User already exists with id: ' + foundUser.id);
    }
});

router.get('/', function(req, res, next) {
    res
        .status(200)
        .send(users);
});

module.exports = router;