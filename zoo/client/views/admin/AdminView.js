/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Marionette = require('marionette');
var AdminScreenTemplate = require("hbs!templates/adminScreen");

var MainMenuView = require("./../MainMenuView");
var AdminEditorView = require("./AdminEditorView");

module.exports = Marionette.View.extend({
    el: "body",
    template: AdminScreenTemplate,

    regions: {
        header: "#mainMenu",
        main: "#admin"
    },

    initialize: function (options) {
        _.extend(this, options);
    },

    onRender: function(){
        this.showChildView('header', new MainMenuView());
        this.showChildView('main', new AdminEditorView());

        console.log("AdminView onRender");
    }

});


