/* ── AMBIENCE — color noise generator (white/pink/brown/blue/violet/
   grey) via Web Audio. AudioWorklet-first (the kernel source is shared with
   the worklet via toString, so the selftest can run the same DSP inline);
   ScriptProcessor fallback for old Safari / blob-blocked origins. Grey =
   white + inverse-loudness EQ shelves applied outside the worklet.
   FEATURES.noiseGenerator is the premium gating hook (sprint 3 Gumroad). */
import { $, toast, icon } from './util.js';
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

/* Envelope times (s): long, gentle swells — this is a focus/sleep tool, so
   the sound eases in slowly and washes out without a noticeable edge. */
const FADE_IN = 5.5, FADE_OUT = 3.5, XFADE = 1.6;

/* Per-type loudness calibration so switching sounds keeps perceived volume
   constant (the raw kernels have very different RMS). */
export const NOISE_CAL = {
  ocean: 1.15, brown: 1.0, pink: 1.15, white: 0.85, grey: 0.8, blue: 1.05, violet: 1.5,
};

export const AMBIENCE = {
  ctx: null, master: null, current: null, playing: false, timer: null,
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

  /* Master output: gentle compressor as a safety limiter — brown/violet at
     full volume stay clean. Created once per AudioContext. */
  _ensureMaster(){
    if (this.master) return;
    const c = this.ctx.createDynamicsCompressor();
    c.threshold.value = -9; c.knee.value = 6; c.ratio.value = 8;
    c.attack.value = 0.004; c.release.value = 0.25;
    c.connect(this.ctx.destination);
    this.master = c;
  },

  /* Build one playable graph for a sound type. Returns { gain, nodes,
     timers, type } — multiple graphs can coexist during a crossfade. */
  _spawn(type){
    const ctx = this.ctx;
    const kernel = type === 'grey' || type === 'ocean'
      ? (type === 'ocean' ? 'brown' : 'white') : type;
    let node;
    if (this.workletReady){
      node = new AudioWorkletNode(ctx, 'ca-noise', {
        outputChannelCount: [2],
        processorOptions: { type: kernel },
      });
    } else {                                     // ScriptProcessor fallback
      const sp = ctx.createScriptProcessor(2048, 1, 2);
      const kL = makeNoiseKernel(kernel), kR = makeNoiseKernel(kernel);
      sp.onaudioprocess = e => {
        const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
        for (let i = 0; i < L.length; i++){ L[i] = kL(); R[i] = kR(); }
      };
      node = sp;
    }
    const g = { type, nodes: [node], timers: [], gain: ctx.createGain() };
    g.gain.gain.value = 0.0001;
    let tail = node;
    if (type === 'grey'){                        // approx inverse equal-loudness contour
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowshelf'; lo.frequency.value = 150; lo.gain.value = 8;
      const hi = ctx.createBiquadFilter();
      hi.type = 'highshelf'; hi.frequency.value = 6000; hi.gain.value = 6;
      tail.connect(lo); lo.connect(hi);
      g.nodes.push(lo, hi);
      tail = hi;
    }
    if (type === 'ocean'){
      /* Surf: brown noise riding a slow swell — a randomized LFO cycle
         raises the level and opens the lowpass (the wave builds and breaks
         brighter), then washes back down. Plus a slow stereo drift. */
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 460; lp.Q.value = 0.4;
      const swell = ctx.createGain();
      swell.gain.value = 0.5;
      const pan = ctx.createStereoPanner();
      tail.connect(lp); lp.connect(swell); swell.connect(pan);
      g.nodes.push(lp, swell, pan);
      tail = pan;
      const cycle = () => {
        const t = ctx.currentTime;
        const period = 8 + Math.random() * 6;            // one wave every 8–14s
        const rise = period * 0.42, fall = period * 0.58;
        const peak = 0.8 + Math.random() * 0.25;
        const trough = 0.26 + Math.random() * 0.12;
        swell.gain.setTargetAtTime(peak, t, rise / 3);
        swell.gain.setTargetAtTime(trough, t + rise, fall / 3);
        lp.frequency.setTargetAtTime(380 + peak * 620, t, rise / 3);
        lp.frequency.setTargetAtTime(330, t + rise, fall / 3);
        pan.pan.setTargetAtTime(Math.random() * 0.5 - 0.25, t, period / 2);
        g.timers.push(setTimeout(cycle, period * 1000));
      };
      cycle();
    }
    tail.connect(g.gain);
    g.gain.connect(this.master);
    return g;
  },

  _target(){
    const type = this.current ? this.current.type : $('noiseTypeSelect').value;
    return Math.max(($('noiseVolRange').value / 100) * (NOISE_CAL[type] || 1), 0.0001);
  },

  _kill(g, fade){
    if (!g) return;
    const t = this.ctx.currentTime;
    g.gain.gain.cancelScheduledValues(t);
    g.gain.gain.setValueAtTime(Math.max(g.gain.gain.value, 0.0001), t);
    g.gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    g.timers.forEach(clearTimeout);
    const gg = g.gain, nodes = g.nodes;
    setTimeout(() => {
      nodes.forEach(nd => { try { nd.disconnect(); } catch {} });
      try { gg.disconnect(); } catch {}
    }, fade * 1000 + 120);
  },

  async start(){
    if (FEATURES.noiseGenerator === 'premium'){
      toast('Ambience is a premium feature — unlock via Gumroad', 'err');
      return;
    }
    await this._ensureCtx();
    this._ensureMaster();
    const type = $('noiseTypeSelect').value;
    const old = this.current;
    const g = this._spawn(type);
    this.current = g;
    const t = this.ctx.currentTime;
    const dur = old ? XFADE : FADE_IN;           // first play breathes in; switches crossfade
    const tgt = this._target();
    // start ~26 dB below target (not near-silence) so the exponential swell is
    // gradual across the whole ramp instead of jumping up only at the very end
    g.gain.gain.setValueAtTime(Math.max(tgt * 0.05, 0.0002), t);
    g.gain.gain.exponentialRampToValueAtTime(tgt, t + dur);
    if (old) this._kill(old, XFADE);
    this.playing = true;
    this._armTimer();
    localStorage.setItem('ca_noise', JSON.stringify({
      type, vol: $('noiseVolRange').value }));
    $('noiseBtn').innerHTML = icon('x') + 'Stop sound';
    $('noiseBtn').classList.add('primary');
  },

  stop(fade = FADE_OUT){
    if (!this.playing) return;
    this.playing = false;
    if (this.timer){ clearTimeout(this.timer); this.timer = null; }
    this._kill(this.current, fade);
    this.current = null;
    $('noiseBtn').innerHTML = icon('volume') + 'Play sound';
    $('noiseBtn').classList.remove('primary');
  },

  setVolume(){
    if (this.playing && this.current)
      this.current.gain.gain.exponentialRampToValueAtTime(this._target(), this.ctx.currentTime + 0.1);
  },

  _armTimer(){
    if (this.timer){ clearTimeout(this.timer); this.timer = null; }
    const min = +$('noiseTimerSelect').value;
    if (min > 0 && this.playing)
      this.timer = setTimeout(() => { this.stop(3); toast('Sound timer done — faded out', 'ok'); },
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
  AMBIENCE.setVolume();
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
