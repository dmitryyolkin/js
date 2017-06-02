/**
 * Created by dmitry on 22.03.17.
 */
'use strict';

process.env.NODE_ENV = 'test';

var mongoModels = require('../server/schema/MongoModels');
var mongoose = require('mongoose');

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
describe('users test', function () {
    var authCheckPermissionsStub;

    beforeEach('remove users from DB', function () { //Перед каждым тестом чистим базу
        //stub auth functions
        var auth = require('../server/routes/auth');
        console.log('Create checkPermissions stub for authId: ' + auth.id);
        authCheckPermissionsStub = sinon.stub(
            auth,
            'checkPermissions',
            function (req, res, next) {
                console.log("Default callback of 'usersTest' is invoked for 'checkPermissions' function");
                return next();
            });

        //create test model
        User.remove({}, function (err) {
            if (err) {
                done(err);
            } else {

                //create new users
                new Promise(function (resolve, reject) {
                        //save keeper1
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
                                resolve();
                            }
                        })
                    }
                ).then(
                    //save Admin
                    function () {
                        //save keeper1
                        new User({
                            name: 'admin',
                            email: 'admin@gmail.com',
                            login: 'admin',
                            password: 'admin',
                            roles: ['ADMIN']
                        }).save(function (err, mongoUser) {
                            if (err) {
                                throw err;
                            }
                        })
                    }
                ).catch(function (err) {
                    throw err;
                });
            }
        });
    });

    afterEach(function () {
        console.log('usersTest:afterEach is invoked');

        //assert that our middleware was called once for each test
        sinon.assert.calledOnce(authCheckPermissionsStub);
        sinon.restore(authCheckPermissionsStub);

        //invalidate require cache
        //otherwise next tests use mocks from previos tests what can affect it
        for (var key in require.cache) {
            if (Object.prototype.hasOwnProperty.call(require.cache, key)) {
                delete require.cache[require.resolve(key)]
            }
        }

    });

    /*
     * Тест для /GET
     */
    describe('/GET users', function () {
        it('there are no permissions', function (done) {
                var auth = require('../server/routes/auth');
                console.log('Create checkAdminPermissions stub for authId: ' + auth.id);
                var checkAdminPermissionsStub = sinon.stub(
                    auth,
                    'checkAdminPermissions',
                    function (req, res, next) {
                        console.log("checkAdminPermissions callback with 'no permissions' is invoked for auth function");
                        res
                            .status(403)
                            .send('no permissions')
                    });

                //It's very important to create server AFTER auth stub is configured
                //otherwise original auth will be used or smth like proxyquire should be used
                //https://www.npmjs.com/package/proxyquire
                var server = require('../server/zooServerApp');

                chai.request(server)
                    .get('/users')
                    .end(function (err, res) {
                        try {
                            if (err) {
                                //check results
                                res.should.have.status(403);
                                sinon.assert.calledOnce(checkAdminPermissionsStub);
                                return done();
                            }

                            //
                            done(new Error('no expected permissions error'));
                        } finally {
                            checkAdminPermissionsStub.restore();
                        }
                    })
            }
        );

        describe('/GET users', function () {
            it('there are permissions', function (done) {
                    var auth = require('../server/routes/auth');
                    console.log('Create checkAdminPermissions stub for authId: ' + auth.id);
                    var checkAdminPermissionsStub = sinon.stub(
                        auth,
                        'checkAdminPermissions',
                        function (req, res, next) {
                            console.log("checkAdminPermissions callback with allow permissions is invoked for auth function");
                            return next();
                        });

                    var server = require('../server/zooServerApp');

                    chai.request(server)
                        .get('/users')
                        .end(function (err, res) {
                            try {
                                if (err) {
                                    return done(err);
                                }

                                //check results
                                res.should.have.status(200);
                                res.body.should.be.a('array');
                                res.body.length.should.be.eql(2);

                                //check values
                                //check keeper1
                                var returnedUser = res.body[0];
                                returnedUser.should.have.property('name');
                                returnedUser.name.should.be.eq('keeper1');
                                returnedUser.should.have.property('roles');
                                returnedUser.roles.length.should.be.eql(1);
                                returnedUser.roles[0].should.be.eq('KEEPER');

                                //check admin
                                returnedUser = res.body[1];
                                returnedUser.should.have.property('name');
                                returnedUser.name.should.be.eq('admin');
                                returnedUser.should.have.property('roles');
                                returnedUser.roles.length.should.be.eql(1);
                                returnedUser.roles[0].should.be.eq('ADMIN');

                                done();
                            } finally {
                                checkAdminPermissionsStub.restore();
                            }
                        })
                }
            );

        })

    })

});

