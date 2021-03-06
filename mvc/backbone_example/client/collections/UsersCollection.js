/**
 * Created by dmitry on 30.05.16.
 */
'use strict';

define(function(require){
    var Backbone = require('Backbone');

    return Backbone.Collection.extend({

        initialize: function(options){
            //_,extend копирует все св-ва (в частности model) из destination = options в source = this
            _.extend(this, options);
        },

        parse: function(response){
            //here we can parse response somehow and wrap it in a interesting result
            return response;
        },

        checkUser: function(username, model){
            //fetch is used for Lazy loading
            //and results are returned asynchroniously

            //check is done on clietn side what can be extremelly long
            this.fetch({
                success: function(collection, response){
                    var foundUser = _.find(collection.models, function(user){
                        //it's a bit strange if I compare user.username then this check is always false
                        return user.get('username') == username;
                    });

                    //set state
                    model.set({
                        'state': foundUser != null ? 'success' : 'error',
                        'username': username
                    });
                    return true;
                },
                error: function(collection, response){
                    console.error(response.status);
                    model.set({
                        'state': 'error',
                        'username': username
                    });
                    return false;
                }
            });
        }
    });

});