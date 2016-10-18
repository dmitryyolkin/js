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
    }

});