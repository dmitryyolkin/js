/**
 * Created by dmitry on 16.05.16.
 */
define(function(require){

    var backbone = require('backbone');
    var $ = require("jquery");

    function _start(){
        var Controller = backbone.Router.extend({

            //ставит в соответсвие hash-tag и обработчик
            routes: {
                "": "start", //Пустой hash-тег
                "!/": "start", //initial page
                "!/success": "success", //success hash-tag
                "!/error": "error" //error hash-tag
            },

            start: function(){
                $(".block").hide();
                $("#start").show();
            },

            success: function(){
                $(".block").hide();
                $("#success").show();
            },

            error: function(){
                $(".block").hide();
                $("#error").show();
            }

        });

        //create controller
        var controller = new Controller();

        //Run HTML5 History API push
        //https://habrahabr.ru/post/123106/
        backbone.history.start();
    }

    return {
        startRouting: _start
    }

});
