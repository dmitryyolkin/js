/**
 * Created by dmitry on 28.09.16.
 */
'use strict';

var Marionette = require('marionette');
var AnimalsTemplate = require("hbs!templates/animals/animalsTable");
var AnimalTableBodyView = require("./AnimalTableBodyView");


//Details http://marionettejs.com/docs/v3.0.0/marionette.collectionview.html#rendering-tables
module.exports = Marionette.View.extend({
    //all template's content will be wrapped with 'table' tag
    template: AnimalsTemplate,

    regions: {
        body: {
            el: 'tbody',
            replaceElement: true
        }
    },

    initialize: function (options) {
        _.extend(this, options);
        Backbone.history.navigate('animals');
    },

    onRender: function(){
        this.showChildView('body', new AnimalTableBodyView({
            collection: this.collection
        }));
    }

});

