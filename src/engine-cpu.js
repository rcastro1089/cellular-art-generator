/* ── CANVAS 2D FALLBACK ENGINE ─────────────────────────────────── */
import { state, digitsToMask, coverUV } from './state.js';
import { activePal } from './palettes.js';
import { bestWindowOffset } from './util.js';

export class CPUEngine {
  constructor(canvas){
    this.name = 'Canvas2D';
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.n = 0;
    this.off = document.createElement('canvas');   // grid-resolution buffer
    this.offCtx = this.off.getContext('2d');
    this._pop = 0;
  }
  createGrid(n){
    this.n = n;
    this.cells = new Uint8Array(n * n);
    this.next  = new Uint8Array(n * n);
    this.age   = new Float32Array(n * n);
    this.trail = new Float32Array(n * n);
    this.accumGen = new Float32Array(n * n);   // long-exposure: gen of last visit
    this.accumCnt = new Uint16Array(n * n);    // long-exposure: visit count
    this.gen = 0;
    this.off.width = n; this.off.height = n;
    this.img = this.offCtx.createImageData(n, n);
    this._pop = 0;
  }
  uploadCells(cells){
    this.cells.set(cells);
    this.age.fill(0); this.trail.fill(0);
    let pop = 0;
    for (let i = 0; i < cells.length; i++){
      if (cells[i]){ this.age[i] = 1; this.trail[i] = 1; pop++; }
    }
    this._pop = pop;
    this.resetAccum();
  }
  uploadAge(age, gen){
    let pop = 0;
    for (let i = 0; i < age.length; i++){
      this.cells[i] = age[i] > 0 ? 1 : 0;
      this.age[i] = age[i];
      if (age[i]){ this.trail[i] = 1; pop++; }
    }
    this._pop = pop;
    this.gen = gen;
  }
  readCells(){
    const n = this.n, age = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++)
      age[i] = this.cells[i] ? Math.max(1, Math.min(255, this.age[i])) : 0;
    return age;
  }
  resetAccum(){
    this.accumGen.fill(0);
    this.accumCnt.fill(0);
    this.gen = 0;
  }
  readAccum(){ return { gen: this.accumGen, cnt: this.accumCnt }; }
  step(){
    const n = this.n, c = this.cells, nx = this.next, age = this.age, tr = this.trail;
    const bMask = digitsToMask(state.birth), sMask = digitsToMask(state.survive);
    const wrap = state.wrap;
    this.gen++;
    let pop = 0;
    for (let y = 0; y < n; y++){
      // -1 marks an out-of-bounds row/column when wrapping is off
      const up = y + 1 < n ? y + 1 : (wrap ? 0 : -1);
      const dn = y - 1 >= 0 ? y - 1 : (wrap ? n - 1 : -1);
      const yu = up < 0 ? -1 : up * n, yd = dn < 0 ? -1 : dn * n, y0 = y * n;
      for (let x = 0; x < n; x++){
        const xl = x - 1 >= 0 ? x - 1 : (wrap ? n - 1 : -1);
        const xr = x + 1 < n ? x + 1 : (wrap ? 0 : -1);
        let cnt = 0;
        if (yu >= 0){
          if (xl >= 0) cnt += c[yu+xl];
          cnt += c[yu+x];
          if (xr >= 0) cnt += c[yu+xr];
        }
        if (xl >= 0) cnt += c[y0+xl];
        if (xr >= 0) cnt += c[y0+xr];
        if (yd >= 0){
          if (xl >= 0) cnt += c[yd+xl];
          cnt += c[yd+x];
          if (xr >= 0) cnt += c[yd+xr];
        }
        const i = y0 + x;
        const alive = c[i] === 1;
        const nextAlive = alive ? ((sMask >> cnt) & 1) : ((bMask >> cnt) & 1);
        nx[i] = nextAlive;
        if (nextAlive){
          age[i] = alive ? age[i] + 1 : 1; tr[i] = 1; pop++;
          this.accumGen[i] = this.gen;
          if (this.accumCnt[i] < 65535) this.accumCnt[i]++;
        }
        else { age[i] = 0; tr[i] *= 0.90; }
      }
    }
    this.cells = nx; this.next = c;
    this._pop = pop;
  }
  paint(x, y, alive, radius){
    const n = this.n, r = radius | 0;
    for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++){
      const px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= n || py >= n) continue;
      const i = py * n + px;
      const was = this.cells[i];
      this.cells[i] = alive ? 1 : 0;
      this.age[i] = alive ? 1 : 0;
      this.trail[i] = alive ? 1 : this.trail[i];
      this._pop += (alive ? 1 : 0) - was;
    }
  }
  getCell(x, y){ return this.cells[y * this.n + x]; }
  population(){ return this._pop; }

  _drawGridBuffer(transparent){
    const n = this.n, d = this.img.data, p = activePal();
    const bg = p.bgRGB.map(v => v * 255);
    const stops = p.stopsRGB.map(c => c.map(v => v * 255));
    const ns = stops.length, span = state.ageSpan;
    const history = state.renderMode === 'history';
    const genN = Math.max(this.gen, 1);
    const pick = t => {
      const f = Math.min(Math.max(t, 0), 1) * (ns - 1);
      const k = Math.min(Math.floor(f), ns - 2), fr = f - k;
      return [stops[k][0] + (stops[k+1][0] - stops[k][0]) * fr,
              stops[k][1] + (stops[k+1][1] - stops[k][1]) * fr,
              stops[k][2] + (stops[k+1][2] - stops[k][2]) * fr];
    };
    for (let y = 0; y < n; y++){
      const rowTop = (n - 1 - y) * n;                 // flip: engine y-up → image top-down
      for (let x = 0; x < n; x++){
        const i = y * n + x, j = (rowTop + x) * 4;
        let col = null, a = 0;
        if (history){
          if (this.accumCnt[i]){
            col = pick(this.accumGen[i] / genN);
            a = Math.min(1, Math.max(0.3, this.accumCnt[i] / 24));
          }
          if (this.cells[i]){ col = pick(1); a = 1; }
        } else if (this.cells[i]){
          col = pick(this.age[i] / span); a = 1;
        } else if (this.trail[i] > 0.02){
          col = stops[0]; a = this.trail[i] * 0.30;
        }
        if (transparent){
          d[j] = col ? col[0] : 0; d[j+1] = col ? col[1] : 0; d[j+2] = col ? col[2] : 0;
          d[j+3] = a * 255;
        } else {
          d[j]   = col ? bg[0] + (col[0] - bg[0]) * a : bg[0];
          d[j+1] = col ? bg[1] + (col[1] - bg[1]) * a : bg[1];
          d[j+2] = col ? bg[2] + (col[2] - bg[2]) * a : bg[2];
          d[j+3] = 255;
        }
      }
    }
    this.offCtx.putImageData(this.img, 0, 0);
  }

  render(){
    this._drawGridBuffer();
    const W = this.canvas.width, H = this.canvas.height, ctx = this.ctx, n = this.n;
    // pan/zoom + cover-crop window in off-buffer coords (row 0 = grid y max)
    const c = coverUV(W, H);
    const sx = c.ox * n, sy = (1 - c.oy - c.sy) * n, sw = c.sx * n, sh = c.sy * n;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = `rgb(${activePal().bgRGB.map(v => v * 255 | 0).join(',')})`;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.off, sx, sy, sw, sh, 0, 0, W, H);
    if (state.bloom && !activePal().lightBg && 'filter' in ctx){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = `blur(${Math.max(4, H / 90)}px)`;
      ctx.globalAlpha = Math.min(1, state.bloomIntensity * 0.55);
      ctx.drawImage(this.off, sx, sy, sw, sh, 0, 0, W, H);
      ctx.restore();
    }
  }

  renderToPixels(w, h, fitMode = 'fit', transparent = false){
    this._drawGridBuffer(transparent);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const n = this.n;
    if (fitMode === 'fit'){
      // letterbox: full grid visible, centered
      const scale = Math.min(w / n, h / n);
      const dw = n * scale, dh = n * scale;
      if (!transparent){
        ctx.fillStyle = `rgb(${activePal().bgRGB.map(v => v * 255 | 0).join(',')})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.off, 0, 0, n, n, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      // fill: cover-crop (smart = densest window; engine y-up → image flip)
      let sx = 0, sy = 0, sw = n, sh = n;
      if (w > h){
        sh = n * h / w;
        const f = sh / n;
        const o = fitMode === 'smart' ? bestWindowOffset(this.cells, n, 1, f, 'y') : (1 - f) / 2;
        sy = (1 - o - f) * n;
      } else if (h > w){
        sw = n * w / h;
        const f = sw / n;
        sx = (fitMode === 'smart' ? bestWindowOffset(this.cells, n, 1, f, 'x') : (1 - f) / 2) * n;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.off, sx, sy, sw, sh, 0, 0, w, h);
    }
    const img = ctx.getImageData(0, 0, w, h);
    if (transparent) this._drawGridBuffer(false);   // restore opaque buffer for display
    return { data: img.data, w, h };
  }
  dispose(){}
}
