/**
 * Created by dmitry on 01.02.17.
 */
'use strict';

var Backbone = require('backbone');
var Marionette = require('marionette');

var ErrorTemplate = require("hbs!templates/error/errorScreen");
var MainMenuView = require("./../MainMenuView");
var ErrorView = require("./ErrorView");

module.exports = Marionette.View.extend({
    el: 'body',
    template: ErrorTemplate,

    initialize: function(options){
        _.extend(this, options);
        Backbone.history.navigate('error');
    },

    regions: {
        header: "#mainMenu",
        error: "#error-controls"
    },

    onRender: function(){
        console.log("ErrorScreenView onRender");
        this.showChildView('header', new MainMenuView());
        this.showChildView('error', new ErrorView({
            message: this.message,
            error: this.error
        }));
    }

});

