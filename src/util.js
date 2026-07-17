/* ── SMALL SHARED HELPERS (DOM + pure) ─────────────────────────── */
export const $ = id => document.getElementById(id);

let toastTimer;
export function toast(msg, cls){
  const t = $('toast');
  t.textContent = msg;
  t.className = 'show' + (cls ? ' ' + cls : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 2800);
}

/* Densest crop window: map = density samples (row-major, y-up), returns
   uv offset in [0, 1-frac] along the chosen axis. */
export function bestWindowOffset(map, R, stride, frac, axis){
  const sums = new Float64Array(R);
  for (let y = 0; y < R; y++)
    for (let x = 0; x < R; x++)
      sums[axis === 'y' ? y : x] += map[(y * R + x) * stride];
  const win = Math.max(1, Math.round(frac * R));
  let cur = 0;
  for (let i = 0; i < win && i < R; i++) cur += sums[i];
  let best = 0, bestSum = cur;
  for (let s = 1; s + win <= R; s++){
    cur += sums[s + win - 1] - sums[s - 1];
    if (cur > bestSum){ bestSum = cur; best = s; }
  }
  return Math.min(best / R, Math.max(0, 1 - frac));
}
