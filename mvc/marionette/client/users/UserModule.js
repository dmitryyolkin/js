/**
 * Created by dmitry on 27.07.16.
 */
'use strict';

//imports
var Marionette = require('marionette');

var UserRouter = require('./UserRouter');
var UserController = require('./UserController');
var UsersCollection = require('./UsersCollection');
var UserLayoutView = require('./views/layout/UserLayoutView');

var User = require('./models/User');
var AppState = require('./models/AppState');

module.exports = Marionette.Module.extend({
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

        var usersLayoutView = new UserLayoutView({
            model: appStateModel,
            collection: usersCollection,
            router: router
        });
        usersLayoutView.render();

    }
});
