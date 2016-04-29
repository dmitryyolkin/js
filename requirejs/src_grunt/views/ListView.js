/**
 * Created by yolkin on 20.04.2016.
 */

define(function(require){

    function _render(users){
        var $ = require('jquery');
        var _ = require('underscore');

        var appDiv = $('#app');
        var html = '<ul>';

        _.each(users, function(user){
            html += '<li>' + user.name + '</li>';
        });

        html += '</ul>';
        appDiv.html(html);
    }

    //таким образом выставляется публичный интерфейс
    return {
        render: _render
    };

});