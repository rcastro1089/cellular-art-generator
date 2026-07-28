/* ── CELLSCAPE PRO — client-side license unlock (Gumroad) ──────────
   Validation-tier gating: there is NO backend yet, so this is optimistic
   and bypassable by design — it exists to measure willingness to pay, not
   to hard-enforce. Real enforcement lands with the Cloudflare Workers
   backend (sprint 3). Pro unlocks print-resolution export, transparent
   PNG, video export and watermark removal. The free tier stays fully
   usable (play + 1920×1080 signed PNG) — that is what the SEO traffic
   lands on and shares. */
import { $, toast, icon } from './util.js';

/* Gumroad product. Set GUMROAD_PERMALINK to your product's /l/<slug> once
   it exists (Gumroad → the product → Share → the URL after /l/). If your
   Gumroad API rejects product_permalink, switch the body param below to
   product_id and put the product id here instead. */
const GUMROAD_PERMALINK = 'cellscape-pro';
const GUMROAD_URL = `https://automanexus.gumroad.com/l/${GUMROAD_PERMALINK}`;
const LS_KEY = 'cellscape_pro_license';
/* Local dev/test key: unlocks the Pro UX before the Gumroad product is live.
   Remove (or leave — it only affects this browser) once real keys work. */
const DEV_KEY = 'CELLSCAPE-DEV';
/* The bundle is public, so a hardcoded unlock key would be a free bypass in
   production. DEV_KEY is therefore honored on local dev hosts only. */
const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);

export const PRO = { active: false };
export const isPro = () => PRO.active;

function setPro(active){
  PRO.active = active;
  document.body.classList.toggle('is-pro', active);
  const b = $('proUnlockBtn');
  if (b){
    b.innerHTML = active ? icon('check') + 'Pro unlocked' : icon('sparkles') + 'Unlock Pro';
    b.classList.toggle('is-unlocked', active);
  }
}

/* Gate a Pro-only action. Returns true if allowed; else nudges to unlock. */
export function gatePro(feature){
  if (PRO.active) return true;
  toast(`${feature} needs Cellscape Pro`, 'err');
  openProModal();
  return false;
}

/* Verify a license key against Gumroad's public, CORS-enabled API. */
export async function verifyLicense(key){
  key = (key || '').trim();
  if (!key) return false;
  if (key === DEV_KEY && IS_LOCAL){ localStorage.setItem(LS_KEY, key); setPro(true); return true; }
  try {
    const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_permalink: GUMROAD_PERMALINK,
        license_key: key,
        increment_uses_count: 'false'
      })
    });
    const data = await res.json().catch(() => null);
    if (data && data.success){ localStorage.setItem(LS_KEY, key); setPro(true); return true; }
  } catch (e){ console.warn('[pro] license verify failed', e); }
  return false;
}

/* Restore on load: trust a stored key optimistically (so Pro works offline),
   then revalidate in the background — only an *explicit* rejection downgrades,
   so a flaky network never silently re-locks a paying user. */
function restore(){
  const key = localStorage.getItem(LS_KEY);
  if (!key) return;
  if (key === DEV_KEY){                      // dev unlock: local hosts only
    if (IS_LOCAL) setPro(true);
    else localStorage.removeItem(LS_KEY);
    return;
  }
  setPro(true);
  fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ product_permalink: GUMROAD_PERMALINK, license_key: key, increment_uses_count: 'false' })
  }).then(r => r.json()).then(d => {
    if (d && d.success === false){ localStorage.removeItem(LS_KEY); setPro(false); }
  }).catch(() => {});
}

/* ── Modal ──────────────────────────────────────────────────────── */
export function openProModal(){ const m = $('proModal'); if (m){ m.classList.add('show'); $('proKeyInput')?.focus(); } }
function closeProModal(){ $('proModal')?.classList.remove('show'); }

function wire(){
  $('proUnlockBtn')?.addEventListener('click', openProModal);
  $('proModalClose')?.addEventListener('click', closeProModal);
  $('proModal')?.addEventListener('click', e => { if (e.target.id === 'proModal') closeProModal(); });
  $('proBuyBtn')?.addEventListener('click', () => window.open(GUMROAD_URL, '_blank', 'noopener'));
  const activate = async () => {
    const btn = $('proActivateBtn');
    btn.disabled = true; btn.textContent = 'Checking…';
    const ok = await verifyLicense($('proKeyInput').value);
    btn.disabled = false; btn.textContent = 'Activate';
    if (ok){ toast('✓ Cellscape Pro unlocked', 'ok'); closeProModal(); }
    else toast('That license key was not recognized', 'err');
  };
  $('proActivateBtn')?.addEventListener('click', activate);
  $('proKeyInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { wire(); restore(); });
else { wire(); restore(); }
