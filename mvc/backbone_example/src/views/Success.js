/**
 * Created by dmitry on 20.05.16.
 */
'use strict';

define(function(require){
    var Backbone = require('backbone');
    var $ = require('jquery');
    var _ = require('underscore');

    return Backbone.View.extend({
        el: $('#block'),

        initialize: function(options){
            _.extend(this, options);
        },

        template: _.template($('#success').html()),

        render: function () {
            $(this.el).html(this.template(this.data));
        }
    });
});