/**
 * Created by dmitry on 29.08.16.
 */
'use strict';

var express = require('express');
var MongoModels = require('../schema/MongoModels');

var User = MongoModels.User;
var LoginToken = MongoModels.LoginToken;

var router = express.Router();

router.get('/', function (req, res) {
    //todo clarify why we need session.user_id - probably it's extra now
    var userId = req.session.user_id;
    if (userId) {
        User.findById(userId, function (user) {
            if (user) {
                req.currentUser = user;
                sendUser(req, res, user);
            } else {
                res
                    .status(401)
                    .send("User is not found: " + userId);
            }
        });
    } else if (req.cookies.loginToken) {
        authenticateFromLoginToken(req, res);
    } else {
        res
            .status(401)
            .send('User is not specified in coockie')
    }
});

router.post('/', function (req, res) {
    User.findOne({login: req.body.user.login}, function (err, user) {
        if (user && user.authenticate(req.body.user.password)) {
            req.session.user_id = user.id;

            // Remember me
            if (req.body.rememberMe) {
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

/**
 * If user decides to keep him/her logged in then
 * System saves info about him/her in cookie in shape of loginToken
 */
function authenticateFromLoginToken(req, res) {
    var cookieLoginToken = JSON.parse(req.cookies.loginToken);
    LoginToken.findOne({
        login: cookieLoginToken.login,
        series: cookieLoginToken.series,
        token: cookieLoginToken.token
    }, (function (err, token) {
        if (!token) {
            res
                .status(401)
                .send("Login token is specified for login: " + cookieLoginToken.login);
            return;
        }

        User.findOne({login: token.login}, function (err, user) {
            if (user) {
                req.session.user_id = user.id;
                req.currentUser = user;

                token.token = token.randomToken();
                saveLoginToken(
                    token,
                    req, res, user
                )
            } else {
                res
                    .status(401)
                    .send(
                        "Login Token exists but user is not found. Login: "
                        + cookieLoginToken.login + ", userId: " + token.login
                    );
            }
        });
    }));
}

function saveLoginToken(loginToken, req, res, user) {

    //cookie set this way can not be read with JS on client
    //of we want to make it available we have to set 'httpOnly = false' cookie option
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
            user :{
                name: user.name,
                surname: user.surname,
                email: user.email,
                roles: user.roles,
                animals: user.animals
            }
        });
}

module.exports = router;
