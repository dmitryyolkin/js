/**
 * Created by dmitry on 25.05.16.
 */
'use strict';

define(function(require){
    var backbone = require('backbone');

    return backbone.Model.extend({
        idAttribute: "id",
        defaults: {
            username: '',
            state: 'start'
        }
    });
});