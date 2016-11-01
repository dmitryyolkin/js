/**
 * Created by dmitry on 31.10.16.
 */
'use strict';

var Marionette = require('marionette');
var AnimalRowTemplate = require("hbs!templates/animalRow");

module.exports = Marionette.ItemView.extend({
    //all template's content will be wrapped with 'tr' tag
    tagName: "tr",
    template: AnimalRowTemplate,

    initialize: function (options) {
        _.extend(this, options);
    },

    //it's required to show data in hbs template
    serializeData: function () {
        var animal = this.model.attributes;
        return {
            name: animal.name,
            species: animal.species,
            age: animal.age,
            cage: animal.cage,
            keeper: animal.keeper
        };
    }

});
