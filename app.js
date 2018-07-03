// Dependencies Requirement
var express = require('express');
var http = require('http');
var https = require('https');
var config = require('./config');
var bodyParser = require('body-parser');
var axios = require('axios');
var stringify = require('json-stringify-safe');
var querystring = require('querystring');

// New express application and execution port
var app = express();
var port = process.env.PORT || 8083;

// Disable etag
app.disable('etag');

// Allow URLEncoded and JSON on Request Body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Allow CORS 
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// App Routes
app.post('/get-bio', function (req, res) {
  axios.get('https://torre.bio/api/bios/' + req.body.personId)
    .then(function (response) {
      res.send(stringify(response.data));
    })
    .catch(function (error) {
      return res.send(error);
    });
});

app.get('/auth', function (req, res) {
  var error = req.query.error;
  var error_description = req.query.error_description;
  var state = req.query.state;
  var code = req.query.code;
  if (error) {
    next(new Error(error));
  }
  
  handshake(req.query.code, res);
});

// Start Server
var server = http.createServer(app).listen(port, function () {
  console.log('Running application on port: ' + port);
});

// Socket.IO
var io = require('socket.io').listen(server);

function handshake(code, ores) {
  var data = querystring.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: 'http%3A%2F%2Flocalhost%3A8083%2Fauth',
      client_id: '78rknub4ani6mz',
      client_secret: 'b3Nk3SX9hGnTXQkw'
  });

  var options = {
      host: 'www.linkedin.com',
      path: '/oauth/v2/accessToken',
      protocol: 'https:',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data)
      }
  };
  
  var req = https.request(options, function (res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          data += chunk;
      });
      res.on('end', function () {
        io.emit('profile', { 'data': data });
        ores.redirect('http://localhost:8080/');
      });
      req.on('error', function (e) {
          console.log("problem with request: " + e.message);
      });

  });
  req.write(data);
  req.end();
}