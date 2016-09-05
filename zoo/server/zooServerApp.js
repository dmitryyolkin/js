'use strict';

var express = require('express'),
    expressSession = require('express-session'),
    path = require('path'),
    favicon = require('serve-favicon'),

    //todo Morgan is default logger provided by idea
    //it's better to use log4js
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    mongoStore = require('connect-mongodb'),
    mongoose = require('mongoose'),
    defaults = require('./defaults'),

    //schemas
    UserSchema = require('./schema/UserSchema'),
    AnimalSchema = require('./schema/AnimalSchema'),
    CageSchema = require('./schema/CageSchema'),
    ZooSchema = require('./schema/ZooSchema'),

    //routes
    routes = require('./routes/index'),
    users = require('./routes/users'),
    animals = require('./routes/animals'),
    sessions = require('./routes/sessions');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in ../static
app.use(favicon(path.join(__dirname, '../static/images/', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//configure mongoConnection
var User = mongoose.model('User', UserSchema);
var Animal = mongoose.model('Animal', AnimalSchema);
var Cage = mongoose.model('Cage', CageSchema);
var Zoo = mongoose.model('Zoo', ZooSchema);
mongoose.connect(defaults['db-uri']);

//it allows to have req.session variable
var db = mongoose.connection;
app.use(expressSession({
  store: mongoStore({
    dbname: db.db.databaseName,
    host: db.db.serverConfig.host,
    port: db.db.serverConfig.port,
    username: db.user,
    password: db.pass
  }),

  secret: 'zoosecret', //some secret phrase to sign Session Id
  resave: false, //don't save session in MongoStore if it's not changed
  saveUninitialized: true, //save uninitialized session to mongo (uninitialized session is when it's new). True is usefule for login dialog
  cookie: {
    maxAge: 30 * 60 * 1000 //period when session is expired
  }
}));

//https://github.com/expressjs/method-override
//Причиной этому является тот факт, что мы не можем полагаться на браузер в вопросах определения HTTP-методов (например, таких как DELETE).
//Но мы можем использовать некоторое соглашение, чтобы обойти эту проблему: формы могут использовать скрытые поля,
//которые Express будет интерпретировать как “настоящий” HTTP-метод.
app.use(methodOverride());

app.use(express.static(path.join(__dirname, '../static')));
app.use(express.static(path.join(__dirname, '../client')));

app.use('/', routes);
app.use('/users', users);
app.use('/animals', animals);
app.use('/sessions', sessions);

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
