/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Marionette = require('marionette');
var AdminScreenTemplate = require("hbs!templates/admin/adminScreen");

var MainMenuView = require("./../MainMenuView");
var AdminUserEditorView = require("./AdminUserEditorView");
var AdminUserTableView = require("./AdminUserTableView");

module.exports = Marionette.View.extend({
    el: "body",
    template: AdminScreenTemplate,

    regions: {
        header: "#mainMenu",
        userTable: "#user-table",
        userEditor: "#user-editor"
    },

    initialize: function (options) {
        _.extend(this, options);
    },

    onRender: function () {
        this.showChildView('header', new MainMenuView());
        this.showChildView('userTable', new AdminUserTableView({
            collection: this.collection
        }));

        //todo comment this view
        this.showChildView('userEditor', new AdminUserEditorView());

        console.log("AdminView onRender");
    }

});


