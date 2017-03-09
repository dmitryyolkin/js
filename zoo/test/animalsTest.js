/**
 * Created by dmitry on 02.03.17.
 */
'use strict';

process.env.NODE_ENV = 'test';

var server = require('../server/zooServerApp');
var auth = require('../server/routes/auth');

var mongoModels = require('../server/schema/MongoModels');
var Animal = mongoModels.Animal;

//Подключаем dev-dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
var sinon = require('sinon');

chai.use(chaiHttp);

//Наш основной блок
describe('animals', function () {
    var authCheckPermissionsStub;
    var authCheckAdminPermissionsStub;

    before(function(){
        var defaultCallback = function(req, res, next){
            return next();
        };

        //todo не вызывается этот стаб
        authCheckPermissionsStub = sinon.stub(auth, 'checkPermissions', defaultCallback);
        authCheckAdminPermissionsStub = sinon.stub(auth, 'checkAdminPermissions', defaultCallback);

        //invoke next() because var checkPermissions has signature like function (req, res, next){..} and 'next' argument has 3rd index
        //authCheckPermissionsStub.callArg(2);
        //authCheckAdminPermissionsStub.callArg(2);
    });

    beforeEach('remove animals from DB', function (done) { //Перед каждым тестом чистим базу
        Animal.remove({}, function (err) {
            if (err) {
                done(err);
            }

            //done is used as callback to test asynchronous code
            done();
        })
    });

    afterEach(function() {
        //assert that our middleware was called once for each test
        sinon.assert.calledOnce(authCheckPermissionsStub);
        sinon.assert.calledOnce(authCheckAdminPermissionsStub);

        authCheckPermissionsStub.reset();
        authCheckAdminPermissionsStub.reset();
    });

    /*
     * Тест для /GET
     */
    describe('/GET animals', function () {
        it('it should GET all the animals', function (done) {
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
        )
        ;
    })
    ;

});
