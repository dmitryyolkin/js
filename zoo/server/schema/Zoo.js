/**
 * Created by dmitry on 18.08.16.
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = new Schema({
    users: [{
        type: Schema.Type.ObjectId,
        required: true,
        ref: './User'
    }],

    animals: [{
        type: Schema.Type.ObjectId,
        required: true,
        ref: './Animal'
    }]

});