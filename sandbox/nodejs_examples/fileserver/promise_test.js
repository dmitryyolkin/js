/**
 * Created by dmitry on 15.12.15.
 */
'use strict';

var http = require('http');
var promise = require('promise');
var fs = require('fs');

http.createServer(function(request, response){
    function urlToPath(url){
        var path = require('url').parse(url).pathname;
        return '.' + decodeURIComponent(path);
    }

    var path = urlToPath(request.url);

    //'denodeify' function creates promise
    //if promises are not used then we have to pass some callback function in a method
    //and check error code
    var readFile = promise.denodeify(fs.readFile);
    readFile(path, 'utf8').then(
        function(data){
            response.writeHead(200, {"Content-type" : "text/plain"});
            response.write(data);
            response.end();
        },
        function(error){
            response.writeHead(400, {"Content-type" : "text/plain"});
            response.write("Can't read file: " + path + ", reason: " + error.toString());
            response.end();
        }
    );


}).listen(8000);
