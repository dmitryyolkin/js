/**
 * Created by dmitry on 28.09.16.
 */
'use strict';

var Marionette = require('marionette');
var ZooHeaderTemplate = require("hbs!templates/zooHeader");

module.exports = Marionette.View.extend({
    template: ZooHeaderTemplate,

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        console.log("ZooHeaderView onRender");
    }

});
