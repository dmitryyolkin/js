/**
 * Created by dmitry on 18.05.16.
 */

'use strict';

define(function(require){

    var backbone = require('backbone');
    var Controller = require('./controller/Controller');
    var View = require('./views/View');

    return {
        Models: {},
        Routers: {},
        Views: {},
        data: {},

        init: function () {
            this.Routers.Controller = Controller;
            this.Views.View = View;

            //Run HTML5 History API push
            //https://habrahabr.ru/post/123106/
            backbone.history.start();
        }
    };

});