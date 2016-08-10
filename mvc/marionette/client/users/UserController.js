/**
 * Created by dmitry on 26.07.16.
 */
'use strict';

var Marionette = require('marionette');

module.exports = Marionette.Controller.extend({

    initialize: function(options){
        //set model to this.model
        _.extend(this, options);
    },

    start: function () {
        this.model.set({
            'state': 'start'
        });
    },

    success: function () {
        this.model.set({
            'state': 'success'
        });
    },

    error: function () {
        this.model.set({
            'state': 'error'
        });
    }
});
