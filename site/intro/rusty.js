/* rusty.js
   Rusty, the Xenith robot. Canvas 2D, no dependencies, no DOM beyond the canvas.

   window.RustyRig
     .mount(canvas, opts?)  attach a canvas, returns the rig
     .setState(name)        boot neutral listening curious thinking proud happy
                            laugh excited confused concerned scanning presenting
                            sleepy error celebrating, plus the intro aliases
                            idle greet menu assemble gate handoff found void
     .setGaze(x, y)         normalized -1..1, -1 is left and up
     .update(dtMs)          ms, advances the springs and draws (intro path)
     .draw(bob, breathe)    unitless scrub, draws one frame, no advance
     .draw(t, dt)           seconds + seconds/ms delta, advances then draws
     .frame(t, dt)          explicit seconds frame
     .assemble(0..1)        scrubs the boot, head stays off until the drop
     .drop(0..1)            scrubs just the head drop
     .face(text, ms)        screen stamp, a long stamp hides the eyes
     .talk(index, level)    mouth from a talk index, syllables off a hash
     .say(text, cps)        typed line, mouth follows the real characters
     .blink(ms) .nod()      authored beats
     .celebrate()           spin, arms up, confetti, FOUND
     .resize(w, h) .destroy()

   Face: window.RustyFace is used when a page loads face.js before this file.
   With no face.js the same part frames are painted by the bundled fallback.
   Pupils move inside the lens. The eye plates never move.
   Antenna is parented to the head, so the drop carries it.
   Onsets stagger: eye at 0, pupil and mouth at 16ms, head at 33ms, body at 50ms.
   Treads are outside the bob; the body bobs off the treads, never with them. */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;

  var C = {
    white: "#e9e3d2",
    shell2: "#d3ccbb",
    shade: "#bdb6a4",
    dark: "#241d3a",
    ink: "#0b0818",
    red: "#ff5c3b",
    amber: "#ffb15c",
    cream: "#ffe9b0",
    violet: "#7b5cff",
    mint: "#9ef0c0"
  };

  var HEAD_AT = 0.55;      /* asm where the head starts its drop */
  var DROP_SPAN = 0.45;    /* asm the drop occupies */
  var ONSET_DETAIL = 0.016;
  var ONSET_HEAD = 0.033;
  var ONSET_BODY = 0.050;
  var GROUND_Y = 22.3;     /* tread contact, the pivot for lean and squash */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInQuad(t) { return t * t; }
  function damp(a, b, lambda, dt) { return a + (b - a) * (1 - Math.exp(-lambda * dt)); }
  function hash(n) {
    n = (n + 0x9e3779b9) | 0;
    n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
    n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
    return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
  }

  /* ---------- 2D affine ---------- */

  function mTrans(x, y) { return [1, 0, 0, 1, x, y]; }
  function mRot(r) {
    var c = Math.cos(r), s = Math.sin(r);
    return [c, s, -s, c, 0, 0];
  }
  function mScale(x, y) { return [x, 0, 0, y, 0, 0]; }
  function mMul(m, n) {
    return [
      m[0] * n[0] + m[2] * n[1],
      m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3],
      m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4],
      m[1] * n[4] + m[3] * n[5] + m[5]
    ];
  }
  function mPoint(m, x, y) {
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }

  /* ---------- spring ---------- */

  function Spring(k, d) {
    this.x = 0;
    this.v = 0;
    this.k = k;
    this.d = d;
  }
  Spring.prototype.to = function (target, dt) {
    var a = (target - this.x) * this.k - this.v * this.d;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  };
  Spring.prototype.kick = function (v) { this.v += v; };

  /* ---------- parts ----------
     x, y are the attachment point in the parent frame. px, py is the pivot
     inside the rectangle. The antenna hangs off the head, so every head
     motion and the drop include it. Head pieces use a step reveal at the
     drop, never a fade. */

  var PARTS = [
    { id: "head", parent: "root", x: 0, y: 0, w: 20, h: 15, px: 10, py: 15, fill: C.white, at: HEAD_AT, head: true },
    { id: "bezel", parent: "head", x: 0, y: -1, w: 17.6, h: 12.6, px: 8.8, py: 12.6, fill: C.shade, at: HEAD_AT, head: true },
    { id: "screen", parent: "bezel", x: 0, y: -1.6, w: 15.2, h: 10, px: 7.6, py: 10, fill: C.ink, at: HEAD_AT, head: true, paint: paintScreen },
    { id: "eyeL", parent: "screen", x: -3.5, y: -6.2, w: 3.2, h: 3.2, px: 1.6, py: 1.6, fill: C.red, at: HEAD_AT, head: true, paint: paintEye },
    { id: "eyeR", parent: "screen", x: 3.5, y: -6.2, w: 3.2, h: 3.2, px: 1.6, py: 1.6, fill: C.red, at: HEAD_AT, head: true, paint: paintEye },
    { id: "mouth", parent: "screen", x: 0, y: -2.2, w: 4.4, h: 2.4, px: 2.2, py: 1.2, fill: C.amber, at: HEAD_AT, head: true, paint: paintMouth },
    { id: "earL", parent: "head", x: -10, y: -7.4, w: 2.2, h: 6, px: 2.2, py: 3, fill: C.shade, at: HEAD_AT, head: true, ear: true },
    { id: "earR", parent: "head", x: 10, y: -7.4, w: 2.2, h: 6, px: 0, py: 3, fill: C.shade, at: HEAD_AT, head: true, ear: true },
    { id: "antBase", parent: "head", x: 0, y: -14.6, w: 3, h: 2, px: 1.5, py: 2, fill: C.shade, at: HEAD_AT, head: true },
    { id: "antRod", parent: "antBase", x: 0, y: -2, w: 2, h: 8, px: 1, py: 8, fill: C.amber, at: HEAD_AT, head: true },
    { id: "bulb", parent: "antRod", x: 0, y: -8, w: 4, h: 3, px: 2, py: 3, fill: C.cream, at: HEAD_AT, head: true },
    { id: "glow", parent: "bulb", x: 0, y: -1.5, w: 8, h: 7, px: 4, py: 3.5, fill: C.amber, at: HEAD_AT, head: true, paint: paintGlow },
    { id: "neck", parent: "root", x: 0, y: 0, w: 5, h: 4, px: 2.5, py: 0, fill: C.shade, at: 0.42 },
    { id: "body", parent: "root", x: 0, y: 4, w: 14, h: 12.5, px: 7, py: 0, fill: C.white, shade: C.shell2, at: 0.34, paint: paintBody },
    { id: "chestScreen", parent: "body", x: 0, y: 1.2, w: 10.4, h: 8.4, px: 5.2, py: 0, fill: C.ink, at: 0.36, paint: paintChest },
    { id: "chestPixel", parent: "chestScreen", x: 0, y: 4.2, w: 2, h: 2, px: 1, py: 1, fill: C.amber, at: 0.38, paint: paintChestPixel },
    { id: "armLU", parent: "root", x: -7, y: 5.2, w: 3, h: 7, px: 1.5, py: 0.6, fill: C.white, at: 0.40 },
    { id: "armLF", parent: "armLU", x: 0, y: 6.6, w: 2.8, h: 6, px: 1.4, py: 0, fill: C.shade, at: 0.42 },
    { id: "handL", parent: "armLF", x: 0, y: 6, w: 3.4, h: 3.2, px: 1.7, py: 0, fill: C.amber, at: 0.44 },
    { id: "armRU", parent: "root", x: 7, y: 5.2, w: 3, h: 7, px: 1.5, py: 0.6, fill: C.white, at: 0.42 },
    { id: "armRF", parent: "armRU", x: 0, y: 6.6, w: 2.8, h: 6, px: 1.4, py: 0, fill: C.shade, at: 0.44 },
    { id: "handR", parent: "armRF", x: 0, y: 6, w: 3.4, h: 3.2, px: 1.7, py: 0, fill: C.amber, at: 0.46 },
    { id: "treadL", parent: "root", x: -5.6, y: 16.3, w: 7.4, h: 6, px: 3.7, py: 0, fill: C.dark, at: 0.28, tread: true, paint: paintTread },
    { id: "treadR", parent: "root", x: 5.6, y: 16.3, w: 7.4, h: 6, px: 3.7, py: 0, fill: C.dark, at: 0.28, tread: true, paint: paintTread },
    { id: "port", parent: "root", x: 6.9, y: 5, w: 3, h: 4.6, px: 1.5, py: 1, fill: C.shade, at: 0.46 },
    { id: "cable", parent: "port", x: 0, y: 4.6, w: 1.4, h: 9, px: 0.7, py: 0, fill: C.dark, at: 0.48, paint: paintCable }
  ];

  /* draw order, back to front. the antenna sits behind the head, the folded
     arms sit in front of it so a hand can rest on the jaw. */
  var DRAW = [
    "cable", "port", "earL", "earR",
    "treadL", "treadR", "neck", "body", "chestScreen", "chestPixel",
    "head", "bezel", "screen", "eyeL", "eyeR", "mouth",
    "antBase", "antRod", "bulb",
    "armLU", "armLF", "handL", "armRU", "armRF", "handR",
    "glow"
  ];

  /* ---------- states ----------
     head, lean, ant, arms and elbows are degrees. arms positive is outward.
     text sits on the face screen. four or more characters take the full screen
     and hide the eyes. eye and mouth name the bundled fallback painters; the
     face atlas resolves the state name first whenever it is present. */

  var STATES = {
    boot: {
      head: 0, lean: 0, ant: 0, armL: 3, armR: 3, elbL: 2, elbR: 2,
      eye: "wide", mouth: "dot", bob: 0, rate: 0.8, lift: 0, text: "", chest: 0.2
    },
    neutral: {
      head: 0, lean: 0, ant: 0, armL: 6, armR: 6, elbL: 9, elbR: 9,
      eye: "open", mouth: "flat", bob: 0.55, rate: 1, lift: 0, text: "", chest: 0.5
    },
    listening: {
      head: 2, lean: 1.5, ant: 4, armL: 8, armR: 8, elbL: 12, elbR: 12,
      eye: "open", mouth: "tiny", bob: 0.35, rate: 1, lift: 0, text: "", chest: 0.6
    },
    curious: {
      head: -5, lean: -2, ant: 10, armL: 6, armR: 22, elbL: 10, elbR: 40,
      eye: "wide", mouth: "dot", bob: 0.7, rate: 1.2, lift: -1.4, text: "?", chest: 0.65
    },
    thinking: {
      head: 7, lean: 2, ant: -8, armL: 6, armR: 100, elbL: 9, elbR: 117,
      eye: "open", mouth: "wavy", bob: 0.45, rate: 0.9, lift: 0, text: "...", chest: 0.35
    },
    proud: {
      head: -3, lean: 0, ant: 7, armL: 20, armR: 20, elbL: 8, elbR: 8,
      eye: "happy", mouth: "smile", bob: 0.65, rate: 1.1, lift: -1.5, text: "", chest: 0.9
    },
    happy: {
      head: -3, lean: -1, ant: 7, armL: 16, armR: 16, elbL: 14, elbR: 14,
      eye: "happy", mouth: "smile", bob: 0.65, rate: 1.1, lift: -1.5, text: "", chest: 0.9
    },
    laugh: {
      head: -6, lean: -2, ant: 14, armL: 46, armR: 46, elbL: 20, elbR: 20,
      eye: "laugh", mouth: "laugh", bob: 1.4, rate: 3, lift: -2.5, text: "ha", chest: 1
    },
    excited: {
      head: -2, lean: -3, ant: 15, armL: 30, armR: 30, elbL: 20, elbR: 20,
      eye: "wide", mouth: "open", bob: 1.15, rate: 2.6, lift: -2, text: "", chest: 1
    },
    confused: {
      head: 9, lean: 3.5, ant: -14, armL: 26, armR: 26, elbL: 38, elbR: 38,
      eye: "wide", mouth: "wavy", bob: 0.5, rate: 0.8, lift: 0, text: "?", chest: 0.3
    },
    concerned: {
      head: 4, lean: 2.5, ant: -4, armL: 12, armR: 12, elbL: 16, elbR: 16,
      eye: "focus", mouth: "droop", bob: 0.3, rate: 0.9, lift: 0, text: "", chest: 0.4
    },
    scanning: {
      head: 0, lean: 0, ant: 0, armL: 10, armR: 10, elbL: 14, elbR: 14,
      eye: "scan", mouth: "slit", bob: 0.65, rate: 1, lift: 0, text: "...", chest: 0.7
    },
    presenting: {
      head: 0, lean: -1, ant: 5, armL: 42, armR: 42, elbL: 26, elbR: 26,
      eye: "open", mouth: "smile", bob: 0.6, rate: 1, lift: -0.5, text: "", chest: 0.8
    },
    sleepy: {
      head: 6, lean: 3, ant: -10, armL: 4, armR: 4, elbL: 6, elbR: 6,
      eye: "sleepy", mouth: "dot", bob: 0.2, rate: 0.6, lift: 1.5, text: "", chest: 0.25
    },
    error: {
      head: 0, lean: 0, ant: 0, armL: 3, armR: 3, elbL: 2, elbR: 2,
      eye: "x", mouth: "grit", bob: 0, rate: 0, lift: 0, text: "err", chest: 0.15
    },
    celebrating: {
      head: -6, lean: 0, ant: 19, armL: 118, armR: 118, elbL: 8, elbR: 8,
      eye: "happy", mouth: "laugh", bob: 1.3, rate: 3, lift: -2.5, text: "FOUND", chest: 1
    }
  };

  var ALIAS = {
    idle: "neutral",
    greet: "listening",
    menu: "curious",
    assemble: "boot",
    gate: "scanning",
    handoff: "proud",
    found: "proud",
    void: "boot",
    pick: "listening",
    success: "celebrating",
    choose: "listening"
  };

  /* ---------- fallback face ----------
     Used only when window.RustyFace is absent. Same frames and inks as
     face.js: eyes 3.2 square, mouth 4.4 by 2.4, y down. */

  var FB_ALIAS = {
    idle: "neutral", greet: "listening", menu: "curious", assemble: "boot",
    gate: "scanning", handoff: "proud", found: "proud", celebrating: "proud",
    success: "celebrating", void: "boot", pick: "listening", happy: "happy"
  };

  var FB_EYE = {
    open: { k: 0, hw: 1.60, hh: 1.60, glow: 0.25, lt: 0.25, lb: 0.10, tilt: 0, pw: 0.50, ph: 0.50, px: 0.05, py: 0.02, lx: 0.55, ly: 0.40 },
    wide: { k: 1, hw: 1.86, hh: 1.82, glow: 0.45, lt: 0.10, lb: 0, tilt: 0, pw: 0.34, ph: 0.36, px: 0.15, py: -0.25, lx: 0.55, ly: 0.40 },
    focus: { k: 2, hw: 1.50, hh: 1.35, glow: 0.15, lt: 1.15, lb: 0.45, tilt: 0.55, pw: 0.60, ph: 0.60, px: 0.10, py: 0.35, lx: 0.30, ly: 0.30 },
    happy: { k: 3, hw: 1.55, hh: 1.55, glow: 0 },
    laugh: { k: 4, hw: 1.60, hh: 1.60, glow: 0 },
    sleepy: { k: 5, hw: 1.60, hh: 1.60, glow: 0.10, lt: 2.30, lb: 0.35, tilt: 0, pw: 0.35, ph: 0.28, px: 0.05, py: 0.95, lx: 0.10, ly: 0.08 },
    x: { k: 6, hw: 1.60, hh: 1.60, glow: 0 },
    scan: { k: 7, hw: 1.50, hh: 1.45, glow: 0.20, lt: 0.60, lb: 0.20 }
  };

  function fbEyeSpec() {
    return FB_EYE[cur.eye] || FB_EYE.open;
  }

  function fbPlate(x, y, w, h, a) {
    if (a) { ctx.fillStyle = "rgba(255,92,59,.13)"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
    ctx.fillStyle = C.red;
    ctx.fillRect(x, y, w, h);
  }

  function fbPupil(cx, cy, pw, ph) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(cx - pw, cy - ph, pw * 2, ph * 2);
    ctx.fillStyle = C.cream;
    ctx.fillRect(cx - pw + 0.14, cy - ph + 0.14, 0.30, 0.30);
  }

  function fbLidTop(cover, tilt, side) {
    if (cover <= 0.02) return;
    for (var i = 0; i < 4; i++) {
      var x = -1.7 + i * 0.85;
      var f = ((i + 0.5) / 4) * 2 - 1;
      var h = clamp(cover + tilt * f * side, 0, 3.2);
      ctx.fillStyle = C.ink;
      ctx.fillRect(x, -1.75, 0.85, h + 0.15);
      ctx.fillStyle = "rgba(255,92,59,.85)";
      ctx.fillRect(x, -1.6 + h - 0.22, 0.85, 0.22);
    }
  }

  function fbLidBottom(cover) {
    if (cover <= 0.02) return;
    var h = Math.min(3.2, cover);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-1.7, 1.6 - h, 3.4, h + 0.15);
    ctx.fillStyle = "rgba(255,92,59,.70)";
    ctx.fillRect(-1.7, 1.6 - h - 0.18, 3.4, 0.18);
  }

  function fbEye(p) {
    var e = fbEyeSpec();
    var side = p && p.id === "eyeR" ? 1 : -1;

    if (blinkT > 0 && e.k !== 6 && state !== "celebrating" && state !== "error") {
      ctx.fillStyle = C.red;
      ctx.fillRect(-1.6, -0.4, 3.2, 0.8);
      return;
    }

    if (e.k === 3) {
      ctx.fillStyle = C.red;
      ctx.fillRect(-e.hw, -0.30, e.hw * 2, 0.80);
      ctx.fillRect(-e.hw, -1.70, 0.90, 1.50);
      ctx.fillRect(e.hw - 0.90, -1.70, 0.90, 1.50);
      return;
    }
    if (e.k === 4) {
      ctx.fillStyle = C.red;
      ctx.fillRect(-1.70, 0.05, 3.40, 0.85);
      ctx.fillRect(-1.70, -1.00, 0.95, 1.25);
      ctx.fillRect(0.75, -1.00, 0.95, 1.25);
      ctx.fillStyle = C.cream;
      ctx.fillRect(1.65, -1.45, 0.40, 0.40);
      return;
    }
    if (e.k === 6) {
      ctx.fillStyle = C.red;
      ctx.fillRect(-1.55, -1.55, 3.10, 3.10);
      ctx.fillStyle = C.ink;
      for (var j = 0; j < 7; j++) {
        var o = -1.30 + j * 0.38;
        ctx.fillRect(o, o, 0.34, 0.34);
        ctx.fillRect(-o - 0.34, o, 0.34, 0.34);
      }
      ctx.fillStyle = C.cream;
      ctx.fillRect(-0.17, -0.17, 0.34, 0.34);
      return;
    }

    fbPlate(-e.hw, -e.hh, e.hw * 2, e.hh * 2, e.glow);

    if (e.k === 7) {
      var sx = Math.sin(time * 4.6) * 0.62;
      ctx.fillStyle = C.ink;
      ctx.fillRect(sx - 0.26, -0.95, 0.52, 2.10);
      ctx.fillStyle = C.cream;
      ctx.fillRect(sx - 0.40, -0.85, 0.12, 1.70);
    } else {
      var cx = e.px + gx * e.lx;
      var cy = e.py + gy * e.ly;
      var mx = Math.max(0.04, e.hw - e.pw * 0.92);
      var my = Math.max(0.04, e.hh - e.ph * 0.92);
      fbPupil(clamp(cx, -mx, mx), clamp(cy, -my, my), e.pw, e.ph);
    }

    fbLidTop(e.lt, e.tilt, side);
    fbLidBottom(e.lb);
  }

  function fbTalk(m, w) {
    var h = 0.35 + m * 1.10;
    if (h <= 0.02) return;
    ctx.fillStyle = C.amber;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    if (h > 0.80) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(-w * 0.27, -h * 0.18, w * 0.54, h * 0.40);
    }
  }

  function fbMouth() {
    var m = mouthState();
    var kind = talking() ? "talk" : m.mouth;
    var t = time;
    ctx.fillStyle = C.amber;

    if (kind === "talk") { fbTalk(talkM, talkW); return; }
    if (kind === "flat") {
      ctx.fillRect(-2.2, -0.4, 4.4, 0.8);
    } else if (kind === "tiny") {
      ctx.fillRect(-0.8, -0.1, 1.6, 0.55);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-0.45, 0.04, 0.9, 0.2);
    } else if (kind === "dot") {
      ctx.fillRect(-0.6, -0.6, 1.2, 1.2);
    } else if (kind === "wavy") {
      ctx.fillRect(-2.2, -0.15 + Math.sin(t * 2.2) * 0.22, 1.4, 0.9);
      ctx.fillRect(-0.6, 0.25 + Math.sin(t * 2.2 + 2.1) * 0.22, 1.2, 0.9);
      ctx.fillRect(0.8, -0.15 + Math.sin(t * 2.2 + 4.2) * 0.22, 1.4, 0.9);
    } else if (kind === "smile") {
      ctx.fillRect(-2.2, -0.9, 1, 1);
      ctx.fillRect(1.2, -0.9, 1, 1);
      ctx.fillRect(-1.2, 0.1, 2.4, 0.9);
    } else if (kind === "open") {
      ctx.fillRect(-1.4, -0.9, 2.8, 1.8);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-0.8, -0.18, 1.6, 0.64);
    } else if (kind === "laugh") {
      ctx.fillRect(-1.7, -1.1, 3.4, 2.2);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-1.1, -0.55, 2.2, 0.9);
      ctx.fillStyle = C.cream;
      ctx.fillRect(-1.3, -0.55, 2.6, 0.25);
    } else if (kind === "grit") {
      ctx.fillRect(-1.6, -0.55, 3.2, 1.1);
      ctx.fillStyle = C.ink;
      for (var i = 0; i < 3; i++) ctx.fillRect(-1.0 + i * 0.9, -0.55, 0.18, 1.1);
    } else if (kind === "droop") {
      ctx.fillRect(-1.6, 0.05, 3.2, 0.55);
      ctx.fillRect(-1.95, 0.35, 0.35, 0.55);
      ctx.fillRect(1.6, 0.35, 0.35, 0.55);
    } else if (kind === "slit") {
      ctx.fillRect(-2.2, 0.15, 4.4, 0.5);
      ctx.fillStyle = C.ink;
      ctx.fillRect(((t * 1.1) % 3.7) - 1.85, 0.15, 0.5, 0.5);
    } else {
      ctx.fillRect(-2.2, -0.4, 4.4, 0.8);
    }
  }

  /* ---------- rig state ---------- */

  var rig = {
    state: "boot",
    phase: "boot",
    reduced: false,
    parts: PARTS.length,
    version: "2.0",
    mount: mount,
    setState: setState,
    setGaze: setGaze,
    update: update,
    frame: frameStep,
    draw: draw,
    celebrate: celebrate,
    assemble: assemble,
    drop: drop,
    face: face,
    talk: talk,
    say: say,
    blink: blink,
    nod: nod,
    resize: resize,
    destroy: destroy
  };

  var cv = null, ctx = null;
  var W = 320, H = 360, scale = 6, dpr = 1, hair = 1 / 6;
  var time = 0;
  var state = "boot";
  var cur = STATES.boot;
  var prevStateName = "boot";
  var onsetPrev = STATES.boot;
  var onsetAt = -1;
  var stateStart = 0;

  var gazeX = 0, gazeY = 0;
  var gx = 0, gy = 0;
  var still = 0;

  var headS = new Spring(110, 16);
  var antS = new Spring(150, 9);
  var leanS = new Spring(70, 12);
  var armS = [new Spring(130, 14), new Spring(130, 14)];
  var elbS = [new Spring(120, 14), new Spring(120, 14)];
  var headLift = 0;
  var neckPress = 0;
  var lookBoost = 0;
  var nodT = -1;

  var blinkT = 0;
  var blinkNext = 3.4;

  var asm = 0, asmAuto = false, lastAsm = 0;
  var autoStallT = 0, autoDone = false;
  var squash = 0, squashV = 0;
  var spin = 0, spinT = -1, spinDir = 1;
  var celT = -1, celPrev = null;
  var screenFlash = 0;
  var sparkT = 0;
  var dustT = 0;
  var ps = [];

  var stamp = "";
  var stampUntil = 0;
  var talkOn = false;
  var talkIx = -1;
  var talkAt = -1;
  var talkInt = 1;
  var talkM = 0;
  var talkW = 3;
  var talkKickIx = -1;
  var sayText = "";
  var sayStart = 0;
  var sayCps = 38;
  var sayOn = false;
  var sayIx = -1;
  var sayPeak = 0;
  var sayWidth = 3;

  var failAt = -1;
  var cam = { x: 0.5, y: 0.46, s: 1 };
  var liveBob = 0, liveBreathe = 0;
  var liveFace = null, liveFaceT = -1, liveFaceState = "";
  var wake = {
    landed: false, landT: 0, b1: false, b2: false,
    looked: false, lookAt: 0
  };

  var byId = {};
  PARTS.forEach(function (p) {
    p.rot = 0;
    p.ox = 0;
    p.oy = 0;
    p.roX = 0;
    p.roY = 0;
    p.rev = 1;
    p.alpha = 0;
    p.m = [1, 0, 0, 1, 0, 0];
    byId[p.id] = p;
  });

  var ro = null;
  var lastW = 0, lastH = 0;
  var listening = false;
  function onResize() { resize(); }

  /* ---------- drawn-state helpers ---------- */

  function headVisible() {
    if (asm < HEAD_AT) return false;
    if (asm >= 1) return true;
    return dropP() > 0.0001;
  }

  function dropP() {
    return clamp((asm - HEAD_AT) / DROP_SPAN, 0, 1);
  }

  function stampText() {
    return stamp && time < stampUntil ? stamp : "";
  }

  function stampLong() {
    var s = stampText();
    return s.length >= 4;
  }

  function screenText() {
    var s = stampText();
    if (s) return s;
    return cur.text || "";
  }

  function screenLong() {
    return screenText().length >= 4;
  }

  function talking() {
    return talkOn || sayOn || rig.talking === true;
  }

  function mouthState() {
    var elapsed = onsetAt < 0 ? 99 : time - onsetAt;
    return elapsed >= ONSET_DETAIL ? cur : (onsetPrev || cur);
  }

  function eyeVisible(id) {
    if (!headVisible()) return false;
    if (stampLong() || screenLong()) return false;
    if (!wake.landed) return false;
    var age = time - wake.landT;
    if (age < 0.08) return false;
    if (id === "eyeR") return age >= 0.22;
    return age >= 0.11;
  }

  function mouthVisible() {
    if (!headVisible()) return false;
    if (stampText() || cur.text) return false;
    if (!wake.landed) return false;
    /* boot mouth lands after both eyes, never before them */
    if (time - wake.landT < (state === "boot" ? 0.26 : 0.08)) return false;
    return true;
  }

  function faceKey(name) {
    var key = typeof name === "string" ? name.toLowerCase() : "";
    return FB_ALIAS[key] || (STATES[key] ? key : "neutral");
  }

  function ensureFace() {
    if (liveFace && liveFaceT === time && liveFaceState === state) return liveFace;
    liveFaceT = time;
    liveFaceState = state;
    liveFace = null;
    var F = global.RustyFace;
    if (!F || typeof F.shapes !== "function") return null;
    var opts = { gx: gx, gy: gy, t: time, blink: blinkT > 0 ? 1 : 0 };
    if (talking()) opts.talk = { m: talkM, w: talkW };
    try {
      liveFace = F.shapes(faceKey(state), opts);
      if (onsetAt >= 0 && time - onsetAt < ONSET_DETAIL && onsetPrev) {
        var ps = F.shapes(faceKey(prevStateName), { gx: gx, gy: gy, t: time, blink: opts.blink });
        liveFace.mouth = ps.mouth;
        liveFace.mouthKind = ps.mouthKind;
      }
    } catch (err) {
      liveFace = null;
    }
    return liveFace;
  }

  /* ---------- painters ---------- */

  function block(p) {
    var x = -p.px, y = -p.py, w = p.w, h = p.h;
    ctx.fillStyle = p.fill;
    ctx.fillRect(x, y, w, h);
    if (p.shade) {
      ctx.fillStyle = p.shade;
      ctx.fillRect(x, y + h * 0.58, w, h * 0.42);
    }
    ctx.strokeStyle = p.edge || C.dark;
    ctx.lineWidth = hair * 1.1;
    ctx.strokeRect(x + hair * 0.55, y + hair * 0.55, w - hair * 1.1, h - hair * 1.1);
    ctx.fillStyle = "rgba(255,233,176,.14)";
    ctx.fillRect(x + hair, y + hair, w - hair * 2, hair);
  }

  function paintScreen(p) {
    if (!headVisible()) return;
    var x = -p.px, y = -p.py, w = p.w, h = p.h;
    var flick = 0.9 + Math.sin(time * 12) * 0.08;

    ctx.fillStyle = C.ink;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(123,92,255,.5)";
    ctx.lineWidth = hair;
    ctx.strokeRect(x + hair * 1.6, y + hair * 1.6, w - hair * 3.2, h - hair * 3.2);

    ctx.fillStyle = "rgba(5,4,12,.5)";
    for (var yy = y + 1.2; yy < y + h; yy += 2.4) ctx.fillRect(x + hair, yy, w - hair * 2, hair * 0.8);

    ctx.fillStyle = "rgba(123,92,255," + (0.04 + Math.sin(time * 12) * 0.02) + ")";
    ctx.fillRect(x + hair, y + hair, w - hair * 2, h - hair * 2);

    /* one scanline tops the screen as the head lands, then the eyes cut in */
    var sinceLand = wake.landed ? time - wake.landT : -1;
    if (sinceLand >= 0 && sinceLand < 0.18) {
      var sweep = y + h * (sinceLand / 0.18);
      ctx.fillStyle = "rgba(255,233,176,.18)";
      ctx.fillRect(x + hair, sweep, w - hair * 2, 0.22);
    }

    /* amber corner ticks, the only chrome on his face */
    ctx.fillStyle = "rgba(255,177,92,.85)";
    ctx.fillRect(x + 1.2, y + 1.2, 1.6, hair * 1.2);
    ctx.fillRect(x + 1.2, y + 1.2, hair * 1.2, 1.6);
    ctx.fillRect(x + w - 2.8, y + 1.2, 1.6, hair * 1.2);
    ctx.fillRect(x + w - 1.2 - hair, y + 1.2, hair * 1.2, 1.6);
    ctx.fillRect(x + 1.2, y + h - 1.2 - hair, 1.6, hair * 1.2);
    ctx.fillRect(x + w - 2.8, y + h - 1.2 - hair, 1.6, hair * 1.2);

    var label = screenText();
    if (label === "...") label = new Array(1 + (Math.floor(time * 2.4) % 3) + 1).join(".");
    if (!label) return;

    var big = label.length >= 4;
    var size = big ? 2.5 : 2.8;
    ctx.font = size + "px PS2P, 'Press Start 2P', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = C.cream;
    ctx.globalAlpha = clamp(flick, 0, 1);
    if (big) {
      ctx.fillRect(x + 1.6, y + h * 0.5 - hair, hair, hair * 12);
      ctx.fillText(label, 0, -h * 0.5);
    } else {
      ctx.fillText(label, 0, -2.2);
    }
    ctx.globalAlpha = p.alpha;
  }

  function paintEye(p) {
    if (!eyeVisible(p.id)) return;

    var shape = ensureFace();
    if (shape) {
      var rects = p.id === "eyeR" ? shape.eyes.r : shape.eyes.l;
      var i;
      for (i = 0; i < rects.length; i++) {
        var q = rects[i];
        ctx.fillStyle = q.c;
        ctx.fillRect(q.x, q.y, q.w, q.h);
      }
      return;
    }

    fbEye(p);
  }

  function paintMouth(p) {
    if (!mouthVisible()) return;

    var shape = ensureFace();
    if (shape) {
      var rects = shape.mouth;
      for (var i = 0; i < rects.length; i++) {
        var q = rects[i];
        ctx.fillStyle = q.c;
        ctx.fillRect(q.x, q.y, q.w, q.h);
      }
      return;
    }

    fbMouth();
  }

  /* the treads are the anchor. when the body bobs up the bottom edge would
     peel off the wheels, so the shell stretches down by the same amount. */
  var bodyStretch = 0;

  function paintBody(p) {
    block(p);
    if (bodyStretch > 0.01) {
      ctx.fillStyle = p.shade || p.fill;
      ctx.fillRect(-p.px, -p.py + p.h, p.w, bodyStretch);
      ctx.fillStyle = "rgba(5,4,12,.45)";
      ctx.fillRect(-p.px + hair, -p.py + p.h - 0.3, p.w - hair * 2, 0.3);
    }
  }

  function paintChest(p) {
    var x = -p.px, y = -p.py, w = p.w, h = p.h;
    ctx.fillStyle = C.ink;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(123,92,255,.35)";
    ctx.lineWidth = hair;
    ctx.strokeRect(x + hair * 1.4, y + hair * 1.4, w - hair * 2.8, h - hair * 2.8);

    var cols = [C.amber, C.mint, C.red];
    for (var i = 0; i < 3; i++) {
      var on = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2.2 + i * 1.7));
      ctx.globalAlpha = clamp(on * (0.4 + cur.chest), 0, 1);
      ctx.fillStyle = cols[i];
      ctx.fillRect(-4.6 + i * 3, 1.5, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;

    var trace = [0.5, 0.5, 1.6, 3.4, 0.9, 2.4, 0.5, 0.5, 1.2];
    var beat = Math.sin(time * (2 + cur.chest * 2.4)) * 0.5 + 0.5;
    for (var j = 0; j < trace.length; j++) {
      var hh = 0.5 + trace[j] * (0.45 + beat * 0.55);
      ctx.globalAlpha = 0.35 + beat * 0.3;
      ctx.fillStyle = C.mint;
      ctx.fillRect(-4.4 + j * 1.05, 6.4 - hh, 0.7, hh);
    }
    ctx.globalAlpha = p.alpha;
  }

  function paintChestPixel(p) {
    var pulse = 0.55 + 0.45 * Math.sin(time * (2 + cur.chest * 3));
    ctx.globalAlpha = p.alpha * clamp(pulse + 0.15, 0, 1);
    ctx.fillStyle = "rgba(255,177,92,.22)";
    ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
    ctx.fillStyle = C.amber;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.fillStyle = C.cream;
    ctx.fillRect(-0.6, -0.6, 0.9, 0.9);
    ctx.globalAlpha = p.alpha;
  }

  function paintTread(p) {
    var x = -p.px, y = -p.py, w = p.w, h = p.h;
    ctx.fillStyle = C.dark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 1.1, y + 1.2, w - 2.2, h - 2.6);
    ctx.fillStyle = C.shade;
    ctx.fillRect(x + 1.5, y + 2.1, 1.7, 1.7);
    ctx.fillRect(x + w - 3.2, y + 2.1, 1.7, 1.7);
    ctx.fillStyle = C.dark;
    ctx.fillRect(x + 2.1, y + 2.7, 0.5, 0.5);
    ctx.fillRect(x + w - 2.6, y + 2.7, 0.5, 0.5);
    ctx.fillStyle = "rgba(255,177,92,.85)";
    ctx.fillRect(x + 1.1, y + h - 2, w - 2.2, 0.7);
    ctx.fillStyle = "rgba(255,233,176,.25)";
    ctx.fillRect(x + 1.1, y + 1.2, w - 2.2, hair);
    ctx.strokeStyle = "#100b22";
    ctx.lineWidth = hair * 1.1;
    ctx.strokeRect(x + hair * 0.55, y + hair * 0.55, w - hair * 1.1, h - hair * 1.1);
  }

  function paintCable(p) {
    var x = -p.px, y = -p.py, w = p.w, h = p.h;
    ctx.fillStyle = C.dark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.shade;
    ctx.fillRect(x + hair, y + 1.2, w - hair * 2, 1.6);
    ctx.fillRect(x + hair, y + 4.2, w - hair * 2, 1.6);
    ctx.fillStyle = C.violet;
    ctx.fillRect(x + hair, y + 7.4, w - hair * 2, 1.4);
  }

  function paintGlow(p) {
    var pulse = state === "celebrating" || state === "excited"
      ? 0.5 + 0.5 * Math.sin(time * 9)
      : 0.5 + 0.5 * Math.sin(time * 2.2);
    ctx.globalAlpha = p.alpha * (0.45 + 0.4 * pulse);
    ctx.fillStyle = "rgba(255,177,92,.10)";
    ctx.fillRect(-4.2, -4.2, 8.4, 8.4);
    ctx.fillStyle = "rgba(255,177,92,.16)";
    ctx.fillRect(-3, -3, 6, 6);
    ctx.fillStyle = "rgba(255,233,176,.22)";
    ctx.fillRect(-1.8, -1.8, 3.6, 3.6);
    ctx.globalAlpha = p.alpha;
  }

  /* ---------- mount and resize ---------- */

  function mount(canvas, opts) {
    if (!canvas || typeof canvas.getContext !== "function") return rig;
    if (ro && ro.disconnect) { ro.disconnect(); ro = null; }
    cv = canvas;
    ctx = cv.getContext("2d");
    if (!ctx) { cv = null; return rig; }
    if (opts && typeof opts === "object") {
      if (opts.reduce === true) rig.reduced = true;
      if (opts.reduced === true) rig.reduced = true;
      if (opts.frame === "seconds" || opts.frame === true) frameMode = 1;
    }
    if (global.matchMedia) {
      try { rig.reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (err) {}
    }
    asm = 0;
    asmAuto = false;
    lastAsm = 0;
    cur = STATES.boot;
    state = "boot";
    resize();
    if (global.ResizeObserver) {
      ro = new global.ResizeObserver(function () { resize(); });
      ro.observe(cv);
    }
    if (!listening && global.addEventListener) {
      listening = true;
      global.addEventListener("resize", onResize);
    }
    return rig;
  }

  function resize(w, h) {
    if (!cv) return;
    var r = cv.getBoundingClientRect ? cv.getBoundingClientRect() : null;
    var nw = num(w, 0), nh = num(h, 0);
    var cw = nw > 0 ? nw : ((r && r.width) || cv.clientWidth || cv.width || 320);
    var ch = nh > 0 ? nh : ((r && r.height) || cv.clientHeight || cv.height || 360);
    cw = Math.max(40, Math.round(cw));
    ch = Math.max(40, Math.round(ch));
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    if (cw === lastW && ch === lastH && cv.width === Math.round(cw * dpr)) return;
    lastW = cw;
    lastH = ch;
    W = cw;
    H = ch;
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    scale = Math.min(W / 48, H / 58) * 0.72;
    hair = 1 / scale;
  }

  function destroy() {
    if (ro && ro.disconnect) { ro.disconnect(); ro = null; }
    if (listening && global.removeEventListener) {
      listening = false;
      global.removeEventListener("resize", onResize);
    }
    if (ctx && cv) {
      try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); } catch (err) {}
    }
    ctx = null;
    cv = null;
    ps.length = 0;
  }

  /* ---------- input ---------- */

  function setGaze(x, y) {
    var nx = Number(x), ny = Number(y);
    gazeX = isFinite(nx) ? clamp(nx, -1, 1) : 0;
    gazeY = isFinite(ny) ? clamp(ny, -1, 1) : 0;
    still = 0;
  }

  function setState(next) {
    var raw = typeof next === "string" ? next.toLowerCase() : "";
    rig.phase = raw || "boot";
    var key = ALIAS[raw] || raw;
    if (!STATES[key]) key = "neutral";
    var changed = key !== state;
    if (changed) {
      onsetPrev = cur;
      prevStateName = state;
      onsetAt = time;
    }
    state = key;
    rig.state = key;
    cur = STATES[key];
    if (changed) {
      stateStart = time;
      if (key !== "celebrating") celT = -1;
    }
    if (key === "boot") {
      asm = 0;
      asmAuto = true;
      lastAsm = 0;
      autoStallT = 0;
      autoDone = false;
      resetWake();
      screenFlash = rig.reduced ? 0 : 1;
      antS.kick(0.6);
    } else if (key === "celebrating") {
      celebrateFx(false);
    } else if (key === "excited") {
      if (changed) puff(12, "spark");
    } else if (key === "confused") {
      if (changed) antS.kick(rnd(-1.2, -0.4));
    } else if (key === "thinking") {
      if (changed) blinkNext = 0.7;
    } else if (key === "proud" || key === "presenting") {
      if (changed) squashV += 0.9;
    }
  }

  function celebrateFx(auto) {
    puff(46, "confetti");
    spinT = 0;
    spinDir = Math.random() < 0.5 ? 1 : -1;
    screenFlash = 1;
    celT = auto ? 2.6 : -1;
    if (!auto) celPrev = null;
  }

  function celebrate() {
    if (state !== "celebrating") {
      celPrev = state;
      onsetPrev = cur;
      prevStateName = state;
      onsetAt = time;
      state = "celebrating";
      rig.state = state;
      cur = STATES.celebrating;
      stateStart = time;
    }
    celebrateFx(true);
  }

  function resetWake() {
    wake.landed = false;
    wake.landT = 0;
    wake.b1 = false;
    wake.b2 = false;
    wake.looked = false;
    wake.lookAt = 0;
    neckPress = 0;
    failAt = -1;
    squash = 0;
    squashV = 0;
    screenFlash = 0;
    blinkT = 0;
    blinkNext = time + 3.4;
    headLift = 0;
    lookBoost = 0;
  }

  function assemble(p) {
    var v = num(p, null);
    if (v === null) {
      asm = 0;
      asmAuto = true;
      lastAsm = 0;
      autoStallT = 0;
      autoDone = false;
      resetWake();
      return;
    }
    v = clamp(v, 0, 1);
    asmAuto = false;
    asm = v;
    if (v < 1 && wake.landed) resetWake();
    if (v >= 1 && lastAsm < 1) completeBoot();
    lastAsm = v;
  }

  function drop(v) {
    var d = clamp(num(v, 1), 0, 1);
    asmAuto = false;
    asm = clamp(HEAD_AT + d * DROP_SPAN, 0, 1);
    if (asm >= 1) completeBoot();
    else if (wake.landed) resetWake();
    lastAsm = asm;
  }

  function completeBoot() {
    if (wake.landed) return;
    wake.landed = true;
    wake.landT = time;
    wake.b1 = false;
    wake.b2 = false;
    wake.looked = false;
    wake.lookAt = time + (rig.reduced ? 0.55 : 1.02);
    neckPress = rig.reduced ? 0 : 3;
    squash = rig.reduced ? 0.4 : 1.2;
    squashV = 0;
    headS.kick(0.7);
    screenFlash = 1;
    blinkT = 0;
    blinkNext = Math.max(blinkNext, time + (rig.reduced ? 0.8 : 1.25));
    failAt = -1;
    puff(20, "dust");
  }

  function face(text, ms) {
    var label = typeof text === "string" ? text : "";
    if (!label) { stamp = ""; stampUntil = 0; return; }
    stamp = label;
    stampUntil = time + Math.max(0.05, (num(ms, 1200) || 1200) / 1000);
  }

  function blink(ms) {
    blinkT = Math.max(blinkT, Math.max(0.04, (num(ms, 140) || 140) / 1000));
  }

  function nod() {
    nodT = 0;
    headS.kick(0.36);
  }

  /* ---------- talk ---------- */

  function talk(index, intensity) {
    if (index === null || index === undefined) {
      talkOn = false;
      talkIx = -1;
      return;
    }
    var ix = Math.floor(num(index, 0)) || 0;
    if (sayOn) { sayOn = false; sayText = ""; }
    talkOn = true;
    talkInt = clamp(num(intensity, 1), 0, 1);
    if (ix !== talkIx) {
      if (talkIx >= 0) antS.kick((ix % 2 ? 1 : -1) * 0.22);
      talkIx = ix;
      talkAt = time;
    }
  }

  function say(text, cps) {
    var line = typeof text === "string" ? text : "";
    if (!line) { sayOn = false; sayText = ""; return; }
    sayText = line;
    sayStart = time;
    sayCps = clamp(num(cps, 38), 4, 90);
    sayOn = true;
    sayIx = -1;
    sayPeak = 0;
    talkOn = false;
  }

  function charMouth(ch) {
    ch = ch.toLowerCase();
    if ("aeiou".indexOf(ch) >= 0) return { m: 0.9, w: 3.4 };
    if ("mbp".indexOf(ch) >= 0) return { m: 0.1, w: 2.6 };
    if ("tdkgcq".indexOf(ch) >= 0) return { m: 0.55, w: 3.0 };
    if ("fszvhxj".indexOf(ch) >= 0) return { m: 0.45, w: 2.8 };
    if ("lr".indexOf(ch) >= 0) return { m: 0.62, w: 3.0 };
    if (ch === "w") return { m: 0.62, w: 3.0 };
    if (ch === "n") return { m: 0.30, w: 2.6 };
    if (ch === " " || ch === "." || ch === "," || ch === "?" || ch === "!") return { m: 0, w: 4.4 };
    return { m: 0.4, w: 3.0 };
  }

  /* ---------- particles ---------- */

  function addParticle(o) { if (ps.length < 140) ps.push(o); }

  function puff(n, kind) {
    if (rig.reduced) return;
    for (var i = 0; i < n; i++) {
      if (kind === "dust") {
        addParticle({
          kind: "dust", x: rnd(-9, 9), y: rnd(17, 22),
          vx: rnd(-2.2, 2.2), vy: rnd(-3.4, -0.6), g: 1.2,
          s: rnd(0.5, 1.5), col: Math.random() < 0.55 ? C.amber : C.violet,
          alpha: rnd(0.18, 0.5), life: rnd(0.7, 1.7), rot: 0, vr: 0
        });
      } else if (kind === "spark") {
        addParticle({
          kind: "spark", x: rnd(-1, 1), y: rnd(-26, -24),
          vx: rnd(-4, 4), vy: rnd(-8, -2), g: 6,
          s: rnd(0.4, 0.9), col: Math.random() < 0.5 ? C.amber : C.cream,
          alpha: rnd(0.7, 1), life: rnd(0.25, 0.6), rot: 0, vr: 0
        });
      } else {
        addParticle({
          kind: "confetti", x: rnd(-5, 5), y: rnd(2, 10),
          vx: rnd(-10, 10), vy: rnd(-19, -5), g: 17,
          s: rnd(0.7, 1.8), col: [C.amber, C.cream, C.mint, C.violet][i % 4],
          alpha: 0.95, life: rnd(1.1, 2.1), rot: rnd(0, TAU), vr: rnd(-9, 9)
        });
      }
    }
  }

  function antennaSpark() {
    if (rig.reduced || ps.length > 130) return;
    var p = byId.bulb;
    var pt = mPoint(p.m, 0, -1.5);
    addParticle({
      kind: "spark", x: pt[0], y: pt[1],
      vx: rnd(-6, 6), vy: rnd(-9, -1), g: 9,
      s: rnd(0.35, 0.8), col: Math.random() < 0.5 ? C.amber : C.mint,
      alpha: rnd(0.6, 1), life: rnd(0.3, 0.7), rot: 0, vr: 0
    });
  }

  function updateParticles(dt) {
    for (var i = ps.length - 1; i >= 0; i--) {
      var q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { ps.splice(i, 1); continue; }
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
      if (q.kind !== "dust") q.vx *= (1 - 1.2 * dt);
    }
  }

  function drawParticles(behind) {
    for (var i = 0; i < ps.length; i++) {
      var q = ps[i];
      var isDust = q.kind === "dust";
      if (isDust !== behind) continue;
      var a = clamp(q.life / (isDust ? 1.6 : 1.2), 0, 1) * q.alpha;
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = q.col;
      if (isDust) {
        ctx.fillRect(q.x, q.y, q.s, q.s);
      } else {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillRect(-q.s * 0.5, -q.s * 0.5, q.s, q.s);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- update ---------- */

  function update(dtMs) {
    if (!ctx) return;
    var dt = clamp((Number(dtMs) || 16.667) / 1000, 0.001, 0.05);
    step(dt);
    render(liveBob, liveBreathe);
  }

  function frameStep(t, dt) {
    if (!ctx) return;
    var d = clamp(num(dt, 0.0167), 0.001, 0.1);
    step(d);
    render(liveBob, liveBreathe);
  }

  function stepCamera(dt) {
    var mob = W < 760;
    var target = { x: 0.5, y: 0.46, s: 1 };
    var ph = rig.phase;
    if (ph === "gate") {
      target = mob ? { x: 0.5, y: 0.26, s: 0.82 } : { x: 0.5, y: 0.26, s: 0.86 };
    } else if (ph === "greet" || ph === "menu" || ph === "pick" || state === "presenting") {
      target = mob ? { x: 0.5, y: 0.33, s: 0.95 } : { x: 0.685, y: 0.46, s: 1 };
    }
    var k = rig.reduced ? 1 : 1 - Math.exp(-6 * dt);
    cam.x += (target.x - cam.x) * k;
    cam.y += (target.y - cam.y) * k;
    cam.s += (target.s - cam.s) * k;
  }

  function step(dt) {
    time += dt;

    /* auto assembly, without socket stall */
    if (asmAuto) {
      asm = Math.min(1, asm + dt / 1.8);
    }
    var dp = dropP();
    if (asm >= 1 && !wake.landed) completeBoot();

    if (celT > 0) {
      celT -= dt;
      if (celT <= 0) {
        celT = -1;
        if (state === "celebrating") setState(celPrev || "proud");
        celPrev = null;
      }
    }

    /* the gaze is a damp, the head is a spring, the antenna is last */
    var sinceLand = wake.landed ? time - wake.landT : -1;
    if (wake.landed && !wake.looked && sinceLand >= (rig.reduced ? 0.55 : 1.02)) {
      wake.looked = true;
      headS.kick(0.5);
      lookBoost = 1;
      still = 0;
      blinkNext = Math.max(blinkNext, time + 2.2);
    }
    lookBoost = damp(lookBoost, 0, 2.2, dt);

    still += dt;
    var wantX = 0, wantY = 0;
    if (wake.landed && wake.looked) {
      wantX = gazeX;
      wantY = gazeY;
      if (still > 6) {
        wantX = Math.sin(time * 0.45) * 0.42;
        wantY = Math.sin(time * 0.31) * 0.2;
      }
    }
    gx = damp(gx, wantX, 7, dt);
    gy = damp(gy, wantY, 6, dt);

    /* authored double blink, then the rig's own random blinks */
    if (wake.landed) {
      var age = time - wake.landT;
      if (!wake.b1 && age >= 0.62) { wake.b1 = true; blinkT = 0.14; }
      else if (!rig.reduced && wake.b1 && !wake.b2 && age >= 0.90) { wake.b2 = true; blinkT = 0.14; }
      if (age < 1.25) blinkNext = Math.max(blinkNext, wake.landT + 1.25);
    }
    blinkNext -= dt;
    if (blinkNext <= 0) {
      blinkT = 0.14;
      var quick = state === "thinking" || state === "scanning";
      blinkNext = quick ? rnd(1.6, 2.6) : rnd(3.0, 4.4);
      if (Math.random() < 0.16) blinkNext = 0.26;
    }
    if (blinkT > 0) blinkT -= dt;

    /* talk clock */
    var mt = talkTarget();
    talkM = damp(talkM, mt.m, 26, dt);
    talkW = clamp(3.0 + talkM * 0.6, 2.8, 3.8);

    /* onsets: eye 0, pupil and mouth 16ms, head 33ms, body 50ms */
    var elapsed = onsetAt < 0 ? 99 : time - onsetAt;
    var pv = onsetPrev || cur;
    var headSrc = elapsed >= ONSET_HEAD ? cur : pv;
    var bodySrc = elapsed >= ONSET_BODY ? cur : pv;

    var sweep = state === "scanning" ? Math.sin(time * 1.6) * 13 : 0;
    var shake = state === "confused" && !rig.reduced ? Math.sin(time * 8.4) * Math.sin(time * 1.7) * 3 : 0;
    var headTarget = clamp(headSrc.head + gx * 9 + sweep + shake + lookBoost * 3, -15, 15);
    var headNow = headS.to(headTarget * DEG, dt);
    var headDeg = headNow / DEG;

    antS.to((bodySrc.ant + headDeg * 0.85 + gx * 7) * DEG, dt);
    leanS.to((bodySrc.lean + gx * 2.5) * DEG, dt);
    headLift = damp(headLift, bodySrc.lift, 8, dt);

    var armLift = Math.sin(time * (1.1 + bodySrc.rate)) * 2.2;
    var fail = failArm();
    armS[0].to((bodySrc.armL + gx * 4 + armLift) * DEG, dt);
    armS[1].to((bodySrc.armR - gx * 4 + armLift + fail) * DEG, dt);
    elbS[0].to((bodySrc.elbL - gy * 3) * DEG, dt);
    elbS[1].to((bodySrc.elbR - gy * 3 + fail * 1.4) * DEG, dt);

    /* squash and spin */
    var sqA = -squash * 190 - squashV * 13;
    squashV += sqA * dt;
    squash += squashV * dt;
    squash = clamp(squash, -1.2, 1.2);

    if (!rig.reduced && spinT >= 0) {
      spinT += dt;
      var sp = clamp(spinT / 0.85, 0, 1);
      spin = easeOut(sp) * TAU * spinDir;
      if (sp >= 1) { spinT = -1; spin = 0; }
    }

    if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - dt * 2.4);
    neckPress = damp(neckPress, 0, 12, dt);

    if (nodT >= 0) {
      nodT += dt;
      if (nodT > 0.52) nodT = -1;
    }

    stepCamera(dt);

    /* bob and breathe, stored for the render */
    var bobSrc = elapsed >= ONSET_BODY ? cur : pv;
    liveBob = Math.sin(time * (TAU / 1.6) * bobSrc.rate) * bobSrc.bob;
    liveBreathe = Math.sin(time * 1.3) * 0.06;

    /* face and parts */
    var headFall = dp >= 1 ? 0 : -(1 - easeInQuad(dp)) * 14;
    if (wake.landed) headFall += neckPress;

    byId.head.rot = headNow;
    byId.head.oy = headFall + headLift + gy * 0.6 + nodDip();
    byId.neck.rot = headNow * 0.3;
    byId.antRod.rot = antS.x;
    byId.antBase.rot = antS.x * 0.25;
    byId.bulb.rot = antS.x * 0.6;
    byId.glow.rot = antS.x * 0.6;

    byId.armLU.rot = armS[0].x;
    byId.armLF.rot = elbS[0].x;
    byId.armRU.rot = -armS[1].x;
    byId.armRF.rot = -elbS[1].x;
    byId.handL.rot = Math.sin(time * 2.1) * 0.05;
    byId.handR.rot = -Math.sin(time * 2.1) * 0.05;

    /* the plates stay planted. the pupil takes the gaze inside the lens,
       which is the face shape's job, never a transform on the eye part. */

    /* assembly reveal. head parts step in at the drop, never fade. */
    for (var i = 0; i < PARTS.length; i++) {
      var p = PARTS[i];
      if (p.head) {
        var earOn = p.ear ? (wake.landed && time >= wake.landT + 0.04) : true;
        p.alpha = (asm > HEAD_AT && earOn) ? 1 : 0;
        p.rev = 1;
        p.roX = 0;
        p.roY = 0;
        continue;
      }
      if (asm >= 1) {
        p.alpha = 1;
        p.rev = 1;
        p.roX = 0;
        p.roY = 0;
        continue;
      }
      var t = clamp((asm - p.at) / 0.06, 0, 1);
      var e = easeOut(t);
      p.alpha = e;
      p.rev = 0.72 + 0.28 * e;
      p.roX = 0;
      p.roY = 0;
      if (t > 0 && t < 1) {
        p.roX += Math.sin(time * 58 + i) * 0.2;
        p.roY += Math.cos(time * 51 + i) * 0.2;
      }
    }

    /* dust and sparks */
    if (!rig.reduced) {
      dustT -= dt;
      if (dustT <= 0) { dustT = 0.5; puff(1, "dust"); }
      if (state === "excited" || state === "celebrating") {
        sparkT -= dt;
        if (sparkT <= 0) { sparkT = 0.18; antennaSpark(); }
      }
    }

    updateParticles(dt);
    liveFace = null;
  }

  function nodDip() {
    if (nodT < 0) return 0;
    var q = clamp(nodT / 0.52, 0, 1);
    return Math.sin(q * TAU) * (1 - q) * 0.9;
  }

  function talkTarget() {
    if (sayOn) {
      var raw = (time - sayStart) * sayCps;
      if (raw < 0) raw = 0;
      if (raw > sayText.length + 2.5) { sayOn = false; return { m: 0, w: 4.4 }; }
      var ix = Math.min(sayText.length - 1, Math.floor(raw));
      if (ix !== sayIx) {
        if (sayIx >= 0) antS.kick((ix % 2 ? 1 : -1) * 0.22);
        if (sayIx < 0) headS.kick(0.36);
        sayIx = ix;
        var cm = charMouth(sayText.charAt(ix));
        sayPeak = cm.m;
        sayWidth = cm.w;
      }
      var f = raw - Math.floor(raw);
      var env = f < 0.14 ? f / 0.14 : Math.pow(Math.max(0, 1 - f) / 0.86, 0.72);
      return { m: clamp(sayPeak * env, 0, 1.2), w: sayWidth };
    }
    if (talkOn) {
      var age = time - talkAt;
      var h = hash(talkIx);
      var peak = (0.55 + h * 0.55) * talkInt;
      var env2 = age < 0.04 ? age / 0.04 : Math.pow(Math.max(0, 1 - (age - 0.04) / 0.14) / 0.86, 0.72);
      return { m: clamp(peak * env2, 0, 1.2), w: 3.0 };
    }
    if (rig.talking === true) {
      return { m: Math.abs(Math.sin(time * 9)) * 0.9, w: 3.4 };
    }
    return { m: 0, w: 4.4 };
  }

  function failArm() {
    if (failAt < 0 || wake.landed) return 0;
    var fa = time - failAt;
    if (fa < 0.09) return easeOut(fa / 0.09) * 6;
    if (fa < 0.48) return 6 - easeOut((fa - 0.09) / 0.39) * 10;
    if (fa < 0.68) return -4 + easeOut((fa - 0.48) / 0.2) * 4;
    return 0;
  }

  /* ---------- draw ---------- */

  var frameMode = 0; /* 0 auto, 1 seconds */
  var lastDrawA = null, sigVotes = 0;

  function draw(a, b) {
    if (typeof b !== "number") {
      render(num(a, 0), 0);
      return;
    }
    var A = num(a, 0), B = num(b, 0);
    /* t in seconds is large or rises by dt; bob/breathe are unitless and
       bounded. Three matching calls latch the seconds signature. */
    if (frameMode === 1 || A > 8) { frameStep(A, B); return; }
    if (B >= 0.5) {
      lastDrawA = A;
      render(A, B);
      return;
    }
    if (B > 0 && B < 0.25 && lastDrawA !== null) {
      var d = A - lastDrawA;
      if (d > 0 && Math.abs(d - B) < 0.06) sigVotes++;
      else sigVotes = 0;
      if (sigVotes >= 2) {
        frameMode = 1;
        lastDrawA = A;
        frameStep(A, B);
        return;
      }
    }
    lastDrawA = A;
    render(A, B);
  }

  function render(bob, breathe) {
    if (!ctx) return;
    bob = num(bob, liveBob);
    breathe = num(breathe, liveBreathe);

    var s = scale * cam.s;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W * cam.x, H * cam.y + 3.7 * s);
    ctx.scale(s, s);

    /* no floor before there is weight on it */
    var shadowA = byId.treadL.alpha;
    if (shadowA > 0.01) {
      ctx.globalAlpha = shadowA;
      ctx.fillStyle = "rgba(123,92,255,.05)";
      ctx.fillRect(-14, 21.4, 28, 2.6);
      ctx.fillStyle = "rgba(123,92,255,.08)";
      ctx.fillRect(-9, 21.8, 18, 1.6);
      ctx.fillStyle = "rgba(5,4,12,.55)";
      ctx.fillRect(-7, 22.2, 14, 1);
      ctx.globalAlpha = 1;
    }

    drawParticles(true);

    /* lean and squash pivot at the tread contact, the body bobs above it.
       treads use the ground matrix, so the floor never slides. */
    var sx = 1 + squash * 0.03;
    var sy = 1 - squash * 0.05;
    var gm = mTrans(0, GROUND_Y);
    gm = mMul(gm, mRot(leanS.x));
    gm = mMul(gm, mRot(spin));
    gm = mMul(gm, mScale(sx, sy));
    gm = mMul(gm, mTrans(0, -GROUND_Y));
    var lift = bob + breathe * 1.2;
    var rm = mMul(gm, mTrans(0, lift));
    bodyStretch = Math.max(0, -lift);

    ensureFace();

    for (var i = 0; i < PARTS.length; i++) {
      var p = PARTS[i];
      var groundP = p.tread === true;
      var pm = p.parent === "root" ? (groundP ? gm : rm) : byId[p.parent].m;
      var m = mMul(pm, mTrans(p.x + p.ox + p.roX, p.y + p.oy + p.roY));
      m = mMul(m, mRot(p.rot));
      if (p.rev !== 1) m = mMul(m, mScale(p.rev, p.rev));
      p.m = m;
    }

    for (var j = 0; j < DRAW.length; j++) {
      var q = byId[DRAW[j]];
      if (!q || q.alpha <= 0.004) continue;
      if (q.head && !headVisible()) continue;
      ctx.save();
      ctx.transform(q.m[0], q.m[1], q.m[2], q.m[3], q.m[4], q.m[5]);
      ctx.globalAlpha = q.alpha;
      if (q.paint) q.paint(q);
      else block(q);
      ctx.restore();
    }

    if (screenFlash > 0 && headVisible()) {
      var scr = byId.screen;
      ctx.save();
      ctx.transform(scr.m[0], scr.m[1], scr.m[2], scr.m[3], scr.m[4], scr.m[5]);
      ctx.globalAlpha = screenFlash * 0.35;
      ctx.fillStyle = C.cream;
      ctx.fillRect(-scr.w * 0.5, -scr.h, scr.w, scr.h);
      ctx.restore();
    }

    drawParticles(false);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawStall(gm) {
    // Stall indicator removed: head is placed directly
  }

  /* ---------- boot the module ---------- */

  setGaze(0, 0);
  still = 5;

  global.RustyRig = rig;
  return rig;
})(typeof window !== "undefined" ? window : globalThis);
