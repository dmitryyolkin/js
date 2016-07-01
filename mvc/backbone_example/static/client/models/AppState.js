/**
 * Created by dmitry on 30.06.16.
 */
'use strict';

define(function(require){

    var backbone = require('backbone');
    return backbone.Model.extend({
        defaults: {
            state: 'start',
            username: ''
        }
    });

});
