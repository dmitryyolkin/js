/**
 * Created by dmitry on 16.05.16.
 */
'use strict';

define(function(require){

    var Backbone = require('backbone');
    var $ = require('jquery');
    //I don't require App here because App requires View and we have cycle dependency
    //require('../App') can be invoked from check method below but it looks like as a shit
    var controller = require('../controller/Controller');

    var View = Backbone.View.extend({
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
                //огда вы решите, что ваше приложение находится в состоянии, которое желательно было бы сохранить,
                //вызовите navigate чтобы обновить URL, передав в качестве аргумента fragment необходимый фрагмент URL.
                //Если при этом вы хотите вызвать функцию роутера, то установите свойство trigger в true.
                controller.navigate('success', {trigger: true});
            }else{
                controller.navigate('error', {trigger: true});
            }
        }
    });

    return new View();
});