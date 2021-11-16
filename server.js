var bodyParser = require("body-parser");
const express = require('express');
const ejs = require("ejs");
const app = express();
var http = require('http');
var nodemailer = require('nodemailer');

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);//create a server

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log('addr: ' + add);
})

// websocket setup
const WebSocket = require('ws');
const s = new WebSocket.Server({ server });
var user = null;
var doctorEmail = "harishcse18501@gmail.com";

var msgCount = 0;
var ignoreInitialBeats = 20;
var beats = [];
var lastBeatAt = 0;
var state = 0;
var bpmavg = [];
var numWarnings = 0;
var maxWarningLimit = 1;
var flag = 0;

app.get('/', (req, res) => {
  if (user == null) {
    res.render("login");
  } else {
    res.render("index", {
      'doctor': doctorEmail
    });
  }
});

app.post('/', (req, res) => {
  user = req.body.email;
  console.log(user);
  res.redirect("/");
});

app.post('/changeDoctor', (req, res) => {
  doctorEmail = req.body.doctorEmail;
  res.sendStatus(200);
});

app.get('/logout', (req, res) => {
  msgCount = 0;
  ignoreInitialBeats = 20;
  beats = [];
  lastBeatAt = 0;
  state = 0;
  bpmavg = [];
  numWarnings = 0;
  maxWarningLimit = 1;
  flag = 0;
  user = null;
  res.redirect("/");
});


var pass = {
  'GAccount': "projectmailer029@gmail.com",
  'GPassword': "#d$s27&sqW2"
}

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: pass.GAccount,
    pass: pass.GPassword
  }
});



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
                msgCount = 0;
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

              //console.log("sum: " + avg);
              avg /= beats.length;
              bpmavg.push(avg);

              if (bpmavg.length == 2) {
                if (bpmavg[0] < 60) {
                  flag = 1;
                }
                else if (bpmavg[0] > 90) {
                  flag = 2;
                }
                else {
                  flag = 0;
                }
                if (flag != 0) {

                  for (var i = 1; i < bpmavg.length; i++) {
                    if (flag === 1) {
                      if (bpmavg[i] < 60) {
                        continue;
                      }
                      else {
                        flag = 0;
                        break;
                      }
                    }
                    else if (flag === 2) {
                      if (bpmavg[i] > 90) {
                        continue;
                      }
                      else {
                        flag = 0;
                        break;
                      }

                    }
                  }
                }




                if (flag !== 0) {
                  //console.log("flaginside " + flag);
                  client.send("W");
                  numWarnings += 1;
                }

                if (numWarnings == maxWarningLimit) {
                  numWarnings = 0;
                  var bpmMailString = "";
                  if (flag == 1) {
                    bpmMailString = "below 60";
                  }
                  else if (flag == 2) {
                    bpmMailString = "above 90";
                  }

                  var mailOptions = {
                    from: pass.GAccount,
                    to: doctorEmail,
                    subject: 'Alert from Heart Rate Monitoring System',
                    html: 'The average BPM of the user ' + user + ' is ' + bpmMailString
                  }

                  transporter.sendMail(mailOptions, function (err, info) {
                    if (err) {
                      console.log(err);
                      //console.log("Error occured. Mail not sent");
                    }
                    else {
                      console.log("Email sent: " + info.response);
                    }
                  });


                }

                bpmavg = [];
              }


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