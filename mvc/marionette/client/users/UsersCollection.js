/**
 * Created by dmitry on 27.07.16.
 */
'use strict';

define(function(require){
    var Backbone = require('backbone');

    return Backbone.Collection.extend({

        initialize: function(options){
            //_,extend копирует все св-ва (в частности model) из destination = options в source = this
            _.extend(this, options);
        }

    });

});