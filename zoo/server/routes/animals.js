/**
 * Created by dmitry on 18.08.16.
 */
'use strict';

var express = require('express');
var mongoModels = require('../schema/MongoModels');
var logger = require('../logger');

var router = express.Router();
var Animal = mongoModels.Animal;

//get all animals
router.get('/', function (req, res, next) {
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
router.get('/:id', function (req, res, next) {
    logger.log('get /animals/:id ' + req.params.id);
    Animal
        .find({
            _id: req.params.id
        })
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

module.exports = router;