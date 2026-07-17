/* ── EXPORT — HD PNG + viewport video ──────────────────────────── */
import { $, toast } from '../util.js';
import { state } from '../state.js';
import { engine, canvas } from '../engine.js';
import { THREE3D } from '../three3d.js';
import { ruleString } from '../rules.js';
import { setRunning } from '../app.js';

export async function exportPNG(){
  const btn = $('exportBtn');
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
    if ($('overlayCheck').checked){
      const fs = Math.round(H / 60);
      const text = `${ruleString()}  ·  Generation ${state.gen}  ·  cellular-art-generator.pages.dev`;
      ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
      const tw = ctx.measureText(text).width;
      const pad = fs * 0.8, x = W - tw - pad * 2 - fs, y = H - fs * 2.6;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(x, y, tw + pad * 2, fs * 1.9, fs * 0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(text, x + pad, y + fs * 1.32);
    }
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca-art-${ruleString().replace('/','')}-gen${state.gen}-${W}x${H}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`✓ Exported ${W} × ${H} PNG`, 'ok');
  } catch (err) {
    console.error(err);
    toast('Export failed: ' + err.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Export PNG';
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
    a.download = `ca-art-${ruleString().replace('/','')}-${secs}s.${ext}`;
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
    btn.textContent = '🎬 Export Video';
    setRunning(wasRunning);
  }
}
$('videoBtn').addEventListener('click', exportVideo);
