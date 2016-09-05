/**
 * Created by dmitry on 18.08.16.
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = new Schema({
    users: [{
        type: Schema.Types.ObjectId,
        required: true,
        ref: './UserSchema'
    }],

    animals: [{
        type: Schema.Types.ObjectId,
        required: true,
        ref: './Animal'
    }]

});