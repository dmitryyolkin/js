/**
 * Created by dmitry on 18.05.16.
 */

'use strict';

define(function(require){

    var backbone = require('backbone');
    var _ = require('underscore');

    //Model + Controller + View
    var User = require('./models/User');
    var Controller = require('./controller/Controller');
    var BlockView = require('./views/Block');

    return {
        Models: {},
        Routers: {},
        Views: {},
        data: {},

        init: function () {
            //Model
            this.Models.User = new User();

            //Controller
            //_.pick - берет из options только значения Views
            this.Routers.Controller = new Controller({
                model: this.Models.User
            });

            //views
            this.Views.BlockView = new BlockView({
                model: this.Models.User,
                controller: this.Routers.Controller
            });

            //Run HTML5 History API push
            //https://habrahabr.ru/post/123106/
            backbone.history.start();

            //fire 'change' event on model to represent data because model was created before view
            this.Models.User.trigger('change');
        }
    };

});