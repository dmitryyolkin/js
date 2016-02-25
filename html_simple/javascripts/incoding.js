/**
 * Created by dmitry on 26.11.15.
 */
'use strict';

var message = encodeURI('Hello world');
console.log(message); //Hello%20world
console.log(decodeURI(message)); //Hello world

