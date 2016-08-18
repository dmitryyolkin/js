/**
 * Created by dmitry on 17.08.16.
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
    //when new User will be created with new User({...}) then _id will be assigned to this object automatically
    //even if the object is not saved in DB yet

    //there is no need to specify '_id' column in scheme explicitly
    name: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    login: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },

    //reference to other scheme is done with 'population' approach
    //see http://mongoosejs.com/docs/populate.html
    roles: [{
        type: String,
        required: true,
        default: 'KEEPER',

        //make sure there are no values different from list below
        enum: ['ADMIN', 'KEEPER', 'ZOOLOGIST']
    }],

    //array specifies order in which keeper should walk through animals
    animals: [{
        type: Schema.Type.ObjectId,
        required: false, //admin or zoologist don't contain anumals
        ref: './Animal'
    }]

});

//add some default methods for schema
User.methods.isAvailable = function(){
    console.log('User scheme isAvailable() method is invoked');
};

module.exports = User;

