/**
 * Created by dmitry on 17.04.16.
 */

require(['models/User', 'controllers/ListController'], function(User, ListController){
     var users = [];
     for (var i = 0; i < 3; i++){
          users[i] = new User('user' + i);
     }

     localStorage.users = JSON.stringify(users);
     ListController.start();
});