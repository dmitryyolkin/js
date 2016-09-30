/**
 * Created by dmitry on 19.09.16.
 */
'use strict';

//imports
var Backbone = require('backbone');
var Marionette = require('marionette');
var LoginTemplate = require("hbs!templates/login");

var _ = require('underscore');
var $ = require('jquery');

module.exports = Marionette.ItemView.extend({
    el: 'body',

    initialize: function (options) {
        _.extend(this, options);
        Backbone.history.navigate('login');
    },

    template: LoginTemplate,
    events: {
        'click input:button': 'login',  //Обработчик клика на кнопке "Log in"
        'keyup input#pass': 'keyPressEventHandler' //Обработчик нажатия enter в тексовом поле
    },

    login: function(){
        console.log('LoginView is login');

        this.model.save(
            {
                user: {
                    login: $(this.el).find('input#login').val(),
                    //todo pass should be encrypted on client before sending
                    password: $(this.el).find('input#pass').val()
                },
                rememberMe: $(this.el).find('input#rememberMe').val() == 'on'
            },
            {
                success: function(model, response, options){
                    console.log('login was done successfuly');
                    //redirect to somewhere
                },

                error: function(model, xhr, options){
                    console.log('login was failed: ');
                }
            }
        )
    },

    keyPressEventHandler: function(event){
        if (event.keyCode == 13){
            //it's interesting if I invoke this.render() then method above is executed
            //but data is not updated in UI
            $('input:button').click();
        }
    },

    onRender: function() {
        //we can put some code here that will be invoked before
        //this layoutView will be rendered
        console.log('LoginView is onRender');
    },

    //it's required to show data in hbs template
    serializeData: function () {
        return {
            user: this.model.user
        };
    }

});