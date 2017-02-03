/**
 * Created by dmitry on 09.12.16.
 */
'use strict';

var express = require('express');
var auth = require('./auth');

var json2csv = require('json2csv');
var excel = require('node-excel-export');

var mongoModels = require('../schema/MongoModels');
var router = express.Router();
var Animal = mongoModels.Animal;

function exportAnimals(exportCallback) {
    Animal
        .find({})
        .populate('keeper')
        .populate('cage')
        .exec(function (err, animals) {
            if (err) {
                logger.error(err);
                res
                    .status(500)
                    .send(err);
            } else {
                exportCallback(animals);
            }
        })
}

function mapAnimalsSchema2SimpleJson(animals) {
    return animals.map(function (animal) {
        return {
            name: animal.name,
            species: animal.species,
            age: animal.age,
            keeper: animal.keeper.name,
            cage: animal.cage.name
        }
    });
}

//get all animals (json)
router.get('/json/', auth.checkPermissions, function (req, res, next) {
    console.log('get /export/json');
    exportAnimals(function (animals) {

        var animalsJson = mapAnimalsSchema2SimpleJson(animals);

        //set content type
        res.set({
            'Content-Type': 'application/json', //will be saved as file
            'Content-Length': animalsJson.length, //appx file length

            // set file nemae without showing Save dialog
            //if we need to show Save dialog then 'attachment' should be used instead of 'inline'
            'Content-Disposition': "attachment; filename='animals.json'"
        });

        res
            .status(200)
            .send(JSON.stringify(animalsJson));
    });

});

//get all animals (csv)
router.get('/csv/', auth.checkPermissions, function (req, res, next) {
    console.log('get /export/csv');
    exportAnimals(function (animals) {
        var animalsCsv = json2csv({
            data: animals,
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
    });

});

//get all animals (excel)
router.get('/excel/', auth.checkPermissions, function (req, res, next) {
    console.log('get /export/excel');
    exportAnimals(function (animals) {

        //We can define styles as json object
        //More info: https://github.com/protobi/js-xlsx#cell-styles
        var styles = {
            header: {
                fill: {
                    fgColor: {
                        rgb: 'B0E0E6'
                    }
                },
                font: {
                    color: {
                        rgb: 'FFFFFFFF'
                    },
                    sz: 14,
                    bold: true,
                    underline: true
                }
            },
            cellPink: {
                fill: {
                    fgColor: {
                        rgb: 'FFFFCCFF'
                    }
                }
            },
            cellGreen: {
                fill: {
                    fgColor: {
                        rgb: 'FF00FF00'
                    }
                }
            }
        };

        //Here we specify the export structure
        var specification = {
            // <- the key should match the actual data key
            name: {
                displayName: 'Animal name', // <- Here you specify the column header
                headerStyle: styles.header, // <- Header style
                //cellStyle: styles.cellPink,
                width: 120 // <- width in pixels
            },
            species: {
                displayName: 'Species',
                headerStyle: styles.header,
                cellStyle: function(value, row) {
                    return (value == 'Predator') ? styles.cellPink : styles.cellGreen;
                },
                width: 120
            },
            age: {
                displayName: 'Age',
                headerStyle: styles.header,
                //cellStyle: styles.cellPink, // <- Cell style
                width: 50
            },
            'keeper': {
                displayName: 'Keeper',
                headerStyle: styles.header,
                cellStyle: styles.cellGreen,
                width: 120
            },
            'cage': {
                displayName: 'Cage',
                headerStyle: styles.header,
                //cellStyle: styles.cellGreen,
                width: 120
            }
        };

        // Create the excel report.
        // This function will return Buffer
        var report = excel.buildExport(
            [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                {
                    // <- Specify sheet name (optional)
                    name: 'Animals',

                    // <- Report specification
                    specification: specification,

                    // <-- Report data
                    // The data set should have the following shape (Array of Objects)
                    // The order of the keys is irrelevant, it is also irrelevant if the
                    // dataset contains more fields as the report is build based on the
                    // specification provided above. But you should have all the fields
                    // that are listed in the report specification
                    data: mapAnimalsSchema2SimpleJson(animals)
                }
            ]
        );

        //We can then return this straight
        //This is sails.js specific (in general you need to set headers)
        res.attachment('animals_table.xlsx');
        return res.send(report);
    });
});

module.exports = router;
