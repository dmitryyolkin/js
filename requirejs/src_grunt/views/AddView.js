/**
 * Created by yolkin on 20.04.2016.
 */

define(function(require){

    function _render(AddController){
        var $ = require('jquery');

        var appDiv = $('#app');
        appDiv.html("<input id='user-name' /><button id='addBtn'>Add this user</button>");

        var addBtn = $('#addBtn');
        var userNameInput = $('#user-name');
        addBtn.click(function(){
            AddController.addUser(userNameInput.val());
        })
    }

    //таким образом выставляется публичный интерфейс
    return {
        render: _render
    }
});
