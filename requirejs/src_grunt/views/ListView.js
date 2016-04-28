/**
 * Created by yolkin on 20.04.2016.
 */

define(function(){

    function _render(users){
        var appDiv = document.getElementById('app');
        var html = '<ul>';
        for (var i = 0; i < users.length; i++){
            html += '<li>' + users[i].name + '</li>';
        }
        html += '</ul>';
        appDiv.innerHTML = html;
    }

    //таким образом выставляется публичный интерфейс
    return {
        render: _render
    };

});
