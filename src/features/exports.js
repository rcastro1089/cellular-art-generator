/* ── EXPORT — HD PNG + viewport video ──────────────────────────── */
import { $, toast, icon } from '../util.js';
import { state } from '../state.js';
import { engine, canvas } from '../engine.js';
import { THREE3D } from '../three3d.js';
import { ruleString } from '../rules.js';
import { setRunning } from '../app.js';
import { gatePro, isPro } from '../pro.js';

/* Free tier: one social-sized PNG, always signed. Print resolutions,
   transparent background, video and watermark removal are Pro. */
const FREE_SIZE = '1920x1080';

/* Brand signature stamped on exports (on by default; Advanced can hide it):
   [logo mark]  Grown, not drawn — Cellscape  ·  B3/S23 · gen 4218 */
function drawSignature(ctx, W, H){
  const fs = Math.max(12, Math.round(H / 64));
  const bold = `600 ${fs}px Inter, system-ui, sans-serif`;
  const reg  = `400 ${fs}px Inter, system-ui, sans-serif`;
  const t1 = 'Grown, not drawn — Cellscape';
  const t2 = `  ·  ${ruleString()} · gen ${state.gen}`;
  ctx.font = bold; const w1 = ctx.measureText(t1).width;
  ctx.font = reg;  const w2 = ctx.measureText(t2).width;
  const mark = fs * 1.15, gap = fs * 0.65, padX = fs * 0.95, bh = fs * 2.3;
  const bw = padX + mark + gap + w1 + w2 + padX;
  const x = W - bw - fs * 1.5, y = H - bh - fs * 1.5;
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,16,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, bh / 2);
  ctx.fill();
  // logo mark: 2×2 cells, diagonal pair filled
  const mx = x + padX, my = y + (bh - mark) / 2;
  const c = mark * 0.46, r = mark * 0.12, o = mark - c;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, fs * 0.07);
  [[0, 0, 1], [o, 0, 0], [0, o, 0], [o, o, 1]].forEach(([dx, dy, fill]) => {
    ctx.beginPath();
    ctx.roundRect(mx + dx, my + dy, c, c, r);
    fill ? ctx.fill() : ctx.stroke();
  });
  const ty = y + bh / 2 + fs * 0.36;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = bold;
  ctx.fillText(t1, mx + mark + gap, ty);
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = reg;
  ctx.fillText(t2, mx + mark + gap + w1, ty);
  ctx.restore();
}

export async function exportPNG(){
  const btn = $('exportBtn');
  // ── Pro gates (checked before we touch the run state / spinner) ──
  if ($('exportSelect').value !== FREE_SIZE && !gatePro('Print-quality export')) return;
  if ($('transparentCheck').checked && !gatePro('Transparent background')) return;
  if (!$('overlayCheck').checked && !gatePro('Watermark removal')) return;
  const [w, h] = $('exportSelect').value.split('x').map(Number);
  const wasRunning = state.running;
  setRunning(false);
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Rendering…';
  await new Promise(r => setTimeout(r, 30));    // let the button repaint
  try {
    const is3D = state.viewMode !== 'planar';
    if (is3D && !THREE3D.ready) throw new Error('3D view not ready yet');
    const transparent = $('transparentCheck').checked && !is3D;
    const { data, w: W, h: H } = is3D
      ? THREE3D.exportPixels(w, h)
      : engine.renderToPixels(w, h, $('exportFitSelect').value, transparent);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.putImageData(new ImageData(data, W, H), 0, 0);
    // Free exports are always signed; only Pro may drop the signature.
    if (!isPro() || $('overlayCheck').checked) drawSignature(ctx, W, H);
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellscape-${ruleString().replace('/','')}-gen${state.gen}-${W}x${H}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`✓ Exported ${W} × ${H} PNG`, 'ok');
  } catch (err) {
    console.error(err);
    toast('Export failed: ' + err.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = icon('download') + 'Export PNG';
    setRunning(wasRunning);
  }
}
$('exportBtn').addEventListener('click', exportPNG);

/* ── VIDEO EXPORT — records the live viewport via captureStream.
   WebM (VP9/VP8) everywhere modern; Safari 17+ falls back to native MP4.
   FEATURES.videoExport is the gating hook for the future premium tier. */
function videoMime(){
  if (!window.MediaRecorder) return null;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    .find(m => MediaRecorder.isTypeSupported(m)) || null;
}
let recordingVideo = false;
export async function exportVideo(){
  if (recordingVideo) return;
  if (!gatePro('Video export')) return;
  const btn = $('videoBtn');
  const mime = videoMime();
  if (!mime){ toast('Video capture not supported in this browser', 'err'); return; }
  const secs = +$('videoDurSelect').value;
  const src = state.viewMode === 'planar' ? canvas : THREE3D.canvasEl;
  const wasRunning = state.running;
  setRunning(true);                        // capture motion, not a frozen frame
  recordingVideo = true;
  btn.disabled = true;
  let stopPump = () => {};
  try {
    /* explicit frame pump (~30fps): auto-capture from accelerated canvases
       silently produces no frames on some Chromium setups. Falls back to
       auto mode where requestFrame is unavailable. */
    let stream = src.captureStream(0);
    let reqFrame = null;
    {
      const tr = stream.getVideoTracks()[0];
      if (tr && tr.requestFrame) reqFrame = () => tr.requestFrame();
      else if (stream.requestFrame) reqFrame = () => stream.requestFrame();  // Firefox
      else { tr && tr.stop(); stream = src.captureStream(30); }
    }
    if (reqFrame){
      let pumping = true, last = 0;
      stopPump = () => { pumping = false; };
      const pump = ts => {
        if (!pumping) return;
        if (ts - last >= 33){ last = ts; reqFrame(); }
        requestAnimationFrame(pump);
      };
      requestAnimationFrame(pump);
    }
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => rec.onstop = res);
    rec.start(250);
    for (let t = secs; t > 0; t--){
      btn.innerHTML = `<span class="spin"></span>Recording… ${t}s`;
      await new Promise(r => setTimeout(r, 1000));
    }
    rec.stop();
    await stopped;
    stream.getTracks().forEach(tr => tr.stop());
    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    if (!blob.size) throw new Error('no frames captured');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellscape-${ruleString().replace('/','')}-${secs}s.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`✓ Exported ${secs}s ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(1)} MB`, 'ok');
  } catch (err){
    console.error(err);
    toast('Video export failed: ' + err.message, 'err');
  } finally {
    stopPump();
    recordingVideo = false;
    btn.disabled = false;
    btn.innerHTML = icon('video') + 'Export video';
    setRunning(wasRunning);
  }
}
$('videoBtn').addEventListener('click', exportVideo);
