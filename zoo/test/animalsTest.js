/**
 * Created by dmitry on 02.03.17.
 */
'use strict';

process.env.NODE_ENV = 'test';

var mongoModels = require('../server/schema/MongoModels');
var mongoose = require('mongoose');

var Animal = mongoModels.Animal;
var Cage = mongoModels.Cage;
var User = mongoModels.User;

//Подключаем dev-dependencies
var mocha = require('mocha');
var chai = require('chai');
var chaiHttp = require('chai-http');

//proxy frameworks
var sinon = require('sinon'); //stub separate functions of a service

chai.should();
chai.use(chaiHttp);

//Test
describe('animals test', function () {
    var server,
        authCheckPermissionsStub;

    before(function () {
        //stub auth functions
        var auth = require('../server/routes/auth');
        console.log('Create checkPermissions stub for authId: ' + auth.id);
        authCheckPermissionsStub = sinon.stub(
            auth,
            'checkPermissions',
            function (req, res, next) {
                console.log("Default callback of 'animalsTest' is invoked for 'checkPermissions' function");
                return next();
            });

        //It's very important to create server AFTER auth stub is configured
        //otherwise original auth will be used or smth like proxyquire should be used
        //https://www.npmjs.com/package/proxyquire
        server = require('../server/zooServerApp');
    });

    beforeEach('remove animals from DB', function (done) { //Перед каждым тестом чистим базу
        var defaultErr = function (err) {
            //Cage can not be erased
            done(err);
        };
        new Promise(function (resolve, reject) {
            Cage.remove({}, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }

            })
        }).then(
            //cage is removed
            function () {
                return new Promise(function (resolve, reject) {
                    User.remove({}, function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    })
                });
            }
        ).then(
            //cage is removed
            function () {
                Animal.remove({}, function (err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                })
            }
        ).catch(defaultErr);
    });

    afterEach(function () {
        //assert that our middleware was called once for each test
        sinon.assert.calledOnce(authCheckPermissionsStub);
        authCheckPermissionsStub.reset();
    });

    after(function () {
        // Unwraps the spy
        console.log('animalsTest:after is invoked');
        sinon.restore(authCheckPermissionsStub);

        //invalidate require cache
        //otherwise next tests use mocks from previos tests what can affect it
        for (var key in require.cache){
            if (Object.prototype.hasOwnProperty.call(require.cache, key)) {
                delete require.cache[require.resolve(key)]
            }
        }
    });

    function createAmimalAndTest(test) {
        var onRejected = function (err) {
            done(err);
        };
        new Promise(function (resolve, reject) {
            //save cage
            new Cage({name: 'predators1'}).save(function (err, mongoCage) {
                if (err) {
                    reject(err);
                } else {
                    resolve(mongoCage)
                }
            });
        }).then(
            //save User
            function (cage) {
                return new Promise(function (resolve, reject) {
                    new User({
                        name: 'keeper1',
                        email: 'keeper1@gmail.com',
                        login: 'keeper1',
                        password: 'keeper1',
                        roles: ['KEEPER']
                    }).save(function (err, mongoUser) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                cage: cage,
                                user: mongoUser
                            });
                        }
                    })
                });
            }
        ).then(
            //save Animal
            function (info) {
                return new Promise(function (resolve, reject) {
                    new Animal({
                        name: 'animal1',
                        species: 'Predator',
                        age: 1,
                        cage: info.cage,
                        keeper: info.user
                    }).save(function (err, animal) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(animal);
                        }
                    });
                });

            }
        ).then(
            //update animals
            function (animal) {
                return new Promise(function (resolve, reject) {
                    var cage = animal.cage;
                    cage.animals = [animal];
                    cage.save(function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(animal);
                        }
                    });
                });

            }
        ).then(
            //handler
            function (animal) {
                return test(animal);
            }
        ).catch(onRejected);
    }

    /*
     * Тест для /GET
     */
    describe('/GET animals', function () {
        it('there are no animals', function (done) {
                chai.request(server)
                    .get('/animals')
                    .end(function (err, res) {
                        if (err) {
                            done(err);
                            return;
                        }

                        //check results
                        res.should.have.status(200);
                        res.body.should.be.a('array');
                        res.body.length.should.be.eql(0);
                        done();
                    })
            }
        );

        it('there is one animal', function (done) {
            createAmimalAndTest(function (animal) {
                //animals is saved
                chai.request(server)
                    .get('/animals')
                    .end(function (err, res) {
                        if (err) {
                            done(err);
                            return;
                        }

                        //check results
                        res.should.have.status(200);
                        res.body.should.be.a('array');
                        res.body.length.should.be.eql(1);

                        //check values
                        var returnedAnimal = res.body[0];
                        returnedAnimal.should.have.property('name');
                        returnedAnimal.name.should.be.eq('animal1');

                        returnedAnimal.should.have.property('species');
                        returnedAnimal.species.should.be.eq('Predator');

                        returnedAnimal.should.have.property('age');
                        returnedAnimal.age.should.be.eq(1);

                        //cage
                        returnedAnimal.should.have.property('cage');

                        var cage = returnedAnimal.cage;
                        cage.should.have.property('name');
                        cage.should.have.property('animals');
                        cage.name.should.be.eq('predators1');
                        cage.animals.length.should.be.eq(1);
                        cage.animals[0].should.be.eq(returnedAnimal._id);

                        //keeper
                        returnedAnimal.should.have.property('keeper');

                        var keeper = returnedAnimal.keeper;
                        keeper.should.have.property('name');
                        keeper.name.should.be.eq('keeper1');

                        done();
                    })
            });

        });

        it('there is noone animal with faked id', function (done) {
            createAmimalAndTest(function (animal) {
                //animals is saved
                var fakeId;
                while (true) {
                    fakeId = mongoose.Types.ObjectId().toHexString();
                    if (fakeId != animal.id) {
                        break;
                    }
                }

                var url = '/animals/' + fakeId;
                chai.request(server)
                    .get(url)
                    .end(function (err, res) {
                        if (err) {
                            res.should.have.status(404);
                            return done();
                        }

                        done(err);

                    })
            });

        });

        it('there is one animal with real id', function (done) {
            createAmimalAndTest(function (animal) {
                var url = '/animals/' + animal.id;
                chai.request(server)
                    .get(url)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        //check results
                        res.should.have.status(200);
                        var returnedAnimal = res.body;
                        returnedAnimal.should.have.property('_id');
                        returnedAnimal._id.should.be.eq(animal.id);

                        returnedAnimal.should.have.property('age');
                        returnedAnimal.age.should.be.eq(animal.age);

                        returnedAnimal.should.have.property('name');
                        returnedAnimal.name.should.be.eq(animal.name);

                        returnedAnimal.should.have.property('species');
                        returnedAnimal.species.should.be.eq(animal.species);

                        returnedAnimal.should.have.property('cage');
                        returnedAnimal.should.have.property('keeper');

                        done();
                    })
            });

        });

    })
    ;

});
