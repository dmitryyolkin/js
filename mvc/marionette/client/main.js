/**
 * Created by dmitry on 06.07.16.
 */

'use strict';

define(function(require){
    //libs
    var Backbone = require('backbone');
    var Marionette = require('marionette');

    //internal
    var AppRouter = require('./AppRouter');

    var App = new Marionette.Application();

    //add initializers
    App.addInitializer(function(options){
        new AppRouter();
        Backbone.history.start();
    });

    //embedded events
    App.on('initialize:after', function(options){
        if (Backbone.history){
            Backbone.history.start();
        }
    });

    App.on('start', function(options){
        alert('start: ' + options);
    });

    //something useful can be put in options
    var options = {};
    App.start(options);

    //EventAggregator
    App.vent.on('Dmitry_test', function(){
        console.log("it's dmitry's test event");
    });
    App.vent.trigger('Dmitry_test');

});
