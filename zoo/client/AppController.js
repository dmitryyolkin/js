/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');

var LoginView = require('./views/login/LoginView');
var AnimalsView = require('./views/animals/AnimalsTableView');

//models
var LoginModel = require('./models/LoginModel');
var AnimalsCollection = require('./models/AnimalsCollection');

var _ = require('underscore');

function showloginView(loginModel) {
    //check user in localstorage
    //and set login if it exists
    if (localStorage.user && localStorage.user != 'undefined'){
        var user = JSON.parse(localStorage.user);
        if (user){
            loginModel.user.login = user.login;
        }
    }

    var loginView = new LoginView({
        model: loginModel
    }).render();
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
        var loginModel = new LoginModel();
        loginModel.sync(
            'GET',
            loginModel,
            {
                success: function (model, response, options) {
                    console.log('login/check - success)');

                    //details how collection can be shown
                    //http://stackoverflow.com/questions/27673371/backbone-js-collection-view-example-using-marionette-template
                    var animalsView = new AnimalsView({
                        collection: new AnimalsCollection()
                    });
                    animalsView.render();
                },

                error: function (model, response, options) {
                    console.log('login/check - error: ' + response.responseText);
                    showloginView(loginModel);
                }
            }
        );
    }
});
