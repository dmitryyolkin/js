/**
 * Created by dmitry on 28.09.16.
 */
'use strict';

var Marionette = require('marionette');
var AnimalsTemplate = require("hbs!templates/animals");

module.exports = Marionette.ItemView.extend({
    el: 'body',

    initialize: function (options) {
        _.extend(this, options);
        Backbone.history.navigate('animals');
    },

    template: AnimalsTemplate,

    //it's required to show data in hbs template
    serializeData: function () {
        return {
            animals: this.collection
        };
    }

});

