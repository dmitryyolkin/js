/**
 * Created by dmitry on 19.08.16.
 */
'use strict';

var Marionette = require('marionette');
var $ = require('jquery');

module.exports = Marionette.Controller.extend({

    initialize: function (options) {
        //set some external params to this controller instance
        _.extend(this, options);
    },

    login: function () {
        console.log('AppController: login is invoked');
    },

    showAnimals: function () {
        console.log('AppController: showAnimals is invoked');
        $.ajax({
            url: '/sessions/check',
            type: 'GET',
            dataType: 'json',

            success: function(data, textStatus, jqXHR){
                console.log('sessions/check - success');
                //this.navigate('showAnimals', true);
            },

            error: function(jqXHR, textStatus) {
                console.log('sessions/check - error: ' + jqXHR.responseText);
                //todo перейти на нужный стейт
                //возможно все делать через модель и ее state - там наверное лучше чем navigate
                this.navigate('login', true);
            }
        });

    }

});
