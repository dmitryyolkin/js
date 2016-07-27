'use strict';

var request = new XMLHttpRequest();
//open connection
//false means synchronous request, true - asynchronous
request.open('GET', 'example.html', true);
request.addEventListener('load', function(){
    console.log(request.status, request.statusText);
    console.log(request.responseText);
});

//send something, e.g. String|Blob and so on
request.send(null);

