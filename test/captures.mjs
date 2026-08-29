/* ── Captures: render real del motor → PNG (playwright local) ──
   Sirve el repo estático, abre /?pattern=X&palette=Y, corre ~300
   generaciones y captura el canvas. Uso: node test/captures.mjs rundir
   donde rundir es un JSON: [{pattern, palette, gens, out, rule?}] */
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };

const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
    if (!file.startsWith(normalize(ROOT))) throw new Error('traversal');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const jobFile = process.argv[2];
const jobs = JSON.parse(await readFile(jobFile, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 720, height: 720 } });  // DPR 1: sin DPR alto el WebGL headless va a FPS útil
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

for (const j of jobs) {
  const qs = new URLSearchParams();
  if (j.rule) qs.set('rule', j.rule); else qs.set('pattern', j.pattern);
  if (!j.rule) qs.set('palette', j.palette || 'Neon');
  const url = `http://127.0.0.1:${port}/index.html?${qs}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // esperar a que el motor arranque (deep-link autostarts) y el canvas pinte
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 100 && c.height > 100;
  }, null, { timeout: 15000 });
  // deep-link deja el motor EN PAUSA (play pulsante). El botón es toggle:
  // solo dar PLAY si está en estado pausado (title="Play"), NUNCA re-click
  // si ya corre (eso lo pausaría). Reintenta hasta que GEN avance.
  const gens = j.gens || 160;
  const t0 = Date.now();
  // ocultar la barra de herramientas flotante + hint + forzar canvas CUADRADO
  // (el engine cover-crops el grid al aspect del canvas)
  await page.addStyleTag({ content: '#viewBar{display:none!important}#hint{display:none!important}#canvasWrap{width:640px!important;height:640px!important;padding:0!important;border:none!important}#caCanvas{width:640px!important;height:640px!important}' }).catch(() => {});
  await page.waitForFunction((g) => {
    const st = document.querySelector('#headStats');
    if (!st) return false;
    const m = st.textContent.match(/GEN\s*(\d+)/i);
    if (m && parseInt(m[1], 10) >= g) return true;
    const pb = document.querySelector('#playBtn');
    const wantPlay = pb && (pb.title === 'Play' || pb.classList.contains('pulse'));
    if (wantPlay && Date.now() - (window.__cc || 0) > 600) {
      pb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const sp = document.querySelector('#speedRange');
      if (sp) { sp.value = '120'; sp.dispatchEvent(new Event('change', { bubbles: true })); }
      window.__cc = Date.now();   // reintentar solo si sigue en pausa
    }
    return false;
  }, gens, { timeout: 60000 });
  // paleta/pausa: página ya aplicó palette via deep-link; frame final
  await page.waitForTimeout(250);
  // zoom opcional post-gens: hold del botón vbZoomIn (1.10^z)
  const zi = j.zoom || 0;
  if (zi > 0){
    await page.evaluate((n) => {
      const btn = document.querySelector('#vbZoomIn');
      if (!btn) return;
      const down = new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0 });
      const up   = new PointerEvent('pointerup',   { bubbles: true, pointerId: 1, button: 0 });
      btn.dispatchEvent(down);
      const stop = (Date.now() - 0) + n * 95;
      // hold ~95ms por zoom
      setTimeout(() => btn.dispatchEvent(up), n * 95);
    }, zi);
    await page.waitForTimeout(zi * 95 + 200);
  }
  const canvas = page.locator('#caCanvas').first();
  await mkdir(dirname(j.out), { recursive: true });
  await canvas.screenshot({ path: j.out });
  console.log('OK', j.out, Date.now() - t0 + 'ms');
  if (errors.length){ console.log('  pageerrors:', [...new Set(errors)]); errors.length = 0; }
}
await browser.close(); server.close();
console.log('DONE');