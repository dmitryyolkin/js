/**
 * Created by dmitry on 03.10.16.
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LoginTokenSchema = new Schema({
    login: {type: String, index: true},
    series: {type: String, index: true},
    token: {type: String, index: true}
});

LoginTokenSchema.method('randomToken', function () {
    return Math.round((new Date().valueOf() * Math.random())) + '';
});

LoginTokenSchema.pre('save', function (next) {
    // Automatically create the tokens
    this.token = this.randomToken();
    if (this.isNew) {
        this.series = this.randomToken();
    }
    next();
});

LoginTokenSchema.virtual('id')
    .get(function () {
        return this._id.toHexString();
    });

LoginTokenSchema.virtual('cookieValue')
    .get(function () {
        return JSON.stringify({
            login: this.login,
            token: this.token,
            series: this.series
        });
    });

module.exports = LoginTokenSchema;