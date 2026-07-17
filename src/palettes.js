/* ── PALETTES ────────────────────────────────────────────────────
   Each: bg color + 2-5 stops. Live cells interpolate across stops
   by age (generations alive); dead cells leave a fading trail. */
import { state } from './state.js';

export const PALETTES = [
  { name:'Neon',       bg:'#05010d', stops:['#00f0ff','#ff00ea','#7b2ff7'] },
  { name:'Fire',       bg:'#0a0200', stops:['#ff2200','#ff8c00','#ffd900','#fff5c0'] },
  { name:'Matrix',     bg:'#010801', stops:['#00ff41','#00b32e','#0a4d14'] },
  { name:'Ocean',      bg:'#010b18', stops:['#00e5ff','#0090d4','#003d66'] },
  { name:'Gold',       bg:'#0d0800', stops:['#ffe680','#ffbf00','#8a5a00'] },
  { name:'Pastel',     bg:'#14121c', stops:['#ffb3d9','#d9b3ff','#b3d9ff'] },
  { name:'Monochrome', bg:'#050505', stops:['#ffffff','#aaaaaa','#4d4d4d'] },
  { name:'Alien',      bg:'#060010', stops:['#7cff00','#3ecf5a','#b400ff'] },
  { name:'Sunset',     bg:'#12041a', stops:['#ff6600','#ff2e88','#b13fff'] },
  { name:'Forest',     bg:'#071006', stops:['#9fe870','#2e8b3a','#5a3a1a'] },
  { name:'Ice',        bg:'#04101c', stops:['#ffffff','#63b3ff','#0fd6c0'] },
  { name:'Blood',      bg:'#0a0000', stops:['#ff1a1a','#b30000','#4d0000'] },
  { name:'Electric',   bg:'#00030d', stops:['#ffffff','#00aaff','#0044ff'] },
  { name:'Retro',      bg:'#0d0a00', stops:['#ffb000','#cc8400','#664200'] },
  { name:'Vaporwave',  bg:'#0d0221', stops:['#ff71ce','#01cdfe','#b967ff'] },
  { name:'Nord',       bg:'#2e3440', stops:['#88c0d0','#81a1c1','#5e81ac','#eceff4'] },
  { name:'Solarized',  bg:'#fdf6e3', stops:['#b58900','#cb4b16','#268bd2'] },
  { name:'Dracula',    bg:'#282a36', stops:['#50fa7b','#ff79c6','#bd93f9'] },
  { name:'Rose Gold',  bg:'#14080a', stops:['#f7cac9','#e8b4b8','#b76e79'] },
  { name:'Midnight',   bg:'#020617', stops:['#e2e8f0','#64748b','#1e3a8a'] },
  { name:'Cyberpunk',  bg:'#060014', stops:['#fcee09','#00f0ff','#ff003c'] },
  { name:'Aurora',     bg:'#02040d', stops:['#00ff9f','#00b8ff','#8b5cf6'] },
  /* print palettes — light paper backgrounds, ink-density stops */
  { name:'Indigo Press', bg:'#f4f1e8', stops:['#0a1e5a','#1d4ed8','#4f8df9','#b7d3ff'] },
  { name:'India Ink',    bg:'#f7f5f0', stops:['#111111','#3d3d3d','#8a8a8a'] },
  { name:'Vermilion',    bg:'#f6f1e7', stops:['#7f1d1d','#e03616','#f59e0b'] },
  { name:'Botanica',     bg:'#f2f4ec', stops:['#1e3d2f','#2f7d4f','#98b380'] },
  { name:'Riso',         bg:'#fbf8f1', stops:['#1f3ec2','#e4572e'] },
];

export function hex2rgb(h){
  return [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
}
export function luma(rgb){ return 0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2]; }
PALETTES.forEach(p => {
  p.bgRGB = hex2rgb(p.bg);
  p.stopsRGB = p.stops.map(hex2rgb);
  p.lightBg = luma(p.bgRGB) > 0.5;
});

/* Theme-aware palette: 'light' derives a paper variant of dark palettes
   (paper bg + stops darkened to print-safe luma). Cached per palette. */
const PAPER_BG = hex2rgb('#f6f2e9');
export function activePal(){
  const p = state.palette;
  if (state.theme !== 'light' || p.lightBg) return p;
  if (!p._light){
    p._light = {
      name: p.name + ' Paper',
      stops: p.stops,
      bgRGB: PAPER_BG,
      stopsRGB: p.stopsRGB.map(c => {
        const l = luma(c);
        const k = l > 0.55 ? 0.55 / l : 1;
        return c.map(v => v * k);
      }),
      lightBg: true,
    };
  }
  return p._light;
}

/* Shared 32-entry gradient LUT over a palette's stops — the ONE
   implementation (voxel + terrain colorers both sample it). */
export function paletteLUT32(pal){
  const stops = pal.stopsRGB, ns = stops.length, LUT = [];
  for (let i = 0; i < 32; i++){
    const t = i / 31 * (ns - 1);
    const k = Math.min(Math.floor(t), ns - 2), f = t - k;
    LUT.push([
      stops[k][0] + (stops[k+1][0] - stops[k][0]) * f,
      stops[k][1] + (stops[k+1][1] - stops[k][1]) * f,
      stops[k][2] + (stops[k+1][2] - stops[k][2]) * f,
    ]);
  }
  return LUT;
}
