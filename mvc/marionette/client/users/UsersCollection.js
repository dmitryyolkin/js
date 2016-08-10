/**
 * Created by dmitry on 27.07.16.
 */
'use strict';

var Backbone = require('backbone');

module.exports = Backbone.Collection.extend({

    initialize: function(options){
        //_,extend копирует все св-ва (в частности model) из destination = options в source = this
        _.extend(this, options);
    }

});