/**
 * Created by dmitry on 26.07.16.
 */
'use strict';

define(function(require){
    var Marionette = require('marionette');

    return Marionette.Controller.extend({
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
});
