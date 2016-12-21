var express = require('express'),
    path = require('path'),
    passport = require('passport'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    cookieSession = require('cookie-session'),
    LocalStrategy = require('passport-local').Strategy,
    exec = require('child_process').exec,
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    proxy = require('http-proxy-middleware'),
    mpd = require('mpd'),
    mpdClient = mpd.connect({
      port: 6600,
      host: 'localhost'
    }),
    config = require('./config.json'),
    app = express(),
    MongoClient = require('mongodb').MongoClient,
    url = 'mongodb://localhost:27017/home',
    privateKey = fs.readFileSync(config.privateKey, 'utf8'),
    certificate = fs.readFileSync(config.certificate, 'utf8');

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
  mpdClient.sendCommand("play");
  res.send({success: true});
});

app.get('/api/media/stop', requireLogin, function(req, res) {
  mpdClient.sendCommand("stop");
  res.send({success: true});
});

app.get('/api/media/status', requireLogin, function(req, res) {
  mpdClient.sendCommand("status", function(err, msg) {
    data = ('{ "' + msg.trim().replace(/\n/g, '", "') + '" }').replace(/: /g, '": "');
    data = JSON.parse(data);

    mpdClient.sendCommand("currentsong", function(err, msg) {
      data.currentSong = msg.replace(/.*\nName: /, ''). replace(/\n.*/g, '');
      res.send({
        success: true,
        data: data
      });
    });
  });
});

app.get('/api/light/0/on', requireLogin, function(req, res) {
  exec('sudo gpio write 5 1');
  res.send({success: true});
});

app.get('/api/light/0/off', requireLogin, function(req, res) {
  exec('sudo gpio write 5 0');
  res.send({success: true});
});

app.use('/api/camera', requireLogin);
app.use('/api/camera', proxy('ws://127.0.0.1:8000'));

app.get(['/', '/index.html'], function(req, res) {
  if(!req.isAuthenticated()) {
    return res.redirect('/login');
  } else {
    return res.sendFile(path.resolve('../index.html'));
  }
});

app.use(express.static(path.resolve('../')));

let httpsServer = https.createServer({
      key: privateKey,
      cert: certificate
    }, app);

httpsServer.listen(8009, function() {
  exec('sudo gpio mode 5 output');
  exec('sudo gpio write 5 0');
  console.log('Listening on port 8009');
});

http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(8008);
