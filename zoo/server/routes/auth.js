/**
 * Created by dmitry on 03.02.17.
 */

'use strict';

//Details about passport.js http://passportjs.org/docs/login
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var MongoModels = require('../schema/MongoModels');
var User = MongoModels.User;
var LoginToken = MongoModels.LoginToken;

passport.use(new LocalStrategy(
    {
        usernameField: 'login',
        passwordField: 'password',

        //in this case system will pass 'req' variable to Strategy verify function
        passReqToCallback: true
    },
    function (req, login, password, done) {
        if (req.user) {
            //user alresy exists in request
            return done(null, user);

        } else if (req.cookies.loginToken) {
            //try to optimize with login token
            authenticateFromLoginToken(req, res, done);

        } else {

            //regsiter new user
            User.findOne({login: login}, function (err, user) {
                if (err) {
                    //some error happened
                    return done(err);
                }

                if (!user) {
                    //user is absent
                    //params
                    //  null is error
                    //  false means that credentials is wrong
                    //  message that should be provided in UI
                    return done(null, false, {message: 'Incorrect login'});
                }


                if (user && user.authenticate(password)) {
                    if (req.body.user.rememberMe) {
                        // Remember me
                        saveLoginToken(
                            new LoginToken({login: user.login}),
                            req, res, user
                        );
                    }

                    //user is found
                    return done(null, user);
                } else {
                    //password is not correct
                    return done(null, false, {message: 'Incorrect passord'});
                }
            });
        }
    }
));

function authenticateFromLoginToken(req, res, done) {
    var cookieLoginToken = JSON.parse(req.cookies.loginToken);
    LoginToken.findOne({
        login: cookieLoginToken.login,
        series: cookieLoginToken.series,
        token: cookieLoginToken.token
    }, (function (err, token) {
        if (err){
            return done(err);
        }

        if (!token) {
            return done(null, false, {message: "Login token is specified for login: " + cookieLoginToken.login});
        }

        User.findOne({login: token.login}, function (err, user) {
            if (user) {
                token.token = token.randomToken();
                saveLoginToken(token, req, res);
                return done(null, user)
            }

            return done(
                null, false,
                {
                    message: "Login Token exists but user is not found. Login: " + cookieLoginToken.login + ", userId: " + token.login
                }
            );
        });
    }));
}

function validate(err, user, info) {
    if (err) {
        return next(err);
    }
    if (!user) {
        res
            .status(401)
            .send('User is not specified in cookie')
    }
    req.logIn(user, function (err) {
        if (err) {
            return next(err);
        }
        return next();
    });
}

function saveLoginToken(loginToken, req, res) {

    //cookie set this way can not be read with JS on client
    //if we want to make it available we have to set 'httpOnly = false' cookie option
    //see http://stackoverflow.com/questions/17508027/cant-access-cookies-from-document-cookie-in-js-but-browser-shows-cookies-exist
    loginToken.save(function () {
        res.cookie('loginToken', loginToken.cookieValue, {
            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), //expires in two days
            path: '/'
        });
    });
}

function isAdmin(user) {
    return user.roles && user.roles.indexOf('ADMIN') != -1;
}

module.exports = {

    //check if there is a user with login/password
    checkPermissions: function (req, res, next) {
        //register custom callback
        passport.authenticate('local', validate)(req, res, next);
    },

    //check if there is a user with login/password having Admin permissions
    checkAdminPermissions: function (req, res, next) {
        var user = req.user;
        if (!user) {
            res
                .status(401)
                .send('User is not specified in cookie')
        }

        if (!isAdmin(user)) {
            res
                .status(403)
                .send("User doesn't have Admin permissions: " + user.id);
        }

        //user has all nessesary permissions
        next();
    }

};