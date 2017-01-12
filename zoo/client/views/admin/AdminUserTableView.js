/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Marionette = require('marionette');
var AdminUserTableTemplate = require("hbs!templates/admin/adminUserTable");
var AdminUserTableBodyView = require("./AdminUserTableBodyView");

module.exports = Marionette.View.extend({
    template: AdminUserTableTemplate,

    regions: {
        body: {
            el: 'tbody',
            replaceElement: true
        }
    },

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        this.showChildView('body', new AdminUserTableBodyView({
            collection: this.collection
        }));

        console.log("AdminEditor onRender");
    }

});

