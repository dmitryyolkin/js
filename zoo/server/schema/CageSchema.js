/**
 * Created by dmitry on 17.08.16.
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = new Schema({
    name: {
        type: String,
        required: true
    },

    animals: [{
        type: Schema.Types.ObjectId,
        required: false,
        ref: 'Animal'
    }]
});
