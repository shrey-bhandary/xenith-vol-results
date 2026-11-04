/* face.js
   Rusty's face as data. No canvas, no DOM, no dependencies.

   window.RustyFace
     .shapes(name, opts?)   one expression as draw-ready rectangles
     .blend(a, b, t)        two expressions or two shapes, mixed 0..1
     .talkCycle(t, intensity) mouth envelope + rects for speech at time t
     .names                 the fifteen canonical expressions
     .aliases               names older code calls, mapped
     .C                     the four inks, plus their alpha variants

   Every number is a rig unit, the same units as the part list in rusty.js.
   y is down. Rectangles are plain {x, y, w, h, c}; c is a CSS color string,
   alpha baked in, so a consumer only ever sets fillStyle and fillRect.

   Frames:
     shape.eyes.l / shape.eyes.r   origin at the eye centre, 3.2 square base
     shape.mouth                   origin at the mouth centre, frame 4.4 by 2.4
     to place them on the screen: eyes at x -+3.5, y -6.2; mouth at x 0, y -2.2

   A rig computes one face per frame, then draws eyeL from eyes.l, eyeR from
   eyes.r and the mouth from mouth. That is one shape for both eyes, not two.

   opts is optional and read live:
     gx, gy   gaze -1..1, shifts the pupil inside the plate
     t        seconds, drives wavy mouths and the scanning read head
     blink    0..1, closes the lid over the plate
     talk     0..1.2, or a talkCycle() result; replaces the mouth while speaking

   shapes(name) with no opts is cached and safe to hold. Treat shape.p and the
   rect arrays as read-only. blend() and shapes(name, opts) return new objects. */

(function (global) {
  "use strict";

  var VERSION = "1.0";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function mix(a, b, t) { return a + (b - a) * t; }

  /* ---------- ink ---------- */

  var C = {
    red: "#ff5c3b",
    cream: "#ffe9b0",
    amber: "#ffb15c",
    ink: "#0b0818"
  };

  function fade(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  C.redHalo = fade(C.red, 0.13);
  C.redEdge = fade(C.red, 0.85);
  C.redEdge2 = fade(C.red, 0.70);
  C.creamTrail = fade(C.cream, 0.35);

  /* ---------- the atlas ---------- */

  var EYE = ["open", "wide", "focus", "happy", "laugh", "sleepy", "x", "scan"];
  var MOUTH = ["flat", "tiny", "dot", "wavy", "smile", "open", "laugh", "grit", "droop", "slit"];

  /* One preset per expression, channels only. k is EYE, m is MOUTH.
     gl is halo thickness, lt / lb lid covers, tl lid tilt toward the outer
     corner, pw / ph pupil half extents, lp / rp a per-eye pupil override.
     lx / ly are how much of the gaze the pupil takes.
     mw / mh / mk size the mouth shape, mr / mp its animation rate and phase. */
  var EXPR = {
    boot: {
      k: 0, hw: 1.55, hh: 1.55, gl: .20, lt: .10, lb: 0, tl: 0,
      pw: .42, ph: .42, px: .10, py: -.05, lx: .30, ly: .20,
      m: 2, mw: 1.10
    },
    sleepy: {
      k: 5, hw: 1.60, hh: 1.60, gl: .10, lt: 2.30, lb: .35, tl: 0,
      pw: .35, ph: .28, px: .05, py: .95, lx: .10, ly: .08,
      m: 2, mw: .90
    },
    neutral: {
      k: 0, hw: 1.60, hh: 1.60, gl: .25, lt: .25, lb: .10, tl: 0,
      pw: .50, ph: .50, px: .05, py: .02, lx: .42, ly: .28, dr: .04, drR: .9,
      m: 0, mw: 4.40, mh: .80
    },
    listening: {
      k: 0, hw: 1.60, hh: 1.55, gl: .30, lt: .55, lb: .30, tl: .10,
      pw: .48, ph: .52, px: 0, py: .10, lx: .55, ly: .40,
      m: 1, mw: 1.60, mh: .55
    },
    curious: {
      k: 1, hw: 1.86, hh: 1.82, gl: .45, lt: .10, lb: 0, tl: 0,
      pw: .34, ph: .36, px: .15, py: -.25, lx: .50, ly: .40,
      m: 2, mw: 1.20
    },
    thinking: {
      k: 0, hw: 1.60, hh: 1.50, gl: .20, lt: .80, lb: .20, tl: -.18,
      pw: .42, ph: .44, px: -.35, py: -.45, lx: .22, ly: .20, dr: .06, drR: .7,
      m: 3, mr: 1.7, mp: .40
    },
    proud: {
      k: 3, hw: 1.55, hh: 1.55, gl: 0,
      m: 4, mw: 4.40, mh: .80, mk: 1.00
    },
    happy: {
      k: 3, hw: 1.60, hh: 1.60, gl: 0,
      m: 4, mw: 4.40, mh: .80, mk: .90
    },
    laugh: {
      k: 4, hw: 1.60, hh: 1.60, gl: 0,
      m: 6, mw: 3.40, mh: 2.20, mk: 1.00
    },
    confused: {
      k: 1, hw: 1.75, hh: 1.70, gl: .30, lt: .35, lb: 0, tl: .25,
      pw: .45, ph: .45, px: 0, py: 0, lp: [-.20, -.50], rp: [.25, .35],
      lx: .15, ly: .20, m: 3, mr: 8.4, mp: .55
    },
    concerned: {
      k: 2, hw: 1.50, hh: 1.35, gl: .15, lt: 1.15, lb: .45, tl: .55,
      pw: .60, ph: .60, px: .10, py: .35, lx: .18, ly: .16,
      m: 8, mw: 3.20, mh: .55
    },
    scanning: {
      k: 7, hw: 1.50, hh: 1.45, gl: .20, lt: .60, lb: .20, tl: 0,
      pw: .26, ph: 1.05, px: 0, py: .10, lx: 0, ly: 0,
      m: 9
    },
    excited: {
      k: 1, hw: 1.90, hh: 1.85, gl: .50, lt: 0, lb: 0, tl: 0,
      pw: .30, ph: .32, px: 0, py: 0, lx: .60, ly: .35,
      m: 5, mw: 2.80, mh: 1.80
    },
    presenting: {
      k: 0, hw: 1.60, hh: 1.60, gl: .25, lt: .25, lb: .10, tl: 0,
      pw: .50, ph: .50, px: 0, py: .10, lx: .45, ly: .30,
      m: 4, mw: 4.40, mh: .80, mk: .80
    },
    error: {
      k: 6, hw: 1.60, hh: 1.60, gl: 0, lt: 0, lb: 0, tl: 0,
      pw: .50, ph: .50, px: 0, py: 0, lx: 0, ly: 0, m: 7
    }
  };

  /* The order the demo, and a reader, should meet them in: wake, talk,
     react, fail. */
  var NAMES = [
    "boot", "sleepy", "neutral", "listening", "curious", "thinking",
    "proud", "happy", "laugh", "confused", "concerned", "scanning",
    "excited", "presenting", "error"
  ];

  /* intro.js and rusty.js have been calling these for a while. found and
     celebrating belong to the screen stamp; proud is the face under it. */
  var ALIAS = {
    idle: "neutral",
    greet: "listening",
    menu: "curious",
    assemble: "boot",
    gate: "scanning",
    handoff: "proud",
    celebrating: "proud",
    found: "proud"
  };

  /* ---------- rect builders, all in the part frames ---------- */

  function R(x, y, w, h, c) { return { x: x, y: y, w: w, h: h, c: c }; }

  function plate(out, hw, hh, glow) {
    if (glow > 0) {
      out.push(R(-hw - glow, -hh - glow, (hw + glow) * 2, (hh + glow) * 2, C.redHalo));
    }
    out.push(R(-hw, -hh, hw * 2, hh * 2, C.red));
  }

  function pupil(out, cx, cy, phw, phh) {
    out.push(R(cx - phw, cy - phh, phw * 2, phh * 2, C.ink));
    out.push(R(cx - phw + .14, cy - phh + .14, .30, .30, C.cream));
  }

  function lidTop(out, cover, tilt, side) {
    if (cover <= .02) return;
    for (var i = 0; i < 4; i++) {
      var x = -1.7 + i * .85;
      var f = ((i + .5) / 4) * 2 - 1;
      var h = clamp(cover + tilt * f * side, 0, 3.2);
      out.push(R(x, -1.75, .85, h + .15, C.ink));
      out.push(R(x, -1.6 + h - .22, .85, .22, C.redEdge));
    }
  }

  function lidBottom(out, cover) {
    if (cover <= .02) return;
    var h = Math.min(3.2, cover);
    out.push(R(-1.7, 1.6 - h, 3.4, h + .15, C.ink));
    out.push(R(-1.7, 1.6 - h - .18, 3.4, .18, C.redEdge2));
  }

  function happyEye(out, w) {
    out.push(R(-w, -.30, w * 2, .80, C.red));
    out.push(R(-w, -1.70, .90, 1.50, C.red));
    out.push(R(w - .90, -1.70, .90, 1.50, C.red));
  }

  function laughEye(out, side) {
    out.push(R(-1.70, .05, 3.40, .85, C.red));
    out.push(R(-1.70, -1.00, .95, 1.25, C.red));
    out.push(R(.75, -1.00, .95, 1.25, C.red));
    out.push(R(side * 1.85 - .20, -1.45, .40, .40, C.cream));
  }

  function xEye(out) {
    out.push(R(-1.55, -1.55, 3.10, 3.10, C.red));
    for (var i = 0; i < 7; i++) {
      var o = -1.30 + i * .38;
      out.push(R(o, o, .34, .34, C.ink));
      out.push(R(-o - .34, o, .34, .34, C.ink));
    }
    out.push(R(-.17, -.17, .34, .34, C.cream));
  }

  function eyeRects(p, side, o) {
    var out = [];
    var k = num(p.k, 0);
    var hw = num(p.hw, 1.60);
    var hh = num(p.hh, 1.60);

    if (k === 3) { happyEye(out, hw); return out; }
    if (k === 4) { laughEye(out, side); return out; }
    if (k === 6) { xEye(out); return out; }

    plate(out, hw, hh, num(p.gl, 0));

    var lt = num(p.lt, 0), lb = num(p.lb, 0), tl = num(p.tl, 0);
    if (o.blink > 0) {
      var close = o.blink * 1.6;
      lt = Math.max(lt, close);
      lb = Math.max(lb, close);
    }

    if (k === 7) {
      var sx = num(p.px, 0) + (o.t > 0 ? Math.sin(o.t * 4.6) * .62 : 0);
      pupil(out, sx, .10, .26, 1.05);
      out.push(R(sx - .40, -.85, .12, 1.70, C.creamTrail));
    } else {
      var base = (side < 0 ? p.lp : p.rp) || [num(p.px, 0), num(p.py, 0)];
      var pw = num(p.pw, .50), ph = num(p.ph, .50);
      var cx = base[0] + o.gx * num(p.lx, .42);
      var cy = base[1] + o.gy * num(p.ly, .28);
      var dr = num(p.dr, 0);
      if (dr > 0) cx += Math.sin(o.t * num(p.drR, .9)) * dr;
      var mx = Math.max(.04, hw - pw * .92);
      var my = Math.max(.04, hh - ph * .92);
      pupil(out, clamp(cx, -mx, mx), clamp(cy, -my, my), pw, ph);
    }

    lidTop(out, lt, tl, side);
    lidBottom(out, lb);
    return out;
  }

  /* ---------- mouths ---------- */

  function mouthFlat(out, w, h) {
    out.push(R(-w / 2, -h / 2, w, h, C.amber));
  }

  function mouthTiny(out, w, h) {
    out.push(R(-w / 2, -.10, w, h, C.amber));
    out.push(R(-w * .28, .04, w * .56, .20, C.ink));
  }

  function mouthDot(out, s) {
    out.push(R(-s / 2, -.20, s, s, C.amber));
  }

  function mouthWavy(out, ph) {
    var a = Math.sin(ph) * .22, b = Math.sin(ph + 2.1) * .22, c = Math.sin(ph + 4.2) * .22;
    out.push(R(-2.20, -.15 + a, 1.40, .90, C.amber));
    out.push(R(-.60, .25 + b, 1.20, .90, C.amber));
    out.push(R(.80, -.15 + c, 1.40, .90, C.amber));
  }

  function mouthSmile(out, k) {
    out.push(R(-2.20, -.25 - k * .65, 1.00, 1.00, C.amber));
    out.push(R(1.20, -.25 - k * .65, 1.00, 1.00, C.amber));
    out.push(R(-1.20, .10, 2.40, .90 * k, C.amber));
  }

  function mouthOpen(out, w, h) {
    out.push(R(-w / 2, -h / 2, w, h, C.amber));
    out.push(R(-w * .28, -h * .10, w * .56, h * .36, C.ink));
  }

  function mouthLaugh(out, k) {
    out.push(R(-1.70, -1.10, 3.40, 2.20 * k, C.amber));
    out.push(R(-1.10, -.55, 2.20, .90 * k, C.ink));
    out.push(R(-1.30, -.55, 2.60, .25, C.cream));
  }

  function mouthGrit(out) {
    out.push(R(-1.60, -.55, 3.20, 1.10, C.amber));
    for (var i = 0; i < 3; i++) out.push(R(-1.00 + i * .90, -.55, .18, 1.10, C.ink));
  }

  function mouthDroop(out, w, h) {
    out.push(R(-w / 2, .05, w, h, C.amber));
    out.push(R(-w / 2 - .35, .35, .35, h, C.amber));
    out.push(R(w / 2, .35, .35, h, C.amber));
  }

  function mouthSlit(out, x) {
    out.push(R(-2.20, .15, 4.40, .50, C.amber));
    out.push(R(x, .15, .50, .50, C.ink));
  }

  function mouthTalk(m, w) {
    var out = [];
    var h = .35 + m * 1.10;
    out.push(R(-w / 2, -h / 2, w, h, C.amber));
    if (h > .80) out.push(R(-w * .27, -h * .18, w * .54, h * .40, C.ink));
    return out;
  }

  function mouthRects(p, t) {
    var out = [];
    var mw = num(p.mw, 4.40), mh = num(p.mh, .80);
    switch (num(p.m, 0)) {
      case 1: mouthTiny(out, mw, mh); break;
      case 2: mouthDot(out, mw); break;
      case 3: mouthWavy(out, t * num(p.mr, 2.2) + num(p.mp, 0)); break;
      case 4: mouthSmile(out, num(p.mk, 1)); break;
      case 5: mouthOpen(out, mw, mh); break;
      case 6: mouthLaugh(out, num(p.mk, 1)); break;
      case 7: mouthGrit(out); break;
      case 8: mouthDroop(out, mw, mh); break;
      case 9: mouthSlit(out, t > 0 ? ((t * 1.1) % 3.7) - 1.85 : 0); break;
      default: mouthFlat(out, mw, mh);
    }
    return out;
  }

  /* ---------- shape assembly ---------- */

  var cache = {};

  function resolveName(n) {
    var key = typeof n === "string" ? n.toLowerCase() : "";
    key = ALIAS[key] || key;
    return EXPR[key] ? key : "neutral";
  }

  function make(key, p, opts) {
    var o = opts ? {
      gx: clamp(num(opts.gx, 0), -1, 1),
      gy: clamp(num(opts.gy, 0), -1, 1),
      t: Math.max(0, num(opts.t, 0)),
      blink: clamp(num(opts.blink, 0), 0, 1)
    } : { gx: 0, gy: 0, t: 0, blink: 0 };

    var talking = false;
    var talkM = 0;
    if (opts && opts.talk != null) {
      talkM = typeof opts.talk === "object" ? num(opts.talk.m, 0) : num(opts.talk, 0);
      talking = typeof opts.talk === "object" || talkM > 0;
    }

    var mouth;
    var kind;
    if (talking) {
      talkM = clamp(talkM, 0, 1.2);
      kind = "talk";
      mouth = mouthTalk(talkM, clamp(3.0 + talkM * .6, 2.8, 3.8));
    } else {
      kind = MOUTH[num(p.m, 0)] || "flat";
      mouth = mouthRects(p, o.t);
    }

    return {
      name: key,
      eyeKind: EYE[num(p.k, 0)] || "open",
      mouthKind: kind,
      eyes: {
        l: eyeRects(p, -1, o),
        r: eyeRects(p, 1, o)
      },
      mouth: mouth,
      p: p
    };
  }

  function shapes(name, opts) {
    var key = resolveName(name);
    if (!opts) {
      return cache[key] || (cache[key] = make(key, EXPR[key], null));
    }
    return make(key, EXPR[key], opts);
  }

  /* ---------- blending ---------- */

  function asShape(v) {
    if (v && v.eyes && v.mouth) return v;
    return shapes(v);
  }

  function lpOf(p) {
    return p.lp || [num(p.px, 0), num(p.py, 0)];
  }

  function rpOf(p) {
    return p.rp || [num(p.px, 0), num(p.py, 0)];
  }

  function blend(a, b, t) {
    t = clamp(num(t, .5), 0, 1);
    var A = asShape(a);
    var B = asShape(b);
    if (t <= 0) return A;
    if (t >= 1) return B;

    var pa = A.p, pb = B.p;
    var la = lpOf(pa), lb = lpOf(pb);
    var ra = rpOf(pa), rb = rpOf(pb);

    /* Kinds snap at the half. Every number under them crossfades, so an eye
       opening into a happy bracket keeps its plate size until the bracket
       lands, and the mouth shape only swaps on a closed frame. */
    var p = {
      k: t < .5 ? num(pa.k, 0) : num(pb.k, 0),
      hw: mix(num(pa.hw, 1.6), num(pb.hw, 1.6), t),
      hh: mix(num(pa.hh, 1.6), num(pb.hh, 1.6), t),
      gl: mix(num(pa.gl, 0), num(pb.gl, 0), t),
      lt: mix(num(pa.lt, 0), num(pb.lt, 0), t),
      lb: mix(num(pa.lb, 0), num(pb.lb, 0), t),
      tl: mix(num(pa.tl, 0), num(pb.tl, 0), t),
      pw: mix(num(pa.pw, .5), num(pb.pw, .5), t),
      ph: mix(num(pa.ph, .5), num(pb.ph, .5), t),
      px: mix(num(pa.px, 0), num(pb.px, 0), t),
      py: mix(num(pa.py, 0), num(pb.py, 0), t),
      lx: mix(num(pa.lx, .42), num(pb.lx, .42), t),
      ly: mix(num(pa.ly, .28), num(pb.ly, .28), t),
      dr: mix(num(pa.dr, 0), num(pb.dr, 0), t),
      drR: mix(num(pa.drR, .9), num(pb.drR, .9), t),
      lp: [mix(la[0], lb[0], t), mix(la[1], lb[1], t)],
      rp: [mix(ra[0], rb[0], t), mix(ra[1], rb[1], t)],
      m: t < .5 ? num(pa.m, 0) : num(pb.m, 0),
      mw: mix(num(pa.mw, 4.4), num(pb.mw, 4.4), t),
      mh: mix(num(pa.mh, .8), num(pb.mh, .8), t),
      mk: mix(num(pa.mk, 1), num(pb.mk, 1), t),
      mr: mix(num(pa.mr, 2.2), num(pb.mr, 2.2), t),
      mp: mix(num(pa.mp, 0), num(pb.mp, 0), t)
    };

    var f = make(A.name + "+" + B.name, p, null);
    f.mix = t;
    f.a = A.name;
    f.b = B.name;
    return f;
  }

  /* ---------- talk ---------- */

  function hash(n) {
    n = (n + 0x9e3779b9) | 0;
    n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
    n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
    return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
  }

  /* A syllable clock, not a sine loop. Each step opens on a fast attack,
     decays over the rest of its slot, and a few slots take a consonant dip
     through the middle. Peak heights vary per syllable off a hash, so no two
     flaps are the same shape. intensity 0 shuts the mouth and leaves a slit. */
  function talkCycle(t, intensity) {
    t = Math.max(0, num(t, 0));
    var k = clamp(num(intensity, 1), 0, 1);
    var rate = 4.6 + k * 1.8;
    var step = t * rate;
    var i = Math.floor(step);
    var f = step - i;
    var h = hash(i);
    var h2 = hash(i + 71);

    var attack = Math.min(1, f / .14);
    var decay = Math.pow(Math.max(0, 1 - f) / .86, .72);
    var m = attack * decay * (.55 + h * .55) * k;

    if (h2 < .24 && f > .52 && f < .66) m *= .18;
    m += Math.sin(t * 53.7) * .035 * k;
    m = clamp(m, 0, 1.2);

    var w = clamp(3.0 + m * .6, 2.8, 3.8);
    return {
      m: m,
      w: w,
      h: .35 + m * 1.10,
      open: m > .55,
      syllable: i,
      rects: mouthTalk(m, w)
    };
  }

  /* ---------- api ---------- */

  var api = {
    version: VERSION,
    C: C,
    names: NAMES,
    aliases: ALIAS,
    eyeKinds: EYE,
    mouthKinds: MOUTH,
    shapes: shapes,
    blend: blend,
    talkCycle: talkCycle
  };

  global.RustyFace = api;
  return api;
})(typeof window !== "undefined" ? window : globalThis);
