/**
 * Created by dmitry on 26.07.16.
 */
'use strict';

define(function(require){
    var Marionette = require('marionette');
    return Marionette.AppRouter.extend({

        //ставит в соответсвие hash-tag и обработчик
        appRoutes: {
            "": "start", //Пустой hash-тег
            "!/": "start", //initial page
            "!/success": "success", //success hash-tag
            "!/error": "error" //error hash-tag
        }

    });
});
