'use strict';
var express = require('express');
var router = express.Router();

//list is bad solution because if post request is added a few times
//we have to check td with id a few times - map is better
var todos = [];

function renderTodos(res) {
    res.render('todos', {'data': todos});
}

//get all todos
router.get('/', function(req, res, next) {
    renderTodos(res);
});

//get td by id
router.get('/:id', function(req, res, next){
    var id = req.params.id;
    for (var i = 0; i < todos.length; i++){
        var todo = todos[i];
        if (todo.id == id){
            res.render("todo", todo);
            return;
        }
    }
    res.statusCode = 404;
    res.send('Todo with id is not found: ' + id);
});

//create new td
router.post('/', function(req, res, next){
    //we have to add
    //app.use(bodyParser.json());
    //app.use(bodyParser.urlencoded({ extended: false }));

    var body = req.body;
    todos.push({
        id: body.id,
        summary: body.summary,
        description: body.description
    });
    renderTodos(res);
});


module.exports = router;
