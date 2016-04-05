/**
 * Created by dmitry on 23.03.16.
 */
'use strict';

var _ = require('underscore');

//--------------------------------------------------------------
//------- Properties--------------------------------------------
//--------------------------------------------------------------

console.log('_.random');
console.log(_.random(0, 55)); //some random between [0..55]

console.log('_.uniqueId');
console.log(_.uniqueId('campaign'));//generates uniqueID like prefix + uniqueId for client-side models or DOM elements

console.log('_.escape');
//Escape String for insertion in HTML like <, > and so on
console.log(_.escape('Hello <my friend>')); //Result is Hello &lt;my friend&gt;!!

console.log('_.unescape');
console.log(_.unescape('Hello &lt;my friend&gt;!!')); //Result is Hello <my friend>

console.log('_.result');
var o = {
    name: 'Ivanov',
    work: function(){
        return 'swim';
    }
};
console.log(_.result(o, 'name')); //Result is Ivanov
console.log(_.result(o, 'work')); //Result is swim
console.log(_.result(o, 'age')); //Result is underfined
console.log(_.result(o, 'age', 10)); //Result is 10


console.log('_.template');
var template = _.template('Hello <%= name %>');
console.log(template({name: 'Ivanov'})); //Result is Hello Ivanov

//own templates can be specified with templateSettings (e.g. like for Mustache)
_.templateSettings = {
    interpolate: /\{\{(.+?)\}\}/g
};
var mustacheTemplate = _.template('Hello {{man}}');
console.log(mustacheTemplate({man: 'Petrov'}));//Hello Petrov


console.log('_.chain');
//_.chail allows to invoke chain of diferent methods on the same object
//It's quite similar with Collection.stream in Java8
//_.chain() method continues to return wrapped method until value() method is invoked
console.log(_.chain([3,1,2,4])
    .sortBy()
    .filter(function(element){
        return element > 1;
    })
    .value()
);