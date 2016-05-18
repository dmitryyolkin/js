/**
 * Created by dmitry on 17.05.16.
 */

define(function(require){
    var backbone = require('backbone');
    var $ = require("jquery");

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

    return new Controller();
});
