/**
 * Created by dmitry on 22.07.16.
 */
'use strict';

define(function(require){
    var Marionette = require('marionette');

    var controller = {
        f1: function(){
            console.log('handler f1');
        }
    };

    var AppRouter = Marionette.AppRouter.extend({
        controller: controller,

        // "f1" метод должен существовать в controller.someMethod
        //все эти роуты работают через хеш - теги, т.е. надо писать к примеру localhost:3000/#routes/1
        //Если мы напишем без #, т.е.localhost:3000/routes/1 , то пойдет запрос к серверу
        appRoutes: {
            'routes/1': 'f1'
        },

        /* стандартные роуты могут быть примиксованы с appRoute  */
        routes: {
            'routes/2': 'f2'
        },

        f2: function(){
            console.log('handler f2');
        }
    });

    return AppRouter;
});
