/* ── VOXEL CA — separate volumetric automaton, pure JS ─────────── */
import { state, digitsToMask } from './state.js';

const MOORE_OFFSETS = (() => {
  const o = [];
  for (let dz = -1; dz <= 1; dz++)
  for (let dy = -1; dy <= 1; dy++)
  for (let dx = -1; dx <= 1; dx++)
    if (dx || dy || dz) o.push(dx, dy, dz);
  return o;
})();
const VN_OFFSETS = [1,0,0, -1,0,0, 0,1,0, 0,-1,0, 0,0,1, 0,0,-1];

export class Voxel3D {
  constructor(n){
    this.n = n;
    this.cells = new Uint8Array(n * n * n);
    this.next  = new Uint8Array(n * n * n);
    this.age   = new Uint16Array(n * n * n);
    /* long-exposure history (3D mirror of the 2D accum texture):
       born = gen current life started, lastVisit = gen last alive,
       visitCnt = lifetimes lived (0 = never visited → no ghost) */
    this.born      = new Uint32Array(n * n * n);
    this.lastVisit = new Uint32Array(n * n * n);
    this.visitCnt  = new Uint16Array(n * n * n);
    this.gen = 0; this.pop = 0;
  }
  randomFill(density){
    this.cells.fill(0); this.age.fill(0);
    this.born.fill(0); this.lastVisit.fill(0); this.visitCnt.fill(0);
    const n = this.n, n2 = n * n, lo = Math.floor(n * 0.3), hi = Math.ceil(n * 0.7);
    let pop = 0;
    for (let z = lo; z < hi; z++)
    for (let y = lo; y < hi; y++)
    for (let x = lo; x < hi; x++){
      if (Math.random() < density){
        const i = z * n2 + y * n + x;
        this.cells[i] = 1; this.age[i] = 1; this.visitCnt[i] = 1; pop++;
      }
    }
    this.gen = 0; this.pop = pop;
  }
  clear(){
    this.cells.fill(0); this.age.fill(0);
    this.born.fill(0); this.lastVisit.fill(0); this.visitCnt.fill(0);
    this.gen = 0; this.pop = 0;
  }
  resetExposure(){
    const c = this.cells;
    for (let i = 0; i < c.length; i++){
      this.born[i] = 0; this.lastVisit[i] = 0;
      this.visitCnt[i] = c[i] ? 1 : 0;
    }
    this.gen = 0;
  }
  step(){
    const n = this.n, n2 = n * n, c = this.cells, nx = this.next, age = this.age;
    const bMask = digitsToMask(state.birth3d), sMask = digitsToMask(state.survive3d);
    const offs = state.nb3d === 'vn' ? VN_OFFSETS : MOORE_OFFSETS;
    const wrap = state.wrap, g1 = this.gen + 1;
    let pop = 0;
    for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++){
      const row = z * n2 + y * n;
      for (let x = 0; x < n; x++){
        let cnt = 0;
        for (let k = 0; k < offs.length; k += 3){
          let px = x + offs[k], py = y + offs[k+1], pz = z + offs[k+2];
          if (wrap){
            px = px < 0 ? n - 1 : (px >= n ? 0 : px);
            py = py < 0 ? n - 1 : (py >= n ? 0 : py);
            pz = pz < 0 ? n - 1 : (pz >= n ? 0 : pz);
          } else if (px < 0 || py < 0 || pz < 0 || px >= n || py >= n || pz >= n) continue;
          cnt += c[pz * n2 + py * n + px];
        }
        const i = row + x, alive = c[i];
        const na = alive ? ((sMask >>> cnt) & 1) : ((bMask >>> cnt) & 1);
        nx[i] = na;
        age[i] = na ? (alive ? Math.min(age[i] + 1, 65535) : 1) : 0;
        if (na){
          this.lastVisit[i] = g1;
          if (!alive){
            this.born[i] = g1;
            if (this.visitCnt[i] < 65535) this.visitCnt[i]++;
          }
        }
        pop += na;
      }
    }
    this.cells = nx; this.next = c;
    this.pop = pop; this.gen++;
  }
}
