/**
 * Created by dmitry on 11.03.16.
 */
'use strict';

var mongoose = require('mongoose');
mongoose.connect('mongodb://eu-smr-mng-01.maxifier.com/y_test');

var db = mongoose.connection;
db.on('error', function(err){
    console.log('Console error: ' + err);
});

db.on('disconnected', function(){
    console.log('Mongo DB is disconnected');
});

db.once('open', function(){
    var personSchema = mongoose.Schema(
        {
            name: String,
            age: Number
        },
        //this statement can be ommited and
        //it indicates how MongoDB table will be named.
        //By default Mangoose add -s or replace model name - in this case 'people' collection will be created in MongoDB
        //what can be considered as unexpected behaviour
        {
            collection: "person"
        }
    );

    var Person = mongoose.model('Person', personSchema);

    //we assume data was prepared with mongoose example
    //and we have at least two records: Ivanov - 30, Petrov - 45

    //Query
    Person.find(function(err, persons){
        console.log('Find all people');
        if (err){
            console.log(err);
        }
        persons.forEach(function(person){
            console.log(
                'name: ' + person.name,
                'age: ' + person.age
            )
        });
    });

    //see details regarding Query builder here http://mongoosejs.com/docs/queries.html
    Person.
        find().
        where('age').lt(40).
        exec(function(err, persons){
            console.log('Find peaople yonger 40');
            if (err){
                console.log(err);
            }
            persons.forEach(function(person){
                console.log(
                    'name: ' + person.name,
                    'age: ' + person.age
                )
            });
        });
});

var exit = function(){
    db.close(function(){
        console.log('Close mongo DB connection');
        process.exit(0);
    });
};

process.on('SIGINT', exit).on('SIGTERM', exit);