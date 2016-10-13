/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');

var LoginView = require('./login/LoginView');
var AnimalsView = require('./animals/AnimalsView');
var LoginModel = require('./models/LoginModel');

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

module.exports = Marionette.Controller.extend({

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
                    console.log('login/check - success. user.details: ' + JSON.stringify(response.user));

                    //if we don't stringify then object will be saved in localStorage incorrectly
                    localStorage.user = JSON.stringify(response.user);
                    var animalsView = new AnimalsView({
                        model: response.user
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
