/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Backbone = require('backbone');
module.exports = Backbone.Model.extend({
    //urlRoot is needed to be able to get a certain user by id
    //e.g. new User({id: 'some id'}).fetch();
    urlRoot: '/users',
    defaults: {
        name: null,
        surname: null,
        email: null,
        login: null,
        roles: [],
        animals: []
    }
});

