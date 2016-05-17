/**
 * Created by dmitry on 16.05.16.
 */
'use strict';

define(function(require){

    var Backbone = require('backbone');
    var $ = require('jquery');
    var Controller = require('../controller/Controller');

    return Backbone.View.extend({
        el: $('#start'), //DOM элемент виджета
        events: {
            'click input:button': 'check'  // Обработчик клика на кнопке "Проверить"
        },

        check: function () {
            //if I write this.el.find() then I'ill get an error $(this.el).find is not a function
            //it happens because my DOM structure is initialized before assigning el to $('start')
            //Ideally we have to assign el to jquery value after DOM is initialized
            //OR use something like $(this.el) or this.$el every time
            //For details please see http://stackoverflow.com/questions/5554865/backbone-js-el-is-not-working
            if (this.$el.find('input:text').val() == 'test'){
                //true is trigger
                Controller.navigate('success', {trigger: true});
            }else{
                Controller.navigate('error', {trigger: true});
            }
        }
    });
});