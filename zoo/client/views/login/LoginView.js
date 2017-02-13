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

var loginFailedClass = '.loginFailed';

module.exports = Marionette.View.extend({
    el: 'body',

    initialize: function (options) {
        _.extend(this, options);
        Backbone.history.navigate('login');
    },

    template: LoginTemplate,
    events: {
        'click input:button#loginBtn': 'login',  //Обработчик клика на кнопке "Log in"
        'keyup input#pass': 'keyPressEventHandler', //Обработчик нажатия enter в тексовом поле
        'keyup input#login, input#pass': 'hideLoginFailedMsg' //скрываем login failed message
    },

    login: function(){
        console.log('LoginView is login');

        this.model.save(
            {
                login: $(this.el).find('input#login').val(),
                password: $(this.el).find('input#pass').val(),
                rememberMe: $(this.el).find('input#rememberMe').val() == 'on'
            },
            {
                success: function(model, response, options){
                    console.log('login was done successfuly - user details: ' + JSON.stringify(response.user));

                    //if we don't stringify then object will be saved in localStorage incorrectly
                    localStorage.user = JSON.stringify(response.user);
                    Backbone.history.navigate(
                        'animals',
                        {
                            //we have to invoke 'animals' handler
                            trigger: true
                        }
                    );
                },

                error: function(model, xhr, options){
                    $(loginFailedClass).text(xhr.responseText).show();
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

    hideLoginFailedMsg: function(){
        var $loginFailedEl = $(loginFailedClass);
        if ($loginFailedEl.is(':visible')){
            $loginFailedEl.hide();
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