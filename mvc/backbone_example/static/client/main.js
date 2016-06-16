/**
 * Created by dmitry on 13.05.16.
 */

'use strict';

define(function(require){
    var backbone = require('backbone');
    var _ = require('underscore');

    var User = require('./models/User');
    var UsersCollection = require('./collections/UsersCollection');
    var Controller = require('./controllers/Controller');
    var BlockView = require('./views/Block');

    //Model + Controller + View
    var Models = {};
    var Collections = {};
    var Routers = {};
    var Views = {};

    //Model
    Models.User = new User();

    //Collections
    Collections.UsersCollection = new UsersCollection({
        model: User,
        url: '/users'
    });

    //Controller
    //_.pick - берет из options только значения Views
    Routers.Controller = new Controller({
        model: Models.User
    });

    //views
    Views.BlockView = new BlockView({
        model: Models.User,
        controller: Routers.Controller,
        collection: Collections.UsersCollection
    });

    //Run HTML5 History API push
    //https://habrahabr.ru/post/123106/
    backbone.history.start();

    //fire 'change' event on model to represent data because model was created before view
    Models.User.trigger('change');
});