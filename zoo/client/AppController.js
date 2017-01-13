/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');

var LoginView = require('./views/login/LoginView');
var AnimalsView = require('./views/animals/AnimalsView');
var AdminView = require('./views/admin/AdminView');

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

function showloginView(loginModel) {
    var loginView = new LoginView({
        model: updateLoginModel(loginModel)
    }).render();
}

function handleRequest(success, error){
    var loginModel = updateLoginModel(new LoginModel());
    if (!loginModel.user.login) {
        showloginView(loginModel);
    }

    loginModel.sync(
        'GET',
        loginModel,
        {
            success: success,

            error: function (model, response, options) {
                if (error){
                    return error(model, response, options);
                }

                console.log('login/check - error: ' + response.responseText);
                showloginView(loginModel);
            }
        }
    )
}

//Started with marionette 3.0 Marionette.Object should be used instead of Marionette.Controller
module.exports = Marionette.Object.extend({

    initialize: function (options) {
        //set some external params to this controller instance
        _.extend(this, options);
    },

    login: function () {
        console.log('AppController: login is invoked');
        showloginView(new LoginModel())
    },

    animals: function () {
        console.log('AppController: animals is invoked');
        handleRequest(function (model, response, options) {
            console.log('login/check - success)');

            //details how collection can be shown
            //http://stackoverflow.com/questions/27673371/backbone-js-collection-view-example-using-marionette-template
            var animalsView = new AnimalsView({
                collection: new AnimalsCollection()
            });
            animalsView.render();
        });

    },

    admin: function () {
        console.log('AppController: admin is invoked');
        handleRequest(function (model, response, options) {
            console.log('login/check - success)');
            var user = model.user;
            if (user.roles && user.roles.indexOf('ADMIN') != -1) {
                var animalsView = new AdminView({
                    collection: new UsersCollection()
                });
                animalsView.render();
            } else {
                console.error("user dosn't have admin permissions");
                //todo надо показывать какую-то error page
            }

        });
    }
});
