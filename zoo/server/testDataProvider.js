/**
 * Created by dmitry on 18.10.16.
 */
'use strict';

var mongoModels = require('./schema/MongoModels');
var logger = require('./logger');

var User = mongoModels.User;
var Zoo = mongoModels.Zoo;
var Animal = mongoModels.Animal;
var Cage = mongoModels.Cage;

function saveInstances(newInstances, conditionFunc, mongoModel) {
    newInstances.forEach(function (instance) {
        mongoModel.findOne(
            conditionFunc(instance), //condition
            function (err, mongoInstance) {
                if (!mongoInstance) {
                    //there is no such instance
                    instance.save(function (err) {
                        if (err) {
                            logger.error('Error within saving instance: ' + JSON.stringify(instance, null, "\t") + '\n error: ' + err);
                            return;
                        }
                        logger.info('Instance of model ' + mongoModel.modelName + ' is saved successfully:' + JSON.stringify(instance, null, "\t"));
                    })
                } else{
                    logger.info('Instance of model ' + mongoModel.modelName + ' was already saved before:' + JSON.stringify(instance, null, "\t"));
                }
            }
        );
    });
}

function creareZooWorker(zooWorker) {
    return new User({
        name: zooWorker.name,
        email: zooWorker.name + '@gmail.com',
        login: zooWorker.name,
        password: zooWorker.name,
        roles: zooWorker.roles
    })
}

module.exports = {

    //create test user
    createAdmin: function () {
        var admin = new User({
                name: 'admin',
                email: 'dmitry.yolkin@gmail.com',
                login: 'admin',
                password: 'admin',
                roles: ['ADMIN']
            });

        saveInstances(
            [admin],
            function (user) {
                return {
                    login: user.login
                };
            },
            User
        );
    },

    //create temp Zoo
    createZoo: function () {
        function filterAnimals(animals, species) {
            return animals.filter(function (animal) {
                return animal.species == species;
            });
        }

        function checkAnimalsInCage(elements, animalHolder) {
            if (animalHolder.animals.length == 0) {
                elements.push(animalHolder);
            }
        }

        //check whether initialization was already done or not
        Zoo.findOne(
            {},
            function(err, mongoZoo){
                if (err){
                    logger.error(err);
                    return;
                }

                if (mongoZoo){
                    logger.info('Instance of Zoo was already saved before:' + JSON.stringify(mongoZoo, null, "\t"));
                    return;
                }

                //initialize zoo
                //create Cages
                var predator1Cage = new Cage({name: 'predators1'});
                var fish1Cage = new Cage({name: 'fishes1'});
                saveInstances(
                    [predator1Cage, fish1Cage],
                    function (cage) {
                        return {
                            name: cage.name
                        };
                    },
                    Cage
                );

                //create keepers and zoologist
                var keeper1 = creareZooWorker({name: 'keeper1', roles: ['KEEPER']});
                var keeper2 = creareZooWorker({name: 'keeper2', roles: ['KEEPER']});
                var zoologist1 = creareZooWorker({name: 'zoologist1', roles: ['ZOOLOGIST']});

                saveInstances(
                    [keeper1, keeper2, zoologist1],
                    function (user) {
                        return {
                            login: user.login
                        };
                    },
                    User
                );

                //create Animals
                var animals = [];
                animals.push(new Animal({name: 'lion', species: 'Predator', age: 10, cage: predator1Cage._id, keeper: keeper1._id}));
                animals.push(new Animal({name: 'tiger', species: 'Predator', age: 20, cage: predator1Cage._id, keeper: keeper1._id}));
                animals.push(new Animal({name: 'shark', species: 'Fish', age: 30, cage: fish1Cage._id, keeper: keeper2._id}));

                saveInstances(
                    animals,
                    function (animal) {
                        return {
                            name: animal.name
                        };
                    },
                    Animal
                );

                //post-saving
                //cages
                predator1Cage.animals = filterAnimals(animals, 'Predator');
                fish1Cage.animals = filterAnimals(animals, 'Fish');

                var cages = [];

                checkAnimalsInCage(cages, predator1Cage);
                checkAnimalsInCage(cages, fish1Cage);
                for (var i = 0; i < cages.length; i++) {
                    cages[i].save(function(err, cage){
                        if (err){
                            logger.error(err);
                            return;
                        }
                        logger.info('Cage was updated: ' + JSON.stringify(cage, null, "\t"));
                    })
                }

                //users
                var keepers = [];
                checkAnimalsInCage(keepers, keeper1);
                checkAnimalsInCage(keepers, keeper2);
                for (var i = 0; i < keepers.length; i++) {
                    var keeper = keepers[i];
                    for (var j = 0; j < animals.length; j++) {
                        var animal = animals[j];
                        if (animal.keeper == keeper._id){
                            if (keeper.animals.length == 0){
                                keeper.animals = [];
                            }
                            keeper.animals.push(animal);
                        }
                    }

                    //save
                    keeper.save(function(err, doc){
                        if (err){
                            logger.error(err);
                            return;
                        }
                        logger.info('Keeper was updated: ' + JSON.stringify(doc, null, "\t"));
                    });

                }


                //create Zoo
                new Zoo({
                    users: [keeper1, keeper2, zoologist1],
                    animals: animals
                }).save(function(err, zoo){
                    if (err){
                        logger.error(err);
                    }
                    logger.info('Zoo was saved: ' + JSON.stringify(zoo, null, "\t"));
                });
            }
        );

    }

}
;
