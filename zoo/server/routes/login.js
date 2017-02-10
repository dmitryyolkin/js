/**
 * Created by dmitry on 29.08.16.
 */
'use strict';

var express = require('express');
var auth = require('./auth');

var MongoModels = require('../schema/MongoModels');

var User = MongoModels.User;
var LoginToken = MongoModels.LoginToken;

var router = express.Router();

//todo If authentication is done on Server with auth then Login is no need anymore

router.get('/', auth.checkPermissions, function (req, res) {
    //todo корректно обработать next(err)
    if (!req.user) {
        res
            .status(500)
            .send("Auth.checkPermission is passed but currentUser is absent from req.currentUser");
    }

    sendUser(req, res, req.currentUser);
});

router.post('/', auth.checkPermissions, function (req, res) {
    //todo корректно обработать next(err)
    if (!req.user) {
        res
            .status(500)
            .send("Auth.checkPermission is passed but currentUser is absent from req.currentUser");
    }

    sendUser(req, res, req.currentUser);
});

function sendUser(req, res, user) {
    res
        .status(200)
        .send({
            user: {
                login: user.login,
                name: user.name,
                surname: user.surname,
                email: user.email,
                roles: user.roles,
                animals: user.animals
            }
        });
}

module.exports = router;
