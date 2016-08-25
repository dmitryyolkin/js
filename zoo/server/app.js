var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');

//todo Morgan is default logger provided by idea
//it's better to use log4js
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var routes = require('./routes/index');
var users = require('./routes/users');
var animals = require('./routes/animals');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in ../static
app.use(favicon(path.join(__dirname, '../static/images/', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.
//https://github.com/expressjs/method-override
app.use(methodOverride());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../static')));
app.use(express.static(path.join(__dirname, '../client')));

app.use('/', routes);
app.use('/users', users);
app.use('/animals', animals);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
