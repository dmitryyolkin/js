/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');

module.exports = Marionette.AppRouter.extend({
    initialize: function(options){
        //set controller to this.controller
        _.extend(this, options);
    },

    //set corresponddence between routes and controller's methods
    appRoutes: {
        "": "animals",
        "animals": "animals",
        "login": "login",
        "admin": "admin",
        "error": "error"
    }
});
