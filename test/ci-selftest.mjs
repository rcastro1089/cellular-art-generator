/* CI runner: serves the repo statically, opens #selftest in headless
   Chromium and fails unless document.title reports ALL-PASS.
   Local use:  npm i --no-save playwright && npx playwright install chromium
               node test/ci-selftest.mjs */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
    if (!file.startsWith(normalize(ROOT))) throw new Error('traversal');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', m => { if (m.text().startsWith('SELFTEST')) logs.push(m.text()); });
await page.goto(`http://127.0.0.1:${port}/index.html#selftest`);
await page.waitForFunction(() => document.title.startsWith('SELFTEST'), null, { timeout: 30000 });
const title = await page.title();
logs.forEach(l => console.log(l));
console.log('TITLE:', title);
await browser.close();
server.close();

if (title !== 'SELFTEST ALL-PASS'){
  console.error('❌ selftest failed');
  process.exit(1);
}
console.log('✅ selftest ALL-PASS');
