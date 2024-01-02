class Block {
  constructor(x, y, health, type, team, host) {
    this.x = x;
    this.y = y;
    this.maxHp = this.hp = health;
    this.type = type;
    this.host = host;
    this.team = team;
    this.raw = {};
    this.id = Math.random();
    this.s = false;
    this.c = !['fire', 'airstrike'].includes(type);
    if (type === 'fire' || type === 'airstrike') this.sd = setTimeout(() => this.destroy(), type === 'fire' ? 2500 : 6000);
    if (type === 'airstrike') {
      for (let i = 0; i < 80; i++) setTimeout(() => {
        if (this.host.b.includes(this)) this.host.d.push(new Damage(this.x + Math.floor(Math.random()*250)-50, this.y + Math.floor(Math.random()*250)-50, 100, 100, 50, this.team, this.host));
      }, 5000+Math.random()*500);
    }
    this.quadrant = host.quadtree.insert(this);
    this.u();
  }

  u() {
    this.updatedLast = Date.now();
    for (const property of ['x', 'y', 'maxHp', 'hp', 'type', 's', 'team', 'id']) this.raw[property] = this[property];
  }

  damage(d) {
    if (this.hp === Infinity) return;
    this.hp = Math.max(this.hp-Math.abs(d), 0);
    this.s = true;
    clearTimeout(this.bar);
    this.bar = setTimeout(() => {
      this.s = false;
      this.u();
    }, 3000);
    this.u();
    if (this.hp === 0) this.destroy();
  }

  destroy() {
    clearTimeout(this.sd);
    clearTimeout(this.bar);
    const index = this.host.b.indexOf(this);
    if (index !== -1) this.host.b.splice(index, 1);
    this.host.quadtree.remove(this.quadrant);
  }
}
if (module) module.exports = Block;
