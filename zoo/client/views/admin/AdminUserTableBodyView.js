/**
 * Created by dmitry on 12.01.17.
 */
'use strict';

var Marionette = require('marionette');
var AdminUserTableRowView = require("./AdminUserTableRowView");

module.exports = Marionette.CollectionView.extend({
    tagName: 'tbody',
    childView: AdminUserTableRowView
});

