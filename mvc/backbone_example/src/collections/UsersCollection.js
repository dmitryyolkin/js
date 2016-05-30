/**
 * Created by dmitry on 30.05.16.
 */
'use strict';

define(function(require){
    var backbone = require('backbone');

    return backbone.Collection.extend({

        initialize: function(options){
            //_,extend копирует все св-ва (в частности model) из destination = options в source = this
            _.extend(this, options);
        },

        checkUser: function(username){
            var foundUser = this.find(function(user){
                //it's a bit strange if I compare user.username then this check is always false
                return user.get('username') == username;
            });
            return foundUser != null;
        }
    });

});