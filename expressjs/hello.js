'use strict';

var express = require("express");
var app = express();

app.get('/', function(req, res){
    res.send('Hello world');
});

//if you visit localhost:3000 then you will see 'Hello world' msg
app.listen(3000, function(){
    console.log("Request is got");
});