/**
 * Created by dmitry on 10.03.16.
 */
'use strict';

var mongoose = require('mongoose');

//connect to DB
mongoose.connect('mongodb://eu-smr-mng-01.maxifier.com/y_test');
var db = mongoose.connection;

// When there is an error
db.on('error', function(err){
    console.log('Console error: ' + err);
});

// When the connection is disconnected
db.on('disconnected', function () {
    console.log('Mongo DB is disconnected');
});

//register handler when connection is opened
db.once('open', function(){
    //define table schema how entity will be saved in Mongo DB
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

    //specify some default behaviour for schema
    //NOTE: new methods should be specified before model is created
    personSchema.methods.doJob = function(){
        console.log(this.name + " does job");
    };

    //compile schema into model that can be used to create new Person instances
    var Person = mongoose.model('Person', personSchema);

    //create handler that is onvoken after saving/failing an entity in Mongo DB
    //details about saving can be found here http://mongoosejs.com/docs/api.html#model_Model-save
    var onSave = function (err, person) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(person + ' is saved');
    };

    //create certain person instances
    var ivanov = new Person({
        name: "Ivanov",
        age: 30
    });
    ivanov.doJob();
    ivanov.save(onSave);

    var petrov = new Person({
        name: "Petrov",
        age: 45
    });
    petrov.doJob();
    petrov.save(onSave)
});

// If the Node process ends, close the Mongoose connection
var exit = function() {
    db.close(function () {
        console.log('Close mongo DB connection');
        process.exit(0);
    });
};

//В POSIX-системах:
//  SIGINT — сигнал для остановки процесса пользователем с терминала. SIGINT — целочисленная константа, определенная в заголовочном файле signal.h.
//  SIGTERM — сигнал для запроса завершения процесса.
process.on('SIGINT', exit).on('SIGTERM', exit);

//If we want to close mongoose connection forsibly then we can invoke code below
//But please remember all mongo DB operations are ASYNC and in this case we have a risk to loose some data
//db.close();