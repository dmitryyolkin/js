/**
 * Created by dmitry on 17.08.16.
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = new Schema({
    name: {
        type: String,
        required: true,
        unique : true, //make sure there is only one animal with unique name
        dropDups: true //to ensure dropping duplicate records in your schemas
    },

    kind: {
        type: String,
        default: 'Predator',
        enum: ['Bird', 'Fish', 'Herbivorous', 'Predator']
    },

    age: {
        type: Number,
        required: false
    },

    keeper: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: './User'
    },

    cage: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: './Cage'
    }

});
