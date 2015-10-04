var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

function IOHandler(process, sep) {
  this._sep = sep || '\n';
  this._process = process;
  this._stdin = process.stdin;
  this._stdout = process.stdout;
  this._writeQueue = [];

  this._ready = true;
  this._currentStr = '';

  this._stdout.on('data', this._handleData.bind(this));
  this._process.on('exit', this._handleExit.bind(this));

  EventEmitter.call(this);
}
inherits(IOHandler, EventEmitter);

IOHandler.prototype._handleData = function(data) {
  this._currentStr += data.toString();
  if (this._currentStr[this._currentStr.length-1] === this._sep) {
    this._wipe();
  }
};

IOHandler.prototype._handleExit = function(code) {
  this.emit('exit', code);
};

IOHandler.prototype._wipe = function() {
  this.emit('end', this._currentStr.slice());
  this._currentStr = '';
  this._dequeue();
};

IOHandler.prototype.enqueue = function(data) {
  this._writeQueue.push(data);
  if (this._ready) { this._dequeue(); }
};

IOHandler.prototype._dequeue = function() {
  if (this._writeQueue.length) {
    this._ready = false;
    this._stdin.write(this._writeQueue.shift());
  } else {
    this._ready = true;
  }
};

module.exports = IOHandler;
