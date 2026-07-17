/* ── APP STATE (single source of truth for settings) ───────────── */
import { PALETTES } from './palettes.js';

export const state = {
  grid: 500,
  birth: [3], survive: [2,3],
  running: true,
  speed: 30,           // generations per second
  gen: 0,
  palette: PALETTES[0],
  bloom: true,
  bloomIntensity: 1.2,
  density: 0.15,
  ageSpan: 60.0,       // generations mapped across the palette gradient
  wrap: true,          // toroidal edge wrapping (2D + voxel)
  theme: 'dark',       // 'dark' | 'light' (paper — print ready)
  renderMode: 'history', // 'live' | 'history' (long-exposure accumulation)
  cellShape: 0,        // 0 square · 1 circle · 2 rounded · 3 diamond (WebGL only)
  viewMode: 'planar',  // 'planar' | 'torus' | 'sphere' | 'knot' | 'mobius' | 'blackhole' | 'terrain' | 'voxel'
  autoRotate: false,
  voxelN: 50,
  voxelOpacity: 1.0,
  voxelSize: 0.25,     // cube edge as fraction of cell pitch (gaps between cubes)
  birth3d: [4], survive3d: [5],
  nb3d: 'moore',       // 'moore' (26) | 'vn' (6)
  sliceAxis: 'y',
  slicePct: 100,
  terrainRelief: 1.0,  // height multiplier for the exposure-terrain mode
};

/* Feature gating hooks — flipped to 'premium' by the Gumroad unlock flow
   (sprint 3). Client-side only: real enforcement needs the Workers backend. */
export const FEATURES = { videoExport: 'free', noiseGenerator: 'free' };

export const digitsToMask = d => d.reduce((m,n) => m | (1 << n), 0);

/* Exposure terrain height: log-scaled visit count so early exposure doesn't
   saturate. Pure function (selftested). Returns 0..1. */
export function terrainHeight(cnt, maxCnt){
  if (!cnt || cnt <= 0) return 0;
  return Math.log1p(cnt) / Math.log1p(Math.max(maxCnt, 1));
}

/* 2D viewport pan/zoom (screen only — exports always render the full artwork).
   viewUV() → the uv window the color pass samples: uv = v_uv * s + offset */
export const VIEW2D = { z: 1, cx: 0.5, cy: 0.5 };
export function viewUV(){
  // identity outside planar: torus/sphere sample this render as a texture
  if (state.viewMode !== 'planar') return { s: 1, ox: 0, oy: 0 };
  const s = 1 / VIEW2D.z;
  return { s, ox: VIEW2D.cx - s / 2, oy: VIEW2D.cy - s / 2 };
}
export function clampView(){
  VIEW2D.z = Math.min(Math.max(VIEW2D.z, 1), 32);
  const h = 0.5 / VIEW2D.z;
  VIEW2D.cx = Math.min(Math.max(VIEW2D.cx, h), 1 - h);
  VIEW2D.cy = Math.min(Math.max(VIEW2D.cy, h), 1 - h);
  const lbl = document.getElementById('vbZoomLbl');
  if (lbl) lbl.textContent = VIEW2D.z > 1.001 ? VIEW2D.z.toFixed(1) + '×' : '';
}
