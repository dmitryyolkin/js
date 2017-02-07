/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

//imports
var Backbone = require('backbone');
var Marionette = require('marionette');
var $ = require('jquery');

//routers
var AppRouter = require('./AppRouter');
var AppController = require('./AppController');

var ErrorScreenView = require('./views/error/ErrorScreenView');

//init
module.exports = Marionette.Application.extend({
    initialize: function (options) {
        //some initializers can be added here
        //keep it just in case as an example
        console.log('App.initialize is invoked with options: ' + options);
    },

    onStart: function () {


        //init controller and router
        var appController = new AppController();
        var appRouter = new AppRouter({
            controller: appController
        });

        //add global error handler for Backbone
        $.ajaxSetup({
            cache: false,
            statusCode: {
                401: function(jqXHR, textStatus, errorThrown){
                    // Redirect the to the login page.
                    Backbone.history.navigate('login');
                },
                403: function(jqXHR, textStatus, errorThrown) {
                    // 403 -- Access denied
                    new ErrorScreenView({
                        message: "Use doesn't have permissions"
                    }).render();
                }
            }
        });

        if (Backbone.history) {
            Backbone.history.start();
        }
    }

});