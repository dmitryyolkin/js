/**
 * Created by dmitry on 26.05.16.
 */
'use strict';

define(function(require){
    var Backbone = require('Backbone');

    return Backbone.View.extend({
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
            //For details please see http://stackoverflow.com/questions/5554865/Backbone-js-el-is-not-working

            var username = $(this.el).find('input:text').val();

            //add user asynchronously
            //instead of using collection.create I could use model.save() where model is User model
            //      Please keep in mind if the model is not saved on server then it has isNew flag = true and model.save() sends POST request
            //      Otherwise if the moel already exists model.save sends PUT requests
            this.collection.create(
                //new user
                {
                    username: username
                },

                //response handlers
                {
                    wait: true, // waits for server to respond with 200 before adding newly created model to collection
                    success: _.bind(function(collection, response){
                        console.log('success');
                        this.model.set({
                            'state': 'success',
                            'username': username
                        });
                    }, this),

                    error: _.bind(function(collection, response){
                        console.log('error');
                        this.model.set({
                            'state': 'error',
                            'username': username
                        });
                    }, this)
                }
            );
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
