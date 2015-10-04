var _ = require('underscore');
var async = require('async');
var request = require('request');
var semaphore = require('semaphore');
var bodyParser = require('body-parser');
var child_process = require('child_process');

var Firebase = require('firebase');
var firebaseRef = new Firebase(process.env.FIREBASE_URL);

var LifeIOHandler = require('./io-handler');

var BIN_PATH = __dirname + '/../../bin/life';

module.exports = require('express').Router()
  .post('/', bodyParser.urlencoded({extended: true}), createGame)
  .post('/:id/start', startGame)
  .get('/:id', getGameCoords)
  .post('/:id',  bodyParser.json(), updateGame);

function createGame(req, res) {
  var id;
  firebaseRef.child('maxId').transaction(function(maxId) {
    return id = ((maxId || 0) + 1);
  }, function() {
    // spin up life binary instance and hold
    // it behind this game
    var ioHandler = new LifeIOHandler(child_process.spawn(BIN_PATH));
    global.games[id] = {
      ioHandler: ioHandler,
      semaphore: semaphore(1)
    };
    // update the global object after the game
    // instance closes
    ioHandler.on('exit', function() {
      var game = global.games[id];
      if (game) {
        game.semaphore.take(function() {
          if (game.ioHandler === ioHandler) {
            delete global.games[id].ioHandler;
          }
          game.semaphore.leave();
        });
      }
    });
    return res.json({ id: id });
  });
}

function startGame(req, res, next) {
  var gameId = req.params.id;
  var game = global.games[gameId];
  if (!game) {
    game = global.games[gameId] = {
      semaphore: semaphore(1)
    };
  }
  var coordsRef = firebaseRef.child(gameId + '/coords');
  coordsRef.once('value', function(snapshot) {
    if (snapshot.exists()) {
      game.semaphore.take(function() {
        game.ioHandler = new LifeIOHandler(child_process.spawn(BIN_PATH));
        game.semaphore.leave();
        var val = snapshot.exportVal();
        request.get({
          url: process.env.ROOT_URL + '/api/' + gameId,
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(val)
        }, function(err, response, body) {
          res.set('Content-Type', 'application/json');
          return res.send(body);
        });
      });
    } else {
      var err = new Error('Game ' + gameId + ' could not be found');
      err.statusCode = 404;
      return next(err);
    }
  });
}

function getGameCoords(req, res) {
  var coordsRef = firebaseRef.child(req.params.id + '/coords');
  coordsRef.once('value', function(snapshot) {
    res.json(snapshot.exportVal() || {});
  });
}

function updateGame(req, res, next) {
  var gameId = req.params.id;
  var game = global.games[gameId];
  if (!game) {
    var err = new Error('No saved game');
    err.statusCode = 404;
    return next(err);
  }

  var coordsRef = firebaseRef.child(gameId + '/coords');
  async.waterfall([
    /**
     * Writes the new pixels to the firebase reference
     */
    function drawNewPixels(callback) {
      var drawn = req.body.drawn;
      coordsRef.transaction(function(data) {
        data = data || {};
        return extendCoords(data, drawn);
      }, callback);
    },

    /**
     * Builds array of coordinate x and y to pass to our
     * life binary
     */
    function buildArgsArray(committed, snapshot, callback) {
      var pointsStr = '';
      var drawn = req.body.drawn;
      for (var x in drawn) {
        for (var y in drawn[x]) {
          pointsStr += (x + ' ' + y + ' ');
        }
      }
      if (pointsStr.length) { pointsStr = pointsStr.substr(0, pointsStr.length-1); }
      pointsStr += '\n';
      return callback(null, pointsStr);
    },

    /**
     * Runs the life binary and passes along the
     * JSON output
     */
    function getResultJSON(pointsStr, callback) {
      var io = game.ioHandler;
      io.once('end', function(jsonStr) {
        // go ahead and send the JSON back before updating
        // the firebase ref
        res.set('Content-Type', 'application/json');
        res.send(jsonStr);

        var json = JSON.parse(jsonStr);
        return callback(null, json);
      }).enqueue(pointsStr);
    },

    /**
     * Updates the firebase reference with the output
     * from the life binary
     */
    function updateFirebase(json, callback) {
      var updates = extendCoords({}, json.deaths, json.births);
      coordsRef.transaction(function(data) {
        data = data || {};
        return extendCoords(data, updates);
      }, function(err) {
        return callback(err, json);
      });
    }
  ], function(err, json) { if (err) { return next(err); } });
}

/**
 * Mimics underscore's extend, but descends a level
 * instead of overwriting top-level keys
 *
 * @param {Object} base
 * @param {...Object} coords
 *
 * @example
 * // returns {4: {3: true, 9: true}, 5: {9: true}}
 * extendCoords({4: {3: true}}, {4: {9: true}}, {5: {9: true}});
 *
 * @returns {Object} the modified base object
 */
function extendCoords(base, coords) {
  base = base || {};
  for (var x in coords) {
    base[x] = base[x] || {};
    for (var y in coords[x]) {
      base[x][y] = coords[x][y];
    }
  }

  var args = _.toArray(arguments);
  if (args.length > 2) {
    args.splice(1, 1);
    return extendCoords.apply(this, args);
  }

  return base;
}
