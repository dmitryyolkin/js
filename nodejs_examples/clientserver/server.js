/**
 * Created by dmitry on 10.12.15.
 */
'use strict';

var http = require('http');
var server = http.createServer(function(request, response){
    response.writeHead(200, {"Content-Type": "text/html"});
    //request.url - путь после сервера и порта
    response.write("<h1>Hello</h1> You asked for <code>" + request.url + "</code></p>");
    response.end();
});
server.listen(8000);
