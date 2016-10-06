/**
 * Created by dmitry on 06.10.16.
 */
'use strict';

var mongoose = require('mongoose');

//schemas
var UserSchema = require('./UserSchema');
var LoginTokenSchema = require('./LoginTokenSchema');
var AnimalSchema = require('./AnimalSchema');
var CageSchema = require('./CageSchema');
var ZooSchema = require('./ZooSchema');

module.exports = {
    User: mongoose.model('User', UserSchema),
    LoginToken: mongoose.model('LoginToken', LoginTokenSchema),
    Animal: mongoose.model('Animal', AnimalSchema),
    Cage: mongoose.model('Cage', CageSchema),
    Zoo: mongoose.model('Zoo', ZooSchema)
};