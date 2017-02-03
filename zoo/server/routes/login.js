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
    if (!req.currentUser) {
        res
            .status(500)
            .send("Auth.checkPermission is passed but currentUser is absent from req.currentUser");
    }

    sendUser(req, res, req.currentUser);
});

router.post('/', function (req, res) {
    User.findOne({login: req.body.user.login}, function (err, user) {
        if (user && user.authenticate(req.body.user.password)) {
            req.session.user_id = user.id;

            // Remember me
            if (req.body.user.rememberMe) {
                saveLoginToken(
                    new LoginToken({login: user.login}),
                    req, res, user
                );
            } else {
                //don't save in rememeber me and return user with 200
                sendUser(user, res)
            }
        } else {
            res
                .status(401)
                .send('User is specified but credentials are not correct')
        }
    });
});

function saveLoginToken(loginToken, req, res, user) {

    //cookie set this way can not be read with JS on client
    //if we want to make it available we have to set 'httpOnly = false' cookie option
    //see http://stackoverflow.com/questions/17508027/cant-access-cookies-from-document-cookie-in-js-but-browser-shows-cookies-exist
    loginToken.save(function () {
        res.cookie('loginToken', loginToken.cookieValue, {
            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), //expires in two days
            path: '/'
        });
        sendUser(req, res, user);
    });
}

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
