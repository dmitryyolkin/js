/**
 * Created by dmitry on 17.03.16.
 */
'use strict';

var _ = require('underscore');

//--------------------------------------------------------------
//------- binding ----------------------------------------------
//--------------------------------------------------------------

var fHello = function(suffix){
    return 'hello ' + this.name + suffix;
};

console.log('_.bind');
//_.bind(function, object, *arguments)
//  bind is needed to link object and 'this' entity within function
//  arguments are apssed into function
var bindedF = _.bind(fHello, {name: 'Dmitry'}, '!!!');
console.log(bindedF()); //Result is Hello Dmitry!!!

//--------------------------------------------------------------
//------- Cache ------------------------------------------------
//--------------------------------------------------------------

console.log('_.memorize');
//_.memorize works like @Cached annotation
//it caches requests not to execute long code twice
var i = 0;
var cachedFunc = _.memoize(function(){
    return ++i;
});
console.log(cachedFunc());//Result is 1
console.log(cachedFunc());//The same result is 1

//--------------------------------------------------------------
//------- Asynchronous------------------------------------------
//--------------------------------------------------------------

var printMsg = function(msg){
    return console.log(msg);
};

console.log('_.delay');
//Result is 'Dmitry' printed in 1000 ms after invokations
_.delay(printMsg, 1000, 'Dmitry');

console.log('_.defer');
//_.defer is the same as _.delay with 0 time out
//it's useful to be invoked from UI not to block UI
_.defer(printMsg, 'Simon');

console.log('_.throttle');
//If throtten function was invoked a few times within waitInterval
//then it will be executed once in wait interval and once after it's finished (if more than one invokation is done)
var throttled = _.throttle(printMsg, 1000);
for (var j = 0; j< 100; j++){
    //Result is
    //throttledMsg0
    //throttledMsg99
    throttled('throttledMsg' + j);
}

console.log('_.debounce');
//Waits for wait interval and invoke debounced function
//with arguments passed to it last time
var debounced = _.debounce(printMsg, 1000);
for (var j = 0; j< 100; j++){
    //Result is debouncedMsg99
    debounced('debouncedMsg' + j);
}

console.log('_.once');
//_.once invokes function only once with arguments passed first time
//all other invokations are ignored
var onced = _.once(printMsg);
for (var j = 0; j< 100; j++){
    //Result is onceMsg0
    onced('onceMsg' + j);
}

console.log('_.after');
//Function is executed only if it is onvoked count times previously
var afterF = _.after(3, printMsg);
for (var j = 0; j< 5; j++){
    //Resul is afterMsg2, afterMsg3, afterMsg4
    afterF('afterMsg'+j);
}

console.log('_.before');
//Before function is onvoked only first count - 1 times
var beforeF = _.before(3, printMsg);
for (var j = 0; j< 5; j++){
    //Result is before0, before1
    beforeF('before'+j);
}

//--------------------------------------------------------------
//------- Common -----------------------------------------------
//--------------------------------------------------------------
console.log('_.wrap');
var msg = function(msg){
    return msg;
};
var wrapped = _.wrap(msg, function(func){
    return 'before, ' + func('wrappedMsg') + ', after';
});
//Result is 'before, wrappedMsg, after';
console.log(wrapped());