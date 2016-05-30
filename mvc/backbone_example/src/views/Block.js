/**
 * Created by dmitry on 26.05.16.
 */
'use strict';

define(function(require){
    var backbone = require('backbone');

    return backbone.View.extend({
        el: $('#block'), //DOM элемент виджета

        initialize: function(options){
            //assign options values (like controller and model) to this
            _.extend(this, options);

            //Subscribe for changing model event
            this.model.bind('change', this.render, this);
        },

        templates: {
            'start': _.template($('#start').html()),
            'success': _.template($('#success').html()),
            'error': _.template($('#error').html())
        },

        events: {
            'click input:button': 'check',  //Обработчик клика на кнопке "Проверить"
            'keyup input:text': 'keyPressEventHandler' //Обработчик нажатия enter в тексовом поле
        },

        check: function () {
            //if I write this.el.find() then I'ill get an error $(this.el).find is not a function
            //it happens because my DOM structure is initialized before assigning el to $('start')
            //Ideally we have to assign el to jquery value after DOM is initialized
            //OR use something like $(this.el) or this.$el every time
            //For details please see http://stackoverflow.com/questions/5554865/backbone-js-el-is-not-working

            var username = $(this.el).find('input:text').val();

            //as I understand we have to use set() method to specify values
            //because it fires special event
            this.model.set({
                'state': username == 'test' ? 'success' : 'error',
                'username': username
            });
        },

        render: function () {
            //find current model state (start|success\error)
            var state = this.model.get('state');
            $(this.el).html(this.templates[state](this.model.toJSON()));
            return this;
        },

        keyPressEventHandler: function(event){
            if (event.keyCode == 13){
                //it's interesting if I invoke this.render() then method above is executed
                //but data is not updated in UI
                $('input:button').click();
            }
        }

    });

});
