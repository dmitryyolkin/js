/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Backbone = require('backbone');
module.exports = Backbone.Model.extend({
    user: {
        name: null,
        surname: null,
        email: null,
        login: null,
        roles: [],
        animals: []
    },
    url: '/user'
});

