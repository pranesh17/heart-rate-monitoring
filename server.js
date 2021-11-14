var bodyParser = require("body-parser");
const express = require('express');
const app = express();
var http = require('http');
var path = require("path");
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

const server = http.createServer(app);//create a server

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log('addr: ' + add);
})

/**********************websocket setup**************************************************************************************/

const WebSocket = require('ws');
const s = new WebSocket.Server({ server });

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

var msgCount = 0;
var ignoreInitialBeats = 20;
var beats = [];
var lastBeatAt = 0;
var state = 0;

s.on('connection', function (ws, req) {
  ws.on('message', function (message) {


    s.clients.forEach(function (client) { //broadcast incoming message to all clients (s.clients)
      if (client != ws && client.readyState) { //except to the same client (ws) that sent this message
        if (("" + message).charAt(0) === "N") {
          var now = (new Date().getTime()) / 1000;
          if (now - lastBeatAt > 3) {
            // finger not placed - 2 cases

            if (beats.length !== 0) { // case 1 - finger taken out after some time
              beats = [];
              msgCount = 0;
              console.log("case 1 - finger taken out after some time");
            } else {  // case 2 - finger never placed so far
              // show waiting to user
              if (state != 2) {
                console.log("case 2 - finger not placed");
                state = 2;
                client.send("S2");
              }
            }
          }
          else {
            // finger placed but no beat
            if (state != 3) {
              console.log("case 3 - finger placed but no beat");
              state = 3;
              client.send("S3");
            }

          }

        }
        else { // BPM data
          console.log("Received: " + message);
          msgCount += 1;
          lastBeatAt = (new Date().getTime()) / 1000;
          if (msgCount > ignoreInitialBeats) {

            client.send("" + message);

            beats.push(parseInt("" + message));

            if (msgCount >= 40) {
              let avg = 0;
              for (var i = 0; i < beats.length; i++) {
                avg += beats[i];
              }

              console.log("sum: " + avg);

              avg /= beats.length;
              console.log("avg: " + avg);

              client.send("A" + avg.toString()); // sending average bpm to browser
              msgCount = 20;
              beats = [];
            }
          }
        }
      }
    });

  });
  ws.on('close', function () {
    console.log("lost one client");
  });
  console.log("new client connected");
});


server.listen(3000);