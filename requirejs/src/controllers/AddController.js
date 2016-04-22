/**
 * Created by yolkin on 20.04.2016.
 */

define(['views/AddView', 'models/User'], function(AddView, User){
    function _start(){
        AddView.render(this);
    }

    function _addUser(name){
        var users = JSON.parse(localStorage.users);
        users.push(new User(name));
        localStorage.users = JSON.stringify(users);

        //move to #hash
        window.location.hash = '#list';
    }

    return {
        start: _start,
        addUser: _addUser
    }
});
