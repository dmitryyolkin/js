/**
 * Created by dmitry on 18.08.16.
 */
'use strict';

var express = require('express');
var router = express.Router();

//get all animals
router.get('/', function(req, res, next){
    console.log('get /animals');
    //todo
});

//get animal by id
router.get('/:id', function(req, res, next){
    console.log('get /animals/:id ' + req.params.id);
    //todo
});

//update animal by id
router.post('/:id', function(req, res, next){
    console.log('post /animals/:id ' + req.params.id);
    //todo
});

module.exports = router;