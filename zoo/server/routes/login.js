/**
 * Created by dmitry on 29.08.16.
 */
'use strict';

var express = require('express');
var auth = require('./auth');

var router = express.Router();

router.get('/', auth.checkPermissions, function (req, res) {
    if (!req.user) {
        res
            .status(500)
            .send("Auth.checkPermission is passed but req.user is not specified");
    }

    sendUser(req, res, req.user);
});

router.post('/', auth.checkPermissions, function (req, res) {
    if (!req.user) {
        res
            .status(500)
            .send("Auth.checkPermission is passed but req.user not specified");
    }

    sendUser(req, res, req.user);
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
