class Shot {
  static settings = {bullet: [20, 6], shotgun: [20, 4.8], grapple: [0, 12], powermissle: [100, 9, 50], megamissle: [200, 9, 100], healmissle: [-150, 9, 99]};
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
    this.md = this.damage = Shot.settings[this.type][0]*(rank*10+300)/500;
    this.x = this.sx = (this.xm = Math.cos(r)*Shot.settings[this.type][1])*11.66;
    this.y = this.sy = (this.ym = Math.sin(r)*Shot.settings[this.type][1])*11.66;
    for (let x = Math.max(0, Math.min(29, Math.floor(this.x/100)); x <= Math.max(0, Math.min(29, Math.floor((this.x+10)/100))); x++) {
      for (let y = Math.max(0, Math.min(29, Math.floor(this.y/100)); y <= Math.max(0, Math.min(29, Math.floor((this.y+10)/100))); y++) {
        host.cells[x][y].add(this);
        this.cells.add(x+'x'+y);
      }
    }
    return this;
  }
  collide(e) {
    let size = Shot.settings[this.type][2], o = size/2+10, isBlock = e instanceof Block, pullGrapple = (isBlock || !e) && this.type === 'grapple';
    if (size) this.host.d.push(new Damage(this.x-o, this.y-o, size, size, this.damage, this.team, this.host)); // damage change to square instead of rect hitbox?
    if (this.type === 'dynamite' || this.type === 'usb' || this.type === 'grapple') {
      const g = pullGrapple ? this.host.pt.find(t => t.username === Engine.getUsername(this.team)) : e;
      this.target = g;
      this.offset = [g.x-this.x, g.y-this.y];
      if (pullGrapple) this.update = () => {};
      if (this.type === 'grapple') {
        if (g.grapple) g.grapple.bullet.destroy();
        g.grapple = {target: pullGrapple ? {x: e.x, y: e.y} : this.host.pt.find(t => t.username === Engine.getUsername(this.team)), bullet: this};
      }
      return false;
    } else if (this.type === 'fire') {
      if (isBlock) return this.host.b.push(A.template('Block').init(e.x, e.y, Infinity, 'fire', this.team, this.host));
      if (!e.immune) e.fire = {team: this.team, time: Date.now()};
    } else if (size) {
      this.host.d.push(new Damage(x-o, y-o, size, size, this.damage, this.team, this.host));
    } else if (Engine.getTeam(e.team) !== Engine.getTeam(this.team) && e) {
      if (isBlock) e.damage(this.damage); else e.damageCalc(this.x, this.y, this.damage, Engine.getUsername(this.team));
    }
    return true;
  }
  collision() {
    if (this.x < 0 || this.y < 0 || this.x > 3000 || this.y > 3000) this.collide();
    for (const cell of this.cells) {
      const c = cell.split('x');
      for (const e of [...this.host.cells[c[0]][c[1]]].sort(this.sorter)) {
        let size = e instanceof Block || e.role === 0 ? 100 : 80;
        if (!e.ded && !e.c && Engine.collision(this.x, this.y, 10, 10, e.x, e.y, size, size)) return this.collide(e);
      }
    }
    return false;
  }
  update() {
    this.oldx = this.x;
    this.oldy = this.y;
    const time = Math.floor((Date.now()-this.e)/5), x = this.target?.x || time*this.xm+this.sx, y = this.target?.y || time*this.ym+this.sy;
    let x1 = this.x
    if (0|(this.x/100) !== 0|(x/100) || 0|(this.y/100) !== 0|(y/100) || 0|((this.x+10)/100) !== 0|((x+10)/100) || 0|((this.y+10)/100) !== 0|((y+10)/100)) {
      for (let ) {
        
      }
    }
    this.x = x;
    this.y = y;
    
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
    if (this.collision() || (this.target && (this.target?.ded || this.host.pt.find(t => t.username === Engine.getUsername(this.team))?.ded))) this.destroy();
    if (this.type === 'shotgun') {
      this.d = Math.sqrt((this.x - this.sx) ** 2 + (this.y - this.sy) ** 2);
      this.damage = this.md - (this.d / 300) * this.md;  
      if (this.d >= 300) this.destroy();
    } else if (this.type === 'dynamite') this.r += 5;
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
