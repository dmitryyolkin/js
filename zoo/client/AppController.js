/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');
var LoginView = require('./login/LoginView');

var $ = require('jquery');
var _ = require('underscore');

function checkAndNavigate(source) {
    $.ajax({
        url: '/sessions/check',
        type: 'GET',
        dataType: 'json',

        success: _.bind(function (data, textStatus, jqXHR) {
            console.log('sessions/check - success');
            this.model.set({
                'state': source
            });
        }, this),

        error: _.bind(function (jqXHR, textStatus) {
            console.log('sessions/check - error: ' + jqXHR.responseText);
            this.model.set({
                'state': 'login',
                'user': {} //todo
            });
        }, this)
    });
}

module.exports = Marionette.Controller.extend({

    initialize: function (options) {
        //set some external params to this controller instance
        _.extend(this, options);

        //create views
        var loginView = new LoginView({
            model: this.model
        });
        loginView.render();
    },

    login: function () {
        console.log('AppController: login is invoked');
        this.model.set({
            'state': 'login',
            'user': {} //todo
        });
    },

    showAnimals: function () {
        console.log('AppController: showAnimals is invoked');
        checkAndNavigate.call(this, 'animals');
    }
});
