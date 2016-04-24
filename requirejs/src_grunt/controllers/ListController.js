/**
 * Created by yolkin on 20.04.2016.
 */

define(function(require){
    var ListView = require('../views/ListView');

    function _start(){
        ListView.render(JSON.parse(localStorage.users));
    }

    return {
        start: _start
    }
});
