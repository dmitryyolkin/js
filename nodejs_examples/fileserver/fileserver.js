/**
 * Created by dmitry on 14.12.15.
 */
'use strict';

var http = require('http');
var fs = require('fs');


//METHODS creation
var methods = Object.create(null);

methods.GET = function(path, respond){
    console.log('Path: ' + path);
    fs.stat(path, function(error, stats){
        if (error && error.code == 'ENOENT'){
            //no file or directory
            respond(404, 'File not found');
        }else if (error){
            respond(500, error.toString());
        }else if (stats.isDirectory()){
            fs.readdir(path, function(error, files){
                if (error){
                    respond(500, error.toString());
                }else{
                    respond(200, files.join('\n'));
                }
            });
        }else{
            //create readable streem and pass it to respond
            respond(200, fs.createReadStream(path), require('mime').lookup(path));
        }
    });
};

methods.DELETE = function(path, respond){
    console.log('Path: ' + path);
    function respondErrorOrNothing(respond){
        return function(error){
            if (error){
                respond(500, error.toString())
            }else{
                respond(204);
            }
        }
    }

    fs.stat(path, function(error, stats){
        if (error && error.code == 'ENOENT'){
            respond(204);
        }else if (error){
            respond(500, error.toString());
        }else if (stats.isDirectory()){
            fs.rmdir(path, respondErrorOrNothing(respond));
        }else{
            fs.unlink(path, respondErrorOrNothing(respond));
        }
    });
};

methods.PUT = function(path, respond, request){
    console.log('Path: ' + path);
    var outputStream = fs.createWriteStream(path);
    outputStream.on('error', function(error){
        respond(500, error.toString());
    });
    outputStream.on('finish', function(){
        respond(204);
    });
    //forward input stream in output stream
    request.pipe(outputStream);
};

//create Server
http.createServer(function(request, response){
    function urlToPath(url){
        var path = require('url').parse(url).pathname;
        //decode URL to usual string (e.g. replace %20 with ' ' and so on)
        return '.' + decodeURIComponent(path);
    }

    function respond(code, body, type) {
        if (!type) {
            type = 'text/plain';
        }
        response.writeHead(code, {"Content-Type": type});
        if (body && body.pipe) {
            //forward data from readable to writable stream
            //end close response as well
            body.pipe(response);
        } else {
            response.end(body);
        }
    }

    if (request.method in methods){
        //respond - link to the method
        methods[request.method](urlToPath(request.url), respond, request);
    }else{
        respond(405, 'Method ' + request.method + ' is not found');
    }
}).listen(8000);

