/**
 * Created by dmitry on 06.07.16.
 */

'use strict';

var App = require('./App');

//require jquery is for example and be able to invoke $(document).ready(main) from index.hbs
//if we use backbone or jquery then his require is not needed
var $ = require('jquery');

module.exports = function(){
    console.log('main is started');

    //just in case to pass something in Marionetter application
    var options = {};
    App.start(options)
};
