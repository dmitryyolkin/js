/**
 * Created by dmitry on 25.05.16.
 */
'use strict';

//I splitted out AppState and User because logically it's two different models
//  User saves all info regarding user profile
//  AppState - it's state for BlockView
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
    idAttribute: "id",
    defaults: {
        username: ''
    }
});
