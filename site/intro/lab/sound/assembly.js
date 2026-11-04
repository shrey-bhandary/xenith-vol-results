/* lab/sound/assembly.js
   Rusty's wake, as audio. WebAudio only: no files, no fetch, no speech,
   no DOM, no listeners. Nine voices, one context, one bus.

   window.RustyAssembly
     enable()            create or resume the context. Call it inside the wake
                         gesture; browsers only unpause audio there.
     mute(on)            hard mute on the bus, returns the new state.
     servoUp(dur)        saw 120 -> 260 through a bandpass. Arm and shoulder rise.
     servoDown(dur)      the same voice falling, 260 -> 110.
     ratchet(count)      n stepped ticks, 30ms apart, 1.4k rising to 1.7k.
     clank(size)         three inharmonic triangles plus a body note. 0.4..1.4.
     tickMetal(level)    12ms metal tick at 2.4k. Optional level 0.15..1.
     powerUp()           CRT power-on: saw rise, 9k whine, two pips.
     ambientStart()      room bed: filtered noise loop plus a 38Hz sine.
     ambientStop()       900ms release, then the sources are stopped.

   Gains, measured at the destination
   The bus is unity on purpose: the plan's numbers are output-relative, so a
   voice's gain is also the number you hear. A compressor sits after the bus
   and catches stacks, not single voices. Every peak is -1 dBFS or lower.

     voice            linear   dBFS   where
     servoUp          0.028    -31    B04 arms, B10 stretch
     servoDown        0.026    -32    B06 false start, B11 settle
     ratchet tick     0.020    -34    B02 rod segments
     clank partials   0.050/0.025/0.0167   -26/-32/-36   B04, B06, B07, B11
     clank body       0.090*k  -21 at k=1     B04, B06, B07, B11
     powerUp rise     0.030    -30    B08 screen
     powerUp whine    0.020    -34    B08 screen
     powerUp pips     0.035/0.030  -29/-30  B08
     ambient bed      0.050    -26    B03 in, B05 to B12 under everything
     ambient sub      0.022    -33    B03 in, B06 to B14 under everything
     tickMetal        0.030    -30    B01, B07, B13
     master           1.000     0     bus, compressor at -12dB threshold

   When each one fires in the wake beats
     B01  0.52   tickMetal(0.6)          the 8ms tick that means nothing yet
     B02  0.70   ratchet(4)              30ms apart, 1.4k / 1.5k / 1.6k / 1.7k
     B03  1.60   ambientStart()          noise bed up over 2.4s, sub from zero
     B04  3.02   clank(1.0)              68Hz body, the tread thump
     B04  3.10   servoUp(0.07) x2        arms unfold, left leads by 60ms
     B05  3.30   (nothing)               bed holds. No duck is implemented.
     B06  4.10   servoUp(0.08)           the wind-up that gets cut
     B06  4.24   clank(0.6)              94Hz body, the arm hits its stop
     B07  4.45   clank(1.2) + tickMetal()  55Hz body plus the 2.4k contact tick
     B08  5.05   powerUp()               screen takes power, eyes follow
     B09  5.68   tickMetal(0.7)          blink one. 5.94 the same, four dB down
     B10  6.10   servoUp(0.30)           120 -> 260, the only full-body beat
     B11  6.70   servoDown(0.28)         arms drop to rest
     B11  6.94   clank(1.1)              61Hz, the treads take the weight
     B12  7.20   (nothing)               bed only. The silence is the cue.
     B13  7.85   tickMetal(0.5)          the 1.9k click, before he looks
     B14  8.40   (nothing)               A5 / C#6 / E6 are outside these voices

   Where this departs from plan/wake.md, on purpose
   - The sub is a flat 38Hz for the whole bed. The plan slides 40 to 44 across
     B03, but a moving sub would smear the 38Hz cue at B13 and the two are the
     same octave.
   - clank's body note is 132 - 64*size, so 0.6 lands on 94Hz for B06 and 1.2
     lands on 55Hz for B07, which is what those beats ask for.
   - B04 wants a 240Hz square for the arms; this module only has the saw
     servo. The 2ms attack still reads as a mechanism, not a note.
   - B09 wants 1.1k ticks. tickMetal sits at 2.4k and is dropped 3dB instead.
     Cheaper than a second voice that only fires twice.
   - No duck, no speech, no note sequences. B14's three character blips belong
     to whatever paints the face, not to the rig's motor bed.
*/
(function (global) {
  "use strict";

  var V = {
    servo: 0.028, servoDown: 0.026, ratchet: 0.020,
    part: 0.050, body: 0.090, tick: 0.030,
    power: 0.030, whine: 0.020, pipA: 0.035, pipB: 0.030,
    bed: 0.050, sub: 0.022
  };
  var MASTER = 1.0;

  var ctx = null, bus = null, comp = null, noise = null, amb = null;
  var dead = false, muted = false;

  function ensure() {
    if (dead) return null;
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) { dead = true; return null; }
      try {
        ctx = new AC();
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.knee.value = 6;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.25;
        bus = ctx.createGain();
        bus.gain.value = muted ? 0 : MASTER;
        bus.connect(comp);
        comp.connect(ctx.destination);
      } catch (e) {
        dead = true;
        return null;
      }
    }
    if (ctx.state === "suspended") {
      try { ctx.resume(); } catch (e) {}
    }
    return ctx;
  }

  /* Two seconds of pinkish noise, peak-normalised so the gains above mean
     what they say. One buffer, made once, reused by the bed and every tick. */
  function noiseBuffer(c) {
    if (noise) return noise;
    var len = Math.floor(c.sampleRate * 2);
    var b = c.createBuffer(1, len, c.sampleRate);
    var d = b.getChannelData(0);
    var last = 0, peak = 0, i, w;
    for (i = 0; i < len; i++) {
      w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last;
      if (Math.abs(last) > peak) peak = Math.abs(last);
    }
    var k = peak > 0 ? 0.92 / peak : 1;
    for (i = 0; i < len; i++) d[i] *= k;
    noise = b;
    return b;
  }

  function drop(node) {
    try { node.disconnect(); } catch (e) {}
  }

  /* One filtered noise burst. dur in seconds, centre in Hz, gain linear. */
  function burst(t, dur, centre, q, gain, type) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    var f = ctx.createBiquadFilter();
    f.type = type || "bandpass";
    f.frequency.value = centre;
    f.Q.value = q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t, Math.random() * 1.4);
    src.stop(t + dur + 0.02);
    src.onended = function () { drop(src); drop(f); drop(g); };
    return g;
  }

  /* One oscillator with an optional glide and an optional filter. */
  function voicelike(t, opts) {
    var o = ctx.createOscillator();
    o.type = opts.type;
    o.frequency.setValueAtTime(opts.from, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + opts.dur);
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain), t + (opts.attack || 0.02));
    out.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    var tail = out;
    if (opts.filter) {
      var f = ctx.createBiquadFilter();
      f.type = opts.filter.type;
      f.frequency.setValueAtTime(opts.filter.from, t);
      if (opts.filter.to) f.frequency.linearRampToValueAtTime(opts.filter.to, t + opts.dur);
      f.Q.value = opts.filter.q;
      o.connect(f);
      f.connect(out);
      tail = f;
      o.onended = function () { drop(o); drop(f); drop(out); };
    } else {
      o.connect(out);
      o.onended = function () { drop(o); drop(out); };
    }
    tail.connect(bus);
    o.start(t);
    o.stop(t + opts.dur + 0.03);
    return o;
  }

  function servoUp(dur) {
    var c = ensure();
    if (!c) return;
    var d = Math.max(0.06, Math.min(2.5, dur || 0.3));
    var t = c.currentTime + 0.005;
    voicelike(t, {
      type: "sawtooth", from: 120, to: 260, dur: d, gain: V.servo, attack: 0.03,
      filter: { type: "bandpass", from: 700, to: 900, q: 1.1 }
    });
  }

  function servoDown(dur) {
    var c = ensure();
    if (!c) return;
    var d = Math.max(0.06, Math.min(2.5, dur || 0.28));
    var t = c.currentTime + 0.005;
    voicelike(t, {
      type: "sawtooth", from: 260, to: 110, dur: d, gain: V.servoDown, attack: 0.02,
      filter: { type: "bandpass", from: 900, to: 650, q: 1.1 }
    });
  }

  function ratchet(count) {
    var c = ensure();
    if (!c) return;
    var n = count | 0;
    if (n < 1) n = 3;
    if (n > 12) n = 12;
    var t0 = c.currentTime + 0.005;
    for (var i = 0; i < n; i++) {
      burst(t0 + i * 0.03, 0.03, 1400 + (i % 4) * 100, 2.2, V.ratchet);
    }
  }

  function clank(size) {
    var c = ensure();
    if (!c) return;
    var k = Math.max(0.4, Math.min(1.4, size || 1));
    var t = c.currentTime + 0.005;
    var partials = [820, 1340, 1970];
    for (var i = 0; i < partials.length; i++) {
      voicelike(t, {
        type: "triangle",
        from: partials[i] * (0.94 + Math.random() * 0.1),
        dur: 0.32 + i * 0.05,
        gain: (V.part / (i + 1)) * k,
        attack: 0.004
      });
    }
    voicelike(t, {
      type: "sine",
      from: Math.max(42, Math.min(110, 132 - 64 * k)),
      to: Math.max(30, (132 - 64 * k) * 0.72),
      dur: 0.26,
      gain: V.body * k,
      attack: 0.003
    });
    burst(t, 0.05, 3000, 0.8, 0.02 * k, "highpass");
  }

  function tickMetal(level) {
    var c = ensure();
    if (!c) return;
    var k = Math.max(0.15, Math.min(1, level || 1));
    var t = c.currentTime + 0.002;
    burst(t, 0.012, 2400, 5.5, V.tick * k);
    voicelike(t, {
      type: "square",
      from: 2400 * (0.98 + Math.random() * 0.04),
      dur: 0.02,
      gain: V.tick * 0.55 * k,
      attack: 0.001
    });
  }

  function powerUp() {
    var c = ensure();
    if (!c) return;
    var t = c.currentTime + 0.005;
    voicelike(t, {
      type: "sawtooth", from: 70, to: 520, dur: 0.7, gain: V.power, attack: 0.1,
      filter: { type: "lowpass", from: 400, to: 2200, q: 0.7 }
    });
    voicelike(t, {
      type: "sine", from: 9000, dur: 0.3, gain: V.whine, attack: 0.02
    });
    voicelike(t + 0.62, { type: "triangle", from: 523.25, dur: 0.22, gain: V.pipA, attack: 0.01 });
    voicelike(t + 0.63, { type: "triangle", from: 659.25, dur: 0.22, gain: V.pipB, attack: 0.01 });
  }

  function ambientStart() {
    var c = ensure();
    if (!c || amb) return;
    var t = c.currentTime;
    var src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    var lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1200;
    lp.Q.value = 0.7;
    var bed = c.createGain();
    bed.gain.setValueAtTime(0.0001, t);
    bed.gain.exponentialRampToValueAtTime(V.bed, t + 2.4);
    var sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 38;
    var sg = c.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(V.sub, t + 2.4);
    src.connect(lp);
    lp.connect(bed);
    bed.connect(bus);
    sub.connect(sg);
    sg.connect(bus);
    src.start(t);
    sub.start(t);
    amb = { src: src, sub: sub, lp: lp, bed: bed, sg: sg };
  }

  function ambientStop() {
    if (!amb || !ctx) return;
    var a = amb;
    amb = null;
    try {
      var t = ctx.currentTime;
      a.bed.gain.cancelScheduledValues(t);
      a.sg.gain.cancelScheduledValues(t);
      a.bed.gain.setTargetAtTime(0.0001, t, 0.25);
      a.sg.gain.setTargetAtTime(0.0001, t, 0.25);
    } catch (e) {}
    global.setTimeout(function () {
      try { a.src.stop(); } catch (e) {}
      try { a.sub.stop(); } catch (e) {}
      drop(a.src);
      drop(a.sub);
      drop(a.lp);
      drop(a.bed);
      drop(a.sg);
    }, 900);
  }

  function mute(on) {
    muted = on !== false;
    if (ctx && bus) {
      try { bus.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.02); } catch (e) {}
    }
    return muted;
  }

  function enable() {
    return !!ensure();
  }

  global.RustyAssembly = Object.freeze({
    enable: enable,
    mute: mute,
    servoUp: servoUp,
    servoDown: servoDown,
    ratchet: ratchet,
    clank: clank,
    tickMetal: tickMetal,
    powerUp: powerUp,
    ambientStart: ambientStart,
    ambientStop: ambientStop
  });
})(typeof window !== "undefined" ? window : globalThis);
