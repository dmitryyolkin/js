/**
 * Created by dmitry on 18.08.16.
 */
'use strict';

var express = require('express');
var auth = require('../auth');

var router = express.Router();

//get all users
router.get('/', auth.isUserLoggedIn, function(req, res, next){
    console.log('get /users');
    //todo
});

//get user by id
router.get('/:id', auth.isUserLoggedIn, function(req, res, next){
    console.log('get /users/:id ' + req.params.id);
    //todo
});

//create new user
router.put('/:id', auth.isUserLoggedIn, function(req, res, next){
    console.log('put /users/:id ' + req.params.id);
    //todo
});

//update user
router.post('/:id', auth.isUserLoggedIn, function(req, res, next){
    console.log('post /users/:id ' + req.params.id);
    //todo
});

//delete user
router.delete('/:id', auth.isUserLoggedIn, function(req, res, next){
    console.log('delete /users/:id ' + req.params.id);
    //todo
});

module.exports = router;