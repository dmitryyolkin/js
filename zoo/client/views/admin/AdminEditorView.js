/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Marionette = require('marionette');
var AdminEditorTemplate = require("hbs!templates/adminEditor");

module.exports = Marionette.View.extend({
    template: AdminEditorTemplate,

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        console.log("AdminEditor onRender");
    }

});

