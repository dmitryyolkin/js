'use strict';

var express = require('express');
var expressSession = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');

var logger = require('./logger');
var log4js = require('log4js');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var mongoStore = require('connect-mongodb');
var mongoose = require('mongoose');
var testDataProvider = require('./testDataProvider');

var defaults = require('./defaults');

//routes
var index = require('./routes/index');
var users = require('./routes/users');
var animals = require('./routes/animals');
var login = require('./routes/login');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in ../static
app.use(favicon(path.join(__dirname, '../static/images/', 'favicon.ico')));
app.use(log4js.connectLogger(
    log4js.getLogger('access'),
    { level: 'auto' })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//init test data
testDataProvider.createAdmin();
testDataProvider.createZoo();

//line below is required not to get line below
//Mongoose: mpromise (mongoose's default promise library) is deprecated,
//plug in your own promise library instead: http://mongoosejs.com/docs/promises.html
mongoose.Promise = global.Promise;
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

app.use('/', index);
app.use('/users', users);
app.use('/animals', animals);
app.use('/login', login);

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

logger.info('Zoo application is run');
module.exports = app;
