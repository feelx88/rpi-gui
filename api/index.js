var express = require('express'),
    app = express(),
    MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/home';

app.get('/data', function (req, res) {
  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, db) {
    let temp = db.collection('temperatures');
    temp.find().sort({_id: -1}).limit(432).toArray(function(err, docs) {
      res.send(docs);
      db.close();
    });
  });
});

app.use('/', express.static('../build/unbundled'));

app.listen(8008, function () {
  console.log('Listening on port 8008');
});
