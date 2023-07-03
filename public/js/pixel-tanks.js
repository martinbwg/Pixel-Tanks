/*
 Copyright (c) 2013, Rodrigo González, Sapienlab All Rights Reserved.
 Available via MIT LICENSE. See https://github.com/roro89/jsonpack/blob/master/LICENSE.md for details.
 */
(function(define) {

	define([], function() {

		var TOKEN_TRUE = -1;
		var TOKEN_FALSE = -2;
		var TOKEN_NULL = -3;
		var TOKEN_EMPTY_STRING = -4;
		var TOKEN_UNDEFINED = -5;

		var pack = function(json, options) {

			// Canonizes the options
			options = options || {};

			// A shorthand for debugging
			var verbose = options.verbose || false;

			verbose && console.log('Normalize the JSON Object');

			// JSON as Javascript Object (Not string representation)
			json = typeof json === 'string' ? this.JSON.parse(json) : json;

			verbose && console.log('Creating a empty dictionary');

			// The dictionary
			var dictionary = {
				strings : [],
				integers : [],
				floats : []
			};

			verbose && console.log('Creating the AST');

			// The AST
			var ast = (function recursiveAstBuilder(item) {

				verbose && console.log('Calling recursiveAstBuilder with ' + this.JSON.stringify(item));

				// The type of the item
				var type = typeof item;

				// Case 7: The item is null
				if (item === null) {
					return {
						type : 'null',
						index : TOKEN_NULL
					};
				}
				
				//add undefined 
				if (typeof item === 'undefined') {
					return {
						type : 'undefined',
						index : TOKEN_UNDEFINED
					};
				}

				// Case 1: The item is Array Object
				if ( item instanceof Array) {

					// Create a new sub-AST of type Array (@)
					var ast = ['@'];

					// Add each items
					for (var i in item) {
						
						if (!item.hasOwnProperty(i)) continue;

						ast.push(recursiveAstBuilder(item[i]));
					}

					// And return
					return ast;

				}

				// Case 2: The item is Object
				if (type === 'object') {

					// Create a new sub-AST of type Object ($)
					var ast = ['$'];

					// Add each items
					for (var key in item) {

						if (!item.hasOwnProperty(key))
							continue;

						ast.push(recursiveAstBuilder(key));
						ast.push(recursiveAstBuilder(item[key]));
					}

					// And return
					return ast;

				}

				// Case 3: The item empty string
				if (item === '') {
					return {
						type : 'empty',
						index : TOKEN_EMPTY_STRING
					};
				}

				// Case 4: The item is String
				if (type === 'string') {

					// The index of that word in the dictionary
					var index = _indexOf.call(dictionary.strings, item);

					// If not, add to the dictionary and actualize the index
					if (index == -1) {
						dictionary.strings.push(_encode(item));
						index = dictionary.strings.length - 1;
					}

					// Return the token
					return {
						type : 'strings',
						index : index
					};
				}

				// Case 5: The item is integer
				if (type === 'number' && item % 1 === 0) {

					// The index of that number in the dictionary
					var index = _indexOf.call(dictionary.integers, item);

					// If not, add to the dictionary and actualize the index
					if (index == -1) {
						dictionary.integers.push(_base10To36(item));
						index = dictionary.integers.length - 1;
					}

					// Return the token
					return {
						type : 'integers',
						index : index
					};
				}

				// Case 6: The item is float
				if (type === 'number') {
					// The index of that number in the dictionary
					var index = _indexOf.call(dictionary.floats, item);

					// If not, add to the dictionary and actualize the index
					if (index == -1) {
						// Float not use base 36
						dictionary.floats.push(item);
						index = dictionary.floats.length - 1;
					}

					// Return the token
					return {
						type : 'floats',
						index : index
					};
				}

				// Case 7: The item is boolean
				if (type === 'boolean') {
					return {
						type : 'boolean',
						index : item ? TOKEN_TRUE : TOKEN_FALSE
					};
				}

				// Default
				throw new Error('Unexpected argument of type ' + typeof (item));

			})(json);

			// A set of shorthands proxies for the length of the dictionaries
			var stringLength = dictionary.strings.length;
			var integerLength = dictionary.integers.length;
			var floatLength = dictionary.floats.length;

			verbose && console.log('Parsing the dictionary');

			// Create a raw dictionary
			var packed = dictionary.strings.join('|');
			packed += '^' + dictionary.integers.join('|');
			packed += '^' + dictionary.floats.join('|');

			verbose && console.log('Parsing the structure');

			// And add the structure
			packed += '^' + (function recursiveParser(item) {

				verbose && console.log('Calling a recursiveParser with ' + this.JSON.stringify(item));

				// If the item is Array, then is a object of
				// type [object Object] or [object Array]
				if ( item instanceof Array) {

					// The packed resulting
					var packed = item.shift();

					for (var i in item) {
						
						if (!item.hasOwnProperty(i)) 
							continue;
						
						packed += recursiveParser(item[i]) + '|';
					}

					return (packed[packed.length - 1] === '|' ? packed.slice(0, -1) : packed) + ']';

				}

				// A shorthand proxies
				var type = item.type, index = item.index;

				if (type === 'strings') {
					// Just return the base 36 of index
					return _base10To36(index);
				}

				if (type === 'integers') {
					// Return a base 36 of index plus stringLength offset
					return _base10To36(stringLength + index);
				}

				if (type === 'floats') {
					// Return a base 36 of index plus stringLength and integerLength offset
					return _base10To36(stringLength + integerLength + index);
				}

				if (type === 'boolean') {
					return item.index;
				}

				if (type === 'null') {
					return TOKEN_NULL;
				}

				if (type === 'undefined') {
					return TOKEN_UNDEFINED;
				}

				if (type === 'empty') {
					return TOKEN_EMPTY_STRING;
				}

				throw new TypeError('The item is alien!');

			})(ast);

			verbose && console.log('Ending parser');

			// If debug, return a internal representation of dictionary and stuff
			if (options.debug)
				return {
					dictionary : dictionary,
					ast : ast,
					packed : packed
				};

			return packed;

		};

		var unpack = function(packed, options) {

			// Canonizes the options
			options = options || {};

			// A raw buffer
			var rawBuffers = packed.split('^');

			// Create a dictionary
			options.verbose && console.log('Building dictionary');
			var dictionary = [];

			// Add the strings values
			var buffer = rawBuffers[0];
			if (buffer !== '') {
				buffer = buffer.split('|');
				options.verbose && console.log('Parse the strings dictionary');
				for (var i=0, n=buffer.length; i<n; i++){
					dictionary.push(_decode(buffer[i]));
				}
			}

			// Add the integers values
			buffer = rawBuffers[1];
			if (buffer !== '') {
				buffer = buffer.split('|');
				options.verbose && console.log('Parse the integers dictionary');
				for (var i=0, n=buffer.length; i<n; i++){
					dictionary.push(_base36To10(buffer[i]));
				}
			}

			// Add the floats values
			buffer = rawBuffers[2];
			if (buffer !== '') {
				buffer = buffer.split('|')
				options.verbose && console.log('Parse the floats dictionary');
				for (var i=0, n=buffer.length; i<n; i++){
					dictionary.push(parseFloat(buffer[i]));
				}
			}
			// Free memory
			buffer = null;

			options.verbose && console.log('Tokenizing the structure');

			// Tokenizer the structure
			var number36 = '';
			var tokens = [];
			var len=rawBuffers[3].length;
			for (var i = 0; i < len; i++) {
				var symbol = rawBuffers[3].charAt(i);
				if (symbol === '|' || symbol === '$' || symbol === '@' || symbol === ']') {
					if (number36) {
						tokens.push(_base36To10(number36));
						number36 = '';
					}
					symbol !== '|' && tokens.push(symbol);
				} else {
					number36 += symbol;
				}
			}

			// A shorthand proxy for tokens.length
			var tokensLength = tokens.length;

			// The index of the next token to read
			var tokensIndex = 0;

			options.verbose && console.log('Starting recursive parser');

			return (function recursiveUnpackerParser() {

				// Maybe '$' (object) or '@' (array)
				var type = tokens[tokensIndex++];

				options.verbose && console.log('Reading collection type ' + (type === '$' ? 'object' : 'Array'));

				// Parse an array
				if (type === '@') {

					var node = [];

					for (; tokensIndex < tokensLength; tokensIndex++) {
						var value = tokens[tokensIndex];
						options.verbose && console.log('Read ' + value + ' symbol');
						if (value === ']')
							return node;
						if (value === '@' || value === '$') {
							node.push(recursiveUnpackerParser());
						} else {
							switch(value) {
								case TOKEN_TRUE:
									node.push(true);
									break;
								case TOKEN_FALSE:
									node.push(false);
									break;
								case TOKEN_NULL:
									node.push(null);
									break;
								case TOKEN_UNDEFINED:
									node.push(undefined);
									break;
								case TOKEN_EMPTY_STRING:
									node.push('');
									break;
								default:
									node.push(dictionary[value]);
							}

						}
					}

					options.verbose && console.log('Parsed ' + this.JSON.stringify(node));

					return node;

				}

				// Parse a object
				if (type === '$') {
					var node = {};

					for (; tokensIndex < tokensLength; tokensIndex++) {

						var key = tokens[tokensIndex];

						if (key === ']')
							return node;

						if (key === TOKEN_EMPTY_STRING)
							key = '';
						else
							key = dictionary[key];

						var value = tokens[++tokensIndex];

						if (value === '@' || value === '$') {
							node[key] = recursiveUnpackerParser();
						} else {
							switch(value) {
								case TOKEN_TRUE:
									node[key] = true;
									break;
								case TOKEN_FALSE:
									node[key] = false;
									break;
								case TOKEN_NULL:
									node[key] = null;
									break;
								case TOKEN_UNDEFINED:
									node[key] = undefined;
									break;
								case TOKEN_EMPTY_STRING:
									node[key] = '';
									break;
								default:
									node[key] = dictionary[value];
							}

						}
					}

					options.verbose && console.log('Parsed ' + this.JSON.stringify(node));

					return node;
				}

				throw new TypeError('Bad token ' + type + ' isn\'t a type');

			})();

		}
		/**
		 * Get the index value of the dictionary
		 * @param {Object} dictionary a object that have two array attributes: 'string' and 'number'
		 * @param {Object} data
		 */
		var _indexOfDictionary = function(dictionary, value) {

			// The type of the value
			var type = typeof value;

			// If is boolean, return a boolean token
			if (type === 'boolean')
				return value ? TOKEN_TRUE : TOKEN_FALSE;

			// If is null, return a... yes! the null token
			if (value === null)
				return TOKEN_NULL;

			//add undefined
			if (typeof value === 'undefined')
				return TOKEN_UNDEFINED;


			if (value === '') {
				return TOKEN_EMPTY_STRING;
			}

			if (type === 'string') {
				value = _encode(value);
				var index = _indexOf.call(dictionary.strings, value);
				if (index === -1) {
					dictionary.strings.push(value);
					index = dictionary.strings.length - 1;
				}
			}

			// If has an invalid JSON type (example a function)
			if (type !== 'string' && type !== 'number') {
				throw new Error('The type is not a JSON type');
			};

			if (type === 'string') {// string
				value = _encode(value);
			} else if (value % 1 === 0) {// integer
				value = _base10To36(value);
			} else {// float

			}

			// If is number, "serialize" the value
			value = type === 'number' ? _base10To36(value) : _encode(value);

			// Retrieve the index of that value in the dictionary
			var index = _indexOf.call(dictionary[type], value);

			// If that value is not in the dictionary
			if (index === -1) {
				// Push the value
				dictionary[type].push(value);
				// And return their index
				index = dictionary[type].length - 1;
			}

			// If the type is a number, then add the '+'  prefix character
			// to differentiate that they is a number index. If not, then
			// just return a 36-based representation of the index
			return type === 'number' ? '+' + index : index;

		};

		var _encode = function(str) {
			if ( typeof str !== 'string')
				return str;

			return str.replace(/[\+ \|\^\%]/g, function(a) {
				return ({
				' ' : '+',
				'+' : '%2B',
				'|' : '%7C',
				'^' : '%5E',
				'%' : '%25'
				})[a]
			});
		};

		var _decode = function(str) {
			if ( typeof str !== 'string')
				return str;

			return str.replace(/\+|%2B|%7C|%5E|%25/g, function(a) {
				return ({
				'+' : ' ',
				'%2B' : '+',
				'%7C' : '|',
				'%5E' : '^',
				'%25' : '%'
				})[a]
			})
		};

		var _base10To36 = function(number) {
			return Number.prototype.toString.call(number, 36).toUpperCase();
		};

		var _base36To10 = function(number) {
			return parseInt(number, 36);
		};

		var _indexOf = Array.prototype.indexOf ||
		function(obj, start) {
			for (var i = (start || 0), j = this.length; i < j; i++) {
				if (this[i] === obj) {
					return i;
				}
			}
			return -1;
		};

		return {
			JSON : JSON,
			pack : pack,
			unpack : unpack
		};

	});

})( typeof define == 'undefined' || !define.amd ? function(deps, factory) {
	var jsonpack = factory();
	if ( typeof exports != 'undefined')
		for (var key in jsonpack)
		exports[key] = jsonpack[key];
	else
		window.jsonpack = jsonpack;
} : define);

(() => {
  class MegaSocket {
    constructor(url, options) {
      this.url = url;
      this.options = {};
      this.callstack = {open: [], close: [], message: []};
      const {keepAlive = true, autoconnect = true, reconnect = false} = options;

      this.options.keepAlive = keepAlive;
      this.options.autoconnect = autoconnect;
      this.options.reconnect = reconnect;
      if (this.options.autoconnect) {
        this.status = 'connecting';
        this.connect();
      } else {
        this.status = 'idle';
        window.addEventListener('offline', () => {
          this.socket.close();
          this.socket.onclose();
        });
        if (this.options.reconnect) window.addEventListener('online', this.connect.bind(this));
      }
    }

    connect() {
      this.socket = new WebSocket(this.url);
      this.socket.onopen = () => {
        this.status = 'connected';
        if (this.options.keepAlive) this.socket.keepAlive = setInterval(() => {
          this.socket.send('|');
        }, 50000);
        this.callstack.open.forEach(f => f());
      }
      this.socket.onmessage = data => {
        try {
          data = window.jsonpack.unpack(A.de(data.data));
        } catch(e) {
          alert('Socket Encryption Error: ' + A.de(data.data));
        }
        if (data.status === 'error') return alert(data.message);
        this.callstack.message.forEach(f => f(data));
      }
      this.socket.onclose = e => {
        clearInterval(this.socket.keepAlive);
        this.status = 'disconnected';
        this.callstack.close.forEach(f => f());
        if (this.options.reconnect) this.connect();
      }
    }

    on(event, operation) {
      if (event === 'connect') this.callstack.open.push(operation);
      if (event === 'message') this.callstack.message.push(operation);
      if (event === 'close') this.callstack.close.push(operation);
    }
    no(event) {
      if (event === 'connect') this.callstack.open = [];
      if (event === 'message') this.callstack.message = [];
      if (event === 'close') this.callstack.close = [];
    }
    send(data) {
      this.socket.send(A.en(window.jsonpack.pack(data)));
    }
    close() {
      this.socket.close();
    }
  }

  class A {
    static each(arr, func, filter, param) {
      var l = 0;
      while (l<arr.length) {
        if ((filter === undefined || filter === null) ? true : (arr[l][filter.key] === filter.value)) {
          var r = undefined;
          if (typeof func === 'string') {
            r = arr[l][func](param);
          } else {
            r = func.bind(arr[l])({ ...param, i: l });
          }
          if (r !== undefined) return r;
        }
        l++;
      }
    }

    static search(arr, filter) {
      var l = 0;
      while (l<arr.length) {
        if (arr[l][filter.key] === filter.value) {
          return arr[l];
        }
        l++;
      }
    }

    static collider(rect1, rect2) {
      if ((rect1.x > rect2.x || rect1.x+rect1.w > rect2.x) && (rect1.x < rect2.x+rect2.w || rect1.x+rect1.w < rect2.x+rect2.w) && (rect1.y > rect2.y || rect1.y+rect1.h > rect2.y) && (rect1.y < rect2.y+rect2.h || rect1.y+rect1.h < rect2.y+rect2.h)) return true;
      return false;
    }

    static assign(obj, keys, values) {
      A.each(keys, function(d) {obj[this] = d.values[d.i]}, null, {values: values});
    }

    static en(c) {var x='charCodeAt',b,e={},f=c.split(""),d=[],a=f[0],g=256;for(b=1;b<f.length;b++)c=f[b],null!=e[a+c]?a+=c:(d.push(1<a.length?e[a]:a[x](0)),e[a+c]=g,g++,a=c);d.push(1<a.length?e[a]:a[x](0));for(b=0;b<d.length;b++)d[b]=String.fromCharCode(d[b]);return d.join("")}

    static de(b) {var a,e={},d=b.split(""),c=d[0],f=d[0],g=[c],h=256,o=256;for(b=1;b<d.length;b++)a=d[b].charCodeAt(0),a=h>a?d[b]:e[a]?e[a]:f+c,g.push(a),c=a.charAt(0),e[o]=f+c,o++,f=a;return g.join("")}
  }

  class Menu {
    constructor(draw, listeners, element, context) {
      this.draw = draw.bind(this);
      this.element = element;
      this.listeners = listeners;
      for (const property in this.listeners) {
        this.listeners[property] = this.listeners[property].bind(context ? context : this);
      }
    }

    addListeners() {
      for (let property in this.listeners) {
        this.element.addEventListener(property, this.listeners[property]);
      }
    }

    removeListeners() {
      for (let property in this.listeners) {
        this.element.removeEventListener(property, this.listeners[property]);
      }
    }
  }

  class Menus {
    static trigger(name) {
      if (Menus.current) Menus.menus[Menus.current].removeListeners();
      Menus.current = name;
      GUI.clear();
      Menus.menus[Menus.current].draw();
      Menus.menus[Menus.current].addListeners();
    }

    static onclick(e) {
      const x = (e.clientX-(window.innerWidth-window.innerHeight*1.6)/2)/PixelTanks.resizer, y = e.clientY/PixelTanks.resizer;
      for (const b of this.data.buttons) if (A.collider({x: x, y: y, w: 0, h: 0}, {x: b[0], y: b[1], w: b[2], h: b[3]})) return Menus.trigger(b[4]);
      for (const e of this.data.exec) if (A.collider({x: x, y: y, w: 0, h: 0}, {x: e[0], y: e[1], w: e[2], h: e[3]})) eval(e[4])
    }

    static redraw() {
      GUI.clear();
      if (Menus.current) Menus.menus[Menus.current].draw();
    }

    static removeListeners() {
      Menus.menus[Menus.current].removeListeners();
    }
  }

  class Network {
    static get(callback) {
      const {username, token} = PixelTanks.user;
      PixelTanks.socket.send({op: 'database', type: 'get', username, token});
      PixelTanks.socket.on('message', data => {
        if (data.status === 'success' && data.type === 'get') {
          PixelTanks.socket.no('message');
          callback(data.data);
        }
      });
    }

    static update(key, value) {
      const {username, token} = PixelTanks.user;
      PixelTanks.socket.send({op: 'database', type: 'set', username, token, key, value});
      PixelTanks.socket.on('message', data => {
        if (data.success) PixelTanks.socket.no('message');
      });
    }

    static auth(username, password, type, callback) {
      PixelTanks.socket.send({op: 'auth', type, username, password});
      PixelTanks.socket.on('message', data => {
        if (data.status === 'success') {
          PixelTanks.socket.no('message');
          PixelTanks.user.username = username;
          PixelTanks.user.token = data.token;
          callback();
        }
      });
    }
  }

  class Loader {

    static loadImage(source, t, i) {
      this.total++;
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          this.loaded++;
          PixelTanks.updateBootProgress(Math.round(this.loaded/this.total*100)/100);
          resolve(image);
        }
        image.onerror = () => reject(new Error(`Failed to load image: ${source}`));
        image.src = `https://cs6413110.github.io/Pixel-Tanks/public/images${source}.png`;
        this.key[t][i] = image;
      });
    }
  
    static async loadImages(key) {
      Loader.key = key;
      Loader.loaded = 0;
      Loader.total = 0;
      const promises = [];
      for (const t in key) {
        for (const i in key[t]) {
          if (!i.includes('_')) promises.push(this.loadImage(key[t][i], t, i));
        }
      }
      await Promise.all(promises);
      PixelTanks.launch();
    }
  
  }

  class GUI {
    
    static resize() {
      PixelTanks.resizer = window.innerHeight/1000;
      GUI.canvas.height = window.innerHeight;
      GUI.canvas.width = window.innerHeight*1.6;
      GUI.draw.setTransform(PixelTanks.resizer, 0, 0, PixelTanks.resizer, 0, 0);
      Menus.redraw();
    }

    static drawImage(image, x, y, w, h, t, px, py, bx, by, a, cx, cy, cw, ch) {
      if (a) {
        GUI.draw.translate(x+px, y+py);
        GUI.draw.rotate(a*Math.PI/180);
      }
      GUI.draw.globalAlpha = t;
      if (cx || cy || cy || ch) {
        GUI.draw.drawImage(image, cx, cy, cw, ch, x, y, w, h);
      } else {
        GUI.draw.drawImage(image, a ? -px+bx : x, a ? -py+by : y, w, h);
      }
      GUI.draw.globalAlpha = 1;
      if (a) {
        GUI.draw.rotate(-a*Math.PI/180);
        GUI.draw.translate(-x-px, -y-py);
      }
    }

    static drawText(message, x, y, size, color, anchor) {
      GUI.draw.font = `${size}px Font`;
      GUI.draw.fillStyle = color;
      GUI.draw.fillText(message, x-GUI.draw.measureText(message).width*anchor, y+size*.8*(1-anchor));
    }

    static clear() {
      GUI.draw.clearRect(-10000, -10000, 20000, 20000);
    }
  }

  class PixelTanks {

    static start() {
      PixelTanks.setup();
      PixelTanks.boot();
    }

    static setup() {
      document.body.innerHTML += `
      <style>
        html, body {
	  margin: 0;
	  max-height: 100vh;
	  max-width: 100vw;
	  padding: 0;
	  overflow: hidden;
	  text-align: center;
	}
	canvas {
	  display: inline;
	}
        @font-face {
	  font-family: 'Font';
          src: url('https://cs6413110.github.io/Pixel-Tanks/public/fonts/PixelOperator.ttf') format('truetype');
	}
      </style>
      `;
      GUI.canvas = document.createElement('CANVAS');
      GUI.draw = GUI.canvas.getContext('2d');
      document.body.appendChild(GUI.canvas);
      PixelTanks.resizer = window.innerHeight/1000;
      GUI.canvas.height = window.innerHeight;
      GUI.canvas.width = window.innerHeight*1.6;
      GUI.canvas.style = 'background-color: black;';
      GUI.draw.setTransform(PixelTanks.resizer, 0, 0, PixelTanks.resizer, 0, 0);
      GUI.drawText('Loading Font', 800, 500, 50, '#fffff', 0.5);
      window.oncontextmenu = () => {return false};
      window.addEventListener('resize', GUI.resize);
    }

    static updateBootProgress(progress) {
      GUI.clear();
      GUI.drawText(Math.round(progress*100)+'%', 800, 500, 50, '#ffffff', 0.5);
    }

    static boot() {
      PixelTanks.user = {};

      PixelTanks.images = {
        blocks: {
          barrier: '/blocks/barrier',
          strong: '/blocks/strong',
          weak: '/blocks/weak',
          spike: '/blocks/spike',
          floor: '/blocks/floor',
          void: '/blocks/void',
          gold: '/blocks/gold',
          heal: '/blocks/heal',
          mine: '/blocks/mine',
          fire: '/blocks/fire',
          airstrike: '/blocks/airstrike',
          fortress: '/blocks/fortress',
        },
        bullets: {
          //normal: '/bullets/default/normal', no image yet :(
          shotgun: '/bullets/shotgun',
          powermissle: '/bullets/powermissle',
          megamissle: '/bullets/megamissle',
          grapple: '/bullets/grapple',
          dynamite: '/bullets/dynamite',
          fire: '/bullets/fire',
        },
        tanks: {
          buff: '/tanks/buff',
          base: '/tanks/base',
          destroyed: '/tanks/destroyed',
          top: '/tanks/top',
          bottom: '/tanks/bottom',
          bottom2: '/tanks/bottom2',
        },
        cosmetics: {
              'DarkMemeGod': '/cosmetics/meme',
              'Aaron': '/cosmetics/aaron',
              'Astronaut': '/cosmetics/astronaut',
              'Onfire': '/cosmetics/onfire',
              'Assassin': '/cosmetics/assassin',
              'Redsus': '/cosmetics/redsus',
              'Venom': '/cosmetics/venom',
              'Blue Tint': '/cosmetics/blue_tint',
              'Purple Flower': '/cosmetics/purple_flower',
              'Leaf': '/cosmetics/leaf',
              'Basketball': '/cosmetics/basketball',
              'Purple Top Hat': '/cosmetics/purple_top_hat',
              'Terminator': '/cosmetics/terminator',
              'Dizzy': '/cosmetics/dizzy',
              'Knife': '/cosmetics/knife',
              'Scared': '/cosmetics/scared',
              'Laff': '/cosmetics/laff',
              'Hacker Hoodie': '/cosmetics/hacker_hoodie',
              'Error': '/cosmetics/error',
              'Purple Grad Hat': '/cosmetics/purple_grad_hat',
              'Bat Wings': '/cosmetics/bat_wings',
              'Back Button': '/cosmetics/back',
              'Fisher Hat': '/cosmetics/fisher_hat',
              'Kill = Ban': '/cosmetics/ban',
              'Blue Ghost': '/cosmetics/blue_ghost',
              'Pumpkin Face': '/cosmetics/pumpkin_face',
              'Pumpkin Hat': '/cosmetics/pumpkin_hat',
              'Red Ghost': '/cosmetics/red_ghost',
              'Candy Corn': '/cosmetics/candy_corn',
              'Yellow Pizza': '/cosmetics/yellow_pizza',
              'Orange Ghost': '/cosmetics/orange_ghost',
              'Pink Ghost': '/cosmetics/pink_ghost',
              'Paleontologist': '/cosmetics/paleontologist',
              'Yellow Hoodie': '/cosmetics/yellow_hoodie',
              'X': '/cosmetics/x',
              'Sweat': '/cosmetics/sweat',
              'Spirals': '/cosmetics/spirals',
              'Spikes': '/cosmetics/spikes',
              'Rudolph': '/cosmetics/rudolph',
              'Reindeer Hat': '/cosmetics/reindeer_hat',
              'Red Hoodie': '/cosmetics/red_hoodie',
              'Question Mark': '/cosmetics/question_mark',
              'Purple-Pink Hoodie': '/cosmetics/purplepink_hoodie',
              'Purple Hoodie': '/cosmetics/purple_hoodie',
              'Pumpkin': '/cosmetics/pumpkin',
              'Pickle': '/cosmetics/pickle',
              'Orange Hoodie': '/cosmetics/orange_hoodie',
              'Helment': '/cosmetics/helment',
              'Green Hoodie': '/cosmetics/green_hoodie',
              'Exclaimation Point': '/cosmetics/exclaimation_point',
              'Eggplant': '/cosmetics/eggplant',
              'Devil Wings': '/cosmetics/devils_wings',
              'Christmas Tree': '/cosmetics/christmas_tree',
              'Christmas Lights': '/cosmetics/christmas_lights',
              'Checkmark': '/cosmetics/checkmark',
              'Cat Hat': '/cosmetics/cat_hat',
              'Blueberry': '/cosmetics/blueberry',
              'Blue Hoodie': '/cosmetics/blue_hoodie',
              'Blue Helment': '/cosmetics/blue_helment',
              'Banana': '/cosmetics/bannana',
              'Aqua Helment': '/cosmetics/aqua_helment',
              'Apple': '/cosmetics/apple',
              'Hoodie': '/cosmetics/hoodie',
              'Purple Helment': '/cosmetics/purple_helment',
              'Angel Wings': '/cosmetics/angel_wings',
              'Boost': '/cosmetics/boost',
              'Bunny Ears': '/cosmetics/bunny_ears',
              'Cake': '/cosmetics/cake',
              'Cancelled': '/cosmetics/cancelled',
              'Candy Cane': '/cosmetics/candy_cane',
              'Cat Ears': '/cosmetics/cat_ears',
              'Christmas Hat': '/cosmetics/christmas_hat',
              'Controller': '/cosmetics/controller',
              'Deep Scratch': '/cosmetics/deep_scratch',
              'Devil Horns': '/cosmetics/devil_horn',
              'Headphones': '/cosmetics/earmuffs',
              'Eyebrows': '/cosmetics/eyebrows',
              'First Aid': '/cosmetics/first_aid',
              'Flag': '/cosmetics/flag',
              'Halo': '/cosmetics/halo',
              'Hax': '/cosmetics/hax',
              'Low Battery': '/cosmetics/low_battery',
              'Mini Tank': '/cosmetics/mini_tank',
              'MLG Glasses': '/cosmetics/mlg_glasses',
              'Money Eyes': '/cosmetics/money_eyes',
              'No Mercy': '/cosmetics/no_mercy',
              'Peace': '/cosmetics/peace',
              'Police': '/cosmetics/police',
              'Question Mark': '/cosmetics/question_mark',
              'Rage': '/cosmetics/rage',
              'Small Scratch': '/cosmetics/small_scratch',
              'Speaker': '/cosmetics/speaker',
              'Swords': '/cosmetics/swords',
              'Tools': '/cosmetics/tools',
              'Top Hat': '/cosmetics/top_hat',
              'Uno Reverse': '/cosmetics/uno_reverse',
              'Mask': '/cosmetics/victim',
        },
        menus: {
          ui: '/menus/default/ui',
          start: '/menus/default/start',
          main: '/menus/default/main',
          multiplayer: '/menus/default/multiplayer',
          crate: '/menus/default/crate',
          settings: '/menus/default/settings',
          keybinds: '/menus/default/keybinds',
          inventory: '/menus/default/inventory',
          classTab: '/menus/default/classTab',
          healthTab: '/menus/default/healthTab',
          itemTab: '/menus/default/itemTab',
          cosmeticTab: '/menus/default/cosmeticTab',
          deathEffectsTab: '/menus/default/cosmeticTab',
          shop_armor: '/menus/default/shop_armor',
          shop_class: '/menus/default/shop_class',
          shop_items: '/menus/default/shop_items',
          shop_kits: '/menus/default/shop_kits',
          broke: '/menus/default/broke',
          htp1: '/menus/default/htp1',
          htp2: '/menus/default/htp2',
          htp3: '/menus/default/htp3',
          htp4: '/menus/default/htp4',
        },
        emotes: { // type: 0=loop 1=play once 2=static
          speech: '/emotes/speech',
          speech_: {speed: 50},
          mlg: '/emotes/mlg',
          mlg_: {type: 1, frames: 13, speed: 50},
          wink: '/emotes/wink',
          wink_: {type: 2, speed: 50},
          confuzzled: '/emotes/confuzzled',
          confuzzled_: {type: 2, speed: 50},
          surrender: '/emotes/surrender',
          surrender_: {type: 2, speed: 50},
          anger: '/emotes/anger',
          anger_: {type: 0, frames: 4, speed: 50},
          ded: '/emotes/ded',
          ded_: {type: 2, speed: 50},
          mercy: '/emotes/mercy',
          mercy_: {type: 0, frames: 1, speed: 50},
          suffocation: '/emotes/suffocation',
          suffocation_: {type: 0, frames: 3, speed: 50},
          nomercy: '/emotes/nomercy',
          nomercy_: {type: 0, frames: 1, speed: 50},
          idea: '/emotes/idea',
          idea_: {type: 1, frames: 6, speed: 50},
          scared: '/emotes/scared',
          scared_: {type: 2, speed: 50},
          crying: '/emotes/crying',
          crying_: {type: 0, frames: 5, speed: 50},
          flat: '/emotes/flat',
          flat_: {type: 0, frames: 1, speed: 50},
          noflat: '/emotes/noflat',
          noflat_: {type: 0, frames: 1, speed: 50},
          rage: '/emotes/rage',
          rage_: {type: 0, frames: 5, speed: 50},
          sad: '/emotes/sad',
          sad_: {type: 0, frames: 2, speed: 50},
          sweat: '/emotes/sweat',
          sweat_: {type: 0, frames: 10, speed: 50},
          teamedon: '/emotes/miss',
          teamedon_: {type: 1, frames: 28, speed: 75},
          evanism: '/emotes/evanism',
          evanism_: {type: 1, frames: 45, speed: 100},
          miss: '/emotes/teamedon',
          miss_: {type: 0, frames: 12, speed: 50},
        },
        animations: {
          tape: '/animations/tape',
          tape_: {frames: 17, speed: 50},
          toolkit: '/animations/toolkit',
          toolkit_: {frames: 16, speed: 50},
          glu: '/animations/glu',
          glu_: {frames: 45, speed: 50},
          fire: '/animations/fire',
          fire_: {frames: 1, speed: 50},
          explosion: '/animations/explosion',
        },
        deathEffects: {
          explode: '/animations/explode',
          explode_: {frames: 17, speed: 75, kill: 8, type: 1},
          clicked: '/animations/clicked',
          clicked_: {frames: 29, speed: 75, kill: 28, type: 2},
          amogus: '/animations/amogus',
          amogus_: {frames: 47, speed: 75, kill: 21, type: 1},
          nuke: '/animations/nuke',
          nuke_: {frames: 26, speed: 75, kill: 12, type: 1},
          error: '/animations/error',
          error_: {frames: 10, speed: 250, kill: 10, type: 2},
          magic: '/animations/magic',
          magic_: {frames: 69, speed: 75, kill: 51, type: 2},
          /*securly: '/animations/securly',
          securly_: {frames: 1, speed: 9900, kill: 1, type: 3},*/
          anvil: '/animations/anvil',
          anvil_: {frames: 22, speed: 75, kill: 6, type: 1},
          insta: '/animations/insta',
          insta_: {frames: 22, speed: 75, kill: 21, type: 1},
          crate: '/animations/crate',
          crate_: {frames: 31, speed: 75, kill: 21, type: 2},
          battery: '/animations/battery',
          battery_: {frames: 55, speed: 75, kill: 54, type: 2},
          evan: '/animations/evan',
          evan_: {frames: 8, speed: 500, kill: 7, type: 1},
          minecraft: '/animations/minecraft',
          minecraft_: {frames: 22, speed: 100, kill: 15, type: 2},
          enderman: '/animations/enderman',
          enderman_: {frames: 4, speed: 500, kill: 3, type: 2},
        },
        items: {
          airstrike: '/items/airstrike',
          duck_tape: '/items/duck-tape',
          super_glu: '/items/super-glu',
          shield: '/items/shield',
          flashbang: '/items/flashbang',
          bomb: '/items/bomb',
          dynamite: '/items/dynamite',
          weak: '/items/weak',
          strong: '/items/strong',
          spike: '/items/spike',
          mine: '/items/mine',
          fortress: '/items/fortress',
        }
      };

      Menus.menus = {
        start: {
          buttons: [],
          exec: [
            [580, 740, 200, 100, `Network.auth(Menus.menus.start.username, Menus.menus.start.password, 'login', () => {PixelTanks.getData(() => {Menus.trigger('main');});});`],
            [820, 740, 200, 100, `Network.auth(Menus.menus.start.username, Menus.menus.start.password, 'signup', () => {PixelTanks.getData(() => {Menus.trigger('htp1');});});`],
            [580, 480, 440, 60, `Menus.menus.start.type = 'username';`],
            [580, 580, 440, 60, `Menus.menus.start.type = 'password';`],
          ],
          listeners: {
            keydown: (e) => {
              var start = Menus.menus.start;
              if (e.key.length === 1) {
                start[start.type] += e.key;
              } else if (e.keyCode === 8) {
                start[start.type] = start[start.type].slice(0, -1);
              }
              Menus.redraw();
            }
          },
          customOnLoad: () => {
            if (!Menus.menus.start.type) {
              Menus.menus.start.type = 'username';
              Menus.menus.start.username = '';
              Menus.menus.start.password = '';
            }
            GUI.drawText(Menus.menus.start.username, 580, 495, 30, '#ffffff', 0)
            var l = 0, temp = '';
            while (l < Menus.menus.start.password.length) {
              temp += '*';
              l++;
            }
            GUI.drawText(temp, 580, 595, 30, '#ffffff', 0);
          },
        },
        main: {
          buttons: [
            [1180, 920, 80, 80, 'keybinds'],
            [580, 500, 440, 100, 'multiplayer'],
            [580, 640, 440, 100, 'shop'],
            [420, 920, 80, 80, 'inventory'],
            [528, 896, 80, 80, 'crate'],
            [620, 920, 80, 80, 'htp1']
          ],
          exec: [
            [580, 360, 440, 100, 'alert("Singleplayer is coming in PixelTanks beta.");'],
            [320, 920, 80, 80, `(() => {PixelTanks.user.token = undefined; PixelTanks.user.username = undefined; Menus.trigger('start');})();`],
          ],
          listeners: {},
          customOnLoad: () => {
            PixelTanks.save();

            var key = ['red', 'steel', 'crystal', 'dark', 'light'];
            GUI.drawImage(PixelTanks.images.tanks.bottom, 800, 800, 80, 80, 1);
            GUI.drawImage(PixelTanks.images.tanks.top, 800, 800, 80, 90, 1);
            try {
              if (PixelTanks.userData.cosmetic != '' || PixelTanks.userData.cosmetic != undefined) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic], 800, 800, 80, 90, 1);
            } catch(e) {}
            GUI.drawText(PixelTanks.user.username, 900, 840, 50, '#ffffff', 0.5)

            var xpToLevelUp = Math.ceil(Math.pow(1.6, PixelTanks.userData.stats[4]-1)+20*(PixelTanks.userData.stats[4]-1));
            while (PixelTanks.userData.stats[3] >= xpToLevelUp) {
              PixelTanks.userData.stats[3] -= xpToLevelUp;
              PixelTanks.userData.stats[4] += 1;
              xpToLevelUp = Math.ceil(Math.pow(1.6, PixelTanks.userData.stats[4]-1)+20*(PixelTanks.userData.stats[4]-1));
            }
            GUI.drawText('Rank: '+PixelTanks.userData.stats[4], 900, 880, 50, '#ffffff', 0);
            GUI.drawText('XP - '+PixelTanks.userData.stats[3]+'/'+xpToLevelUp, 900, 920, 50, '#ffffff', 0);
            GUI.drawText(PixelTanks.userData.coins, 900, 960, 50, '#ffffff', 0);
          },
        },
        multiplayer: {
          buttons: [
            [424, 28, 108, 108, 'main'],
          ],
          exec: [
            [340, 376, 416, 116, `Menus.menus.multiplayer.gamemode = 'ffa'`],
            [340, 532, 416, 116, `Menus.menus.multiplayer.gamemode = 'duels'`],
            [340, 688, 416, 116, `Menus.menus.multiplayer.gamemode = 'tdm'`],
            [340, 844, 416, 116, `Menus.menus.multiplayer.gamemode = 'juggernaut'`],
            [868, 848, 368, 88, `PixelTanks.user.joiner = new MultiPlayerTank(Menus.menus.multiplayer.ip, Menus.menus.multiplayer.gamemode); Menus.removeListeners()`],
          ],
          listeners: {
            keydown: (e) => {
              if (e.key.length === 1) Menus.menus.multiplayer.ip += e.key;
              if (e.keyCode === 8) Menus.menus.multiplayer.ip = Menus.menus.multiplayer.ip.slice(0, -1);
              Menus.redraw();
            }
          },
          customOnLoad: () => {
            if (!Menus.menus.multiplayer.gamemode) Menus.menus.multiplayer.gamemode = 'ffa';
            if (Menus.menus.multiplayer.ip === undefined) Menus.menus.multiplayer.ip = '141.148.128.231/ffa';
            GUI.drawText(Menus.menus.multiplayer.ip, 800, 276, 50, '#FFFFFF', 0.5);
          }
        },
        crate: {
          buttons: [[418, 112, 106, 106, 'main'], [1076, 114, 106, 106, 'cosmetic']],
          exec: [[625, 324, 564, 564, 'PixelTanks.openCrate()'], [0, 324, 564, 564, 'PixelTanks.openDeath()']],
          listeners: {},
          customOnLoad: () => {
            GUI.drawText('Crates: ' + PixelTanks.userData.stats[1], 800, 260, 30, '#ffffff', 0.5);
          }
        },
        settings: {
          buttons: [
            [59, 56, 53, 53, 'main'],
            [397, 65, 38, 35, 'keybinds'],
          ],
          exec: [],
          listeners: {},
          customOnLoad: () => {}
        },
        htp1: {
          buttons: [
            [12, 12, 120, 120, 'main'],
            [476, 224, 320, 80, 'htp2'],
            [804, 224, 320, 80, 'htp3'],
            [1132, 224, 320, 80, 'htp4']
          ],
          exec: [],
          listeners: {},
          customOnLoad: () => {}
        },
        htp2: {
          buttons: [
            [12, 12, 120, 120, 'main'],
            [148, 224, 320, 80, 'htp1'],
            [804, 224, 320, 80, 'htp3'],
            [1132, 224, 320, 80, 'htp4']
          ],
          exec: [],
          listeners: {},
          customOnLoad: () => {}
        },
        htp3: {
          buttons: [
            [12, 12, 120, 120, 'main'],
            [148, 224, 320, 80, 'htp1'],
            [476, 224, 320, 80, 'htp2'],
            [1132, 224, 320, 80, 'htp4']
          ],
          exec: [],
          listeners: {},
          customOnLoad: () => {}
        },
        htp4: {
          buttons: [
            [12, 12, 120, 120, 'main'],
            [148, 224, 320, 80, 'htp1'],
            [476, 224, 320, 80, 'htp2'],
            [804, 224, 320, 80, 'htp3']
          ],
          exec: [],
          listeners: {},
          customOnLoad: () => {}
        },
        keybinds: {
          buttons: [
            [40, 40, 120, 120, 'main'],
          ],
          exec: [],
          listeners: {
            keydown: (e) => {
              if (Menus.menus.keybinds.keybind !== undefined) {
                PixelTanks.userData.settings[Menus.menus.keybinds.keybind] = e.keyCode;
              }
              Menus.redraw();
              PixelTanks.save();
            },
            mousedown: (e) => {
              var x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - ((window.innerWidth-window.innerHeight*1.6)/2)*PixelTanks.resizer;
              var y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
              x /= PixelTanks.resizer;
              y /= PixelTanks.resizer;
              if ((x > 40 && x < 280) && (y > 760 && y < 840)) {
                Menus.menus.keybinds.keybind = 'item1';
              } else if ((x > 360 && x < 500) && (y > 760 && y < 840)) {
                Menus.menus.keybinds.keybind = 'item2';
              } else if ((x > 680 && x < 920) && (y > 760 && y < 840)) {
                Menus.menus.keybinds.keybind = 'item3';
              } else if ((x > 1000 && x < 1240) && (y > 760 && y < 840)) {
                Menus.menus.keybinds.keybind = 'item4';
              } else if ((x > 1000 && x < 1240) && (y > 640 && y < 720)) {
                Menus.menus.keybinds.keybind = 'shoot';
              } else if ((x > 40 && x < 280) && (y > 880 && y < 960)) {
                Menus.menus.keybinds.keybind = 'fire1';
              } else if ((x > 260 && x < 340) && (y > 880 && y < 960)) {
                Menus.menus.keybinds.keybind = 'fire2';
              } else {
                Menus.menus.keybinds.keybind = undefined;
              }
              Menus.redraw();
            },
          },
          customOnLoad: () => {
            GUI.draw.strokeStyle = '#ffffff';
            GUI.draw.lineWidth = 5;
            switch (Menus.menus.keybinds.keybind) {
              case 'item1':
                GUI.draw.strokeRect(70, 140, 80, 50);
                break;
              case 'item2':
                GUI.draw.strokeRect(70, 200, 80, 50);
                break;
              case 'item3':
                GUI.draw.strokeRect(70, 260, 80, 50);
                break;
              case 'item4':
                GUI.draw.strokeRect(70, 320, 80, 50);
                break;
              case 'shoot':
                GUI.draw.strokeRect(70, 380, 80, 50);
                break;
              case 'fire1':
                GUI.draw.strokeRect(260, 140, 80, 50);
                break;
              case 'fire2':
                GUI.draw.strokeRect(260, 200, 80, 50);
                break;
            }
            GUI.draw.fillStyle = '#000000';
            GUI.draw.font = '20px Font';
            GUI.draw.fillText(PixelTanks.userData.settings.item1, 190, 170);
            GUI.draw.fillText(PixelTanks.userData.settings.item2, 190, 230);
            GUI.draw.fillText(PixelTanks.userData.settings.item3, 190, 290);
            GUI.draw.fillText(PixelTanks.userData.settings.item4, 190, 350);
            GUI.draw.fillText(PixelTanks.userData.settings.shoot, 190, 410);
            GUI.draw.fillText(PixelTanks.userData.settings.fire1, 420, 150);
            GUI.draw.fillText(PixelTanks.userData.settings.item5, 420, 210);
          },
        },
        inventory: {
          buttons: [[424, 28, 108, 108, 'main']],
          exec: [[1064, 458, 88, 88, `PixelTanks.switchTab('healthTab');`], [1112, 814, 88, 88, `PixelTanks.switchTab('classTab');`], [400, 814, 88, 88, `PixelTanks.switchTab('itemTab', 1);`], [488, 814, 88, 88, `PixelTanks.switchTab('itemTab', 2);`], [576, 814, 88, 88, `PixelTanks.switchTab('itemTab', 3);`], [664, 814, 88, 88, `PixelTanks.switchTab('itemTab', 4);`], [756, 220, 88, 88, `PixelTanks.switchTab('cosmeticTab');`], [556, 220, 88, 88, `PixelTanks.switchTab('deathEffectsTab');`]],
          listeners: {
            mousedown: (e) => {
              var m = {x: (e.clientX-(window.innerWidth-window.innerHeight*1.6)/2)/PixelTanks.resizer, y: e.clientY/PixelTanks.resizer};
              if (Menus.menus.inventory.healthTab) {
                if (m.x < 742 || m.x > 858 || m.y < 226 || m.y > 774) {
                  Menus.menus.inventory.healthTab = false;
                  return Menus.redraw();
                }
                A.each([240, 344, 456, 564, 672], function(d) {if (A.collider(d.m, {x: 754, y: this, w: 88, h: 88})) d.i === 0 ? PixelTanks.userData.material = 0 : (PixelTanks.userData.armors[d.i-1] ? PixelTanks.userData.material = d.i : alert('You need to buy this first!'))}, null, {m: m});
              }
              if (Menus.menus.inventory.classTab) {
                if (m.x < 688 || m.x > 912 || m.y < 334 || m.y > 666) {
                  Menus.menus.inventory.classTab = false;
                  return Menus.redraw();
                }
                A.each([348, 456, 564], function(d) {if (A.collider(d.m, {x: 702, y: this, w: 88, h: 88})) PixelTanks.userData.classes[[0, 6, 3][d.i]] ? PixelTanks.userData.class = ['tactical', 'fire', 'medic'][d.i] : alert('You need to buy this first!')}, null, {m: m});
                A.each([348, 456, 564], function(d) {if (A.collider(d.m, {x: 816, y: this, w: 88, h: 88})) PixelTanks.userData.classes[[1, 4, 2][d.i]] ? PixelTanks.userData.class = ['stealth', 'builder', 'warrior'][d.i] : alert('You need to buy this first!')}, null, {m: m});
              }
              if (Menus.menus.inventory.itemTab) {
                if (m.x < 580 || m.x > 1020 || m.y < 334 || m.y > 666) {
                  Menus.menus.inventory.itemTab = false;
                  return Menus.redraw();
                }
                var key = {airstrike: [600, 354], super_glu: [708, 354], duck_tape: [816, 354], shield: [924, 354], flashbang: [600, 462], bomb: [708, 462], dynamite: [816, 462], fortress: [924, 462], weak: [600, 570], strong: [708, 570], spike: [816, 570], mine: [904, 570]};
                for (var property in key) if (m.x > key[property][0] && m.x < key[property][0]+80 && m.y > key[property][1] && m.y < key[property][1]+80) if (!PixelTanks.userData.items.includes(property)) PixelTanks.userData.items[Menus.menus.inventory.currentItem-1] = property; else alert('You are not allowed to have more than 1 of the same item');
              }
              if (Menus.menus.inventory.cosmeticTab) {
                if (m.x < 518 || m.x > 1082 || m.y < 280 || m.y > 720) {
                  Menus.menus.inventory.cosmeticTab = false;
                  return Menus.redraw();
                }
                var l = 0;
                while (l<16) {
                  if (A.collider({...m, w: 0, h: 0}, {x: 598+(l%4)*108, y: 298+Math.floor(l/4)*108, w: 88, h: 88})) if (e.button === 0) PixelTanks.userData.cosmetic = PixelTanks.userData.cosmetics[Menus.menus.inventory.cosmeticMenu*16+l]; else if (e.button === 2) PixelTanks.userData.cosmetics.splice(Menus.menus.inventory.cosmeticMenu*16+l, 1);
                  l++;
                }
              }
              if (Menus.menus.inventory.deathEffectsTab) {
                if (m.x < 518 || m.x > 1082 || m.y < 280 || m.y > 720) {
                  Menus.menus.inventory.deathEffectsTab = false;
                  return Menus.redraw();
                }
                var l = 0;
                while (l<16) {
                  if (A.collider({...m, w: 0, h: 0}, {x: 598+(l%4)*108, y: 298+Math.floor(l/4)*108, w: 88, h: 88})) if (e.button === 0) PixelTanks.userData.deathEffect = PixelTanks.userData.deathEffects[Menus.menus.inventory.deathEffectsMenu*16+l]; else if (e.button === 2) PixelTanks.userData.deathEffects.splice(Menus.menus.inventory.deathEffectsMenu*16+l, 1);
                  l++;
                }
              }
              Menus.redraw();
              PixelTanks.save();
            },
            mousemove: (e) => {
              Menus.menus.inventory.target = {x: e.clientX-window.innerWidth/2, y: e.clientY-window.innerHeight/2};
              Menus.redraw();
            },
            keydown: (e) => {
              if (e.key.length === 1) Menus.menus.inventory.color += e.key; else if (e.keyCode === 8) Menus.menus.inventory.color = Menus.menus.inventory.color.slice(0, -1); else if (Menus.menus.inventory.cosmeticTab) {if (e.keyCode === 37 && Menus.menus.inventory.cosmeticMenu !== 0) Menus.menus.inventory.cosmeticMenu--; else if (e.keyCode === 39 && Menus.menus.inventory.cosmeticMenu+1 !== Math.ceil(PixelTanks.userData.cosmetics.length/16)) Menus.menus.inventory.cosmeticMenu++;}  
              PixelTanks.userData.color = Menus.menus.inventory.color;
              Menus.redraw();
            }
          },
          customOnLoad: () => {
            if (!PixelTanks.userData.color) PixelTanks.userData.color = '#A9A9A9';
            if (!Menus.menus.inventory.time) Menus.menus.inventory.time = Date.now();
            if (!Menus.menus.inventory.color) Menus.menus.inventory.color = PixelTanks.userData.color;
            if (!Menus.menus.inventory.target) Menus.menus.inventory.target = {x: 0, y: 0};
            if (!Menus.menus.inventory.cosmeticMenu) Menus.menus.inventory.cosmeticMenu = 0;
            if (!Menus.menus.inventory.deathEffectsMenu) Menus.menus.inventory.deathEffectsMenu = 0;
            if (!PixelTanks.userData.deathEffects) PixelTanks.userData.deathEffects = [];

            var key = ['red', 'steel', 'crystal', 'dark', 'light'];

            GUI.draw.fillStyle = PixelTanks.userData.color;
            GUI.draw.fillRect(1116, 264, 40, 40);
            GUI.drawText(Menus.menus.inventory.color, 1052, 256, 20, PixelTanks.userData.color, 0);
            GUI.drawImage(PixelTanks.images.tanks.top, 1064, 458, 88, 88, 1);
            GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[0]], 402, 816, 80, 80, 1);
            GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[1]], 490, 816, 80, 80, 1);
            GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[2]], 578, 816, 80, 80, 1);
            GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[3]], 666, 816, 80, 80, 1);

            GUI.drawImage(PixelTanks.images.tanks.bottom, 680, 380, 240, 240, 1);
            GUI.drawImage(PixelTanks.images.tanks.top, 680, 380, 240, 270, 1, 120, 120, 0, 0, (-Math.atan2(Menus.menus.inventory.target.x, Menus.menus.inventory.target.y)*180/Math.PI+360)%360);
            if (PixelTanks.userData.cosmetic) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic], 680, 380, 240, 270, 1, 120, 120, 0, 0, (-Math.atan2(Menus.menus.inventory.target.x, Menus.menus.inventory.target.y)*180/Math.PI+360)%360);

            if (Menus.menus.inventory.healthTab || Menus.menus.inventory.classTab || Menus.menus.inventory.itemTab || Menus.menus.inventory.cosmeticTab || Menus.menus.inventory.deathEffectsTab)  {
              GUI.draw.fillStyle = '#000000';
              GUI.draw.globalAlpha = .7;
              GUI.draw.fillRect(0, 0, 1600, 1600);
            }
            if (Menus.menus.inventory.healthTab) {
              GUI.drawImage(PixelTanks.images.menus.healthTab, 742, 226, 116, 548, 1);
              GUI.draw.strokeStyle = '#FFFF00';
              GUI.draw.lineWidth = 10;
              GUI.draw.strokeRect(754, [240, 348, 456, 564, 672][PixelTanks.userData.material], 88, 88);
            } else if (Menus.menus.inventory.classTab) {
              GUI.drawImage(PixelTanks.images.menus.classTab, 688, 334, 224, 332, 1);
              GUI.draw.strokeStyle = '#FFFF00';
              GUI.draw.lineWidth = 10;
              if (PixelTanks.userData.class === 'tactical') GUI.draw.strokeRect(701, 348, 88, 88); else if (PixelTanks.userData.class === 'fire') GUI.draw.strokeRect(701, 456, 88, 88); else if (PixelTanks.userData.class === 'medic') GUI.draw.strokeRect(701, 565, 88, 88); else if (PixelTanks.userData.class === 'stealth') GUI.draw.strokeRect(814, 348, 88, 88); else if (PixelTanks.userData.class === 'builder') GUI.draw.strokeRect(814, 456, 88, 88); else if (PixelTanks.userData.class === 'warrior') GUI.draw.strokeRect(814, 565, 88, 88);
            } else if (Menus.menus.inventory.itemTab) {
              GUI.drawImage(PixelTanks.images.menus.itemTab, 580, 334, 440, 332, 1);
              var key = {airstrike: [600, 354], super_glu: [708, 354], duck_tape: [816, 354], shield: [924, 354], flashbang: [600, 462], bomb: [708, 462], dynamite: [816, 462], fortress: [924, 462], weak: [600, 570], strong: [708, 570], spike: [816, 570], mine: [904, 570]};
              for (var property in key) GUI.drawImage(PixelTanks.images.items[property], key[property][0], key[property][1], 80, 80, 1);
            } else if (Menus.menus.inventory.cosmeticTab) {
              var crop = 0;
              if (Menus.menus.inventory.cosmeticMenu === 0) crop++;
              if (Menus.menus.inventory.cosmeticMenu === Math.ceil(PixelTanks.userData.cosmetics.length/16)-1) crop++;
              GUI.drawImage(PixelTanks.images.menus.cosmeticTab, 518+(Menus.menus.inventory.cosmeticMenu === 0 ? 62 : 0), 280, 564-62*crop, 440, 1, 0, 0, 0, 0, 0, (Menus.menus.inventory.cosmeticMenu === 0 ? 31 : 0), 0, 282-31*crop, 220);
              var l = Menus.menus.inventory.cosmeticMenu*16, end = l+16;
              while (l<Math.min(end, PixelTanks.userData.cosmetics.length)) {
                GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetics[l]], 598+(l%4)*108, 298+Math.floor((l%16)/4)*108, 88, 88, 1);
                if (PixelTanks.userData.cosmetics[l] === PixelTanks.userData.cosmetic) {
                  GUI.draw.strokeStyle = '#FFFF22';
                  GUI.draw.lineWidth = 10;
                  GUI.draw.strokeRect(598+(l%4)*108, 298+Math.floor((l%16)/4)*108, 88, 88);
                }
                l++;
              }
            } else if (Menus.menus.inventory.deathEffectsTab) {
              var crop = 0;
              if (Menus.menus.inventory.deathEffectsMenu === 0) crop++;
              if (Menus.menus.inventory.deathEffectsMenu === Math.ceil(PixelTanks.userData.deathEffects.length/16)-1) crop++;
              GUI.drawImage(PixelTanks.images.menus.deathEffectsTab, 518+(Menus.menus.inventory.deathEffectsMenu === 0 ? 62 : 0), 280, 564-62*crop, 440, 1, 0, 0, 0, 0, 0, (Menus.menus.inventory.deathEffectsMenu === 0 ? 31 : 0), 0, 282-31*crop, 220);
              var l = Menus.menus.inventory.deathEffectsMenu*16, end = l+16;
              while (l<Math.min(end, PixelTanks.userData.deathEffects.length)) {
                GUI.drawImage(PixelTanks.images.deathEffects[PixelTanks.userData.deathEffects[l]].image, 598+(l%4)*108, 298+Math.floor((l%16)/4)*108, 88, 88, 1, 0, 0, 0, 0, 0, (Math.floor((Date.now()-Menus.menus.inventory.time)/PixelTanks.images.deathEffects[PixelTanks.userData.deathEffects[l]+'_'].speed)%PixelTanks.images.deathEffects[PixelTanks.userData.deathEffects[l]+'_'].frames)*200, 0, 200, 200);
                if (PixelTanks.userData.deathEffects[l] === PixelTanks.userData.deathEffect) {
                  GUI.draw.strokeStyle = '#FFFF22';
                  GUI.draw.lineWidth = 10;
                  GUI.draw.strokeRect(598+(l%4)*108, 298+Math.floor((l%16)/4)*108, 88, 88);
                }
                l++;
              }
            }
          },
        },
        shop: {
          buttons: [
            [424, 28, 108, 108, 'main'],
          ],
          exec: [
            [88, 212, 328, 64, '(() => {Menus.menus.shop.tab="items"; Menus.redraw()})();'],
            [456, 212, 328, 64, '(() => {Menus.menus.shop.tab="armor"; Menus.redraw()})();'],
            [824, 212, 328, 64, '(() => {Menus.menus.shop.tab="class"; Menus.redraw()})();'],
            [1192, 212, 328, 64, '(() => {Menus.menus.shop.tab="kits"; Menus.redraw()})();']
          ],
          listeners: {
            mousedown: (e) => {
              var x = (e.clientX-(window.innerWidth-window.innerHeight*1.6)/2)/PixelTanks.resizer;
              var y = e.clientY/PixelTanks.resizer;
              var m = {x: x, y: y, w: 0, h: 0};
              if (Menus.menus.shop.tab === 'items') {} else if (Menus.menus.shop.tab === 'armor') {
                var d = {w: 160, h: 160};
                if (A.collider(m, {...d, x: 424, y: 460})) PixelTanks.purchase('steel');
                if (A.collider(m, {...d, x: 624, y: 460})) !PixelTanks.userData.armors[0] ? alert('You need to buy steel tank first!') : PixelTanks.purchase('crystal');
                if (A.collider(m, {...d, x: 824, y: 460})) !PixelTanks.userData.armors[1] ? alert('You need to buy crystal tank first!') : PixelTanks.purchase('dark');
                if (A.collider(m, {...d, x: 1024, y: 460})) !PixelTanks.userData.armors[2] ? alert('You need to buy dark tank first!') : PixelTanks.purchase('light');
              } else if (Menus.menus.shop.tab === 'class') {
                var d = {w: 176, h: 176}
                if (A.collider(m, {...d, x: 504, y: 416})) PixelTanks.purchase('tactical');
                if (A.collider(m, {...d, x: 720, y: 416})) PixelTanks.purchase('stealth');
                if (A.collider(m, {...d, x: 936, y: 416})) PixelTanks.purchase('builder');
                if (A.collider(m, {...d, x: 504, y: 632})) PixelTanks.purchase('warrior');
                if (A.collider(m, {...d, x: 720, y: 632})) PixelTanks.purchase('fire');
                if (A.collider(m, {...d, x: 936, y: 632})) PixelTanks.purchase('medic');
              } else {}
            },
            mousemove: (e) => {
              Menus.redraw();
              var x = (e.clientX-(window.innerWidth-window.innerHeight*1.6)/2)/PixelTanks.resizer;
              var y = e.clientY/PixelTanks.resizer;
              var m = {x: x, y: y, w: 0, h: 0};
              if (Menus.menus.shop.tab === 'items') {} else if (Menus.menus.shop.tab === 'armor') {
                var d = {w: 160, h: 160};
                if (A.collider(m, {...d, x: 424, y: 460})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 170);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 150);
                  GUI.drawText('Steel Tank', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('+50HP     10000 coins', x+160, y+110, 30, '#000000', .5);
                } else if (A.collider(m, {...d, x: 624, y: 460})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 170);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 150);
                  GUI.drawText('Crystal Tank', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('+100HP    50000 coins', x+160, y+110, 30, '#000000', .5);
                } else if (A.collider(m, {...d, x: 824, y: 460})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 170);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 150);
                  GUI.drawText('Dark Tank', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('+150HP   100000 coins', x+160, y+110, 30, '#000000', .5);
                } else if (A.collider(m, {...d, x: 1024, y: 460})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 170);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 150);
                  GUI.drawText('Light Tank', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('+200HP   150000 coins', x+160, y+110, 30, '#000000', .5);
                }
              } else if (Menus.menus.shop.tab === 'class') {
                var d = {w: 176, h: 176};
                if (A.collider(m, {...d, x: 504, y: 416})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 270);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 250);
                  GUI.drawText('Tactical', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('Boost Ability: Mines', x+20, y+110, 30, '#000000', 0);
                  GUI.drawText('F: Megamissle', x+20, y+160, 30, '#000000', 0);
                  GUI.drawText('70000 coins', x+20, y+210, 30, '#000000', 0);
                } else if (A.collider(m, {...d, x: 720, y: 416})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 270);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 250);
                  GUI.drawText('Stealth', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('Boost Ability: Ghost', x+20, y+110, 30, '#000000', 0);
                  GUI.drawText('F: Invisibility', x+20, y+160, 30, '#000000', 0);
                  GUI.drawText('30000 coins', x+20, y+210, 30, '#000000', 0);
                } else if (A.collider(m, {...d, x: 936, y: 416})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 270);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 250);
                  GUI.drawText('Builder', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('Boost Ability: Blocks', x+20, y+110, 30, '#000000', 0);
                  GUI.drawText('F: Turret', x+20, y+160, 30, '#000000', 0);
                  GUI.drawText('50000 coins', x+20, y+210, 30, '#000000', 0);
                } else if (A.collider(m, {...d, x: 504, y: 632})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 270);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 250);
                  GUI.drawText('Warrior', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('Boost Ability: Damage', x+20, y+110, 30, '#000000', 0);
                  GUI.drawText('F: Buff Mode', x+20, y+160, 30, '#000000', 0);
                  GUI.drawText('70000 coins', x+20, y+210, 30, '#000000', 0);
                } else if (A.collider(m, {...d, x: 720, y: 632})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 270);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 250);
                  GUI.drawText('Fire', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('Boost Ability: Fire', x+20, y+110, 30, '#000000', 0);
                  GUI.drawText('F: Flamethrower', x+20, y+160, 30, '#000000', 0);
                  GUI.drawText('70000 coins', x+20, y+210, 30, '#000000', 0);
                } else if (A.collider(m, {...d, x: 936, y: 632})) {
                  GUI.draw.fillStyle = '#000000';
                  GUI.draw.fillRect(x, y, 320, 270);
                  GUI.draw.fillStyle = '#FFFFFF';
                  GUI.draw.fillRect(x+10, y+10, 300, 250);
                  GUI.drawText('Medic', x+160, y+50, 50, '#000000', .5);
                  GUI.drawText('Boost Ability: Healing', x+20, y+110, 30, '#000000', 0);
                  GUI.drawText('F: Heal Team', x+20, y+160, 30, '#000000', 0);
                  GUI.drawText('50000 coins', x+20, y+210, 30, '#000000', 0);
                }
              }
            }
          },
          customOnLoad: () => {
            if (Menus.menus.shop.tab === undefined) Menus.menus.shop.tab = 'armor';
            GUI.drawImage(PixelTanks.images.menus['shop_'+Menus.menus.shop.tab], 0, 0, 1600, 1000, 1);
            GUI.drawText(PixelTanks.userData.stats[0]+' coinage', 800, 350, 50, 0x000000, 0.5);
            if (Menus.menus.shop.tab === 'items') {
              var items = ['airstrike', 'super_glue', 'duck_tape', 'shield', 'flashbang', 'bomb', 'dynamite', 'weak', 'strong', 'spike', 'mine', 'fortress'];
              
            } else if (Menus.menus.shop.tab === 'armor') {
              if (!PixelTanks.userData.armors[0] && PixelTanks.userData.stats[0] < 10000) GUI.drawImage(PixelTanks.images.menus.broke, 424, 460, 160, 160, 1);
              if (!PixelTanks.userData.armors[1] && PixelTanks.userData.stats[0] < 50000) GUI.drawImage(PixelTanks.images.menus.broke, 624, 460, 160, 160, 1);
              if (!PixelTanks.userData.armors[2] && PixelTanks.userData.stats[0] < 100000) GUI.drawImage(PixelTanks.images.menus.broke, 824, 460, 160, 160, 1);
              if (!PixelTanks.userData.armors[3] && PixelTanks.userData.stats[0] < 150000) GUI.drawImage(PixelTanks.images.menus.broke, 1024, 460, 160, 160, 1);
            } else if (Menus.menus.shop.tab === 'class') {
              if (!PixelTanks.userData.classes[0] && PixelTanks.userData.stats[0] < 70000) GUI.drawImage(PixelTanks.images.menus.broke, 504, 416, 176, 176, 1);
              if (!PixelTanks.userData.classes[1] && PixelTanks.userData.stats[0] < 30000) GUI.drawImage(PixelTanks.images.menus.broke, 720, 416, 176, 176, 1);
              if (!PixelTanks.userData.classes[4] && PixelTanks.userData.stats[0] < 50000) GUI.drawImage(PixelTanks.images.menus.broke, 936, 416, 176, 176, 1);
              if (!PixelTanks.userData.classes[2] && PixelTanks.userData.stats[0] < 70000) GUI.drawImage(PixelTanks.images.menus.broke, 504, 632, 176, 176, 1);
              if (!PixelTanks.userData.classes[6] && PixelTanks.userData.stats[0] < 70000) GUI.drawImage(PixelTanks.images.menus.broke, 720, 632, 176, 176, 1);
              if (!PixelTanks.userData.classes[3] && PixelTanks.userData.stats[0] < 50000) GUI.drawImage(PixelTanks.images.menus.broke, 936, 632, 176, 176, 1);
            } else {}
          },
        },
      }

      for (var property in Menus.menus) {
        if (property.includes('levelSelect')) {
          var menuNum = property.replace('levelSelect', '');
          if (menuNum == '') menuNum = 1;
          menuNum = new Number(menuNum);
          var y = 0;
          while (y < 4) {
            var x = 0;
            while (x < 3) {
              Menu.menus[property].exec.push({
                x: 89 * x + 140,
                y: 88 * y + 94,
                w: 44,
                h: 44,
                ref: `(() => { PixelTanks.user.world = new World(); PixelTanks.user.world.level = ` + (12 * (menuNum - 1) + (x + y * 3) + 1) + `; Menus.removeListeners(); PixelTanks.user.world.init();})();`,
              });
              x++;
            }
            y++;
          }
        }
        var data = Menus.menus[property];
        Menus.menus[property] = new Menu(function() { // No arrow function here
          if (PixelTanks.images.menus[this.id]) GUI.drawImage(PixelTanks.images.menus[this.id], 0, 0, 1600, 1000, 1);
          this.data.customOnLoad = this.data.customOnLoad.bind(this);
          this.data.customOnLoad();
        }, {
          click: Menus.onclick,
          ...data.listeners,
        }, window);
        Menus.menus[property].data = data;
        Menus.menus[property].id = property;
      }

      Loader.loadImages(PixelTanks.images);

      PixelTanks.socket = new MegaSocket('ws://141.148.128.231', {keepAlive: true, reconnect: true, autoconnect: true});
    }

    static launch() {
      setTimeout(() => Menus.trigger('start'), 200);
    }

    static save() {
      try {
        var temp = PixelTanks.playerData;
        temp['pixel-tanks'] = PixelTanks.userData;
        Network.update('playerdata', JSON.stringify(temp));
      } catch (e) {console.log('User Not Logged In?: ERR->' + e)}
    }

    static getData(callback) {
        Network.get((data) => {
          PixelTanks.userData = JSON.parse(data.playerdata)['pixel-tanks'];
          PixelTanks.playerData = JSON.parse(data.playerdata);
          if (!PixelTanks.userData) {
            PixelTanks.userData = {
              username: PixelTanks.user.username,
              material: 0,
              class: 'normal',
              cosmetic: '',
              cosmetics: [],
              deathEffect: '',
              deathEffects: [],
              color: '#ffffff',
              stats: [
                0, // coins
                0, // crates
                1, // level
                0, // xp
                1, // rank
              ],
              classes: [
                false, // tactical
                false, // stealth
                false, // warrior
                false, // medic
                false, // builder
                false, // summoner
                false, // fire
                false, // ice
              ],
              armors: [
                false, // steel
                false, // crystal
                false, // dark
                false, // light
              ],
              items: ['duck_tape', 'weak', 'bomb', 'flashbang'],
              keybinds: {
                items: [49, 50, 51, 52],
                emotes: [53, 54, 55, 56, 57, 48],    
              },
            };
          }
          callback();
        });
    }

    static switchTab(id, n) {
      if (!Menus.menus.inventory.healthTab && !Menus.menus.inventory.classTab && !Menus.menus.inventory.itemTab && !Menus.menus.inventory.cosmeticTab) Menus.menus.inventory[id] = true;
      if (n) Menus.menus.inventory.currentItem = n;
      Menus.redraw();
    }

    static openDeath() {
      if (PixelTanks.userData.stats[1] < 5) {
        alert('Your broke boi!');
        return;
      }
      PixelTanks.userData.stats[1] -= 5;

      var crate = {
        common: ['explode', 'nuke', 'evan'],
        uncommon: ['anvil', 'insta'],
        rare: ['amogus', 'minecraft', 'magic'],
        epic: ['blocked', 'battery'],
        legendary: ['error', 'enderman'],
        mythic: ['clicked'],
      }

      var rarity;
      if (Math.floor(Math.random() * (1001)) < 1) { // .1%
        rarity = 'mythic';
      } else if (Math.floor(Math.random() * (1001)) < 10) { // .9%
        rarity = 'legendary';
      } else if (Math.floor(Math.random() * (1001)) < 50) { // 4%
        rarity = 'epic';
      } else if (Math.floor(Math.random() * (1001)) < 150) { // 10%
        rarity = 'rare';
      } else if (Math.floor(Math.random() * (1000 - 0 + 1)) < 300) { // 15%
        rarity = 'uncommon';
      } else { // 70%
        rarity = 'common'; 
      }

      var number = Math.floor(Math.random()*(crate[rarity].length)), d;
      for (var deathEffect in this.images.deathEffects) {if (deathEffect === crate[rarity][number]) d = this.images.deathEffects[deathEffect]}
      if (d === undefined) document.write('Game Crash!<br>Crashed while trying to give you cosmetic id "'+crate[rarity][number]+'". Report this to cs641311, bradley, or Celestial.');
      Menus.removeListeners();
      var start = Date.now();
      var render = setInterval(function() {
        GUI.clear();
        GUI.drawImage(d, 600, 400, 400, 400, 1, 0, 0, 0, 0, 0, (Math.floor((Date.now()-start)/PixelTanks.images.deathEffects[crate[rarity][number]+'_'].speed)%PixelTanks.images.deathEffects[crate[rarity][number]+'_'].frames)*200, 0, 200, 200);
        GUI.drawText('You Got', 800, 200, 100, '#ffffff', 0.5);
        GUI.drawText(crate[rarity][number], 800, 800, 50, '#ffffff', 0.5);
        GUI.drawText(rarity, 800, 900, 30, {
          mythic: '#FF0000',
          legendary: '#FFFF00',
          epic: '#A020F0',
          rare: '#0000FF',
          uncommon: '#32CD32',
          common: '#FFFFFF',
        }[rarity], 0.5);
      }, 15);
      setTimeout(() => {
        clearInterval(render);
        Menus.trigger('crate');
      }, 5000);
      PixelTanks.userData.deathEffects.push(crate[rarity][number]);
      PixelTanks.save();
    }

    static openCrate(crate) {
      if (PixelTanks.userData.stats[1] <= 0) {
        alert('Your broke boi!');
        return;
      }
      PixelTanks.userData.stats[1]--;

      var crate = {
        common: ['X', 'Red Hoodie', 'Devil Wings', 'Devil Horns', 'Exclaimation Point', 'Orange Hoodie', 'Yellow Hoodie', 'Green Hoodie', 'Leaf', 'Blue Hoodie', 'Purple Hoodie', 'Purple Flower', 'Boost', 'Cancelled', 'Spirals', 'Laff', 'Speaker', 'Spikes', 'Bat Wings', 'Christmas Tree', 'Candy Cane', 'Pumpkin Face', 'Top Hat', 'Mask', 'Purple-Pink Hoodie', 'Bunny Ears', 'Red Ghost', 'Blue Ghost', 'Pink Ghost', 'Orange Ghost'],
        uncommon: ['Apple', 'Pumpkin', 'Basketball', 'Banana', 'Pickle', 'Blueberry', 'Eggplant', 'Peace', 'Question Mark', 'Small Scratch', 'Kill = Ban', 'Headphones', 'Reindeer Hat', 'Pumpkin Hat', 'Cat Ears', 'Cake', 'Cat Hat', 'First Aid', 'Fisher Hat'],
        rare: ['Hax', 'Tools', 'Money Eyes', 'Dizzy', 'Checkmark', 'Sweat', 'Scared', 'Blue Tint', 'Purple Top Hat', 'Purple Grad Hat', 'Eyebrows', 'Helment', 'Rudolph', 'Candy Corn', 'Flag', 'Swords'],
        epic: ['Rage', 'Onfire', 'Halo', 'Police', 'Deep Scratch', 'Back Button', 'Controller', 'Assassin', 'Astronaut', 'Christmas Lights', 'No Mercy', 'Error'],
        legendary: ['Redsus', 'Uno Reverse', 'Christmas Hat', 'Mini Tank', 'Paleontologist', 'Yellow Pizza'],
        mythic: ['Terminator', 'MLG Glasses'],
      }

      var rarity;
      if (Math.floor(Math.random() * (1001)) < 1) { // .1%
        rarity = 'mythic';
      } else if (Math.floor(Math.random() * (1001)) < 10) { // .9%
        rarity = 'legendary';
      } else if (Math.floor(Math.random() * (1001)) < 50) { // 4%
        rarity = 'epic';
      } else if (Math.floor(Math.random() * (1001)) < 150) { // 10%
        rarity = 'rare';
      } else if (Math.floor(Math.random() * (1000 - 0 + 1)) < 300) { // 15%
        rarity = 'uncommon';
      } else { // 70%
        rarity = 'common'; 
      }

      var number = Math.floor(Math.random()*(crate[rarity].length)), c;
      for (var cosmetic in this.images.cosmetics) {if (cosmetic === crate[rarity][number]) c = this.images.cosmetics[cosmetic]}
      if (c === undefined) document.write('Game Crash!<br>Crashed while trying to give you cosmetic id "'+crate[rarity][number]+'". Report this to cs641311, bradley, or Celestial.');
      GUI.clear();
      GUI.drawImage(c, 600, 400, 400, 400, 1);
      GUI.drawText('You Got', 800, 200, 100, '#ffffff', 0.5);
      GUI.drawText(crate[rarity][number], 800, 800, 50, '#ffffff', 0.5);
      GUI.drawText(rarity, 800, 900, 30, {
        mythic: '#FF0000',
        legendary: '#FFFF00',
        epic: '#A020F0',
        rare: '#0000FF',
        uncommon: '#32CD32',
        common: '#FFFFFF',
      }[rarity], 0.5);
      setTimeout(() => {Menus.redraw()}, 2000);
      PixelTanks.userData.cosmetics.push(crate[rarity][number]);
      PixelTanks.save();
    }

    static purchase(stat) {
      var key = {
        tactical: [['classes', 0], 70000],
        stealth: [['classes', 1], 30000],
        warrior: [['classes', 2], 70000],
        medic: [['classes', 3], 50000],
        builder: [['classes', 4], 50000],
        summoner: [['classes', 5], 100000],
        fire: [['classes', 6], 70000],
        ice: [['classes', 7], 70000],
      }
      if (key[stat] === undefined) alert('The ['+stat+'] item is not registered. Scream at me to add it.');
      if (PixelTanks.userData[key[stat][0][0]][key[stat][0][1]]) {
        alert('You already bought this :/');
      } else if (PixelTanks.userData.stats[0] >= key[stat][1]) {
        PixelTanks.userData.stats[0] -= key[stat][1];
        PixelTanks.userData[key[stat][0][0]][key[stat][0][1]] = true;
        alert('purchase succes. thank u 4 ur monee');
      } else {
        alert('Your brok boi');
      }
    }
  }

  class MultiPlayerTank {
    constructor(ip, gamemode) {

      this.xp = 0;
      this.crates = 0;
      this.kills = 0;
      this.coins = 0;
      this.hostupdate = {};
      this.paused = false;
      this.speed = 4;
      this.key = [];
      this.left = null;
      this.up = null;
      this.grapples = 1;
      this.canGrapple = true;
      this.showChat = false;
      this.msg = '';
      this.gamemode = gamemode;
      this.socket = new MegaSocket('ws://'+ip, {keepAlive: false, reconnect: false, autoconnect: true});
      this.tank = {use: [], fire: [], r: 0};
      this.reset();

      this.socket.on('message', function(data) {
        this.ups++;
        if (this.paused) return;
        if (data.event === 'hostupdate') {
          for (var property in data) this.hostupdate[property] = data[property];
          if (data.logs) this.hostupdate.logs = data.logs.reverse();
        } else if (data.event === 'ded') this.reset(); else if (data.event == 'gameover') {
          // #
        } else if (data.event === 'pay') {
          this.coins += new Number(data.amount);
          PixelTanks.userData.stats[0] += new Number(data.amount);
          PixelTanks.save();
        } else if (data.event == 'override') {
          A.each(data.data, function(d) {d.t[this.key] = this.value}, null, {t: this.tank});
          // trigger interpolation update
          if (this.dx) {
            this.dx.t = Date.now();
            this.dx.o = this.tank.x;
          }
          if (this.dy) {
            this.dy.t = Date.now();
            this.dy.o = this.tank.y;
          }
        } else if (data.event == 'kill') {
          this.kills++;
          var crates = Math.floor(Math.random() * (2) + 1);
          var coins = Math.floor(Math.random()*1000);
          this.xp += 10;
          this.crates += crates;
          this.coins += coins;
          PixelTanks.userData.stats[1] += crates;
          PixelTanks.userData.stats[3] += 10;
          PixelTanks.userData.stats[0] += coins;
          PixelTanks.save();
        } else if (data.event == 'ping') this.ping = new Date().getTime()-this.pingStart;
      }.bind(this));

      this.socket.on('connect', function() {
        this.socket.send({
          username: PixelTanks.user.username,
          token: PixelTanks.user.token,
          type: 'join',
          tank: {
            rank: PixelTanks.userData.stats[4],
            username: PixelTanks.user.username,
            class: PixelTanks.userData.class,
            cosmetic: PixelTanks.userData.cosmetic,
            deathEffect: PixelTanks.userData.deathEffect,
            material: PixelTanks.userData.material,
            color: PixelTanks.userData.color,
          },
        });

        this.pinger = setInterval(function() {
          this.pingId = Math.random();
          this.pingStart = Date.now();
          this.socket.send({type: 'ping', id: this.pingId});
          this.ops = 0;
          this.ups = 0;
          this.fps = 0;
        }.bind(this), 1000);
        setInterval(this.send.bind(this), 1000/60);
        this.render = requestAnimationFrame(this.frame.bind(this));
      }.bind(this));

      document.addEventListener('keydown', this.keydown.bind(this));
      document.addEventListener('keyup', this.keyup.bind(this));
      document.addEventListener('mousemove', this.mousemove.bind(this));
      document.addEventListener('mousedown', this.mousedown.bind(this));
      document.addEventListener('mouseup', this.mouseup.bind(this))
    }

    reset() {
      var time = new Date('Nov 28 2006').getTime();
      this.timers = {
        boost: time,
        powermissle: time,
        toolkit: time,
        class: {time: time, cooldown: -1},
        items: [{time: time, cooldown: -1}, {time: time, cooldown: -1,}, {time: time, cooldown: -1}, {time: time, cooldown: -1}],
      };
      this.fireType = 1;
      this.halfSpeed = false;
      this.canFire = true;
      this.canBoost = true;
      this.canToolkit = true;
      this.canPowermissle = true;
      this.canMegamissle = true;
      this.canInvis = true;
      this.canTurret = true;
      this.canBuild = true;
      this.canBuff = true;
      this.canHeal = true;
      this.canFlame = true;
      this.canDynamite = true;
      this.hasDynamite = false;
      this.canItem0 = true;
      this.canItem1 = true;
      this.canItem2 = true;
      this.canItem3 = true;
      this.canChangePaused = true;
      this.grapples = 1;
      this.canGrapple = true;
      this.kills = 0;
    }

    drawBlock(b) {
      GUI.drawImage(PixelTanks.images.blocks[b.type], b.x, b.y, b.type === 'airstrike' ? 200 : 100, b.type === 'airstrike' ? 200 : 100, (b.type === 'mine' && A.search(this.hostupdate.tanks, {key: 'username', value: PixelTanks.user.username}).team.split(':')[1].replace('@leader', '') !== b.team.split(':')[1].replace('@leader', '')) ? .03 : 1);
    }

    drawShot(s) {
      if (s.type == 'bullet') {
        GUI.draw.fillStyle = '#000000';
        GUI.draw.fillRect(s.x, s.y, 10, 10);
      } else if (['powermissle', 'healmissle'].includes(s.type)) {
        GUI.drawImage(PixelTanks.images.bullets.powermissle, s.x, s.y, 20, 40, 1, 10, 20, 0, 0, s.r+180);
      } else if (s.type === 'megamissle') {
        GUI.drawImage(PixelTanks.images.bullets.megamissle, s.x, s.y, 20, 40, 1, 10, 20, 0, 0, s.r+180);
      } else if (s.type === 'shotgun') {
        GUI.drawImage(PixelTanks.images.bullets.shotgun, s.x, s.y, 10, 10, 1, 5, 5, 0, 0, s.r+180);
      } else if (s.type === 'grapple') {
        GUI.drawImage(PixelTanks.images.bullets.grapple, s.x, s.y, 45, 45, 1, 22.5, 22.5, 0, 0, s.r+180);
        GUI.draw.lineWidth = 10;
        GUI.draw.beginPath();
        GUI.draw.fillStyle = '#A9A9A9';
        GUI.draw.moveTo(s.x, s.y);
        const t = this.hostupdate.tanks.find(t => t.username === s.team.split(':')[0]);
        if (t) GUI.draw.lineTo(t.x+40, t.y+40);
        GUI.draw.stroke();
      } else if (s.type === 'dynamite') {
        GUI.drawImage(PixelTanks.images.bullets.dynamite, s.x, s.y, 10, 40, 1, 5, 5, 0, 0, s.r+180);
      } else if (s.type === 'fire') {
        GUI.drawImage(PixelTanks.images.bullets.fire, s.x, s.y, 10, 10, 1, 5, 5, 0, 0, s.r+180);
      }
    }

    drawExplosion(e) {
      GUI.drawImage(PixelTanks.images.animations.explosion, e.x, e.y, e.w, e.h, 1, 0, 0, 0, 0, 0, e.f*50, 0, 50, 50);
    }

    drawAi(a) {
      GUI.drawImage(PixelTanks.images.tanks.base, a.x, a.y, 80, 80, 1);
      GUI.drawImage(PixelTanks.images.tanks.top, a.x, a.y, 80, 90, 1, 40, 40, 0, a.p, a.r);
      if (a.cosmetic) GUI.drawImage(PixelTanks.images.cosmetics[a.cosmetic], a.x, a.y, 80, 90, 1, 40, 40, 0, a.p, a.r);
      GUI.draw.fillStyle = '#000000';
      GUI.draw.fillRect(a.x, a.y+100, 80, 10);
      GUI.draw.fillStyle = '#00FF00';
      GUI.draw.fillRect(a.x+4, a.y+102, 72*a.hp/600, 6);
    }

    drawTank(t) {
      var key = ['red', 'steel', 'crystal', 'dark', 'light'], a = 1;
      if (t.invis && t.username !== PixelTanks.user.username) a = Math.sqrt(Math.pow(t.x-this.tank.x, 2)+Math.pow(t.y-this.tank.y, 2)) > 200 ? 0 : .2;
      if ((t.invis && t.username === PixelTanks.user.username) || t.ded) a = .5;
      GUI.drawImage(PixelTanks.images.tanks['bottom'+(t.baseFrame ? '' : '2')], t.x, t.y, 80, 80, a, 40, 40, 0, 0, t.baseRotation);
      if (t.fire) GUI.drawImage(PixelTanks.images.animations.fire, t.x, t.y, 80, 80, 1, 0, 0, 0, 0, 0, t.fire.frame*29, 0, 29, 29);
      GUI.drawImage(PixelTanks.images.tanks.top, t.x, t.y, 80, 90, a, 40, 40, 0, t.pushback, t.r);
      if (t.cosmetic) GUI.drawImage(PixelTanks.images.cosmetics[t.cosmetic], t.x, t.y, 80, 90, a, 40, 40, 0, t.pushback, t.r);
      if (t.invis && t.username !== PixelTanks.user.username) return;

      if (!t.ded) {
        GUI.draw.fillStyle = '#000000';
        GUI.draw.fillRect(t.x-2, t.y+98, 84, 11);
        GUI.draw.fillStyle = '#90EE90';
        GUI.draw.fillRect(t.x, t.y+100, 80*t.hp/t.maxHp, 5);
      }

      var username = '['+t.rank+'] '+t.username;
      if (t.team.split(':')[1].includes('@leader')) {
        username += ' ['+t.team.split(':')[1].replace('@leader', '')+'] (Leader)'
      } else if (t.team.split(':')[1].includes('@requestor#')) {
        username += ' [Requesting...] ('+t.team.split(':')[1].split('@requestor#')[1]+')';
      } else if (new Number(t.team.split(':')[1]) < 1) {} else {
        username += ' ['+t.team.split(':')[1]+']';
      }

      //GUI.drawImage(PixelTanks.images.blocks.void, t.x-style.width/2+40, t.y-style.height/2-25, style.width, 50, 0.5);
      GUI.drawText(username, t.x+40, t.y-25, 50, t.color, 0.5);

      if (t.shields > 0 && !t.invis) {
        GUI.draw.beginPath();
        GUI.draw.fillStyle = '#7DF9FF';
        GUI.draw.globalAlpha = .2;
        GUI.draw.arc(t.x+40, t.y+40, 66, 0, 2*Math.PI);
        GUI.draw.fill();
        GUI.draw.globalAlpha = 1;
      }

      if (t.buff) GUI.drawImage(PixelTanks.images.tanks.buff, t.x-5, t.y-5, 80, 80, .2);

      GUI.draw.globalAlpha = 1;
      
      if (t.d !== false) {
        var msg = (Math.round(t.damage.d) < 0) ? '+' : '-';
        msg += Math.round(t.damage.d);
        if (PixelTanks.user.username === t.u) {
          GUI.drawText(msg, t.damage.x, t.damage.y, Math.round(t.damage.d/10)+20, '#FFFFFF', 0.5);
          GUI.drawText(msg, t.damage.x, t.damage.y, Math.round(t.damage.d/10)+15, '#FF0000', 0.5);
        } else {
          GUI.drawText(msg, t.damage.x, t.damage.y, Math.round(t.damage.d/10)+20, '#FFFFFF', 0.5);
          GUI.drawText(msg, t.damage.x, t.damage.y, Math.round(t.damage.d/10)+15, '#0000FF', 0.5);
        }
      }
      
      if (t.emote) {
        GUI.drawImage(PixelTanks.images.emotes.speech, t.x+90, t.y-15, 100, 100, 1);
        GUI.drawImage(PixelTanks.images.emotes[t.emote.a], t.x+90, t.y-15, 100, 100, 1, 0, 0, 0, 0, 0, t.emote.f*50, 0, 50, 50);
      }

      if (t.dedEffect && t.dedEffect.time/PixelTanks.images.deathEffects[t.dedEffect.id+'_'].speed <= PixelTanks.images.deathEffects[t.dedEffect.id+'_'].frames) {
        if (t.dedEffect.time/PixelTanks.images.deathEffects[t.dedEffect.id+'_'].speed < PixelTanks.images.deathEffects[t.dedEffect.id+'_'].kill) {
        GUI.drawImage(PixelTanks.images.tanks.bottom, t.dedEffect.x, t.dedEffect.y, 80, 80, 1, 40, 40, 0, 0, 0);
        GUI.drawImage(PixelTanks.images.tanks.top, t.dedEffect.x, t.dedEffect.y, 80, 90, 1, 40, 40, 0, 0, t.dedEffect.r);
        GUI.drawImage(PixelTanks.images.tanks.destroyed, t.dedEffect.x, t.dedEffect.y, 80, 90, 1, 40, 40, 0, 0, t.dedEffect.r);
      if (t.cosmetic) GUI.drawImage(PixelTanks.images.cosmetics[t.cosmetic], t.dedEffect.x, t.dedEffect.y, 80, 90, 1, 40, 40, 0, 0, t.dedEffect.r);
        }
        GUI.drawImage(PixelTanks.images.deathEffects[t.dedEffect.id], t.dedEffect.x-60, t.dedEffect.y-60, 200, 200, 1, 0, 0, 0, 0, 0, Math.floor(t.dedEffect.time/PixelTanks.images.deathEffects[t.dedEffect.id+'_'].speed)*200, 0, 200, 200);
      }

      if (t.animation) {
        GUI.drawImage(PixelTanks.images.animations[t.animation.id], t.x, t.y, 80, 90, 1, 0, 0, 0, 0, 0, t.animation.frame*40, 0, 40, 45);
      }

      if (t.healing && t.class === 'medic' && !t.ded) {
        A.each(this.hostupdate.tanks, function(d) {
          if (Math.sqrt(Math.pow(this.x-d.t.x, 2)+Math.pow(this.y-d.t.y, 2)) > 500) return;
          /*GUI.draw.beginPath();

          GUI.draw.lineStyle(10, 0x00FF00, .7);
          GUI.draw.moveTo(t.x+40, t.y+40);
          GUI.draw.lineTo(this.x+40, this.y+40);
          GUI.draw.endFill();
          GUI.draw.lineStyle(0, 0x000000, 1);*/ //fix heal tether graphics
        }, {key: 'username', value: t.healing}, {t: t})
      }
    }

    frame() {
      GUI.clear();
      this.render = requestAnimationFrame(this.frame.bind(this));
      if (this.hostupdate.logs === undefined) {
        GUI.draw.fillStyle = '#000000';
        return GUI.draw.fillText('Loading Terrain...', 100, 100);
      }
      this.fps++;
      var t = this.hostupdate.tanks, b = this.hostupdate.blocks, s = this.hostupdate.bullets, a = this.hostupdate.ai, e = this.hostupdate.explosions;
      if (this.dx) {
        var x = this.dx.o+Math.floor((Date.now()-this.dx.t)/15)*this.dx.a*this.speed*(this.halfSpeed ? .5 : (this.buffed ? 1.5 : 1));
        if (this.collision(x, this.tank.y)) {
          this.tank.x = x;
          this.left = this.dx.a < 0;
        } else this.left = null;
        this.dx.t = Date.now()-(Date.now()-this.dx.t)%15;
        this.dx.o = this.tank.x;
      }
      if (this.dy) {
        var y = this.dy.o+Math.floor((Date.now()-this.dy.t)/15)*this.dy.a*this.speed*(this.halfSpeed ? .5 : (this.buffed ? 1.5 : 1));
        if (this.collision(this.tank.x, y)) {
          this.tank.y = y;
          this.up = this.dy.a < 0;
        } else this.up = null;
        this.dy.t = Date.now()-(Date.now()-this.dy.t)%15;
        this.dy.o = this.tank.y;
      }
      if (this.b) this.tank.baseFrame = ((this.b.o ? 0 : 1)+Math.floor((Date.now()-this.b.t)/60))%2;
      this.tank.baseRotation = (this.left === null) ? (this.up ? 180 : 0) : (this.left ? (this.up === null ? 90 : (this.up ? 135 : 45)) : (this.up === null ? 270 : (this.up ? 225: 315)));

      A.each(t, function(d) {
        A.assign(this, ['x', 'y', 'r', 'baseRotation', 'baseFrame'], [d.t.x, d.t.y, d.t.r, d.t.baseRotation, d.t.baseFrame]);
        GUI.draw.setTransform(PixelTanks.resizer, 0, 0, PixelTanks.resizer, (-this.x+760)*PixelTanks.resizer, (-this.y+460)*PixelTanks.resizer);
      }, {key: 'username', value: PixelTanks.user.username}, {t: this.tank});

      GUI.drawImage(PixelTanks.images.blocks.floor, 0, 0, 3000, 3000, 1);

      var l = 0;
      while (l<b.length) {
        this.drawBlock(b[l]);
        l++;
      }

      var l = 0;
      while (l<s.length) {
        this.drawShot(s[l]);
        l++;
      }

      var l = 0;
      while (l<a.length) {
        this.drawAi(a[l]);
        l++;
      }

      var l = 0;
      while (l<t.length) {
        this.drawTank(t[l]);
        l++;
      }

      var l = 0;
      while (l<b.length) {
        if (b[l].s) {
          GUI.draw.fillStyle = '#000000';
          GUI.draw.fillRect(b[l].x-2, b[l].y+108, 104, 11);
          GUI.draw.fillStyle = '#0000FF';
          GUI.draw.fillRect(b[l].x, b[l].y+110, 100*b[l].hp/b[l].maxHp, 5);
        }
        l++;
      }

      var l = 0;
      while (l<e.length) {
        this.drawExplosion(e[l]);
        l++;
      }
      
      GUI.draw.setTransform(PixelTanks.resizer, 0, 0, PixelTanks.resizer, 0, 0);
      GUI.drawImage(PixelTanks.images.menus.ui, 0, 0, 1600, 1000, 1);
      GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[0]], 500, 900, 100, 100, 1);
      GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[1]], 666, 900, 100, 100, 1);
      GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[2]], 832, 900, 100, 100, 1);
      GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[3]], 998, 900, 100, 100, 1);

      GUI.draw.fillStyle = PixelTanks.userData.color;
      GUI.draw.globalAlpha = 0.5;
      GUI.draw.fillRect(500, 900+(Math.min((Date.now()-this.timers.items[0].time)/this.timers.items[0].cooldown, 1))*100, 100, 100);
      GUI.draw.fillRect(666, 900+(Math.min((Date.now()-this.timers.items[1].time)/this.timers.items[1].cooldown, 1))*100, 100, 100);
      GUI.draw.fillRect(832, 900+(Math.min((Date.now()-this.timers.items[2].time)/this.timers.items[2].cooldown, 1))*100, 100, 100);
      GUI.draw.fillRect(998, 900+(Math.min((Date.now()-this.timers.items[3].time)/this.timers.items[3].cooldown, 1))*100, 100, 100);
      GUI.draw.fillRect(348, 950+(Math.min((Date.now()-this.timers.class.time)/this.timers.class.cooldown, 1))*50, 50, 50);
      GUI.draw.fillRect(418, 950+(Math.min((Date.now()-this.timers.powermissle)/10000, 1))*50, 50, 50);
      GUI.draw.fillRect(1132, 950+(Math.min((Date.now()-this.timers.toolkit)/30000, 1))*50, 50, 50);
      GUI.draw.fillRect(1212, 950+(Math.min((Date.now()-this.timers.boost)/5000, 1))*50, 50, 50);
      GUI.draw.globalAlpha = 1;

      GUI.draw.fillStyle = '#000000';
      GUI.draw.globalAlpha = .2;
      GUI.draw.fillRect(0, 0, 180, 250);
      GUI.draw.globalAlpha = 1;
      GUI.drawText('Kills Streak: '+this.kills, 10, 50, 30, '#ffffff', 0);
      GUI.drawText('Crates: '+this.crates, 10, 100, 30, '#ffffff', 0);
      GUI.drawText('Experience: '+this.xp, 10, 150, 30, '#ffffff', 0);
      GUI.drawText('Coins: '+this.coins, 10, 200, 30, '#ffffff', 0);

      var l = 0, len = Math.min((this.showChat || this.hostupdate.logs.length<3) ? this.hostupdate.logs.length : 3, 30);
      while (l<len) {
        GUI.draw.fillStyle = '#000000';
        GUI.draw.globalAlpha = .2;
        GUI.draw.fillRect(0, 800-l*30, GUI.draw.measureText(this.hostupdate.logs[l].m).width, 30);
        GUI.draw.globalAlpha = 1;
        GUI.drawText(this.hostupdate.logs[l].m, 0, 800-l*30, 30, this.hostupdate.logs[l].c, 0);
        l++;
      }

      if (this.showChat) {
        GUI.draw.fillStyle = '#000000';
        GUI.draw.globalAlpha = .2;
        GUI.draw.fillRect(0, 830, GUI.draw.measureText(this.msg).width, 30);
        GUI.draw.globalAlpha = 1;
        GUI.drawText(this.msg, 0, 830, 30, '#ffffff', 0);
      }

      var l = 0;
      while (l<t.length) {
        if (t[l].username == PixelTanks.user.username && t[l].flashbanged) {
          GUI.draw.fillStyle = '#FFFFFF';
          GUI.draw.fillRect(0, 0, 1600, 1000);
        }
        l++;
      }
    }

    chat(e) { // OPTIMIZE
      if (e.key.length === 1) this.msg += e.key; else if (e.keyCode === 8) this.msg = this.msg.slice(0, -1); else if (e.keyCode === 13) {
        if (this.msg !== '') {
          if (this.msg.split('')[0] === '/') {
            var command = this.msg.split(' ')[0];
            if (command === '/emote') {
              if (this.msg.split(' ')[1] === 'set') {
                var data = this.msg.split(' ')[2].split('-');
                if (isNaN(data[0]) || !['1', '2', '3', '4', '5', '6'].includes(data[0])) return alert('Invalid Emote Number');
                if (PixelTanks.images.emotes[data[1]] === undefined) return alert('Invalid Emote Name.');
                if (PixelTanks.userData.emotes === undefined) PixelTanks.userData.emotes = [];
                PixelTanks.userData.emotes[data[0]-1] = data[1];
              } else this.emote(this.msg.split(' ')[1]);
            } else this.socket.send({type: 'command', data: this.msg.split(' ')});
          } else this.socket.send({type: 'chat', msg: this.msg});
          this.msg = '';
        }
        this.showChat = false;
      }
    }

    keydown(e) {
      e.preventDefault();
      if (this.key[e.keyCode] === undefined) {
        if (this.showChat) return this.chat(e);
        this.keyStart(e);
        this.keyLoop(e);
        this.key[e.keyCode] = setInterval(this.keyLoop.bind(this), 15, e);
      }
    }

    keyup(e) {
      e.preventDefault();
      clearInterval(this.key[e.keyCode]);
      this.key[e.keyCode] = undefined;
      if (e.keyCode == 65 || e.keyCode == 68) this.left = null;
      if (e.keyCode == 87 || e.keyCode == 83) this.up = null;
      if (this.dx && (e.keyCode === 65 && this.dx.a < 0 || e.keyCode === 68 && this.dx.a > 0)) this.dx = false;
      if (this.dy && (e.keyCode === 87 && this.dy.a < 0 || e.keyCode === 83 && this.dy.a > 0)) this.dy = false;
      if ([87, 65, 68, 83].includes(e.keyCode)) {
        this.b = false;
        if (this.key[65]) this.keyStart({keyCode: 65});
        if (this.key[68]) this.keyStart({keyCode: 68});
        if (this.key[87]) this.keyStart({keyCode: 87});
        if (this.key[83]) this.keyStart({keyCode: 83});
      }
    }

    mousemove(e) {
      var x = e.clientX;
      var y = e.clientY;
      var targetX = x - window.innerWidth/2, targetY = y - window.innerHeight/2;
      var rotation = this.toAngle(targetX, targetY);
      this.tank.r = Math.round(rotation);
      this.mouse = {x: targetX, y: targetY};
    }

    toAngle(x, y) {
      return (-Math.atan2(x, y)*180/Math.PI+360)%360;
    }

    toPoint(angle) {
      var theta = (-angle)*Math.PI/180;
      var y = Math.cos(theta);
      var x = Math.sin(theta);
      return {
        x: x/Math.abs(x),
        y: y/Math.abs(x),
      };
    }

    mousedown(e) {
      if (this.canFire) this.fire(e.button);
      clearInterval(this.fireInterval);
      this.fireInterval = setInterval(this.fire.bind(this), this.fireType === 1 ? 200 : 600, e.button);
    }

    mouseup() {
      clearInterval(this.fireInterval);
    }

    fire(type) {
      if (type === 2) {
        if (!this.canPowermissle) return;
        this.canPowermissle = false;
        this.timers.powermissle = Date.now();
	setTimeout(() => {
	  this.canPowermissle = true;
	}, 10000);
      } else if (type === 0) {
        this.canFire = false;
        setTimeout(function(){this.canFire = true}.bind(this), this.fireType === 1 ? 200 : 600);
      }
      var fireType = ['grapple', 'megamissle', 'dynamite', 2].includes(type) ? 1 : this.fireType, type = type === 2 ? (PixelTanks.userData.class === 'medic' ? 'healmissle' : 'powermissle') : (type === 0 ? (this.fireType === 1 ? 'bullet' : 'shotgun') : type), l = fireType === 1 ? 0 : -10;
      while (l<(fireType === 1 ? 1 : 15)) {
        this.tank.fire.push({...this.toPoint(this.tank.r+l), type: type, r: this.tank.r+l});
        l += 5;
      }
    }

    collision(x, y) {

      var l = 0, team;
      while (l < this.hostupdate.tanks.length) {
        if (this.hostupdate.tanks[l].username === PixelTanks.user.username) {
          team = this.hostupdate.tanks[l].team.split(':')[1].replace('@leader', '').replace('@requestor#', '');
          if (this.hostupdate.tanks[l].ded) return true;
        }
        l++;
      }

      if (x < 0 || y < 0 || x + 80 > 3000 || y + 80 > 3000) return false;

      if (this.tank.invis && this.tank.immune) return true;
      var l = 0, blocks = this.hostupdate.blocks, len = blocks.length;
      while (l<len) {
        if ((x > blocks[l].x || x + 80 > blocks[l].x) && (x < blocks[l].x + 100 || x + 80 < blocks[l].x + 100) && (y > blocks[l].y || y + 80 > blocks[l].y) && (y < blocks[l].y + 100 || y + 80 < blocks[l].y + 100)) {
          if ((blocks[l].type === 'fire' || blocks[l].type === 'fortress' && blocks[l].team.split(':')[1] === team)) {} else if (blocks[l].c) return false;
        }
        l++;
      }
      return true;
    }

    playAnimation(id) {
      this.tank.animation = {id: id, frame: 0};
      clearInterval(this.animationInterval);
      this.animationInterval = setInterval(function() {
        if (this.tank.animation.frame === PixelTanks.images.animations[id+'_'].frames) {
          clearInterval(this.animationInterval);
          setTimeout(function() {this.tank.animation = false}.bind(this), PixelTanks.images.animations[id+'_'].speed);
        } else this.tank.animation.frame++;
      }.bind(this), PixelTanks.images.animations[id+'_'].speed);
    }

    item(id, slot) {
      var key = {
        duck_tape: [function() {
          this.tank.use.push('tape');
          this.playAnimation('tape');
        }, 30000, false],
        super_glu: [function() {
          this.tank.use.push('glu');
          this.playAnimation('glu');
        }, 40000, false],
        shield: [function() {
          this.tank.use.push('shield');
        }, 30000, false],
        weak: [function() {
          this.tank.use.push('block');
          this.tank.blockType = PixelTanks.userData.class === 'builder' ? 'strong' : 'weak';
        }, 3000, false],
        strong: [function() {
          this.tank.use.push('block');
          this.tank.blockType = PixelTanks.userData.class === 'builder' ? 'gold' : 'strong';
        }, 7000, false],
        spike: [function() {
          this.tank.use.push('block');
          this.tank.blockType = 'spike';
        }, 10000, false],
        flashbang: [function() {
          this.tank.use.push('flashbang');
        }, 40000, false],
        bomb: [function() {
          this.tank.use.push('bomb');
        }, 5000, false],
        mine: [function() {
          this.tank.use.push('block');
          this.tank.blockType = 'mine';
        }, 1000, false],
        dynamite: [function() {
          if (!this['canItem'+slot]) {
            this.tank.use.push('dynamite');
          } else {
            this.fire('dynamite');
            this['canItem'+slot] = false;
            this.timers.items[slot].cooldown = 25000;
            this.timers.items[slot].time = new Date();
            setTimeout(function() {
              this['canItem'+slot] = true;
            }.bind(this), 25000);
          }
        }, 25000, true],
        airstrike: [function() {
          this.tank.airstrike = {x: this.mouse.x/PixelTanks.resizer-this.x+1460, y: this.mouse.y/PixelTanks.resizer-this.y+860};
        }, 40000, false],
        fortress: [function() {
          this.tank.use.push('block');
          this.tank.blockType = 'fortress';
        }, 30000, false],
      }
      this.useItem(key[id][0], key[id][1], slot, key[id][2]);
    }

    useItem(enable, cooldown, slot, c) {
      if (c) {
        enable = enable.bind(this);
        enable();
        return;
      }
      if (this['canItem'+slot]) {
        enable = enable.bind(this);
        enable();
        this.timers.items[slot].cooldown = cooldown;
        this.timers.items[slot].time = Date.now();
        this['canItem'+slot] = false;
        setTimeout(function() {
          this['canItem'+slot] = true;
        }.bind(this), cooldown);
      }
    }

    keyStart(e) {
      if (this.paused && e.keyCode !== 22) return;
      switch (e.keyCode) {
        case 65:
        case 68:
          this.dx = {o: this.tank.x, t: Date.now(), a: e.keyCode === 65 ? -1 : 1, b: false};
          this.b = {o: this.tank.baseFrame, t: Date.now()};
        break;
        case 83:
        case 87:
          this.dy = {o: this.tank.y, t: Date.now(), a: e.keyCode === 87 ? -1 : 1, b: false};
          this.b = {o: this.tank.ba, t: Date.now()};
        break;
        case PixelTanks.userData.keybinds.items[0]:
          this.item(PixelTanks.userData.items[0], 0);
          break;
        case PixelTanks.userData.keybinds.items[1]:
          this.item(PixelTanks.userData.items[1], 1);
          break;
        case PixelTanks.userData.keybinds.items[2]:
          this.item(PixelTanks.userData.items[2], 2);
          break;
        case PixelTanks.userData.keybinds.items[3]:
          this.item(PixelTanks.userData.items[3], 3);
          break;
        case PixelTanks.userData.keybinds.emotes[0]:
          this.emote(PixelTanks.userData.emotes[0]);
          break;
        case PixelTanks.userData.keybinds.emotes[1]:
          this.emote(PixelTanks.userData.emotes[1]);
          break;
        case PixelTanks.userData.keybinds.emotes[2]:
          this.emote(PixelTanks.userData.emotes[2]);
          break;
        case PixelTanks.userData.keybinds.emotes[3]:
          this.emote(PixelTanks.userData.emotes[3]);
          break;
        case PixelTanks.userData.keybinds.emotes[4]:
          this.emote(PixelTanks.userData.emotes[4]);
          break;
        case PixelTanks.userData.keybinds.emotes[5]:
          this.emote(PixelTanks.userData.emotes[5]);
          break;
        case 13:
          this.showChat = true;
          break;
        case 18:
          document.write(JSON.stringify(PixelTanks.user.joiner.hostupdate));
          break;
        case false: //PixelTanks.userData.settings.fire1:
          this.fireType = 1;
          clearInterval(this.fireInterval);
          break;
        case false: //PixelTanks.userData.settings.fire2:
          this.fireType = 2;
          clearInterval(this.fireInterval);
          break;
        case 9:
          if (this.fireType === 2) {
            this.fireType = 1;
          } else {
            this.fireType++;
          }
          clearInterval(this.fireInterval);
          break;
        case 82:
          if (this.grapples > 0) {
              this.fire('grapple');
              this.grapples--;
              this.canGrapple = false;
              setTimeout(function() {this.canGrapple = true}.bind(this), 200)
              if (this.grapples === 0) {
               setTimeout(function() {this.grapples = 1}.bind(this), 5000);
              }
          }
          break;
        case 81:
          if (this.canToolkit) {
            if (this.halfSpeed) {
              this.tank.use.push('toolkit');
              this.halfSpeed = false;
            } else {
              this.halfSpeed = true;
              setTimeout(function() {this.halfSpeed = false}.bind(this), PixelTanks.userData.class === 'medic' ? 5000 : 7500);
              this.tank.use.push('toolkit');
              this.canToolkit = false;
              this.timers.toolkit = new Date();
              setTimeout(function() {this.canToolkit = true}.bind(this), 0);
              this.playAnimation('toolkit');
            }
          }
          break;
        case 70:
          if (PixelTanks.userData.class === 'stealth') {
            if (this.canInvis && !this.tank.invis) {
              this.tank.invis = true;
              this.canInvis = false;
              this.timers.class.time = Date.now();
              this.timers.class.cooldown = 30000;
              clearTimeout(this.invis);
              this.invis = setTimeout(function() {
                this.tank.invis = false;
                this.invis = setTimeout(function() {this.canInvis = true}.bind(this), 30000);
              }.bind(this), 30000);
            } else if (this.tank.invis) {
              this.tank.invis = false;
              setTimeout(function() {this.canInvis = true}.bind(this), 30000-(Date.now()-this.timers.class.time));
            }
          } else if (PixelTanks.userData.class === 'normal') {
            // add sheidls ehre for idots
          } else if (PixelTanks.userData.class == 'tactical') {
            if (this.canMegamissle) {
              this.fire('megamissle');
              this.canMegamissle = false;
              this.timers.class.time = Date.now();
              this.timers.class.cooldown = 30000;
              setTimeout(function() {
                this.canMegamissle = true;
              }.bind(this), 30000);
            }
          } else if (PixelTanks.userData.class == 'builder') {
            if (this.canTurret) {
              this.canTurret = false;
              this.tank.use.push('turret');
              this.timers.class.time = Date.now();
              this.timers.class.cooldown = 40000;
              setTimeout(function() {
                this.canTurret = true;
              }.bind(this), 40000);
            }
          } else if (PixelTanks.userData.class === 'warrior') {
            if (this.canBuff) {
              this.canBuff = false;
              this.buffed = true;
              setTimeout(function() {this.buffed = false}.bind(this), 10000);
              this.tank.use.push('buff');
              this.timers.class.time = Date.now();
              this.timers.class.cooldown = 40000;
              setTimeout(function() {
                this.canBuff = true;
              }.bind(this), 40000);
            }
          } else if (PixelTanks.userData.class === 'medic') {
            this.tank.use.push('healSwitch');
            this.timers.class.time = Date.now();
            this.timers.class.cooldown = 0;
          } else if (PixelTanks.userData.class === 'fire') {
            if (this.canFlame) {
              this.canFlame = false;
              this.timers.class.time = Date.now();
              this.timers.class.cooldown = 10000;
              var l = -30;
              while (l<30) {
                this.tank.fire.push({...this.toPoint(this.tank.r+l), type: 'fire', r: this.tank.r+l});
                l+=5;
              }
              setTimeout(function() {this.canFlame = true}.bind(this), 10000);
            }
          }
          break;
        case 27:
          this.paused = !this.paused;
          if (this.paused) {
            GUI.draw.fillStyle = '#000000';
            GUI.draw.fillRect(0, 0, 1600, 1000);
          } else {
            Menus.removeListeners();
          }
          break;
      }
    }

    keyLoop(e) {
      switch (e.keyCode) {
        case 16:
          if (this.canBoost) {
            this.speed = 16;
            this.canBoost = false;
            this.tank.immune = true;
            this.timers.boost = Date.now();
            if (PixelTanks.userData.class === 'tactical') this.tank.use.push('mine');
            setTimeout(function() {
              this.speed = 4;
              this.tank.immune = false;
              if (PixelTanks.userData.class === 'tactical') this.tank.use.push('mine');
              if (PixelTanks.userData.class === 'stealth') this.tank.use.push('bomb');
            }.bind(this), 500);
            setTimeout(function() {this.canBoost = true}.bind(this), 5000);
          }
        break;
      }
    }

    emote(id) {
      clearInterval(this.emoteAnimation);
      clearTimeout(this.emoteTimeout);
      if (PixelTanks.images.emotes[id+'_'].type === 0) { // loop emote
        this.tank.emote = {a: id, f: 0};
        this.emoteAnimation = setInterval(function() {
          if (this.tank.emote.f != PixelTanks.images.emotes[id+'_'].frames) {
            this.tank.emote.f++;
          } else {
            this.tank.emote.f = 0;
          }
        }.bind(this), 50);
        this.emoteTimeout = setTimeout(function() {
          clearInterval(this.emoteAnimation);
          this.tank.emote = null;
        }.bind(this), 5000);
      } else if (PixelTanks.images.emotes[id+'_'].type === 1) { // single run emote
        this.tank.emote = {a: id, f: 0};
        this.emoteAnimation = setInterval(function() {
          if (this.tank.emote.f != PixelTanks.images.emotes[id+'_'].frames) {
            this.tank.emote.f++;
          } else {
            clearInterval(this.emoteAnimation);
            setTimeout(function() {
              this.tank.emote = null;
            }.bind(this), 1500);
          }
        }.bind(this), 50);
      } else {
        this.tank.emote = {
          a: id,
          f: 0,
        }
        this.emoteTimeout = setTimeout(function() {
          this.tank.emote = null;
        }.bind(this), 5000);
      }
    }

    send() {
      this.ops++;
      this.socket.send({username: PixelTanks.user.username, type: 'update', data: this.tank});
      this.tank.blockType = null;
      this.tank.airstrike = null;
      this.tank.fire = [];
      this.tank.use = [];
    }
  }

  window.onload = PixelTanks.start;
})();
