/**
 * Created by dmitry on 27.07.16.
 */
'use strict';

var Marionette = require('marionette');
var UserStateItemView = require('./UserStateItemView');
var _ = require('underscore');

module.exports = Marionette.LayoutView.extend({
    el: 'body',

    regions: {
        block: '#block'
    },

    initialize: function(options){
        console.log('UserlayoutView is initialize');
        this.showChildView('block', new UserStateItemView(options));
    },

    onShow: function() {
        //we can put some code here that will be invoked on show
        //A common use case for the onShow method is to use it to add children views.
        console.log('UserLayoutView is onShow');
    },

    onRender: function() {
        //we can put some code here that will be invoked before
        //this layoutView will be rendered
        console.log('UserLayoutView is onRender');
    }

});
