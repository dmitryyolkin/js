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
    var loginView = new LoginView({
        model: loginModel
    });
    loginView.render();
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

    showAnimals: function () {
        console.log('AppController: showAnimals is invoked');
        var loginModel = new LoginModel();
        loginModel.fetch(
            {
                success: function (model, response, options) {
                    console.log('login/check - success');
                    var animalsView = new AnimalsView({
                        model: some_model //todo
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
