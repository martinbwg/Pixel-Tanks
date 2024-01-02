class Damage {
  constructor(x, y, w, h, a, team, host) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.a = a;
    this.team = team;
    this.host = host;
    this.raw = {};
    this.id = Math.random();
    this.f = 0;
// Spatial partitioning initialization - Quadtree
    this.quadTreeRef = host.quadtree.insert({ x: this.x, y: this.y, width: this.w, height: this.h, damage: this });
    const cache = new Set();
    // Removed old cell-based spatial management comment
    for (const e of entitiesInArea) { // Loop through entities
      const [cx, cy] = cell.split('x');
      for (const e of host.cells[cx][cy]) {
        if (cache.has(e.id)) continue;
        cache.add(e.id);
        if (e instanceof Tank) {
          if (Engine.getUsername(team) !== Engine.getUsername(e.team)) {
            if (Engine.collision(x, y, w, h, e.x, e.y, 80, 80)) e.damageCalc(x, y, Engine.getTeam(team) !== Engine.getTeam(e.team) ? Math.abs(a) : Math.min(a, 0), Engine.getUsername(team));
          }
        } else if (e instanceof Block) {
          if (Engine.collision(x, y, w, h, e.x, e.y, 100, 100)) e.damage(a);
        } else if (e instanceof AI) {
          if (Engine.collision(x, y, w, h, e.x, e.y, e.role === 0 ? 100 : 80, e.role === 0 ? 100 : 80)) e.damageCalc(e.x, e.y, Engine.getTeam(team) !== Engine.getTeam(e.team) ? Math.abs(a) : Math.min(a, 0), Engine.getUsername(team));
        }
      }
    }
    this.i = setInterval(() => {
      this.f++;
      this.u();
    }, 18);
    setTimeout(() => this.destroy(), 200);
  }
  
  u() {
    this.updatedLast = Date.now();
    for (const property of ['x', 'y', 'w', 'h', 'f', 'id']) this.raw[property] = this[property];
  }

  destroy() {
    clearInterval(this.i);
    this.host.quadtree.remove(this.quadTreeRef);
    const index = this.host.d.indexOf(this);
    if (index !== -1) {
      this.host.d.splice(index, 1);
    }
  }
}
if (module) module.exports = Damage;
