/**
 * Created by dmitry on 17.10.16.
 */
'use strict';

var Backbone = require('backbone');
var UserModel = require('./UserModel');

module.exports = Backbone.Collection.extend({
    model: UserModel,
    url: '/users',

    initialize: function(options){
        _.extend(this, options);

        //initialize collection from back-end
        //otherwise it will be empty
        var users = this;
        users.fetch().done(function() {
            users.each(function(item){
                console.log(item.get('name'));
            });
        });
    }

});