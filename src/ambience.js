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
  ocean: 1.15, surf: 1.1, voyager: 0.8, brown: 1.0, pink: 1.15,
  white: 0.85, grey: 0.8, blue: 1.05, violet: 1.5,
};

/* ── Cinematic melody helpers (Voyager preset) ─────────────────────
   Original ambient composition evoking the arpeggiated-organ, minor-key,
   deep-reverb style of space-cinema scores — synthesized from scratch, no
   samples, no copied melody. */
export const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);

/* Decaying-noise impulse response → a big synthetic reverb space. */
function makeReverbIR(ctx, seconds, decay){
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++){
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/* One organ note: additive drawbar timbre (fundamental + octave + fifth +
   sub) through a soft-attack / long-release envelope. Oscillators self-stop
   and get GC'd — no bookkeeping needed. */
function playOrgan(ctx, dest, freq, t, dur){
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.85, t + 0.22);
  env.gain.setValueAtTime(0.85, t + Math.max(dur * 0.5, 0.15));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.3);
  env.connect(dest);
  [[1, 0.55], [2, 0.22], [3, 0.1], [0.5, 0.16]].forEach(([mult, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq * mult;
    const a = ctx.createGain(); a.gain.value = amp;
    o.connect(a); a.connect(env);
    o.start(t); o.stop(t + dur + 1.5);
  });
}

/* A slow sustained pad chord tone under the arpeggio (the "vast" bed). */
function playPad(ctx, dest, freq, t, dur){
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.42, t + 1.2);
  env.gain.setValueAtTime(0.42, t + dur * 0.5);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  env.connect(dest);
  [[1, 'triangle', 0.5], [1.5, 'sine', 0.2], [2, 'sine', 0.14]].forEach(([mult, type, amp]) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq * mult;
    const a = ctx.createGain(); a.gain.value = amp;
    o.connect(a); a.connect(env);
    o.start(t); o.stop(t + dur + 0.2);
  });
}

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
    const kernel = type === 'grey' ? 'white'
      : (type === 'ocean' || type === 'surf' || type === 'voyager') ? 'brown'
      : type;
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
    const g = { type, nodes: [node], timers: [], stopped: false, gain: ctx.createGain() };
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
    if (type === 'surf' || type === 'voyager'){
      // steady ocean bed: brown noise through a fixed lowpass, constant level
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.3;
      const bed = ctx.createGain();
      bed.gain.value = type === 'voyager' ? 0.42 : 0.62;   // sit lower under the melody
      tail.connect(lp); lp.connect(bed);
      g.nodes.push(lp, bed);
      tail = bed;
    }
    if (type === 'voyager') this._buildVoyagerMelody(ctx, g);   // organ arpeggio, summed in parallel
    tail.connect(g.gain);
    g.gain.connect(this.master);
    return g;
  },

  /* Generative cinematic melody: a rising organ arpeggio over an original
     A-minor progression + a low sustained pad on each chord change, all
     drenched in synthetic reverb. Summed into g.gain alongside the ocean
     bed. A lookahead scheduler keeps notes on the audio clock; it re-arms
     via g.timers so _kill() (which sets g.stopped) tears it down cleanly. */
  _buildVoyagerMelody(ctx, g){
    const conv = ctx.createConvolver();
    conv.buffer = makeReverbIR(ctx, 3.4, 2.4);
    const melBus = ctx.createGain();                 // pre-reverb note sum
    const wet = ctx.createGain(); wet.gain.value = 0.9;
    const dry = ctx.createGain(); dry.gain.value = 0.3;
    const melOut = ctx.createGain(); melOut.gain.value = 0.5;   // melody level under the bed
    melBus.connect(conv); conv.connect(wet); wet.connect(melOut);
    melBus.connect(dry); dry.connect(melOut);
    melOut.connect(g.gain);
    g.nodes.push(conv, melBus, wet, dry, melOut);

    const prog = [           // original i–VI–III–VII feel in A natural minor
      [57, 60, 64, 69],      // Am
      [53, 57, 60, 65],      // F
      [48, 55, 60, 64],      // C
      [55, 59, 62, 67],      // G
    ];
    const noteDur = 0.42;
    let nextTime = ctx.currentTime + 0.2, step = 0;
    const scheduler = () => {
      if (g.stopped) return;
      while (nextTime < ctx.currentTime + 0.3){
        const chord = prog[Math.floor(step / 8) % prog.length];
        const within = step % 8;                     // 8-note run: chord tones then +1 octave (rising)
        const m = chord[within % chord.length] + (within >= chord.length ? 12 : 0);
        playOrgan(ctx, melBus, midiToFreq(m), nextTime, noteDur);
        if (within === 0) playPad(ctx, melBus, midiToFreq(chord[0] - 12), nextTime, 5.5);
        nextTime += noteDur;
        step++;
      }
      g.timers.push(setTimeout(scheduler, 60));
    };
    scheduler();
  },

  _target(){
    const type = this.current ? this.current.type : $('noiseTypeSelect').value;
    return Math.max(($('noiseVolRange').value / 100) * (NOISE_CAL[type] || 1), 0.0001);
  },

  _kill(g, fade){
    if (!g) return;
    g.stopped = true;                          // halt the Voyager scheduler
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
