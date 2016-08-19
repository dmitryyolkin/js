/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');
module.exports = Marionette.Controller.extend({

    initialize: function(options){
        //set some external params to this controller instance
        _.extend(this, options);
    },

    login: function(){
        console.log('AppController: login is invoked');
    },

    animals: function(){
        console.log('AppController: amimals is invoked');
    }

});
