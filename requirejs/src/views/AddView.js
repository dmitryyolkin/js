/**
 * Created by yolkin on 20.04.2016.
 */

define(function(){

    function _render(AddController){
        var appDiv = document.getElementById('app');
        appDiv.innerHTML = "<input id='user-name' /><button id='addBtn'>Add this user</button>";

        var addBtn = document.getElementById('addBtn');
        var userNameInput = document.getElementById('user-name');
        addBtn.addEventListener('click', function(){
            AddController.addUser(userNameInput.value);
        }, false)
    }

    return {
        render: _render
    }
});
