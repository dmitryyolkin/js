/**
 * Created by dmitry on 27.07.16.
 */
'use strict';

define(function(require){
    //imports
    var Marionette = require('marionette');

    var UserRouter = require('./UserRouter');
    var UserController = require('./UserController');
    var UsersCollection = require('./UsersCollection');
    var UserView = require('./views/UserView');

    var User = require('./models/User');
    var AppState = require('./models/AppState');

    return Marionette.Module.extend({
        startWithParent: true,

        onStart: function(options){
            console.log('UserModule.onStart mode: ' + options.mode);

            var appStateModel = new AppState();
            var controller = new UserController({
                model: appStateModel
            });
            var router = new UserRouter({
                controller: controller
            });

            var usersCollection = new UsersCollection({
                model: User,
                url: '/users'
            });

            new UserView({
                model: appStateModel,
                collection: usersCollection
            });

            //bind model change with navigation - it's needed for changing hash tag in URL
            //I don't know most correct place for binding model and controller - so I've put it here
            appStateModel.bind('change:state', function(){
                var state = appStateModel.get('state');
                if (state == 'start'){
                    // false потому, что нам не надо вызывать обработчик у Router
                    router.navigate('!/', false);
                }else{
                    router.navigate('!/' + state, false);
                }
            });

            //fire 'change' event on model to represent data because model was created before view
            appStateModel.trigger('change');
        }
    });
});
