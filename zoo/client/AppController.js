/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');

var LoginView = require('./views/login/LoginView');
var AnimalsView = require('./views/animals/AnimalsView');
var AdminView = require('./views/admin/AdminView');
var ErrorScreenView = require('./views/error/ErrorScreenView');

//models
var LoginModel = require('./models/LoginModel');
var UserModel = require('./models/UserModel');
var AnimalsCollection = require('./models/AnimalsCollection');
var UsersCollection = require('./models/UsersCollection');

var _ = require('underscore');

function getUserFromLocalStorage() {
    if (localStorage.user && localStorage.user != 'undefined') {
        return JSON.parse(localStorage.user);
    }
}

function updateLoginModel(loginModel) {
    //check user in localstorage
    //and set login if it exists
    var user = getUserFromLocalStorage();
    if (user) {
        loginModel.user.login = user.login;
    }
    return loginModel;
}

//Started with marionette 3.0 Marionette.Object should be used instead of Marionette.Controller
module.exports = Marionette.Object.extend({

    initialize: function (options) {
        //set some external params to this controller instance
        _.extend(this, options);
    },

    login: function () {
        console.log('AppController: login is invoked');
        var loginView = new LoginView({
            model: updateLoginModel(new LoginModel())
        }).render();
    },

    animals: function () {
        console.log('AppController: animals is invoked');

        //details how collection can be shown
        //http://stackoverflow.com/questions/27673371/backbone-js-collection-view-example-using-marionette-template
        var animalsView = new AnimalsView({
            collection: new AnimalsCollection()
        });
        animalsView.render();
    },

    admin: function () {
        console.log('AppController: admin is invoked');
        var animalsView = new AdminView({
            collection: new UsersCollection()
        });
        animalsView.render();
    },

    error: function(){
        console.log('AppController: error is invoked');
        var errorView = new ErrorScreenView({
            message: 'Some error happened'
        });
        errorView.render();
    }
});
