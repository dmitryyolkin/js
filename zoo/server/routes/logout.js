/**
 * Created by dmitry on 17.02.17.
 */
'use strict';

var express = require('express');
var router = express.Router();

var MongoModels = require('../schema/MongoModels');
var LoginToken = MongoModels.LoginToken;

var logger = require('../logger');

router.get('/', function (req, res) {
    var login;
    if (req.user) {
        login = req.user.login;
    }

    req.logout();
    req.session.destroy(function (err) {
        if (login) {
            LoginToken
                .remove(
                    {login: login},
                    function (err) {
                        if (err) {
                            logger.error(err);
                        } else {
                            //remove loginToken successfully
                            res.redirect('/');
                        }
                    }
                );
        } else {
            res.redirect('/');
        }
    });
});

module.exports = router;

