/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

//imports
var Backbone = require('backbone');
var Marionette = require('marionette');

//modules & routers
var AdminModule = require('./views/admin/AdminModule');
var AnimalsModule = require('./views/animals/AnimalsModule');

var AppRouter = require('./AppRouter');
var AppController = require('./AppController');

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

    //init controller and router
    var appController = new AppController();
    var appRouter = new AppRouter({
        controller: appController
    });

    if (Backbone.history){
        Backbone.history.start();
    }
});

//navigation
App.navigate = function (route, options) {
    options = options || {};
    Backbone.history.navigate(route, options);
};

module.exports = App;
