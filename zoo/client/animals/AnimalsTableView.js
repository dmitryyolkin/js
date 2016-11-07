/**
 * Created by dmitry on 28.09.16.
 */
'use strict';

var Marionette = require('marionette');
var AnimalsTemplate = require("hbs!templates/animals");
var AnimalRowView = require("./AnimalRowView");

//Details http://marionettejs.com/docs/master/marionette.collectionview.html#rendering-tables
module.exports = Marionette.CompositeView.extend({
    //parent element used to attach our template
    el: "body",
    //all template's content will be wrapped with 'table' tag
    tagName: 'table',
    className: 'animalsTable table-hover',
    template: AnimalsTemplate,

    childView: AnimalRowView,
    childViewContainer: 'tbody',

    initialize: function (options) {
        _.extend(this, options);
        Backbone.history.navigate('animals');
    }

});

