require('dotenv').load();

var http = require('http');
var express = require('express');
var exphbs = require('express-handlebars');
var compression = require('compression');

var app = express();

app.use(compression());

var hbs = exphbs.create({
    handlebars: require('handlebars'),
    defaultLayout: 'main',
    layoutsDir: './views/layouts',
    extname: '.hbs'
});
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

app.use(express.static('res'));

app.get('/', function(req, res) {
  res.render('splash');
}).get('/:id', function(req, res) {
  res.render('canvas', {
    gameId: req.params.id
  });
}).use('/api', require('./routes/api'));

/**
 * @global
 * Wraps around all active game instances
 */
global.games = {};

var port = Number(process.env.PORT || 4000);
var server = http.createServer(app).listen(port, function() {
  var addr = server.address();
  console.log('Listening at port %d', addr.port);
});
