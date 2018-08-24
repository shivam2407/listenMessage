const MongoClient = require('mongodb').MongoClient;
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();

app.use(bodyParser.urlencoded({
  extended: false
}));

app.post('/listenMessage', (req, res) => {
  const replyMsg = req.body['Body'];
  const phoneFrom = req.body['From'];
  if (replyMsg.toLowerCase() === 'stop') {
    const firstThree = phoneFrom.substring(2, 5);
    const secondThree = phoneFrom.substring(5, 8);
    const lastFour = phoneFrom.substring(8, 12);
    const finalNumber = firstThree + '-' + secondThree + '-' + lastFour;
    MongoClient.connect("mongodb://127.0.0.1:27017", function (err, client) {
      const db = client.db('companywide');
      const worker = db.collection('workers');
      worker.findOne({
        'Address.Phone': finalNumber,
      }, function (err, result) {
        if (err) throw err;
        if (result) {
          worker.update({
            'Address.Phone': finalNumber
          }, {
            $set: {
              textNotifications: false,
            }
          }, function (err) {
            if (err) throw err;
          });
        }
      });
      res.writeHead(200, {
        'Content-Type': 'text/xml'
      });
      res.end();
    });
  } else if (replyMsg.toLowerCase() === 'start') {
    const firstThree = phoneFrom.substring(2, 5);
    const secondThree = phoneFrom.substring(5, 8);
    const lastFour = phoneFrom.substring(8, 12);
    const finalNumber = firstThree + '-' + secondThree + '-' + lastFour;
    MongoClient.connect("mongodb://127.0.0.1:27017", function (err, client) {
      const db = client.db('companywide');
      const worker = db.collection('workers');
      worker.findOne({
        'Address.Phone': finalNumber,
      }, function (err, result) {
        if (err) throw err;
        if (result) {
          worker.update({
            'Address.Phone': finalNumber
          }, {
            $set: {
              textNotifications: true,
            }
          }, function (err) {
            if (err) throw err;
          });
        }
      });
      res.writeHead(200, {
        'Content-Type': 'text/xml'
      });
      res.end();
    });
  } else if (replyMsg.toLowerCase() === 'y') {
    MongoClient.connect("mongodb://127.0.0.1:27017", function (err, client) {
      if (err) throw err;

      const db = client.db('companywide');
      const message = db.collection('message');
      const jobs = db.collection('jobs');
      const workers = db.collection('workers');
      let messageObj = null;
      const msgObject = message.findOne({
        'phoneNumber': phoneFrom
      }, function (err, items) {
        if (items) {

          const jobId = items['jobId'];
          const workerId = items['workerId'];
          jobs.update({
            _id: jobId
          }, {
            $addToSet: {
              appliedWorkers: {
                workerId: workerId,
                date: new Date,
              }
            }
          }, function (err, result) {
            if (err) throw err;
          });
          workers.update({
            userId: workerId,
          }, {
            $pull: {
              recommandJobs: jobId
            }
          });
          workers.update({
            userId: workerId,
          }, {
            $push: {
              appliedJobs: jobId
            }
          });
          const removeMsg = db.collection('message');
          console.log(phoneFrom);
          removeMsg.remove({
            'phoneNumber': phoneFrom
          }, function (err, result) {
            if (err) throw err;
          });
          let message = 'Thanks. You have applied to the job. You may receive a phone call from the employer';


          const twiml = new MessagingResponse();
          twiml.message(message);

          res.writeHead(200, {
            'Content-Type': 'text/xml'
          });
          res.end(twiml.toString());
        } else {
          res.writeHead(200, {
            'Content-Type': 'text/xml'
          });
          res.end();

        }

      });
    });
  }

});

http.createServer(app).listen(1337, () => {
  console.log("App is running on 1337");
});