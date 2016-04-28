/**
 * Created by yolkin on 20.04.2016.
 */

define(function(){

    function User(name){
        this.name = name || 'Default name';
    }

    //таким образом выставляется публичный интерфейс
    return User;
});