/**
 * Created by dmitry on 18.08.16.
 */
'use strict';

var express = require('express');
var mongoModels = require('../schema/MongoModels');
var User = mongoModels.User;
var Animal = mongoModels.Animal;

var logger = require('../logger');
var router = express.Router();

//get all users
router.get('/', function (req, res, next) {
    logger.log('get /users');
    User
        .find({})
        .populate('animals')
        .exec(function (err, users) {
            if (err) {
                logger.error(err);
                res
                    .status(500)
                    .send(err);
            } else {
                res
                    .status(200)
                    .send(users);
            }
        })
});

//get user by id
router.get('/:id', function (req, res, next) {
    var userId = req.params.id;
    logger.log('get /users/:id ' + userId);
    User
        .find({
            _id: userId
        })
        .populate('animals')
        .exec(function (err, users) {
            if (err) {
                logger.error(err);
                res
                    .status(500)
                    .send(err);
            } else if (users.length > 1) {
                logger.error(err);
                res
                    .status(500)
                    .send('More than 1 user is found with id: ' + userId);
            } else {
                res
                    .status(200)
                    .send(users[0]);
            }
        })
});

//create new user
router.post('/', function (req, res, next) {
    logger.log('post /users');

    var body = req.body;
    var newUser = new User({
        name: body.name,
        email: body.email,
        login: body.login,
        password: body.password,
        roles: body.roles
    });

    newUser.save(function (err, user) {
        if (err) {
            logger.error(err);
            res
                .status(500)
                .send(err);
        } else {
            res
                .status(200)
                .send(user);
        }
    });
});

//update user
router.put('/:id', function (req, res, next) {
    var userId = req.params.id;
    logger.log('put /users/:id ' + userId);

    function checkAndSet(req, newObj, prop) {
        var body = req.body;
        var propValue = body[prop];
        if (propValue) {
            newObj[prop] = propValue;
        }
    }

    var newUser = {};
    var props = ['name', 'surname', 'email', 'login', 'password', 'roles'];
    for (var i = 0; i < props.length; i++) {
        var propName = props[i];
        checkAndSet(req, newUser, propName);
    }

    //fill animals
    var animalNames = req.body.animals;
    var animalCriteria = animalNames.map(function (animalName) {
        return {
            name: animalName
        }
    });
    Animal.find()
        .or(animalCriteria)
        .exec(function (err, animals) {
            if (err) {
                logger.error(err);
                res
                    .status(500)
                    .send(err);
                return;
            }

            //fill animals
            newUser.animals = animals.map(function (animal) {
                return animal._id;
            });

            User.findOneAndUpdate(
                //conditions
                {
                    _id: userId
                },
                //new values
                newUser,
                //options
                {
                    upsert: false
                },
                //callback
                function (err, user) {
                    if (err) {
                        logger.error(err);
                        res
                            .status(500)
                            .send(err);
                    } else {
                        //return result
                        res
                            .status(200)
                            .send(user);
                    }
                }
            );

        });
});

//delete user
router.delete('/:id', function (req, res, next) {
    logger.log('delete /users/:id ' + req.params.id);
    User.remove(
        {_id: req.params.id},
        function (err) {
            if (err) {
                logger.error(err);
                res
                    .status(500)
                    .send(err);
            } else {
                res
                    .status(500)
                    .send({});
            }

        }
    );
});

module.exports = router;