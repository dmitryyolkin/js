/**
 * Created by dmitry on 03.02.17.
 */

'use strict';

var MongoModels = require('../schema/MongoModels');
var User = MongoModels.User;
var LoginToken = MongoModels.LoginToken;

function authenticateFromLoginToken(req, res, next) {
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
                //we save user id in session to avoid token verification within the one session
                req.session.user_id = user.id;
                req.currentUser = user;

                token.token = token.randomToken();
                saveLoginToken(token, req, res, next)
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

function saveLoginToken(loginToken, req, res, next) {

    //cookie set this way can not be read with JS on client
    //if we want to make it available we have to set 'httpOnly = false' cookie option
    //see http://stackoverflow.com/questions/17508027/cant-access-cookies-from-document-cookie-in-js-but-browser-shows-cookies-exist
    loginToken.save(function () {
        res.cookie('loginToken', loginToken.cookieValue, {
            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), //expires in two days
            path: '/'
        });
        next();
    });
}

module.exports = {

    //load user
    checkPermissions: function (req, res, next) {
        var userId = req.session.user_id;
        if (userId) {
            User.findById(userId, function (error, user) {
                if (user) {
                    req.currentUser = user;
                    next();
                } else {
                    res
                        .status(401)
                        .send("User is not found: " + userId);
                }
            });
        } else if (req.cookies.loginToken) {
            authenticateFromLoginToken(req, res, next);
        } else {
            res
                .status(401)
                .send('User is not specified in cookie')
        }
    }
};