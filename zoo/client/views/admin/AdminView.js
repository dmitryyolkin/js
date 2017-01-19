/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Marionette = require('marionette');
var _ = require('underscore');
var AdminScreenTemplate = require("hbs!templates/admin/adminScreen");
var MainMenuView = require("./../MainMenuView");

var UserModel = require("./../../models/UserModel");
var AdminUserEditorView = require("./AdminUserEditorView");
var AdminUserTableView = require("./AdminUserTableView");

function getQueryStrParam(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) {
        return null;
    }
    if (!results[2]) {
        return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

module.exports = Marionette.View.extend({
    el: "body",
    template: AdminScreenTemplate,

    regions: {
        header: "#mainMenu",
        userTable: "#admin-users",
        userEditor: "#admin-user-editor"
    },

    initialize: function (options) {
        _.extend(this, options);
    },

    onRender: function () {
        this.showChildView('header', new MainMenuView());
        var userId = getQueryStrParam('id');
        if (userId) {
            //show user details
            new UserModel({
                id: userId
            }).fetch({
                    success: _.bind(function (userModel) {
                        this.detachChildView('userTable');
                        this.showChildView('userEditor', new AdminUserEditorView({
                            model: userModel
                        }));
                    }, this)
                }
            );
        } else {
            //show all users
            this.detachChildView('userEditor');
            this.showChildView('userTable', new AdminUserTableView({
                collection: this.collection
            }));
        }

        console.log("AdminView onRender");
    }

});


