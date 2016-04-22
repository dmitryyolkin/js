/**
 * Created by dmitry on 17.04.16.
 */

require(['models/User', 'Router'], function(User, Router){
     var users = [];
     for (var i = 0; i < 3; i++){
          users[i] = new User('user' + i);
     }

     localStorage.users = JSON.stringify(users);
     Router.startRouting();
});