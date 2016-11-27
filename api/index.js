var express = require('express'),
    path = require('path'),
    passport = require('passport'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    cookieSession = require('cookie-session'),
    LocalStrategy = require('passport-local').Strategy,
    exec = require('child_process').exec,
    config = require('./config.json'),
    app = express(),
    MongoClient = require('mongodb').MongoClient,
    url = 'mongodb://localhost:27017/home';

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  done(null, {id: id});
});

passport.use(new LocalStrategy(function(username, password, done) {
  if(username === config.username && password === config.password) {
    console.log("logged in!");
    return done(null, {
      id: 1,
      username: username
    });
  } else {
    return done(null, false);
  }
}));

app.use(cookieParser());
app.use(bodyParser());
app.use(cookieSession({
  keys: ['12345'],
  expires: new Date(new Date(Date.now()).getFullYear() + 10, 0) // 01.01 in 10 years
}));
app.use(passport.initialize());
app.use(passport.session());

function requireLogin(req, res, next) {
  if(!req.isAuthenticated()) {
    return res.redirect(401, '/login');
  } else {
    return next();
  }
}

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login/false',
  successRedirect: '/login/true'
}));

app.get('/login/:status', function(req, res) {
  var success = req.params.status === 'true' ? true : false;
  res.status(success ? 200 : 401).send({
    success: success
  });
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/login');
});

app.get('/api/temperatures', requireLogin, function (req, res) {
  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, db) {
    let temp = db.collection('temperatures');
    temp.find().sort({_id: -1}).limit(432).toArray(function(err, docs) {
      res.send(docs);
      db.close();
    });
  });
});

app.get('/api/weight', requireLogin, function (req, res) {
  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, db) {
    let weight = db.collection('weight');
    weight.find().sort({_id: -1}).limit(60).toArray(function(err, docs) {
      res.send(docs);
      db.close();
    });
  });
});

app.put('/api/weight/:weight', requireLogin, function(req, res) {
  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, db) {
    let weight = db.collection('weight');

    weight.insertOne({
      timestamp: new Date(),
      weight: req.params.weight
    },function(err, docs) {
      res.send({
        success: true
      });
      db.close();
    });
  });
});

app.get('/api/media/play', requireLogin, function(req, res) {
  exec('mpc play');
  res.send({success: true});
});

app.get('/api/media/stop', requireLogin, function(req, res) {
  exec('mpc stop');
  res.send({success: true});
});

app.get(['/', '/index.html'], function(req, res) {
  if(!req.isAuthenticated()) {
    return res.redirect('/login');
  } else {
    return res.sendFile(path.resolve('../index.html'));
  }
});

app.use(express.static(path.resolve('../')));

// catchall
app.use(function(req, res) {
  res.sendFile(path.resolve('../index.html'));
});

app.listen(8008, function () {
  console.log('Listening on port 8008');
});
