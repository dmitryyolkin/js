/**
 * Created by dmitry on 02.02.17.
 */
'use strict';

var Backbone = require('backbone');
var Marionette = require('marionette');

var ErrorTemplate = require("hbs!templates/error/error");

module.exports = Marionette.View.extend({
    template: ErrorTemplate,

    initialize: function(options){
        _.extend(this, options);
        Backbone.history.navigate('error');
    },

    onRender: function(){
        console.log("ErrorScreenView onRender");
    },

    //it's required to show data in hbs template
    serializeData: function () {
        return {
            message: this.message || 'No error message specified',
            error: this.error
        };
    }

});


