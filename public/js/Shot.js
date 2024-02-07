class Shot {
  static settings = {damage: {bullet: 20, shotgun: 20, grapple: 10, powermissle: 100, megamissle: 200, healmissle: -150, dynamite: 0, fire: 0, usb: 0}, speed: {bullet: 6, shotgun: 4.8, grapple: 12, powermissle: 9, megamissle: 9, healmissle: 9, dynamite: 4.8, fire: 5.4, usb: 4.8}, size: {healmissle: 99, powermissle: 50, megamissle: 100}};
  static args = ['x', 'y', 'r', 'type', 'team', 'rank', 'host'];
  static raw = ['team', 'r', 'type', 'x', 'y', 'sx', 'sy', 'id'];
  constructor() {
    for (const p of Shot.raw) Object.defineProperty(this, p, {get: () => this.raw[p], set: v => this.setValue(p, v), configurable: true});
    this.cells = new Set();
  }
  init(x, y, r, type, team, rank, host) {
    for (const i in Shot.args) this[Shot.args[i]] = arguments[i];
    this.e = Date.now();
    this.id = Math.random();
    this.md = this.damage = Shot.settings.damage[type]*(rank*10+300)/500;
    this.x = this.sx = (this.xm = Math.cos(r)*Shot.settings.speed[type])*11.66;
    this.y = this.sy = (this.ym = Math.sin(r)*Shot.settings.speed[type])*11.66;
    for (let x = Math.max(0, Math.min(29, Math.floor(this.x/100)); x <= Math.max(0, Math.min(29, Math.floor((this.x+10)/100))); x++) {
      for (let y = Math.max(0, Math.min(29, Math.floor(this.y/100)); y <= Math.max(0, Math.min(29, Math.floor((this.y+10)/100))); y++) {
        host.cells[x][y].add(this);
        this.cells.add(x+'x'+y);
      }
    }
    return this;
  }
  collide(e) {
    let size = Shot.settings.size[this.type], o = size/2+10, isBlock = e instanceof Block, pullGrapple = isBlock || !e;
    if (size) this.host.d.push(new Damage(this.x-o, this.y-o, size, size, this.damage, this.team, this.host)); // damage change to square hitbox?
    if (this.type === 'dynamite' || this.type === 'usb' || this.type === 'grapple') {
      const g = pullGrapple ? this.host.pt.find(t => t.username === Engine.getUsername(this.team)) : e;
      this.target = g;
      this.offset = [g.x-this.x, g.y-this.y];
      this.update = pullGrapple ? () => {} : this.dynaUpdate;
      if (this.type === 'grapple') {
        if (g.grapple) g.grapple.bullet.destroy();
        g.grapple = {target: pullGrapple ? {x: e.x, y: e.y} : this.host.pt.find(t => t.username === Engine.getUsername(this.team)), bullet: this};
      }
      return false;
    } else if (this.type === 'fire') {
      if (isBlock) return this.host.b.push(A.template('Block').init(e.x, e.y, Infinity, 'fire', this.team, this.host));
      if (e.immune) return true;
      e.fire = {team: this.team, time: Date.now(), frame: 0}; // FIRE TEMP FIX static frame
      return true;
    } else if (this.type === 'bullet') {
    } else if (this.type === 'shotgun') {
    }
  }
  collision() {
    /*Hit Priority
    Grapple:
    1.) Enemy players
    2.) Friendly players
    3.) Blocks
    4.) AI(team irrelevant)
    5.) World Border

    Bullets:
    1.) Blocks
    2.) AI enemies
    3.) Player enemies
    4.) Player friends
    5.) AI friends
    6.) World Border

    Missles:
    doesn't matter
    */
    if (this.x < 0 || this.x > 3000 || this.y < 0 || this.y > 3000) {
      if (this.type === 'grapple') {
        const t = host.pt.find(t => t.username === Engine.getUsername(this.team));
        if (t.grapple) t.grapple.bullet.destroy();
        t.grapple = { target: { x: x, y: y }, bullet: this };
        this.update = () => {};
        return false;
      } else if (type === 'dynamite') {
        this.update = () => {}
        return false;
      } else {
        if (Shot.settings.size[type]) host.d.push(new Damage(x - Shot.settings.size[type] / 2 + 10, y - Shot.settings.size[type] / 2 + 10, Shot.settings.size[type], Shot.settings.size[type], this.damage, this.team, host));
        return true;
      }
    }
    for (const cell of cells) { 
      const [cx, cy] = cell.split('x');
      for (const e of host.cells[cx][cy]) {
        if (e instanceof Tank) {
          if (e.ded || !Engine.collision(x, y, 10, 10, e.x, e.y, 80, 80)) continue;
          if (type === 'grapple') {
            if (e.grapple) e.grapple.bullet.destroy();
            e.grapple = {target: host.pt.find(tank => tank.username === Engine.getUsername(this.team)), bullet: this};
            this.target = e;
            this.offset = [e.x-x, e.y-y];
            this.update = this.dynaUpdate;
            return false;
          } else if (type === 'dynamite' || type === 'usb') {
            this.target = e;
            this.offset = [e.x-x, e.y-y];
            this.update = this.dynaUpdate;
            if (type === 'usb') setTimeout(() => this.destroy(), 20000);
            return false;
          } else if (type === 'fire') {
            if (e.immune) return true;
            if (e.fire) clearTimeout(e.fireTimeout);
            e.fire = { team: this.team, frame: e.fire?.frame || 0 };
            e.fireInterval ??= setInterval(() => e.fire.frame ^= 1, 50); // OPTIMIZE make gui effects render by date time not by server interval
            e.fireTimeout = setTimeout(() => {
              clearInterval(e.fireInterval);
              e.fire = false;
            }, 4000);
            return true;
          } else {
            if (Shot.settings.size[type]) {
              host.d.push(new Damage(x - Shot.settings.size[type] / 2 + 10, y - Shot.settings.size[type] / 2 + 10, Shot.settings.size[type], Shot.settings.size[type], this.damage, this.team, host));
            } else if (Engine.getTeam(e.team) !== Engine.getTeam(this.team)) {
              e.damageCalc(x, y, this.damage, Engine.getUsername(this.team));
            }
            return true;
          }
        } else if (e instanceof Block) {
          if (!e.c || !Engine.collision(e.x, e.y, 100, 100, x, y, 10, 10)) continue;
          if (type === 'grapple' || type === 'dynamite') {
            if (type === 'grapple') {
              const t = this.host.pt.find(t => t.username === Engine.getUsername(this.team));
              if (t.grapple) t.grapple.bullet.destroy();
              t.grapple = {target: e, bullet: this}
            }
            this.update = () => {};
            return false;
          } else {
            if (type === 'fire') host.b.push(A.template('Block').init(e.x, e.y, Infinity, 'fire', this.team, host));
            if (Shot.settings.size[type]) {
              host.d.push(new Damage(x - Shot.settings.size[type] / 2 + 10, y - Shot.settings.size[type] / 2 + 10, Shot.settings.size[type], Shot.settings.size[type], this.damage, this.team, host));
            } else if (type !== 'fire') {
              e.damage(this.damage);
            }
            return true;
          }
        } else if (e instanceof AI) {
          if (!Engine.collision(x, y, 10, 10, e.x, e.y, 80, 80)) continue;
          if (type === 'dynamite' || type === 'usb') {
            this.target = e;
            this.offset = [e.x-x, e.y-y];
            this.update = this.dynaUpdate;
            if (type === 'usb') setTimeout(() => this.destroy(), 15000);
            return false;
          } else if (type === 'fire') {
            if (e.fire) clearTimeout(e.fireTimeout);
            e.fire = {team: this.team, frame: e.fire?.frame || 0};
            e.fireInterval ??= setInterval(() => e.fire.frame ^= 1, 50);
            e.fireTimeout = setTimeout(() => {
              clearInterval(e.fireInterval);
              e.fire = false;
            }, 4000);
            return true;
          } else {
            if (Shot.settings.size[type]) {
              host.d.push(new Damage(x - Shot.settings.size[type] / 2 + 10, y - Shot.settings.size[type] / 2 + 10, Shot.settings.size[type], Shot.settings.size[type], this.damage, this.team, host));
            } else if (Engine.getTeam(e.team) !== Engine.getTeam(this.team)) {
              e.damageCalc(x, y, this.damage, Engine.getUsername(this.team));
            }
            return true;
          }
        }
      }
    }
    return false;
  }

  dynaUpdate() {
    this.oldx = this.x;
    this.oldy = this.y;
    this.x = this.target.x - this.offset[0];
    this.y = this.target.y - this.offset[1];
    this.cellUpdate();
    this.u();
    if (this.target.ded) this.destroy();
    if (this.host.pt.find(t => t.username === Engine.getUsername(this.team))?.ded) this.destroy();
  }

  cellUpdate() {
    if (Math.floor(this.oldx/100) !== Math.floor(this.x/100) || Math.floor(this.oldy/100) !== Math.floor(this.y/100) || Math.floor((this.oldx+10)/100) !== Math.floor((this.x+10)/100) || Math.floor((this.oldy+10)/100) !== Math.floor((this.y+10)/100)) { 
      const cells = new Set();
      for (let dx = this.x/100, dy = this.y/100, i = 0; i < 4; i++) {
        const cx = Math.max(0, Math.min(29, Math.floor(i < 2 ? dx : dx + .09))), cy = Math.max(0, Math.min(29, Math.floor(i % 2 ? dy : dy + .09)));
        this.host.cells[cx][cy].add(this);
        cells.add(cx+'x'+cy);
      }
      for (const cell of [...this.cells].filter(c => !cells.has(c))) {
        const [x, y] = cell.split('x');
        this.host.cells[x][y].delete(this);
      }
      this.cells = cells;
    }
  }

  update() {
    const time = Math.floor((Date.now()-this.e)/5);
    this.oldx = this.x;
    this.oldy = this.y;
    this.x = time*this.xm+this.sx;
    this.y = time*this.ym+this.sy;
    this.cellUpdate();
    if (this.collision()) this.destroy();
    if (this.type === 'shotgun') {
      this.d = Math.sqrt((this.x - this.sx) ** 2 + (this.y - this.sy) ** 2);
      this.damage = this.md - (this.d / 300) * this.md;  
      if (this.d >= 300) this.destroy();
    } else if (this.type === 'dynamite') this.r += 5;
    this.u();
  }

  setValue(p, v) {
    this.updatedLast = Date.now();
    this.raw[p] = v;
  }

  destroy() {
    this.host.s.splice(this.host.s.indexOf(this), 1);
    for (const cell of this.cells) {
      const [x, y] = cell.split('x');
      this.host.cells[x][y].delete(this);
    }
  }
}
