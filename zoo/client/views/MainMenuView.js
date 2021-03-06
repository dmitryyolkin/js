/**
 * Created by dmitry on 28.09.16.
 */
'use strict';

var Marionette = require('marionette');
var MainMenuTemplate = require("hbs!templates/mainMenu");

module.exports = Marionette.View.extend({
    template: MainMenuTemplate,

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        console.log("MainMenuView onRender");
    }

});
