/**
 * Created by dmitry on 06.07.16.
 */

define(function(require){
    var App = require('./App');

    //we can pass some options that will be available for all mudules
    //within initialization process
    var options = {
        mode: 'test-mode'
    };
    App.start(options)
});