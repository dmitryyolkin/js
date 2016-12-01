/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

//imports
var Backbone = require('backbone');
var Marionette = require('marionette');

//routers
var AppRouter = require('./AppRouter');
var AppController = require('./AppController');

//init
module.exports = Marionette.Application.extend({
    initialize: function(options) {
        //some initializers can be added here
        //keep it just in case as an example
        console.log('App.initialize is invoked with options: ' + options);
    },

    onStart: function() {


        //init controller and router
        var appController = new AppController();
        var appRouter = new AppRouter({
            controller: appController
        });

        if (Backbone.history){
            Backbone.history.start();
        }
    }

});