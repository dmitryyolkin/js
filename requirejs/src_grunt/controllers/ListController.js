/**
 * Created by yolkin on 20.04.2016.
 */

define(function(require){
    //путь определяется файла, который мы запускаем
    //в нашем случае это будет index.html
    var ListView = require('../views/ListView');

    function _start(){
        ListView.render(JSON.parse(localStorage.users));
    }

    //таким образом выставляется публичный интерфейс
    return {
        start: _start
    }
});
