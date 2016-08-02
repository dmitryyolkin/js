/**
 * Created by dmitry on 27.07.16.
 */
'use strict';

define(function(require){
    var Marionette = require('marionette');
    var UserStateItemView = require('./UserStateItemView');
    var _ = require('underscore');

    return Marionette.LayoutView.extend({
        el: 'body',

        regions: {
            block: '#block'
        },

        initialize: function(options){
            //map region to view
            this.showChildView('block', new UserStateItemView(options));
        },

        onBeforeShow: function() {
            //we can put some code here that will be invoked before
            //this layoutView will be rendered
        }

    });
});
