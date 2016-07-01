/**
 * Created by dmitry on 13.05.16.
 */

'use strict';

define(function(require){
    var backbone = require('backbone');
    var _ = require('underscore');

    var User = require('./models/User');
    var AppState = require('./models/AppState');

    var UsersCollection = require('./collections/UsersCollection');
    var Controller = require('./controllers/Controller');
    var BlockView = require('./views/Block');

    //Model + Controller + View
    var Models = {};
    var Collections = {};
    var Routers = {};
    var Views = {};

    //Model
    Models.AppState = new AppState();

    //Collections
    Collections.UsersCollection = new UsersCollection({
        model: User,
        url: '/users'
    });

    //Controller
    //_.pick - берет из options только значения Views
    Routers.Controller = new Controller({
        model: Models.AppState
    });

    //views
    Views.BlockView = new BlockView({
        model: Models.AppState,
        collection: Collections.UsersCollection
    });

    //Run HTML5 History API push
    //https://habrahabr.ru/post/123106/
    backbone.history.start();

    //fire 'change' event on model to represent data because model was created before view
    Models.AppState.trigger('change');
});