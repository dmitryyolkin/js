/**
 * Created by dmitry on 13.05.16.
 */

'use strict';

define(function(require){

    var backbone = require('backbone');
    var Controller = require('./controller/Controller');
    var View = require('./views/View');

    //start Routing
    var controller = new Controller();
    var view = new View();

    //Run HTML5 History API push
    //https://habrahabr.ru/post/123106/
    backbone.history.start();

});