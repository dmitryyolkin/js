/**
 * Created by dmitry on 26.07.16.
 */
'use strict';

//imports
var Backbone = require('backbone');
var Marionette = require('marionette');
var UserModule = require('./users/UserModule');

//init
var App = new Marionette.Application();
App.module('user', UserModule);

App.addInitializer(function(options){
    //something can be added
    console.log('App.addInitializers mode: ' + options.mode);
});

//add some handlers
App.on('start', function(options){
    if (Backbone.history){
        Backbone.history.start();
    }
});

module.exports = App;
