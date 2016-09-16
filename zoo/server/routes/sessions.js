/**
 * Created by dmitry on 29.08.16.
 */
'use strict';

var express = require('express');
var auth = require('../auth');

var mongoose = require('mongoose');
var UserSchema = require('../schema/UserSchema');

var router = express.Router();
var User = mongoose.model('User', UserSchema);

router.get('/check', function(req, res) {
    var userId = req.session.user_id;
    if (userId) {
        User.findById(userId, function (user) {
            if (user) {
                req.currentUser = user;
                res
                    .status(200)
                    .send({});
            } else {
                res
                    .status(401)
                    .send("User is not found: " + userId);
            }
        });
    } else {
        res
            .status(401)
            .send('User is not specified in coockie')
    }
});

//todo maybe it's not nessesary anymore
router.get('/new', function(req, res) {
    function renderSessionNew(user) {
        res.render('index', {
            data: {
                requireLogin: true,
                user: user
            }
        });
    }

    var userId = req.session.user_id;
    if (userId){
        User.findById(userId, function(err, user){
            renderSessionNew(user | new User());
        });
    }else{
        renderSessionNew(new User());
    }
});

router.post('/', function(req, res) {
    //User.findOne({ email: req.body.user.email }, function(err, user) {
    //    if (user && user.authenticate(req.body.user.password)) {
    //        req.session.user_id = user.id;
    //
    //        // Remember me
    //        if (req.body.remember_me) {
    //            var loginToken = new LoginToken({ email: user.email });
    //            loginToken.save(function() {
    //                res.cookie('logintoken', loginToken.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
    //                res.redirect('/documents');
    //            });
    //        } else {
    //            res.redirect('/documents');
    //        }
    //    } else {
    //        req.flash('error', 'Incorrect credentials');
    //        res.redirect('/sessions/new');
    //    }
    //});
});

router.delete('/', auth.isUserLoggedIn, function(req, res) {
    //if (req.session) {
    //    LoginToken.remove({ email: req.currentUser.email }, function() {});
    //    res.clearCookie('logintoken');
    //    req.session.destroy(function() {});
    //}
    //res.redirect('/sessions/new');
});


module.exports = router;
