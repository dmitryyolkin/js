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
    console.log('get /animals');
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
    console.log('get /animals/:id ' + req.params.id);
    //todo
});

//update animal by id
router.post('/:id', function (req, res, next) {
    console.log('post /animals/:id ' + req.params.id);
    //todo
});

module.exports = router;