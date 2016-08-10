/**
 * Created by dmitry on 30.06.16.
 */
'use strict';

var Backbone = require('backbone');
module.exports = Backbone.Model.extend({
    defaults: {
        state: 'start',
        username: ''
    }
});

