/**
 * Created by dmitry on 17.08.16.
 */
'use strict';

var mongoose = require('mongoose'),
    crypto = require('crypto'),
    _ = require('underscore');

var Schema = mongoose.Schema;
var UserSchema = new Schema({
    //when new UserSchema will be created with new UserSchema({...}) then _id will be assigned to this object automatically
    //even if the object is not saved in DB yet

    //there is no need to specify '_id' column in scheme explicitly
    name: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true,
        validate: [validate, 'an email is required'],
        index: {
            unique: true
        }
    },
    login: {
        type: String,
        required: true,
        validate: [validate, 'login is required'],
        index: {
            unique: true
        }
    },
    passwordHash: {
        type: String,
        required: true
    },
    salt: String, //some salt to encrypt the password

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
        type: Schema.Types.ObjectId,
        required: false, //admin or zoologist don't contain anumals
        ref: './Animal'
    }]

});

//Virtual fields
//Virtual field is a field existed in Object but not stored in Mongo
UserSchema
    .virtual('id')
    .get(function () {
        return this._id.toHexString();
    });

UserSchema.virtual('password')
    .set(function(password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.passwordHash = this.encryptPassword(password);
    })
    .get(function() { return this._password; });


//Methods
UserSchema.method('authenticate', function(userPass) {
    return this.encryptPassword(userPass) === this.passwordHash;
});

UserSchema.method('makeSalt', function() {
    return Math.round((new Date().valueOf() * Math.random() * 1984)) + 'zoo';
});

UserSchema.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
});

UserSchema.pre('save', function(next) {
    if (!validate(this.password)) {
        next(new Error('Invalid password'));
    } else {
        next();
    }
});

//Some internal functions
function validate(v) {
    return !_.isEmpty(v);
}

module.exports = UserSchema;

