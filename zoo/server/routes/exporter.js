/**
 * Created by dmitry on 09.12.16.
 */
'use strict';

var express = require('express');
var json2csv = require('json2csv');

var mongoModels = require('../schema/MongoModels');

var router = express.Router();
var Animal = mongoModels.Animal;

//get all animals
router.get('/csv/', function (req, res, next) {
    console.log('get /export/csv');
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
                var animalsCsv = json2csv({
                    data: anumals,
                    //exporting fields
                    fields: [
                        'name',
                        'species',
                        'age',
                        'keeper.name',
                        'cage.name'
                    ],
                    //field names in csv
                    fieldNames: [
                        'name',
                        'species',
                        'age',
                        'keeper',
                        'cage'
                    ],
                    //delimiter
                    del: ';'
                });

                console.log(animalsCsv);

                //set content type
                res.set({
                    'Content-Type': 'text/csv', //will be saved as file
                    'Content-Length': animalsCsv.length, //appx file length

                    // set file nemae without showing Save dialog
                    //if we need to show Save dialog then 'attachment' should be used instead of 'inline'
                    'Content-Disposition': "inline; filename='animals.csv'"
                });

                res
                    .status(200)
                    .send(animalsCsv);
            }
        })

});

module.exports = router;
