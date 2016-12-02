/**
 * Created by dmitry on 02.12.16.
 */
'use strict';

var Marionette = require('marionette');
var AnimalRowView = require("./AnimalRowView");

module.exports = Marionette.CollectionView.extend({
    tagName: 'tbody',
    childView: AnimalRowView
});
