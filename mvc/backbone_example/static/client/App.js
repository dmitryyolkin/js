/**
 * Created by dmitry on 18.05.16.
 */

'use strict';

define(function(require){

    var backbone = require('backbone');
    var _ = require('underscore');

    //Model + Controller + View
    var User = require('./models/User');
    var UsersCollection = require('./collections/UsersCollection');
    var Controller = require('./controllers/Controller');
    var BlockView = require('./views/Block');

    return {
        Models: {},
        Collections: {},
        Routers: {},
        Views: {},
        data: {},

        init: function () {
            //Model
            this.Models.User = new User();

            //Collections
            this.Collections.UsersCollection = new UsersCollection([
                {username: 'test'},
                {username: 'test1'}
            ]);

            //Controller
            //_.pick - берет из options только значения Views
            this.Routers.Controller = new Controller({
                model: this.Models.User
            });

            //views
            this.Views.BlockView = new BlockView({
                model: this.Models.User,
                controller: this.Routers.Controller,
                collection: this.Collections.UsersCollection
            });

            //Run HTML5 History API push
            //https://habrahabr.ru/post/123106/
            backbone.history.start();

            //fire 'change' event on model to represent data because model was created before view
            this.Models.User.trigger('change');
        }
    };

});