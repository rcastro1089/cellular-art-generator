/* ── AMBIENCE — color noise generator (white/pink/brown/blue/violet/
   grey) via Web Audio. AudioWorklet-first (the kernel source is shared with
   the worklet via toString, so the selftest can run the same DSP inline);
   ScriptProcessor fallback for old Safari / blob-blocked origins. Grey =
   white + inverse-loudness EQ shelves applied outside the worklet.
   FEATURES.noiseGenerator is the premium gating hook (sprint 3 Gumroad). */
import { $, toast } from './util.js';
import { FEATURES } from './state.js';

export function makeNoiseKernel(type){
  let b0 = 0, b1 = 0, b2 = 0, brown = 0, lastP = 0, lastW = 0;
  return function(){
    const w = Math.random() * 2 - 1;
    switch (type){
      default:                                   // white + grey (grey is EQ'd outside)
        return w * 0.30;
      case 'pink': case 'blue': {                // Paul Kellet 3-pole pink filter
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        const p = (b0 + b1 + b2 + w * 0.1848) * 0.10;
        const out = type === 'pink' ? p : (p - lastP) * 3.2;   // blue = differentiated pink
        lastP = p;
        return out;
      }
      case 'brown':                              // leaky integrator of white
        brown += 0.02 * (w - brown);
        return brown * 3.2;
      case 'violet': {                           // differentiated white
        const out = (w - lastW) * 0.22;
        lastW = w;
        return out;
      }
    }
  };
}

export const AMBIENCE = {
  ctx: null, node: null, gain: null, chain: [], playing: false, timer: null,
  workletURL: null, workletReady: false,

  async _ensureCtx(){
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended'){
      // don't block on autoplay policy: try now, else retry on the next real gesture
      await Promise.race([this.ctx.resume(), new Promise(r => setTimeout(r, 250))]);
      if (this.ctx.state === 'suspended')
        document.addEventListener('pointerdown', () => this.ctx.resume(), { once: true });
    }
    if (this.ctx.audioWorklet && !this.workletReady && !this._workletFailed){
      this.workletURL = URL.createObjectURL(new Blob([
        makeNoiseKernel.toString() + `
        class CANoise extends AudioWorkletProcessor{
          constructor(o){ super();
            const t = o.processorOptions.type;
            this.kL = makeNoiseKernel(t); this.kR = makeNoiseKernel(t); }
          process(_, outputs){
            const out = outputs[0], L = out[0], R = out[1];
            for (let i = 0; i < L.length; i++){
              L[i] = this.kL();
              if (R) R[i] = this.kR();          // decorrelated stereo
            }
            return true;
          }
        }
        registerProcessor('ca-noise', CANoise);`,
      ], { type: 'application/javascript' }));
      try {
        await this.ctx.audioWorklet.addModule(this.workletURL);
        this.workletReady = true;
      } catch (err){                             // e.g. blob worklets blocked on file:// origins
        console.warn('AudioWorklet unavailable, using ScriptProcessor fallback:', err.message);
        this._workletFailed = true;
      }
    }
  },

  _buildGraph(type){
    const ctx = this.ctx;
    if (this.workletReady){
      this.node = new AudioWorkletNode(ctx, 'ca-noise', {
        outputChannelCount: [2],
        processorOptions: { type: type === 'grey' ? 'white' : type },
      });
    } else {                                     // ScriptProcessor fallback
      const sp = ctx.createScriptProcessor(2048, 1, 2);
      const kL = makeNoiseKernel(type === 'grey' ? 'white' : type);
      const kR = makeNoiseKernel(type === 'grey' ? 'white' : type);
      sp.onaudioprocess = e => {
        const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
        for (let i = 0; i < L.length; i++){ L[i] = kL(); R[i] = kR(); }
      };
      this.node = sp;
    }
    this.chain = [this.node];
    if (type === 'grey'){                        // approx inverse equal-loudness contour
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowshelf'; lo.frequency.value = 150; lo.gain.value = 8;
      const hi = ctx.createBiquadFilter();
      hi.type = 'highshelf'; hi.frequency.value = 6000; hi.gain.value = 6;
      this.node.connect(lo); lo.connect(hi);
      this.chain.push(lo, hi);
    }
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.0001;
    this.chain.at(-1).connect(this.gain);
    this.gain.connect(ctx.destination);
  },

  async start(){
    if (FEATURES.noiseGenerator === 'premium'){
      toast('🔒 Ambience is a premium feature — unlock via Gumroad', 'err');
      return;
    }
    this.stopGraph();
    await this._ensureCtx();
    this._buildGraph($('noiseTypeSelect').value);
    const vol = $('noiseVolRange').value / 100;
    this.gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), this.ctx.currentTime + 0.4);
    this.playing = true;
    this._armTimer();
    localStorage.setItem('ca_noise', JSON.stringify({
      type: $('noiseTypeSelect').value, vol: $('noiseVolRange').value }));
    $('noiseBtn').textContent = '⏹ Stop noise';
    $('noiseBtn').classList.add('primary');
  },

  stop(fade = 0.5){
    if (!this.playing) return;
    this.playing = false;
    if (this.timer){ clearTimeout(this.timer); this.timer = null; }
    if (this.gain && this.ctx){
      this.gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + fade);
      const old = this.chain.slice();
      const g = this.gain;
      setTimeout(() => { old.forEach(nd => { try { nd.disconnect(); } catch {} }); try { g.disconnect(); } catch {} },
        fade * 1000 + 100);
    }
    this.node = null; this.gain = null; this.chain = [];
    $('noiseBtn').textContent = '▶ Play noise';
    $('noiseBtn').classList.remove('primary');
  },

  stopGraph(){ if (this.playing) this.stop(0.05); },

  setVolume(v){
    if (this.playing && this.gain)
      this.gain.gain.exponentialRampToValueAtTime(Math.max(v, 0.0001), this.ctx.currentTime + 0.08);
  },

  _armTimer(){
    if (this.timer){ clearTimeout(this.timer); this.timer = null; }
    const min = +$('noiseTimerSelect').value;
    if (min > 0 && this.playing)
      this.timer = setTimeout(() => { this.stop(3); toast('🔊 Noise timer done — faded out', 'ok'); },
        min * 60000);
  },
};

/* card bindings (self-contained feature UI) */
$('noiseBtn').addEventListener('click', () => AMBIENCE.playing
  ? AMBIENCE.stop()
  : AMBIENCE.start().catch(err => { console.error(err); toast('Audio failed: ' + err.message, 'err'); }));
$('noiseTypeSelect').addEventListener('change', () => {
  if (AMBIENCE.playing) AMBIENCE.start().catch(err => toast('Audio failed: ' + err.message, 'err'));
});
$('noiseVolRange').addEventListener('input', e => {
  $('noiseVolVal').textContent = e.target.value + '%';
  AMBIENCE.setVolume(e.target.value / 100);
});
$('noiseTimerSelect').addEventListener('change', () => AMBIENCE._armTimer());
try {
  const saved = JSON.parse(localStorage.getItem('ca_noise') || 'null');
  if (saved){
    $('noiseTypeSelect').value = saved.type;
    $('noiseVolRange').value = saved.vol;
    $('noiseVolVal').textContent = saved.vol + '%';
  }
} catch {}
