/**
 * Created by dmitry on 01.02.17.
 */
'use strict';

var Backbone = require('backbone');
var Marionette = require('marionette');
var _ = require('underscore');

var ErrorTemplate = require("hbs!templates/error");

module.exports = Marionette.View.extend({
    el: 'body',
    template: ErrorTemplate,

    initialize: function(options){
        _.extend(this, options);
        Backbone.history.navigate('error');
    },

    onRender: function(){
        console.log("ErrorView onRender");
    },

    //it's required to show data in hbs template
    serializeData: function () {
        return {
            message: this.message || 'No error message specified',
            error: this.error
        };
    }

});

