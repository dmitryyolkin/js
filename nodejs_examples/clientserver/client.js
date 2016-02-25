/**
 * Created by dmitry on 10.12.15.
 */
'use strict';

var http = require('http');
var request = http.request(
    //request description
    {
        hostname: "localhost",
        port: 8000,
        path: "/hello",
        method: 'GET',
        headers: {Accept: "text/html"}
    },
    //callback
    function(response){
        console.log('Server staus code: ' + response.statusCode);
    }
);
request.end();