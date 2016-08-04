/**
 * Created by dmitry on 28.07.16.
 */
'use strict';

define(function(require){
    //imports
    var Marionette = require('marionette');
    var _ = require('underscore');

    return Marionette.ItemView.extend({
        //el and template: false can be used when we don't have template
        //el: $('#block'), //DOM элемент виджета
        //template: false, //template-less

        initialize: function(options){
            //copy controller, model, state to this.controller, model, state
            _.extend(this, options);
        },

        //template is used for static template, i.e. which is not changed depending on model's state
        //if we need dynamic template then getTemplate method should be used
        //template: function(serialized_model){
        //    return '#start';
        //},

        getTemplate: function(){
            return '#' + this.model.get('state');
        },

        //if you like to use some helper functions into your template
        //we can specify templateHelpers field with fields/functions used from template
        //E.g. underscore doesn't support templateHelpers as long as HBs supports that
        //
        //Details: http://marionettejs.com/docs/v2.4.7/marionette.view.html#viewtemplatehelpers
        templateHelpers: function () {
            return {
                testFunction1: function(){
                    //from templateHelpers we need to refer to out links with this prefix
                    return "test function 1 with model state: " + this.model.state;
                },

                testField1: "test field 1"
            };
        },

        events: {
            'click input:button': 'check',  //Обработчик клика на кнопке "Проверить"
            'keyup input:text': 'keyPressEventHandler' //Обработчик нажатия enter в тексовом поле
        },

        modelEvents: {
            //it's the same as this.listenTo(this.model, 'change:state', this.render, this);
            'change:state' : 'render changeUrl'
        },

        onRender: function () {
            //find current model state (start|success\error)
            console.log('UserStateItemView is onRender');
        },

        changeUrl: function(){
            var state = this.model.get('state');
            if (state == 'start'){
                // false потому, что нам не надо вызывать обработчик у Router
                this.router.navigate('!/', false);
            }else{
                this.router.navigate('!/' + state, false);
            }
        },

        check: function () {
            //if I write this.el.find() then I'ill get an error $(this.el).find is not a function
            //it happens because my DOM structure is initialized before assigning el to $('start')
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

        keyPressEventHandler: function(event){
            if (event.keyCode == 13){
                //it's interesting if I invoke this.render() then method above is executed
                //but data is not updated in UI
                $('input:button').click();
            }
        }
    });

});
