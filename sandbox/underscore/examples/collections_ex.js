/**
 * Created by dmitry on 15.03.16.
 */
'use strict';

var _ = require('underscore');
var array = [1,3,2,4,5];
var people = [
    {
        name: 'Ivanov',
        age: 30
    },
    {
        name: 'Petrov',
        age: 45
    }
];

function printArray(array) {
    _.each(array, function (element, index, list) {
        console.log(element);
    });
}

//each
console.log('_.each');
printArray(array);

//map
console.log('_.map');
printArray(_.map(array, function(element, index, list){
    //result is 3,5,4,6,7
    return element + 2;
}));

//reduce
console.log('_.reduce');
var sum = _.reduce(array, function(prev, element, index, list){
    //simple sum
    //result is 15
    if (prev == undefined){
        return element;
    }
    return prev + element;
});
console.log(sum);

//find
console.log('_.find');
console.log(_.find(array, function(element){
    //result is 4
    return element > 3;
}));

//where
console.log('_.where');
//result is {Ivanov, 30}
console.log(_.where(people, {name: 'Ivanov'}));

//filter
console.log('_.filter');
printArray(_.filter(array, function(element){
    //result is 4,5
    return element > 3;
}));

//reject - return collections with elements don't match with predicate condition
console.log('_.reject');
printArray(_.reject(array, function(element){
    //result is 1,2,3
    return element > 3;
}));

//every
console.log('_.every');
console.log(_.every(array, function(element){
    //result is false
    return element > 3;
}));

//some
console.log('_.some');
console.log(_.some(array, function(element){
    //result is true
    return element > 3;
}));

//contains
console.log('_.contains');
//result is true
console.log(_.contains(array, 1));

//min, max
console.log('_.min, _.max');
console.log(_.min(array));//result is 1
console.log(_.max(array, function(element){
    //result is 5
    return element;
}));

//plunk - return possible values of specified property
console.log('_.plunk');
//result is [Ivanov, Petrov]
console.log(_.pluck(people, 'name'));

//sortBy - by default it sort array out in ascendint order
console.log('_.sortBy');
printArray(_.sortBy(array, function(value, index, list){
    //sort out in descending order
    //result is 5,4,3,2,1
    return -value;
}));

//groupBy - group elements by some condition
console.log('_.groupBy');
console.log(_.groupBy(array, function(element, index, list){
    //result is {false: [1,2,3], true: [4,5]}
    return element > 3;
}));
console.log(_.groupBy(array, function(element, index, list){
    //result is {0: [2,4], 1: [1,3,5]}
    return element % 2;
}));

//countBy - it's similar with groupBy but it returns elements count instead of certain elements
console.log('_.countBy');
console.log(_.countBy(array, function(element, index, list){
    //result is {false: 3, true: 2}
    return element > 3;
}));
console.log(_.countBy(array, function(element, index, list){
    //result is {0: 2, 1: 3}
    return element % 2;
}));

//size
console.log('_.size');
console.log(_.size(array));//result is 5

//shuffle
console.log('_.shuffle');
printArray(_.shuffle(array));//result is some shuffled (mixed) copy of array