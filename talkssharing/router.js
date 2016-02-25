/**
 * Created by dmitry on 16.12.15.
 */
'use strict';

/**
 * This class provides matching between path and hadler function is needed to handle this path
 */

var Router = module.exports = function(){
    this.routes = [];
};

/**
 * add new route for handling
 */
Router.prototype.add = function(method, url, handler){
    this.routes.push({
        method: method,
        url: url,
        handler: handler
    });
};

/**
 * @returns {boolean} true if handler is found and invoked. Otherwise false
 */
Router.prototype.resolve = function(request, response){
    var path = require('url').parse(request.url).pathname;
    return this.routes.some(function(route){
        var match = route.url.exec(path);
        if (!match || route.method != request.method){
            return false;
        }

        //decode URL to usual string (e.g. replace %20 with ' ' and so on)
        var urlParts = match.slice(1).map(decodeURIComponent);
        route.handler.apply(
            null,
            [request, response].concat(urlParts)
        );
        return true;
    });
};