/**
 * Created by dmitry on 18.05.16.
 */

'use strict';

define(function(require){

    var backbone = require('backbone');
    var _ = require('underscore');

    //Model
    var User = require('./models/User');

    //Controller
    var Controller = require('./controller/Controller');

    //Views
    var StartView = require('./views/Start');
    var SuccessView = require('./views/Success');
    var ErrorView = require('./views/Error');

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
            this.Routers.Controller = new Controller(_.pick(this, 'Views'));

            //views
            this.Views.StartView = new StartView(_.pick(this, 'Routers', 'data'));
            this.Views.SuccessView = new SuccessView(_.pick(this, 'data'));
            this.Views.ErrorView = new ErrorView(_.pick(this, 'data'));

            //data set
            this.data.username = "";

            //Run HTML5 History API push
            //https://habrahabr.ru/post/123106/
            backbone.history.start();
        }
    };

});