/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

//imports
var Backbone = require('backbone');
var Marionette = require('marionette');

//modules & routers
var AdminModule = require('./admin/AdminModule'),
    AnimalsModule = require('./animals/AnimalsModule'),
    AppRouter = require('./AppRouter'),
    AppController = require('./AppController');

//init
var App = new Marionette.Application();
App.module('admin', AdminModule);
App.module('animals', AnimalsModule);

App.addInitializer(function(options){
    //some initializers can be added here
    //keep it just in case as an example
});

//add some handlers
App.on('start', function(options){
    console.log('App.onStart is invoked with options: ' + options);

    var appController = new AppController();
    var appRouter = new AppRouter({
        controller: appController
    });

    if (Backbone.history){
        Backbone.history.start();
    }

});

module.exports = App;
