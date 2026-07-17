/* ── TIMELINE SNAPSHOTS (2D modes) ─────────────────────────────── */
import { $ } from './util.js';
import { state } from './state.js';
import { engine } from './engine.js';
import { setRunning, refreshStats } from './app.js';

export const SNAP = { list: [], scrub: null, max: 120 };
export function snapEvery(){ return state.grid <= 500 ? 8 : (state.grid <= 1000 ? 20 : 0); }
export function resetSnapshots(){ SNAP.list = []; SNAP.scrub = null; updateHistoryUI(); }
export function maybeSnapshot(){
  const ev = snapEvery();
  if (!ev || state.gen === 0 || state.gen % ev) return;
  const last = SNAP.list[SNAP.list.length - 1];
  if (last && last.gen === state.gen) return;
  SNAP.list.push({ gen: state.gen, age: engine.readCells() });
  if (SNAP.list.length > SNAP.max) SNAP.list.shift();
  updateHistoryUI();
}
export function updateHistoryUI(){
  const r = $('histRange'), n = SNAP.list.length;
  r.max = Math.max(0, n - 1);
  r.disabled = n < 2;
  if (SNAP.scrub === null){
    r.value = r.max;
    $('histVal').textContent = n ? 'g' + SNAP.list[n - 1].gen : '—';
  }
}
export function restoreSnapshot(i){
  const s = SNAP.list[i];
  if (!s) return;
  setRunning(false);
  SNAP.scrub = i;
  engine.uploadAge(s.age, s.gen);
  state.gen = s.gen;
  $('histVal').textContent = 'g' + s.gen;
  refreshStats(true);
}
$('histRange').addEventListener('input', e => restoreSnapshot(+e.target.value));
