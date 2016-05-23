/**
 * Created by dmitry on 20.05.16.
 */
'use strict';

define(function(require){
    var Backbone = require('backbone');
    var $ = require('jquery');
    var _ = require('underscore');

    return Backbone.View.extend({
        el: $('#block'), //DOM element

        initialize: function(options){
            //_,extend копирует все св-ва из destination = options в source = this
            _.extend(this, options);
        },

        template: _.template($('#error').html()),

        render: function () {
            $(this.el).html(this.template(this.data));
        }
    });
});