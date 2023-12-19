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
        background-color: black;
      }
      canvas {
        display: inline;
      }
      @font-face {
        font-family: 'Font';
        src: url('https://cs6413110.github.io/Pixel-Tanks/public/fonts/PixelOperator.ttf') format('truetype');
      }
    </style>`;
    Menus.scaler = document.createElement('CANVAS');
    GUI.canvas = document.createElement('CANVAS');
    GUI.draw = GUI.canvas.getContext('2d');
    GUI.draw.imageSmoothingEnabled = Menus.scaler.getContext('2d').imageSmoothingEnabled = false;
    document.body.appendChild(GUI.canvas);
    PixelTanks.resizer = window.innerHeight/1000;
    GUI.canvas.height = window.innerHeight;
    GUI.canvas.width = window.innerHeight*1.6;
    GUI.canvas.style = 'background-color: black;';
    GUI.draw.setTransform(PixelTanks.resizer, 0, 0, PixelTanks.resizer, 0, 0);
    GUI.drawText('Loading Font', 800, 500, 50, '#fffff', 0.5);
    window.oncontextmenu = () => false;
    window.addEventListener('resize', GUI.resize);
    window.addEventListener('mousemove', Menus.mouseLog);
  }

  static updateBootProgress(progress) {
    GUI.clear();
    if (Math.random() < .05) PixelTanks.loadMessage = PixelTanks.loadMessages[Math.floor(Math.random()*PixelTanks.loadMessages.length)];
    GUI.drawText(PixelTanks.loadMessage, 800, 500, 50, '#ffffff', 0.5);
    GUI.draw.fillStyle = '#FFFFFF';
    GUI.draw.fillRect(400, 600, 800, 60);
    GUI.draw.fillStyle = '#000000';
    GUI.draw.fillRect(405, 605, 790, 50);
    GUI.draw.fillStyle = '#FFFFFF';
    GUI.draw.fillRect(410, 610, progress*780, 40);
  }

  static boot() {
    PixelTanks.user = {};
    PixelTanks.loadMessages = ['Recharging Instas...', 'Summoning Turrets...', 'Sorting Cosmetics...', 'Spotting Stealths...', 'Putting Out Fires...', 'Generating Levels...', 'Loading Up Crates...', 'Filling Up Stocks...', 'Drawing Menus...', 'Placing Blocks...', 'Launching Missles...', 'Booting Game Engine...'];
    PixelTanks.loadMessage = PixelTanks.loadMessages[Math.floor(Math.random()*PixelTanks.loadMessages.length)];
    const config = document.createElement('SCRIPT');
    config.src = 'https://cs6413110.github.io/Pixel-Tanks/public/js/config.js';
    config.onload = () => {
      PixelTanks.images = images;
      Loader.loadImages(PixelTanks.images);
    Menus.menus = {
      start: {
        buttons: [
          [544, 648, 216, 116, function() {PixelTanks.auth(this.username, this.password, 'login')}, true],
          [840, 648, 216, 116, function() {PixelTanks.auth(this.username, this.password, 'signup')}, true],
          [564, 392, 456, 80, function() {this.type = 'username'}, false],
          [564, 520, 456, 80, function() {this.type = 'password'}, false],
        ],
        listeners: {
          keydown: function(e) {
            if (e.key.length === 1) this[this.type] += e.key;
            if (e.keyCode === 8) this[this.type] = this[this.type].slice(0, -1);
            if (e.keyCode === 13) PixelTanks.auth(this.username, this.password, 'login');
          }
        },
        cdraw: function() {
          if (!this.type) {
            this.type = 'username';
            this.username = '';
            this.password = '';
          }
          GUI.drawText(this.username, 574, 407, 50, '#000000', 0);
          GUI.drawText(this.password.replace(/./g, '*'), 574, 535, 50, '#000000', 0);
        },
      },
      main: {
        buttons: [
          [972, 840, 88, 88, 'keybinds', true],
          [532, 616, 536, 136, 'multiplayer', true],
          [648, 840, 88, 88, 'shop', true],
          [540, 840, 88, 88, 'inventory', true],
          [756, 840, 88, 88, 'crate', true],
          [864, 840, 88, 88, 'help', true],
          [532, 392, 536, 136, 'singleplayer', true],
          /*[320, 920, 80, 80, function() {
            clearInterval(PixelTanks.autosave);
            PixelTanks.user.token = undefined;
            PixelTanks.user.username = undefined;
            Menus.trigger('start');
          }],*/ // logout
        ],
        listeners: {},
        cdraw: function() {
          PixelTanks.renderBottom(1200, 600, 160, PixelTanks.userData.color);
          GUI.drawImage(PixelTanks.images.tanks.bottom, 1200, 600, 160, 160, 1);
          PixelTanks.renderTop(1200, 600, 160, PixelTanks.userData.color);
          GUI.drawImage(PixelTanks.images.tanks.top, 1200, 600, 160, 180, 1);
          if (PixelTanks.userData.cosmetic_body) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic_body], 1200, 600, 160, 180, 1);
          if (PixelTanks.userData.cosmetic) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic], 1200, 600, 160, 180, 1);
          if (PixelTanks.userData.cosmetic_hat) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic_hat], 1200, 600, 160, 180, 1);
          GUI.drawText(PixelTanks.user.username, 1280, 800, 100, '#ffffff', 0.5);
        },
      },
      singleplayer: {
        buttons: [
          [25, 28, 80, 74, 'main', true],
        ],
        listeners: {
          mousedown: function(e) {
            const {x, y} = Menus;
            const levelCoords = [
              [31, 179],
              [244, 179],
              [452, 179],
              [672, 179],
              [890, 179],
              [31, 262],
              [244, 262],
              [452, 262],
              [672, 262],
              [890, 262],
              [31, 345],
              [244, 345],
              [452, 345],
              [672, 345],
              [890, 345],
              [31, 428],
              [244, 428],
              [452, 428],
              [672, 428],
              [890, 428],
              [31, 511],
              [244, 511],
              [452, 511],
              [672, 511],
              [890, 511],
              [31, 594],
              [244, 594],
              [452, 594],
              [672, 594],
              [890, 594],
            ];
            for (const c of levelCoords) {
              if (x > c[0]*1600/1049 && x < (c[0]+80)*1600/1049 && y > c[1]*1000/653 && y < (c[1]+74)*1000/653) {
                Menus.removeListeners();
                PixelTanks.user.player = new Client(levelCoords.indexOf(c)+10, false, null);
              }
            }
          }
        },
        cdraw: function() {},
      },
      victory: {
        buttons: [
          [656, 603, 313, 112, function() {
          Menus.trigger('main');
        }, true],
          [558, 726, 505, 114, function() {
            alert('no')
          }, true],
        ],
        listeners: {},
        cdraw: function() {
          GUI.drawText('Coins: '+Menus.menus.victory.stats[coins], 800, 800, 50, '#ffffff', 0.5);
          GUI.drawText('Crates: '+Menus.menus.victory.stats[crates], 800, 900, 50, '#ffffff', 0.5);
          GUI.drawText('Xp: '+Menus.menus.victory.stats[xp], 800, 1000, 50, '#ffffff', 0.5);
        },
      },
      defeat: {
        buttons: [
          [656, 603, 313, 112, function() {
          Menus.trigger('main');
        }, true],
          [558, 726, 505, 114, function() {
            alert('no')
          }, true],
        ],
        listeners: {},
        cdraw: function() {
          GUI.drawText('Coins: '+Menus.menus.defeat.stats[coins], 800, 800, 50, '#ffffff', 0.5);
          GUI.drawText('Crates: '+Menus.menus.defeat.stats[crates], 800, 900, 50, '#ffffff', 0.5);
          GUI.drawText('Xp: '+Menus.menus.defeat.stats[xp], 800, 1000, 50, '#ffffff', 0.5);
        },
      },
      multiplayer: {
        buttons: [
          [424, 28, 108, 108, 'main'],
          [340, 376, 416, 116, function() {this.gamemode = 'ffa'}, true],
          [340, 532, 416, 116, function() {this.gamemode = 'duels'}, true],
          [340, 688, 416, 116, function() {this.gamemode = 'tdm'}, true],
          [340, 844, 416, 116, function() {this.gamemode = 'juggernaut'}, true],
          [868, 848, 368, 88, function() {
            PixelTanks.user.player = new Client(this.ip, true, this.gamemode);
            Menus.removeListeners();
          }, true],
        ],
        listeners: {
          keydown: function(e) {
            if (e.key.length === 1) {
              this.ip += e.key;
            } else if (e.keyCode === 8) {
              this.ip = this.ip.slice(0, -1);
            } else if (e.keyCode !== -1) return;
            this.socket = new MegaSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://')+this.ip, {keepAlive: false, reconnect: true, autoconnect: true});
            this.socket.on('connect', () => {
              this.socket.send({username: PixelTanks.user.username, type: 'stats'});
            });
            this.socket.on('message', (d) => {
              this.output = d;
            });
          }
        },
        cdraw: function() {
          if (!this.gamemode) {
            this.gamemode = 'ffa';
            this.output = {FFA: '', DUELS: '', TDM: ''};
            this.ip = '141.148.128.231/ffa';
            this.listeners.keydown({keyCode: -1, key: ''});
          }
          GUI.drawText(this.gamemode, 1200, 800, 50, '#FFFFFF', 0.5);
          GUI.drawText(this.ip, 800, 276, 50, '#FFFFFF', 0.5);
          GUI.drawText(this.output.FFA.length, 820, 434, 50, '#FFFFFF', 0.5);
          GUI.drawText(this.output.DUELS.length, 820, 590, 50, '#FFFFFF', 0.5);
          GUI.drawText(this.output.TDM.length, 820, 764, 50, '#FFFFFF', 0.5);
          let offset = 0;
          for (const server of this.output[this.gamemode.toUpperCase()]) {
            if (server !== null) for (const player of server) {
              GUI.drawText(player, 880, 400+40*offset, 50, '#FFFFFF', 0);
              offset++;
            }
          }
        }
      },
      crate: {
        buttons: [
          [416, 20, 81, 81, 'main', true],
          [232, 308, 488, 488, function() {PixelTanks.openCrate(0)}, false],
          [880, 308, 488, 488, function() {PixelTanks.openCrate(1)}, false],
        ],
        listeners: {},
        cdraw: function() {
          GUI.drawText('Crates: ' + PixelTanks.userData.stats[1], 800, 260, 30, '#ffffff', 0.5);
        }
      },
      settings: {
        buttons: [
          [59, 56, 53, 53, 'main', true],
          [397, 65, 38, 35, 'keybinds', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      htp1: {
        buttons: [
          [12, 12, 120, 120, 'main', true],
          [476, 224, 320, 80, 'htp2', true],
          [804, 224, 320, 80, 'htp3', true],
          [1132, 224, 320, 80, 'htp4', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      htp2: {
        buttons: [
          [12, 12, 120, 120, 'main', true],
          [148, 224, 320, 80, 'htp1', true],
          [804, 224, 320, 80, 'htp3', true],
          [1132, 224, 320, 80, 'htp4', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      htp3: {
        buttons: [
          [12, 12, 120, 120, 'main', true],
          [148, 224, 320, 80, 'htp1', true],
          [476, 224, 320, 80, 'htp2', true],
          [1132, 224, 320, 80, 'htp4', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      htp4: {
        buttons: [
          [12, 12, 120, 120, 'main', true],
          [148, 224, 320, 80, 'htp1', true],
          [476, 224, 320, 80, 'htp2', true],
          [804, 224, 320, 80, 'htp3', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      keybinds: {
        buttons: [
          [40, 40, 120, 120, 'main', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      help: {
        buttons: [
          [44, 44, 80, 80, 'main', true],
          [684, 764, 236, 80, 'helpinventory', true],
          [1024, 764, 236, 80, 'helpcosmetic', true],
          [1344, 764, 236, 80, 'helpclass', true],
          [44, 884, 236, 80, 'helpmode', true],
          [364, 884, 236, 80, 'helpvocab', true],
          [1344, 884, 236, 80, 'helpteam', true],
        ],
        listeners: {
          mousedown: function(e) {
            const {x, y} = Menus;
            const helpCoords = [
              [44, 644],
              [364, 644],
              [684, 644],
              [1024, 644],
              [1344, 644],
              [44, 764],
              [364, 764],
              [684, 884],
              [1344, 884],
            ];
            for (const c of helpCoords) {
              if (x > c[0] && x < c[0]+80 && y > c[1] && y < c[1]+74) {
                Menus.removeListeners();
                PixelTanks.user.player = new Client(helpCoords.indexOf(c)+1, false, null);
              }
            }
          }
        },
        cdraw: function() {
          const helpCoords = [
              [44, 644],
              [364, 644],
              [684, 644],
              [1024, 644],
              [1344, 644],
              [44, 764],
              [364, 764],
              [684, 884],
              [1344, 884],
            ];
          GUI.draw.fillStyle = '#000000';
          for (const c of helpCoords) GUI.draw.fillRect(c[0], c[1], 80, 74);
        },
      },
      helpinventory: {
        buttons: [
          [120, 132, 120, 120, 'help', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      helpcosmetic: {
        buttons: [
          [120, 132, 120, 120, 'help', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      helpclass: {
        buttons: [
          [120, 132, 120, 120, 'help', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      helpmode: {
        buttons: [
          [120, 132, 120, 120, 'help', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      helpvocab: {
        buttons: [
          [120, 132, 120, 120, 'help', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      helpteam: {
        buttons: [
          [120, 132, 120, 120, 'help', true],
        ],
        listeners: {},
        cdraw: function() {},
      },
      inventory: {
        buttons: [
          [416, 20, 108, 108, 'main', true],
          [1064, 460, 88, 88, PixelTanks.upgrade, true],
          [1112, 816, 88, 88, function() {PixelTanks.switchTab('classTab')}, false],
          [400, 816, 88, 88, function() {PixelTanks.switchTab('itemTab', 1)}, false],
          [488, 816, 88, 88, function() {PixelTanks.switchTab('itemTab', 2)}, false],
          [576, 816, 88, 88, function() {PixelTanks.switchTab('itemTab', 3)}, false],
          [664, 816, 88, 88, function() {PixelTanks.switchTab('itemTab', 4)}, false],
          [756, 220, 88, 88, function() {PixelTanks.switchTab('cosmeticTab')}, false],
          [532, 220, 88, 88, function() {PixelTanks.switchTab('deathEffectsTab')}, false],
        ],
        listeners: {
          mousedown: function(e) {
            const {x, y} = Menus;
            if (this.classTab) {
              if (x < 688 || x > 912 || y < 334 || y > 666) return this.classTab = false;
              for (let xm = 0; xm < 2; xm++) {
                for (let ym = 0; ym < 3; ym++) {
                  if (Engine.collision(x, y, 0, 0, [702, 810][xm], [348, 456, 564][ym], 88, 88)) {
                    if (PixelTanks.userData.classes[[[0, 5, 3], [1, 4, 2]][xm][ym]]) {
                      PixelTanks.userData.class = [['tactical', 'fire', 'medic'], ['stealth', 'builder', 'warrior']][xm][ym];
                    } else alert('You need to buy this first!');
                    return;
                  }
                }
              }
            } else if (this.itemTab) {
              if (x < 580 || x > 1020 || y < 334 || y > 666) return this.itemTab = false;
              const key = {airstrike: [600, 354], super_glu: [708, 354], duck_tape: [816, 354], shield: [924, 354], flashbang: [600, 462], bomb: [708, 462], dynamite: [816, 462], usb: [924, 462], weak: [600, 570], strong: [708, 570], spike: [816, 570], reflector: [904, 570]};
              for (const item in key) {
                if (Engine.collision(x, y, 0, 0, key[item][0], key[item][1], 80, 80)) {
                  if (!PixelTanks.userData.items.includes(item)) {
                    PixelTanks.userData.items[this.currentItem-1] = item;
                  } else alert('You are not allowed to have more than 1 of the same item');
                  return;
                }
              }
            } else if (this.cosmeticTab) {
              if (x < 518 || x > 1082 || y < 280 || y > 720) return Menus.menus.inventory.cosmeticTab = false;
              for (let i = 0; i < 16; i++) {
                if (Engine.collision(x, y, 0, 0, 598+(i%4)*108, 298+Math.floor(i/4)*108, 88, 88)) {
                  if (e.button === 0) {
                    if (confirm('Do you want this cosmetic to be top layer?')) PixelTanks.userData.cosmetic_hat = PixelTanks.userData.cosmetics[this.cosmeticMenu*16+i];
                    if (confirm('Do you want this cosmetic to be middle layer?')) PixelTanks.userData.cosmetic = PixelTanks.userData.cosmetics[this.cosmeticMenu*16+i];
                    if (confirm('Do you want this cosmetic to be base layer?')) PixelTanks.userData.cosmetic_body = PixelTanks.userData.cosmetics[this.cosmeticMenu*16+i];
                  } else {
                    PixelTanks.userData.cosmetics.splice(this.cosmeticMenu*16+i, 1);
                  }
                  return;
                }
              }
            } else if (this.deathEffectsTab) {
              if (x < 518 || x > 1082 || y < 280 || y > 720) return Menus.menus.inventory.deathEffectsTab = false;
              for (let i = 0; i < 16; i++) {
                if (Engine.collision(x, y, 0, 0, 598+(i%4)*108, 298+Math.floor(i/4)*108, 88, 88)) {
                  if (e.button === 0) {
                    PixelTanks.userData.deathEffect = PixelTanks.userData.deathEffects[this.deathEffectsMenu*16+i];
                  } else {
                    PixelTanks.userData.deathEffects.splice(this.deathEffectsMenu*16+i, 1);
                  }
                  return;
                }
              }
            }
          },
          mousemove: function(e) {
            this.target = {x: e.clientX-window.innerWidth/2, y: e.clientY-window.innerHeight/2};
          },
          keydown: function(e) {
            if (e.key.length === 1 && this.color.length < 7) {
              this.color += e.key;
              PixelTanks.userData.color = this.color;
            }
            if (e.keyCode === 8) this.color = this.color.slice(0, -1);
            if (this.cosmeticTab) {
              if (e.keyCode === 37 && this.cosmeticMenu > 0) this.cosmeticMenu--;
              if (e.keyCode === 39 && this.cosmeticMenu+1 !== Math.ceil(PixelTanks.userData.cosmetics.length/16)) this.cosmeticMenu++;
            }
            if (this.deathEffectsTab) {
              if (e.keyCode === 37 && this.deathEffectsMenu > 0) this.deathEffectsMenu--;
              if (e.keyCode === 39 && this.deathEffectsMenu+1 !== Math.ceil(PixelTanks.userData.deathEffects.length/16)) this.deathEffectsMenu++;
            }
          }
        },
        cdraw: function() {
          if (!this.target) {
            this.time = Date.now();
            this.color = PixelTanks.userData.color;
            this.target = {x: 0, y: 0};
            this.cosmeticMenu = 0;
            this.deathEffectsMenu = 0;
          }
          const coins = PixelTanks.userData.stats[0], xp = PixelTanks.userData.stats[3], rank = PixelTanks.userData.stats[4];
          const coinsUP = (rank+1)*1000, xpUP = (rank+1)*100;
          GUI.draw.fillStyle = this.color;
          GUI.draw.fillRect(1008, 260, 32, 32);
          GUI.drawText(this.color, 1052, 260, 30, '#000000', 0);
          GUI.drawText(PixelTanks.user.username, 300, 420, 80, '#000000', .5);
          GUI.drawText('Coins: '+coins, 300, 500, 50, '#FFE900', .5);
          GUI.drawText('Rank: '+rank, 300, 550, 50, '#FF2400', .5);
          GUI.drawText('Level Up Progress', 1400, 400, 50, '#000000', .5);
          GUI.drawText((rank < 20 ? coins+'/'+coinsUP : 'MAXED')+' Coins', 1400, 500, 50, rank < 20 ? (coins < coinsUP ? '#FF2400' : '#90EE90') : '#63666A', .5);
          GUI.drawText((rank < 20 ? xp+'/'+xpUP : 'MAXED')+' XP', 1400, 550, 50, rank < 20 ? (xp < xpUP ? '#FF2400' : '#90EE90') : '#63666A', .5);
          if (coins < coinsUP || xp < xpUP || rank > 19) {
            GUI.draw.fillStyle = '#000000';
            GUI.draw.globalAlpha = .7;
            GUI.draw.fillRect(1064, 458, 88, 88);
            GUI.draw.globalAlpha = 1;
          }
          for (let i = 0; i < 4; i++) GUI.drawImage(PixelTanks.images.items[PixelTanks.userData.items[i]], [404, 492, 580, 668][i], 820, 80, 80, 1);
          PixelTanks.renderBottom(680, 380, 240, PixelTanks.userData.color);
          GUI.drawImage(PixelTanks.images.tanks.bottom, 680, 380, 240, 240, 1);
          PixelTanks.renderTop(680, 380, 240, PixelTanks.userData.color, (-Math.atan2(this.target.x, this.target.y)*180/Math.PI+360)%360);
          GUI.drawImage(PixelTanks.images.tanks.top, 680, 380, 240, 270, 1, 120, 120, 0, 0, (-Math.atan2(this.target.x, this.target.y)*180/Math.PI+360)%360);
          if (PixelTanks.userData.cosmetic_body) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic_body], 680, 380, 240, 270, 1, 120, 120, 0, 0, (-Math.atan2(this.target.x, this.target.y)*180/Math.PI+360)%360);
          if (PixelTanks.userData.cosmetic) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic], 680, 380, 240, 270, 1, 120, 120, 0, 0, (-Math.atan2(this.target.x, this.target.y)*180/Math.PI+360)%360);
          if (PixelTanks.userData.cosmetic_hat) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic_hat], 680, 380, 240, 270, 1, 120, 120, 0, 0, (-Math.atan2(this.target.x, this.target.y)*180/Math.PI+360)%360);
          
          const key = {tactical: [7, 7], fire: [7, 61], medic: [7, 115], stealth: [61, 7], builder: [61, 61], warrior: [61, 115]};
          if (PixelTanks.userData.class) GUI.drawImage(PixelTanks.images.menus.classTab, 1112, 816, 88, 88, 1, 0, 0, 0, 0, undefined, key[PixelTanks.userData.class][0], key[PixelTanks.userData.class][1], 44, 44);
          if (PixelTanks.userData.cosmetic_body) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic_body], 760, 224, 80, 80, 1);
          if (PixelTanks.userData.cosmetic) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic], 760, 224, 80, 80, 1);
          if (PixelTanks.userData.cosmetic_hat) GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetic_hat], 760, 224, 80, 80, 1);
          const deathEffectData = PixelTanks.images.deathEffects[PixelTanks.userData.deathEffect+'_'];
          if (PixelTanks.userData.deathEffect) GUI.drawImage(PixelTanks.images.deathEffects[PixelTanks.userData.deathEffect], 536, 224, 80, 80, 1, 0, 0, 0, 0, undefined, (Math.floor((Date.now()-this.time)/deathEffectData.speed)%deathEffectData.frames)*200, 0, 200, 200);
          Menus.menus.inventory.buttonEffect = true;
          if (this.healthTab || this.classTab || this.itemTab || this.cosmeticTab || this.deathEffectsTab) {
            Menus.menus.inventory.buttonEffect = false;
            GUI.drawImage(PixelTanks.images.blocks.void, 0, 0, 1600, 1600, .7);
          }
          if (this.classTab) {
            GUI.drawImage(PixelTanks.images.menus.classTab, 688, 334, 224, 332, 1);
            GUI.draw.strokeStyle = '#FFFF00';
            GUI.draw.lineWidth = 10;
            if (PixelTanks.userData.class === 'tactical') GUI.draw.strokeRect(701, 348, 88, 88); else if (PixelTanks.userData.class === 'fire') GUI.draw.strokeRect(701, 456, 88, 88); else if (PixelTanks.userData.class === 'medic') GUI.draw.strokeRect(701, 565, 88, 88); else if (PixelTanks.userData.class === 'stealth') GUI.draw.strokeRect(814, 348, 88, 88); else if (PixelTanks.userData.class === 'builder') GUI.draw.strokeRect(814, 456, 88, 88); else if (PixelTanks.userData.class === 'warrior') GUI.draw.strokeRect(814, 565, 88, 88);
          } else if (this.itemTab) {
            GUI.drawImage(PixelTanks.images.menus.itemTab, 580, 334, 440, 332, 1);
            const key = {airstrike: [600, 354], super_glu: [708, 354], duck_tape: [816, 354], shield: [924, 354], flashbang: [600, 462], bomb: [708, 462], dynamite: [816, 462], usb: [924, 462], weak: [600, 570], strong: [708, 570], spike: [816, 570], reflector: [904, 570]};
            for (const item in key) GUI.drawImage(PixelTanks.images.items[item], key[item][0], key[item][1], 80, 80, 1);
          } else if (this.cosmeticTab) {
            const a = this.cosmeticMenu === 0, b = this.cosmeticMenu === Math.floor(PixelTanks.userData.cosmetics.length/16);
            GUI.drawImage(PixelTanks.images.menus.cosmeticTab, 518+(a ? 62 : 0), 280, 564-(a ? 62 : 0)-(b ? 62 : 0), 440, 1, 0, 0, 0, 0, undefined, (a ? 31 : 0), 0, 282-(a ? 31 : 0)-(b ? 31 : 0), 220);
            for (let i = this.cosmeticMenu*16; i < Math.min((this.cosmeticMenu+1)*16, PixelTanks.userData.cosmetics.length); i++) {
              try {
                GUI.drawImage(PixelTanks.images.cosmetics[PixelTanks.userData.cosmetics[i]], 598+(i%4)*108, 298+Math.floor((i%16)/4)*108, 88, 88, 1);
              } catch(e) {
                GUI.draw.fillStyle = '#FF0000';
                GUI.draw.fillRect(598+(i%4)*108, 298+Math.floor((i%16)/4)*108, 88, 88);
              }
              if (PixelTanks.userData.cosmetics[i] === PixelTanks.userData.cosmetic) {
                GUI.draw.strokeStyle = '#FFFF22';
                GUI.draw.lineWidth = 10;
                GUI.draw.strokeRect(598+(i%4)*108, 298+Math.floor((i%16)/4)*108, 88, 88);
              }
            }
          } else if (this.deathEffectsTab) {
            const a = this.deathEffectsMenu === 0, b = this.deathEffectsMenu === Math.floor(PixelTanks.userData.deathEffects.length/16);
            GUI.drawImage(PixelTanks.images.menus.deathEffectsTab, 518+(a ? 62 : 0), 280, 564-(a ? 62 : 0)-(b ? 62 : 0), 440, 1, 0, 0, 0, 0, undefined, (a ? 31 : 0), 0, 282-(a ? 31 : 0)-(b ? 31 : 0), 220);
            for (let i = this.deathEffectsMenu*16; i < Math.min((this.deathEffectsMenu+1)*16, PixelTanks.userData.deathEffects.length); i++) {
              const d = PixelTanks.images.deathEffects[PixelTanks.userData.deathEffects[i]+'_'];
              GUI.drawImage(PixelTanks.images.deathEffects[PixelTanks.userData.deathEffects[i]], 598+(i%4)*108, 298+Math.floor((i%16)/4)*108, 88, 88, 1, 0, 0, 0, 0, undefined, (Math.floor((Date.now()-this.time)/d.speed)%d.frames)*200, 0, 200, 200);
              if (PixelTanks.userData.deathEffects[i] === PixelTanks.userData.deathEffect) {
                GUI.draw.strokeStyle = 0xffff22;
                GUI.draw.lineWidth = 10;
                GUI.draw.strokeRect(598+(i%4)*108, 298+Math.floor((i%16)/4)*108, 88, 88);
              }
            }
          }
        },
      },
      shop: {
        buttons: [
          [416, 20, 108, 108, 'main', true],
          [232, 208, 488, 96, function() {/* class tab */}, true],
          [880, 208, 488, 96, function() {/* ded tab */}, true],
          [496, 404, 176, 176, function() {PixelTanks.purchase(0)}, true],
          [712, 404, 176, 176, function() {PixelTanks.purchase(1)}, true],
          [928, 404, 176, 176, function() {PixelTanks.purchase(4)}, true],
          [496, 620, 176, 176, function() {PixelTanks.purchase(2)}, true],
          [712, 620, 176, 176, function() {PixelTanks.purchase(5)}, true],
          [928, 620, 176, 176, function() {PixelTanks.purchase(3)}, true],
        ],
        listeners: {},
        cdraw: function() {
          GUI.drawText(PixelTanks.userData.stats[0]+' coinage', 800, 350, 50, 0x000000, 0.5);
        },
      },
      pause: {
        buttons: [[128, 910, 1460, 76, function() {
          this.paused = false;
          PixelTanks.user.player.implode();
          Menus.trigger('main');
          this.multiplayer = undefined;
        }, true]],
        listeners: {},
        cdraw: () => {},
      },
    }
    
      for (const m in Menus.menus) Menus.menus[m] = new Menu(Menus.menus[m], m);
    }
    document.head.appendChild(config);
    PixelTanks.socket = new MegaSocket(window.location.protocol === 'https:' ? 'wss://'+window.location.hostname : 'ws://141.148.128.231', {keepAlive: true, reconnect: true, autoconnect: true});
  }

  static launch() {  
    setTimeout(() => Menus.trigger('start'), 200);
  }

  static save() {
    PixelTanks.playerData['pixel-tanks'] = PixelTanks.userData;
    Network.update('playerdata', JSON.stringify(PixelTanks.playerData));
  }

  static getData(callback) {
      Network.get(data => {
        try {
          PixelTanks.playerData = JSON.parse(data.playerdata);
        } catch(e) {
          PixelTanks.playerData = data.playerdata;
        }
        PixelTanks.userData = PixelTanks.playerData['pixel-tanks'];
        if (!PixelTanks.userData) {
          PixelTanks.userData = {
            username: PixelTanks.user.username,
            class: '',
            cosmetic: '',
            cosmetics: [],
            deathEffect: '',
            deathEffects: [],
            color: '#ffffff',
            stats: [
              1000000, // coins
              0, // crates
              1, // level
              0, // xp
              20, // rank
            ],
            classes: [
              false, // tactical
              false, // stealth
              false, // warrior
              false, // medic
              false, // builder
              false, // fire
            ],
            items: ['duck_tape', 'weak', 'bomb', 'flashbang'],
            keybinds: {
              items: [49, 50, 51, 52],
            },
          };
        }
        clearInterval(PixelTanks.autosave);
        PixelTanks.autosave = setInterval(() => PixelTanks.save(), 5000);
        callback();
      });
  }

  static auth(u, p, t) {
    Network.auth(u, p, t, () => PixelTanks.getData(() => Menus.trigger(t === 'login' ? 'main' : 'htp1')));
  }

  static switchTab(id, n) {
    if (!Menus.menus.inventory.healthTab && !Menus.menus.inventory.classTab && !Menus.menus.inventory.itemTab && !Menus.menus.inventory.cosmeticTab) Menus.menus.inventory[id] = true;
    if (n) Menus.menus.inventory.currentItem = n;
    Menus.redraw();
  } // OPTIMIZE
  
  static openCrate(type) {
    const price = type ? 5 : 1, name = type ? 'deathEffects' : 'cosmetics', rand = Math.floor(Math.random()*1001), crate = [{
      common: ['Spooked', 'Cute Eyes', 'America', 'Army', 'UnionJack', 'SKOTTISH', 'X', 'Red Hoodie', 'Devil Wings', 'Devil Horns', 'Exclaimation Point', 'Orange Hoodie', 'Gold Shield', 'Yellow Hoodie', 'Green Hoodie', 'Leaf', 'Blue Hoodie', 'Purple Hoodie', 'Purple Flower', 'Boost', 'Cancelled', 'Spirals', 'Laff', 'Speaker', 'Spikes', 'Bat Wings', 'Christmas Tree', 'Candy Cane', 'Pumpkin Face', 'Top Hat', 'Mask', 'Purple-Pink Hoodie', 'Bunny Ears', 'Red Ghost', 'Blue Ghost', 'Pink Ghost', 'Orange Ghost'],
      uncommon: ['Angry Eyes', 'Hard Hat', 'Present', 'Dead', 'Apple', 'Pumpkin', 'Basketball', 'Banana', 'Pickle', 'Blueberry', 'Eggplant', 'Peace', 'Question Mark', 'Small Scratch', 'Kill = Ban', 'Headphones', 'Reindeer Hat', 'Pumpkin Hat', 'Cat Ears', 'Cake', 'Cat Hat', 'First Aid', 'Fisher Hat'],
      rare: ['Stripes', 'Peashooter', 'Box', 'Straw Hat', 'Hax', 'Tools', 'Money Eyes', 'Dizzy', 'Checkmark', 'Sweat', 'Scared', 'Blue Tint', 'Purple Top Hat', 'Purple Grad Hat', 'Eyebrows', 'Helment', 'Rudolph', 'Candy Corn', 'Flag', 'Swords'],
      epic: ['Locked', 'Elf', 'Triple Gun', 'Black', 'Evil Eyes', 'Gold', 'Rage', 'Onfire', 'Halo', 'Police', 'Deep Scratch', 'Back Button', 'Controller', 'Assassin', 'Astronaut', 'Christmas Lights', 'No Mercy', 'Error'],
      legendary: ['Sun Roof', 'Blind', 'Lego', 'Redsus', 'Uno Reverse', 'Christmas Hat', 'Mini Tank', 'Paleontologist', 'Yellow Pizza'],
      mythic: ['Terminator', 'MLG Glasses'],
    }, {
      common: ['erase', 'explode', 'nuke', 'evan'], //bruh why am i common :(
      uncommon: ['ghost', 'anvil', 'insta', 'knight', 'gameover'],
      rare: ['amogus', 'minecraft', 'magic', 'plant'],
      epic: ['wakawaka', 'battery', 'fix'],
      legendary: ['error', 'enderman', 'mechagodzilla'],
      mythic: ['clicked', 'cat'],
    }];
    let rarity;
    if (rand < 1) { // .1%
      rarity = 'mythic';
    } else if (rand < 10) { // .9%
      rarity = 'legendary';
    } else if (rand < 50) { // 4%
      rarity = 'epic';
    } else if (rand < 150) { // 10%
      rarity = 'rare';
    } else if (rand < 300) { // 15%
      rarity = 'uncommon';
    } else { // 70%
      rarity = 'common'; 
    }
    if (PixelTanks.userData.stats[1] < price) return alert('Your broke boi!');
    PixelTanks.userData.stats[1] -= price; 
    let number = Math.floor(Math.random()*(crate[type][rarity].length)), item;
    for (const e in this.images[name]) if (e === crate[type][rarity][number]) item = this.images[name][e];
    if (item === undefined) document.write('Game Crash!<br>Crashed while trying to give you cosmetic id "'+crate[type][rarity][number]+'". Report this to cs641311, bradley, or Celestial.');
    Menus.removeListeners();
    const start = Date.now(), render = setInterval(function() {
      GUI.clear();
      if (type) GUI.drawImage(item, 600, 400, 400, 400, 1, 0, 0, 0, 0, undefined, (Math.floor((Date.now()-start)/PixelTanks.images[name][crate[type][rarity][number]+'_'].speed)%PixelTanks.images[name][crate[type][rarity][number]+'_'].frames)*200, 0, 200, 200);
      if (!type) GUI.drawImage(item, 600, 400, 400, 400, 1);
      GUI.drawText('You Got', 800, 200, 100, '#ffffff', 0.5);
      GUI.drawText(crate[type][rarity][number], 800, 800, 50, '#ffffff', 0.5);
      GUI.drawText(rarity, 800, 900, 30, {mythic: '#FF0000', legendary: '#FFFF00', epic: '#A020F0', rare: '#0000FF', uncommon: '#32CD32', common: '#FFFFFF'}[rarity], 0.5);
    }, 15); // use built in menus renderer instead?
    setTimeout(() => {
      clearInterval(render);
      Menus.trigger('crate');
    }, 250);
    PixelTanks.userData[name].push(crate[type][rarity][number]);
    PixelTanks.save();
  }

  static upgrade() {
    const coins = PixelTanks.userData.stats[0], xp = PixelTanks.userData.stats[3], rank = PixelTanks.userData.stats[4];
    if (coins < (rank+1)*1000 || xp < (rank+1)*100) return alert('Your broke boi!');
    if (rank >= 20) return alert('You are max level!');
    PixelTanks.userData.stats[0] -= (rank+1)*1000;
    PixelTanks.userData.stats[3] -= (rank+1)*100;
    PixelTanks.userData.stats[4]++;
    PixelTanks.save();
    alert('You Leveled Up to '+(rank+1));
  }

  static renderBottom(x, y, s, color, a=0) {
    GUI.draw.translate(x+40/80*s, y+40/80*s);
    GUI.draw.rotate(a*Math.PI/180);
    GUI.draw.fillStyle = color;
    GUI.draw.beginPath();
    GUI.draw.moveTo(-20/80*s, -32/80*s);
    GUI.draw.lineTo(20/80*s, -32/80*s);
    GUI.draw.lineTo(20/80*s, 32/80*s);
    GUI.draw.lineTo(-20/80*s, 32/80*s); 
    GUI.draw.lineTo(-20/80*s, -32/80*s);
    GUI.draw.fill();
    GUI.draw.rotate(-a*Math.PI/180);
    GUI.draw.translate(-x-40/80*s, -y-40/80*s);
  }

  static renderTop(x, y, s, color, a=0, p=0) {
    GUI.draw.translate(x+40/80*s, y+40/80*s);
    GUI.draw.rotate(a*Math.PI/180);
    GUI.draw.fillStyle = color;
    GUI.draw.beginPath();
    GUI.draw.moveTo(-11/80*s, p+48/80*s);
    GUI.draw.lineTo(-11/80*s, p+28/80*s);
    GUI.draw.lineTo(-16/80*s, p+28/80*s);
    GUI.draw.lineTo(-27/80*s, p+17/80*s);
    GUI.draw.lineTo(-27/80*s, p-16/80*s);
    GUI.draw.lineTo(-16/80*s, p-27/80*s);
    GUI.draw.lineTo(17/80*s, p-27/80*s);
    GUI.draw.lineTo(28/80*s, p-16/80*s);
    GUI.draw.lineTo(28/80*s, p+17/80*s);
    GUI.draw.lineTo(17/80*s, p+28/80*s);
    GUI.draw.lineTo(12/80*s, p+28/80*s);
    GUI.draw.lineTo(12/80*s, p+48/80*s);
    GUI.draw.lineTo(-11/80*s, p+48/80*s);
    GUI.draw.fill();
    GUI.draw.rotate(-a*Math.PI/180);
    GUI.draw.translate(-x-40/80*s, -y-40/80*s);
  }

  static purchase(stat) {
    // since u can like only buy classes the number relates to the index of the true/false value in the PixelTanks.userData.classes to determine whether you have it or not
    const prices = [
      70000, // tactical
      30000, // stealth
      80000, // warrior
      40000, // medic
      60000, // builder
      90000, // fire
    ];
    if (PixelTanks.userData.classes[stat]) return alert('You already bought this.');
    if (PixelTanks.userData.stats[0] < prices[stat]) return alert('Your brok boi.');
    PixelTanks.userData.stats[0] -= prices[stat];
    PixelTanks.userData.classes[stat] = true;
  }
}
