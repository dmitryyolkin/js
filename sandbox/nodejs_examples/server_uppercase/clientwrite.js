/**
 * Created by dmitry on 11.12.15.
 */
'use strict';

var http = require('http');
var request = http.request(
    {
        hostname: "localhost",
        port: 8000,
        path: "/hello",
        method: "POST"
    },
    function(response){
        response.on('data', function(chunk){
            //process stdout is used instead of console
            process.stdout.write(chunk.toString());
        });
        response.on('end', function(){
            console.log('on end');
        });
    }
);
request.end('Hello Server!!!');