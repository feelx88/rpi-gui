var express = require('express'),
    path = require('path'),
    app = express(),
    MongoClient = require('mongodb').MongoClient,
    url = 'mongodb://localhost:27017/home';

app.get('/api/temperatures', function (req, res) {
  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, db) {
    let temp = db.collection('temperatures');
    temp.find().sort({_id: -1}).limit(432).toArray(function(err, docs) {
      res.send(docs);
      db.close();
    });
  });
});

app.get('/api/weight', function (req, res) {
  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, db) {
    let weight = db.collection('weight');
    weight.find().sort({_id: -1}).limit(60).toArray(function(err, docs) {
      res.send(docs);
      db.close();
    });
  });
});

app.put('/api/weight/:weight', function(req, res) {
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

app.use(express.static(path.resolve('../')));

// catchall
app.use(function(req, res) {
  res.sendFile(path.resolve('../index.html'));
});

app.listen(8008, function () {
  console.log('Listening on port 8008');
});
