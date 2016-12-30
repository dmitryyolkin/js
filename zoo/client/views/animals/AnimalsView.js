/**
 * Created by dmitry on 28.09.16.
 */
'use strict';

var Marionette = require('marionette');
var ZooMainTemplate = require("hbs!templates/animalsScreen");

var MainMenuView = require("./../MainMenuView");
var AnimalsTableView = require("./AnimalsTableView");

module.exports = Marionette.View.extend({
    el: "body",
    template: ZooMainTemplate,

    regions: {
        header: "#zoo-header",
        main: "#zoo-main"
    },

    initialize: function (options) {
        _.extend(this, options);
    },

    onRender: function(){
        this.showChildView('header', new MainMenuView());
        this.showChildView('main', new AnimalsTableView({
            collection: this.collection
        }));

        console.log("AnimalsView onRender");
    }

});

