/**
 * Created by dmitry on 27.09.16.
 */
'use strict';

var Backbone = require('backbone');
module.exports = Backbone.Model.extend({
    user: {
        login: 'test',
        password: ''
    },
    url: '/login'
});

