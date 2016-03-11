/**
 * Created by dmitry on 09.03.16.
 */
'use strict';

//npm install mongodb --save

var mongoClient = require('mongodb').MongoClient;
mongoClient.connect('mongodb://eu-smr-mng-01.maxifier.com:27017/best-perm', function(err, db){
    if (err){
        throw err;
    }

    db.collection('generation.recos').find().toArray(function(err, result){
        if (err){
            throw err;
        }
        console.log(result);
    });
});

//There is object  modeling tool for Mongo - it's Mongoose
//https://github.com/Automattic/mongoose