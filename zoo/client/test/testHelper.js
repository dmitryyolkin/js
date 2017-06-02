/**
 * Created by dmitry on 20.03.17.
 */
'use strict';

module.exports = {
    pow: function(x, n) {
        var result = 1;

        for (var i = 0; i < n; i++) {
            result *= x;
        }
        return result;
    }

};
