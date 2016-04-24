/**
 * Created by dmitry on 17.04.16.
 */

require(function(require){

     console.log('main');

     var User = require('../models/User');
     var Router = require('../Router');

     var users = [];
     for (var i = 0; i < 3; i++){
          users[i] = new User('user' + i);
     }

     localStorage.users = localStorage.users || JSON.stringify(users);
     Router.startRouting();
});