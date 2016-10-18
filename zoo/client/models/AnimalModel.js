/**
 * Created by dmitry on 17.10.16.
 */
'use strict';

var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
    defaults: {
        order: null,
        name: 'undefined',
        species: "undefined",
        age: null,
        cage: null,
        keeper: 'undefined'
    }
});
