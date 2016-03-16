/**
 * Created by dmitry on 16.03.16.
 */
'use strict';

var _ = require('underscore');

var array = [5,4,3,2,1];

//----------------------------------------------
//functions similar to different types of copying
//----------------------------------------------
console.log('_.first');
console.log(_.first(array, 2));//Result is 5,4

console.log('_.last');
console.log(_.last(array, 2)); //Result is 2,1

console.log('_.initial');
console.log(_.initial(array, 1));//Result is 5,4,3,2 (withou last 1 element)

console.log('_.rest');
console.log(_.rest(array, 2)); //Result is 3,2,1 (without first two elements)

//----------------------------------------------
//Useful methods of combining different arrays
//----------------------------------------------
console.log('_.compact');
//it return array's copy without falsy elements (as '', undefined, false, null, NAN, 0)
console.log(_.compact([5,4,'', false, null, undefined, NaN, 0])); //Result is 5,4

console.log('_.without');
console.log(_.without(array, 3));//Result is 5,4,2,1

console.log('_.union');
console.log(_.union([5,4], [3,2])); //Result is 5,4,3,2

console.log('_.intersection');
console.log(_.intersection([5,4], [4,3,2,1])); //Result is [4]

console.log('_.difference');
//Return elements from 1st array absent in 2nd array
console.log(_.difference([5,4], [4,3])); //Result is [5]

console.log('_.uniq');
console.log(_.uniq([5,4,3,4,2])); //Result is 5,4,3,2


//----------------------------------------------
//Index
//----------------------------------------------

console.log('_.indexOf');
console.log(_.indexOf(array, 4)); //Result is 1

console.log('_.lastIndexOf');
console.log(_.lastIndexOf([5,4,3,2,1,4], 4)); //Result is 5

console.log('_.findIndex');
console.log(_.findIndex(array, function(element, index, list){
    //find index of element where predicate function is truth
    //Result is 2 (it's index of element = 3)
    return element <= 3;
}));

console.log('_.findLastIndex');
console.log(_.findLastIndex(array, function(element, index, list){
    //find index of element where predicate function is truth
    //Result is 4 (it's index of element = 1)
    return element <= 3;
}));

//----------------------------------------------
//Range
//----------------------------------------------
console.log('_.range');
//_.range(start, stop, step);
console.log(_.range(0, 30, 10)); //Result is [0,10,20]