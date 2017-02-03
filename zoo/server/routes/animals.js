/**
 * Created by dmitry on 18.08.16.
 */
'use strict';

var express = require('express');
var auth = require('./auth');

var mongoModels = require('../schema/MongoModels');
var logger = require('../logger');

var router = express.Router();
var Animal = mongoModels.Animal;

//get all animals
router.get('/', auth.checkPermissions, function (req, res, next) {
    logger.log('get /animals');
    Animal
        .find({})
        .populate('keeper')
        .populate('cage')
        .exec(function (err, anumals) {
            if (err) {
                logger.error(err);
                res
                    .status(500)
                    .send(err);
            } else {
                res
                    .status(200)
                    .send(anumals);
            }
        })

});

//get animal by id
router.get('/:id', auth.checkPermissions, function (req, res, next) {
    var animalId = req.params.id;
    logger.log('get /animals/:id ' + animalId);
    Animal
        .find({
            _id: animalId
        })
        .populate('keeper')
        .populate('cage')
        .exec(function (err, anumals) {
            if (err) {
                logger.error(err);
                res
                    .status(500)
                    .send(err);
            } else if (users.length > 1) {
                logger.error(err);
                res
                    .status(500)
                    .send('More than 1 animal is found with id: ' + animalId);
            } else {
                res
                    .status(200)
                    .send(anumals[0]);
            }
        })

});

module.exports = router;