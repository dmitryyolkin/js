/**
 * Created by dmitry on 21.03.16.
 */
'use strict';

var _ = require('underscore');

function Person(name, age){
    this.name = name;
    this.age = age;
}
Person.prototype.nationality = 'Russian';
Person.prototype.do = function(activity){
    console.log(this.name + ' does  '+ activity);
};

var o = new Person('Ivanov', 35);

//--------------------------------------------------------------
//------- Properties--------------------------------------------
//--------------------------------------------------------------

console.log('_.keys');
//Return own properties only
//Result is name, age
console.log(_.keys(o));

console.log('_.allKeys');
//Return all properties (own + inherited)
//Result is name, age, nationality
console.log(_.allKeys(o));

console.log('_.values');
//Return values of own properties
//Ivanov, 35
console.log(_.values(o));

console.log('_.functions');
//Return all functions of object (including prototype functions)
//Result is [do]
console.log(_.functions(o));

console.log('_.defaults');
//Specify some defaults values if object value is not specified
//_.default doesn't create new object but change current one
//So in example below we create clone object
//Result is {name: 'Ivanov', age: 35, hobby: 'Guitar'}
console.log(_.defaults(_.clone(o), {name: 'Somebody', hobby: 'Guitar'}));

console.log('_.has');
//Idententical to object.hasOwnProperty()
console.log(_.has(o, 'name')); //true
console.log(_.has(o, 'surname')); //false


//--------------------------------------------------------------
//------- Create/Copying ---------------------------------------
//--------------------------------------------------------------

console.log('_.clone');
//Clone object by link (it's not a deep copying)
//Result is name: Ivanov, age: 35 + inherited props + functions
console.log(_.clone(o));

console.log('_.create');
var petrov = _.create(Person.prototype, {name: 'Petrov'});
//Create object based on prototype only with own properties passed in _.create method
//Object.create will create new object with all own properties of prototype
//Result of petrov is own property: name - Pertov, age is not specified
console.log(petrov);
console.log(_.keys(petrov)); //name
console.log(_.allKeys(petrov)); //name, nationality

console.log('_.pick');
//Create copy of object with keys in whitelist passed to pick method
//Result is {name: 'Ivanov'}
console.log(_.pick(o, 'name'));

console.log('_.omit');
//Create copy of object (including own, inherited props + functions) without keys specified in blacklist passed to method
//Result is {age: 35, nationality: 'Russian', do: [Function]}
console.log(_.omit(o, 'name'));


//--------------------------------------------------------------
//------- Verfication ------------------------------------------
//--------------------------------------------------------------

console.log('_.isEqual');
console.log(o == _.clone(o)); //false
console.log(_.isEqual(o, _.clone(o))); //false - it's because some inherited props are considered as own props in cloned object
console.log(_.isEqual(o, new Person('Ivanov', 35))); //true

console.log('_.isEmpty');
//Checks whether array or element is empty or not
console.log(_.isEmpty([1,2,3]));//false
console.log(_.isEmpty([]));//true
console.log(_.isEmpty({name: 'Somebody'}));//false
console.log(_.isEmpty({}));//true

console.log('_.isObject');
//Objects, Arrays and functions are objects
//String, numbers, undefined, NaN are not objects
console.log(_.isObject([]));//true
console.log(_.isObject({}));//true
console.log(_.isObject('Hello'));//false
console.log(_.isObject(123));//false
console.log(_.isObject(undefined));//false
console.log(_.isObject(NaN));//false

console.log('_.isFunction');
console.log(_.isFunction(function(){
    return "";
})); //true
console.log(_.isFunction(Person)); //true
console.log(_.isFunction(o)); //false
console.log(_.isFunction(o.do)); //true
console.log(_.isFunction(o.name)); //false

console.log('_.isFinite');
console.log(_.isFinite(NaN)); //false
console.log(_.isFinite(undefined)); //false
console.log(_.isFinite(null)); //false
console.log(_.isFinite(100)); //true

console.log(_.isArray([]));//true
