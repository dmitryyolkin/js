/**
 * Created by dmitry on 19.09.16.
 */
'use strict';

//imports
var Backbone = require('backbone');
var Marionette = require('marionette');
var LoginTemplate = require("hbs!templates/login");

var _ = require('underscore');

module.exports = Marionette.ItemView.extend({
    initialize: function (options) {
        //copy controller, model, state to this.controller, model, state
        _.extend(this, options);
    },

    getTemplate: function(){
        if (this.model && this.model.get('state') == 'login'){
            return LoginTemplate;
        }
        return false; //no template - use current page
    },

    modelEvents: {
        //it's the same as this.listenTo(this.model, 'change:state', this.render, this);
        'change:state' : 'render changeUrl'
    },

    changeUrl: function(){
        var state = this.model.get('state');
        if (state == 'login'){
            Backbone.history.navigate('login');
        }
    },

    onRender: function() {
        //we can put some code here that will be invoked before
        //this layoutView will be rendered
        console.log('LoginView is onRender');
    }


});