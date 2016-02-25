/**
 * Created by dmitry on 27.11.15.
 */
'use strict';

function getUrl(url, callback){
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.addEventListener('load', function(){
        if (request.status < 400){
            //all is ok
            callback(request, request.responseText);
        }else{
            //request is bad
            callback(null, new Error('Req failed: ' + request.statusText));
        }
    });

    //common server error
    request.addEventListener('error', function(){
        callback(null, new Error('Network failed'));
    });
    request.send(null);
}

//invoke get url and print result in console
getUrl('./fruits.xml', function(response, error){
    if (error != null){
        console.log(error);
    }else{
        console.log(response);
    }
});