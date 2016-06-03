;(function(window, $, el, instructionsEl) {

  /**
   * Encapsulates the canvas element
   * @class
   * @param {HTMLElement} el
   */
  function Canvas(el, instructionsEl) {
    this.el = el;
    this.instructionsEl = instructionsEl;
    this.gameId = this.el.getAttribute('data-game-id');
    this.pixels = {};
    this.context = this.el.getContext('2d');
    this.pixelSize = 4;
    this.currentColor = 0;
    this.newUserPixels = {};

    this.ready = true;

    this.$window = $(window);
    this.$body = $('body').addClass('hide');

    this.el.addEventListener('mousedown', this._handleMousedown.bind(this));
    this.el.addEventListener('mousemove', this._handleMousemove.bind(this));
    this.$window.on('mouseup', this._handleMouseup.bind(this));

    this.init();
  }

  Canvas.prototype.init = function() {
    $.ajax('/api/' + this.gameId + '/start', {
      type: 'POST',
      success: this._handleInitSuccess.bind(this),
      error: this._handleInitError.bind(this),
      complete: this._handleInitComplete.bind(this)
    });
  };

  Canvas.prototype._handleInitSuccess = function(response) {
    // render these as new user pixels to update
    // the client and post them to a new game instance
    // when we're ready to start
    Canvas._withPixels(response, this.drawNewUserPixel.bind(this));
  };

  Canvas.prototype._handleInitError = function(xhr) {
    // ignore a 404 on init--expected when we're
    // starting a new game
    if (xhr.status == 404) { return; }
    this.ready = false;
    this.$body.html('<p class="error">There was an error</p>');
  };

  Canvas.prototype._handleInitComplete = function() {
    this.$body.removeClass('hide');
    this.$window.on('keypress', this._handleSpacebar.bind(this));
  };

  Canvas.prototype.load = function(complete) {
    $.ajax('/api/' + this.gameId, {
      type: 'POST',
      data: JSON.stringify({ drawn: this.newUserPixels }),
      contentType: 'application/json',
      success: this._handleSuccess.bind(this),
      complete: complete
    });
    this.newUserPixels = {};
  };

  Canvas.prototype.drawNewUserPixel = function(x, y) {
    this.draw(x, y);
    Canvas._addPixelToHash(this.newUserPixels, x, y);
  };

  Canvas.prototype._handleMousedown = function(e) {
    this._mousedown = true;
    this.currentPixel = this.getPixelFromEvent(e);
    this.drawNewUserPixel(this.currentPixel.x, this.currentPixel.y);
  };

  Canvas.prototype._handleMousemove = function(e) {
    if (!this._mousedown) { return; }

    e.preventDefault();

    var nextPixel = this.getPixelFromEvent(e);
    var path = Canvas._bres(this.currentPixel, nextPixel);
    Canvas._withPixels(path, (function(x, y) {
      this.drawNewUserPixel(x, y);
    }).bind(this));

    this.currentPixel = nextPixel;
  };

  Canvas.prototype._handleMouseup = function() {
    delete this._mousedown;
  };

  Canvas.prototype._handleSpacebar = function() {
    if (!this.ready) { return; }

    this.ready = false;
    $(this.instructionsEl).addClass('hide');
    this.loop();
  };

  Canvas.prototype.loop = function() {
    this.context.fillStyle = Canvas._getHexColor(
      Math.floor(Math.random() * 16777216));
    setTimeout(function() {
      this.load( this.loop.bind(this) );
    }.bind(this));
  };

  Canvas.prototype.getPixelFromEvent = function(e) {
    return {
      x: Math.floor(e.offsetX / this.pixelSize),
      y: Math.floor(e.offsetY / this.pixelSize)
    };
  };

  /**
   * Updates the client state with the new births
   * and deaths given back by the API
   * @param {Object} response
   */
  Canvas.prototype._handleSuccess = function(response) {
    Canvas._withPixels(response.births, this.draw.bind(this));
    Canvas._withPixels(response.deaths, this.erase.bind(this));
  };

  Canvas.prototype.draw = function(x, y) {
    Canvas._addPixelToHash(this.pixels, x, y);
    this.renderPixel(x, y);
  };

  Canvas.prototype.erase = function(x, y) {
    Canvas._removePixelFromHash(this.pixels, x, y);
    this.erasePixel(x, y);
  };

  Canvas.prototype.renderPixel = function(x, y) {
    this.context.fillRect(
      x * this.pixelSize,
      y * this.pixelSize,
      this.pixelSize, this.pixelSize);
  };

  Canvas.prototype.erasePixel = function(x, y) {
    this.context.clearRect(
      x * this.pixelSize,
      y * this.pixelSize,
      this.pixelSize, this.pixelSize);
  };

  Canvas._addPixelToHash = function(hash, x, y) {
    var obj = hash[x];
    if (!obj) { obj = hash[x] = {}; }
    obj[y] = true;
  };

  Canvas._removePixelFromHash = function(hash, x, y) {
    var obj = hash[x];
    if (obj) { delete obj[y]; }
  };

  Canvas._withPixels = function(pixels, cb) {
    var x, y;
    for (x in pixels) {
      for (y in pixels[x]) {
        cb(x, y);
      }
    }
  };

  Canvas._getHexColor = function(num) {
    var str = num.toString(16);
    while (str.length < 6) {
      str = ('0' + str);
    }
    return '#' + str;
  };

  /**
   * Runs Bresenham's line algorithm on two coordinates to determine
   * pixels that make up a line between them
   * @param {Object} c0
   * @param {Object} c1
   * @returns {Object}
   */
  Canvas._bres = function(c0, c1) {
    var pixels = {};

    var lt = c0.x < c1.x;
    var x0 = lt ? c0.x : c1.x;
    var y0 = lt ? c0.y : c1.y;
    var x1 = lt ? c1.x : c0.x;
    var y1 = lt ? c1.y : c0.y;

    var ySign = y0 < y1 ? 1 : -1;
    var y;
    if(x0 === x1) {
      // draw a vertical line
      for(y = y0; y !== (y1 + ySign); y += ySign) {
        pixels[x0] = pixels[x0] || {};
        pixels[x0][y] = true;
      }
      return pixels;
    }

    var err = 0;
    var deltaErr = Math.abs((y1 - y0) / (x1 - x0));
    y = y0;
    var xSign = x0 < x1 ? 1 : -1;
    for(var x = x0; x !== (x1 + xSign); x += xSign) {
      pixels[x] = pixels[x] || {};
      pixels[x][y] = true;

      err += deltaErr;
      var prevX = x;
      var prevY = y;
      while(Math.abs(err) > 0.5 && y !== y1) {
        if(prevX !== x || prevY !== y) {
          pixels[x] = pixels[x] || {};
          pixels[x][y] = true;
          prevX = x;
          prevY = y;
        }
        y += ySign;
        err -= 1;
      }
    }
    return pixels;
  };

  window.Canvas = new Canvas(el, instructionsEl);

})(window, jQuery, document.querySelector('canvas#main'), document.querySelector('p#instructions'));
