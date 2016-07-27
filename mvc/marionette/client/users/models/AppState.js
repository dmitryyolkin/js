/**
 * Created by dmitry on 30.06.16.
 */
'use strict';

define(function(require){

    var Backbone = require('backbone');
    return Backbone.Model.extend({
        defaults: {
            state: 'start',
            username: ''
        }
    });

});
