/**
 * Created by dmitry on 26.07.16.
 */
'use strict';

var Marionette = require('marionette');

module.exports = Marionette.AppRouter.extend({

    initialize: function(options){
        //set controller to this.controller
        _.extend(this, options);
    },

    //ставит в соответсвие hash-tag и обработчик
    appRoutes: {
        "": "start", //Пустой hash-тег
        "!/": "start", //initial page
        "!/success": "success", //success hash-tag
        "!/error": "error" //error hash-tag
    }

});
