/**
 * Created by dmitry on 17.10.16.
 */
'use strict';

var Backbone = require('backbone');
var AnimalModel = require('./AnimalModel');

module.exports = Backbone.Collection.extend({
    model: AnimalModel,
    url: '/animals',

    initialize: function(options){
        _.extend(this, options);

        //initialize collection from back-end
        //otherwise it will be empty
        var animals = this;
        animals.fetch().done(function() {
            animals.each(function(item){
                console.log(item.get('name'));
            });
        });
    }

});