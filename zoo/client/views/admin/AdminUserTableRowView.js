/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Marionette = require('marionette');
var AdminUserTableRowTemplate = require("hbs!templates/admin/adminUserTableRow");

module.exports = Marionette.View.extend({
    tagName: "tr",
    className: 'user-table-row',
    template: AdminUserTableRowTemplate,

    initialize: function (options) {
        _.extend(this, options);
    },

    //it's required to show data in hbs template
    serializeData: function () {
        var user = this.model.attributes;
        return {
            name: user.name,
            surname: user.surname,
            email: user.email,
            login: user.login,
            roles: user.roles,
            animals: user.animals
        };
    }

});

