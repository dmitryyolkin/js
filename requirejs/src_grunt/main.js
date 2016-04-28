/**
 * Created by dmitry on 17.04.16.
 */

define(function(require){

     console.log('main');

     var User = require('./models/User');
     var Router = require('./Router');

     //underscore and jQuery is added for test only
     var _ = require("underscore");
     var $ = require("jquery");

     var users = [];
     for (var i = 0; i < 3; i++){
          users[i] = new User('user' + i);
     }

     //only for test to check how build process works
     console.log("users size = " + _.size(users));
     console.log($("app"));

     localStorage.users = localStorage.users || JSON.stringify(users);
     Router.startRouting();
});