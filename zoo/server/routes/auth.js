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

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy(
    {
        usernameField: 'login',
        passwordField: 'password',

        //in this case system will pass 'req' variable to Strategy verify function
        passReqToCallback: true
    },
    function (req, login, password, done) {
        if (req.cookies.loginToken) {
            //try to optimize with login token
            authenticateFromLoginToken(req, login, password, done);
        } else {
            authenticateFromLoginPassword(login, password, done);
        }
    }
));

function authenticateFromLoginToken(req, login, password, done) {
    var cookieLoginToken = JSON.parse(req.cookies.loginToken);
    LoginToken.findOne({
        login: cookieLoginToken.login,
        series: cookieLoginToken.series,
        token: cookieLoginToken.token
    }, (function (err, token) {
        if (err) {
            return done(err);
        }

        if (!token) {
            return authenticateFromLoginPassword(login, password, done);
        }

        User.findOne({login: token.login}, function (err, user) {
            if (user) {
                return done(null, user)
            }

            var message =
                "Login Token exists but user is not found. Login: " +
                cookieLoginToken.login +
                ", userId: " + token.login;

            return done(
                null, false,
                {
                    message: message
                }
            );
        });
    }));
}

function authenticateFromLoginPassword(login, password, done) {
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
            //user is found
            return done(null, user);
        } else {
            //password is not correct
            return done(null, false, {message: 'Incorrect password'});
        }
    });
}

function saveLoginToken(loginToken, user, req, res, next) {

    //cookie set this way can not be read with JS on client
    //if we want to make it available we have to set 'httpOnly = false' cookie option
    //see http://stackoverflow.com/questions/17508027/cant-access-cookies-from-document-cookie-in-js-but-browser-shows-cookies-exist
    loginToken.save(function () {
        res.cookie('loginToken', loginToken.cookieValue, {
            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), //expires in two days
            path: '/'
        });

        //log in
        logIn(req, user, next);
    });
}

function logIn(req, user, next) {
    req.logIn(user, function (err) {
        if (err) {
            return next(err);
        }
        return next();
    });
}

function isAdmin(user) {
    return user.roles && user.roles.indexOf('ADMIN') != -1;
}

module.exports = {

    //check if there is a user with login/password
    checkPermissions: function (req, res, next) {
        if (req.user) {
            //user already exists in request
            var userId = user.id;
            User.findById(userId, function (error, user) {
                if (error) {
                    return next(error);
                }

                if (!user) {
                    res
                        .status(401)
                        .send("User is not found: " + userId);

                } else {
                    next();
                }
            });
        } else {

            //Check user credentials
            passport.authenticate('local',
                function (err, user, info) {
                    if (err) {
                        return next(err);
                    }
                    if (!user) {
                        res
                            .status(401)
                            .send('User is not specified in cookie')
                    }

                    //user exists
                    if (req.body.rememberMe) {
                        LoginToken.findOne({
                            login: user.login
                        }, (function (err, loginToken) {
                            if (err) {
                                return next(err);
                            }

                            if (!loginToken) {
                                //create login token if it doesn't exist
                                loginToken = new LoginToken({login: user.login});
                            } else {
                                //update token code for next usage
                                loginToken.token = loginToken.randomToken();
                            }
                            saveLoginToken(
                                loginToken, user,
                                req, res, next
                            );
                        }));
                    } else {
                        //log in
                        logIn(req, user, next);
                    }

                })(req, res, next);
        }


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