/* rusty.js
   Rusty, the Xenith robot. Canvas 2D, no dependencies, no DOM beyond the canvas.

   window.RustyRig
     .mount(canvas)      attach a canvas, returns the rig
     .setState(name)     boot idle curious thinking proud excited confused scanning presenting celebrating
     .setGaze(x, y)      normalized -1..1, -1 is left and up
     .update(dt)         dt in milliseconds, advances the springs and draws
     .celebrate()        spin, arms up, confetti, FOUND, then back to the last state
     .assemble(0..1)     scrubs the boot assembly by hand
     .resize()           remeasure the canvas

   Rig: 26 rectangle parts with explicit pivots. Antenna and arms are springs.
   Eyes have four states, open, blink, happy, wide. He blinks on his own.
   Dust drifts, sparks fire off the antenna, confetti falls on success. */
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

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function damp(a, b, lambda, dt) { return a + (b - a) * (1 - Math.exp(-lambda * dt)); }

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
     inside the rectangle, so every part rotates around a stated point.
     at and from drive the boot assembly. */

  var PARTS = [
    { id: "head", parent: "root", x: 0, y: 0, w: 20, h: 15, px: 10, py: 15, fill: C.white, at: 0.12, from: [-19, 0] },
    { id: "bezel", parent: "head", x: 0, y: -1, w: 17.6, h: 12.6, px: 8.8, py: 12.6, fill: C.shade, at: 0.20, from: [-15, 0] },
    { id: "screen", parent: "bezel", x: 0, y: -1.6, w: 15.2, h: 10, px: 7.6, py: 10, fill: C.ink, at: 0.26, from: [-12, 0], paint: paintScreen },
    { id: "eyeL", parent: "screen", x: -3.5, y: -6.2, w: 3.2, h: 3.2, px: 1.6, py: 1.6, fill: C.red, at: 0.34, from: [0, -5], paint: paintEye },
    { id: "eyeR", parent: "screen", x: 3.5, y: -6.2, w: 3.2, h: 3.2, px: 1.6, py: 1.6, fill: C.red, at: 0.34, from: [0, -5], paint: paintEye },
    { id: "mouth", parent: "screen", x: 0, y: -2.2, w: 4.4, h: 2.4, px: 2.2, py: 1.2, fill: C.amber, at: 0.40, from: [0, 3], paint: paintMouth },
    { id: "earL", parent: "head", x: -10, y: -7.4, w: 2.2, h: 6, px: 2.2, py: 3, fill: C.shade, at: 0.44, from: [-7, 0] },
    { id: "earR", parent: "head", x: 10, y: -7.4, w: 2.2, h: 6, px: 0, py: 3, fill: C.shade, at: 0.44, from: [7, 0] },
    { id: "antBase", parent: "head", x: 0, y: -14.6, w: 3, h: 2, px: 1.5, py: 2, fill: C.shade, at: 0.00, from: [0, 7] },
    { id: "antRod", parent: "antBase", x: 0, y: -2, w: 2, h: 8, px: 1, py: 8, fill: C.amber, at: 0.05, from: [0, 10] },
    { id: "bulb", parent: "antRod", x: 0, y: -8, w: 4, h: 3, px: 2, py: 3, fill: C.cream, at: 0.10, from: [0, 10] },
    { id: "glow", parent: "bulb", x: 0, y: -1.5, w: 8, h: 7, px: 4, py: 3.5, fill: C.amber, at: 0.86, from: [0, 0], paint: paintGlow },
    { id: "neck", parent: "root", x: 0, y: 0, w: 5, h: 4, px: 2.5, py: 0, fill: C.shade, at: 0.46, from: [0, 5] },
    { id: "body", parent: "root", x: 0, y: 4, w: 14, h: 12.5, px: 7, py: 0, fill: C.white, shade: C.shell2, at: 0.52, from: [0, 12] },
    { id: "chestScreen", parent: "body", x: 0, y: 1.2, w: 10.4, h: 8.4, px: 5.2, py: 0, fill: C.ink, at: 0.58, from: [0, 6], paint: paintChest },
    { id: "chestPixel", parent: "chestScreen", x: 0, y: 4.2, w: 2, h: 2, px: 1, py: 1, fill: C.amber, at: 0.60, from: [0, 0], paint: paintChestPixel },
    { id: "armLU", parent: "root", x: -7, y: 5.2, w: 3, h: 7, px: 1.5, py: 0.6, fill: C.white, at: 0.64, from: [-9, 0] },
    { id: "armLF", parent: "armLU", x: 0, y: 6.6, w: 2.8, h: 6, px: 1.4, py: 0, fill: C.shade, at: 0.72, from: [0, 5] },
    { id: "handL", parent: "armLF", x: 0, y: 6, w: 3.4, h: 3.2, px: 1.7, py: 0, fill: C.amber, at: 0.78, from: [0, 4] },
    { id: "armRU", parent: "root", x: 7, y: 5.2, w: 3, h: 7, px: 1.5, py: 0.6, fill: C.white, at: 0.64, from: [9, 0] },
    { id: "armRF", parent: "armRU", x: 0, y: 6.6, w: 2.8, h: 6, px: 1.4, py: 0, fill: C.shade, at: 0.72, from: [0, 5] },
    { id: "handR", parent: "armRF", x: 0, y: 6, w: 3.4, h: 3.2, px: 1.7, py: 0, fill: C.amber, at: 0.78, from: [0, 4] },
    { id: "treadL", parent: "root", x: -5.6, y: 16.3, w: 7.4, h: 6, px: 3.7, py: 0, fill: C.dark, at: 0.80, from: [0, 9], paint: paintTread },
    { id: "treadR", parent: "root", x: 5.6, y: 16.3, w: 7.4, h: 6, px: 3.7, py: 0, fill: C.dark, at: 0.80, from: [0, 9], paint: paintTread },
    { id: "port", parent: "root", x: 6.9, y: 5, w: 3, h: 4.6, px: 1.5, py: 1, fill: C.shade, at: 0.84, from: [7, 0] },
    { id: "cable", parent: "port", x: 0, y: 4.6, w: 1.4, h: 9, px: 0.7, py: 0, fill: C.dark, at: 0.88, from: [0, 7], paint: paintCable }
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
     text sits on the face screen. four or more characters take the full screen. */

  var STATES = {
    boot: {
      head: 0, lean: 0, ant: 0, armL: 3, armR: 3, elbL: 2, elbR: 2,
      eye: "wide", mouth: "dot", bob: 0, rate: 0.8, lift: 0, text: "", chest: 0.2
    },
    idle: {
      head: 0, lean: 0, ant: 0, armL: 6, armR: 6, elbL: 9, elbR: 9,
      eye: "open", mouth: "flat", bob: 0.55, rate: 1, lift: 0, text: "", chest: 0.5
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
      head: -3, lean: 0, ant: 7, armL: 16, armR: 16, elbL: 14, elbR: 14,
      eye: "happy", mouth: "smile", bob: 0.65, rate: 1.1, lift: -1.5, text: "", chest: 0.9
    },
    excited: {
      head: -2, lean: -3, ant: 15, armL: 30, armR: 30, elbL: 20, elbR: 20,
      eye: "wide", mouth: "open", bob: 1.15, rate: 2.6, lift: -2, text: "", chest: 1
    },
    confused: {
      head: 9, lean: 3.5, ant: -14, armL: 26, armR: 26, elbL: 38, elbR: 38,
      eye: "wide", mouth: "wavy", bob: 0.5, rate: 0.8, lift: 0, text: "?", chest: 0.3
    },
    scanning: {
      head: 0, lean: 0, ant: 0, armL: 10, armR: 10, elbL: 14, elbR: 14,
      eye: "open", mouth: "flat", bob: 0.65, rate: 1, lift: 0, text: "...", chest: 0.7
    },
    presenting: {
      head: 0, lean: -1, ant: 5, armL: 42, armR: 42, elbL: 26, elbR: 26,
      eye: "open", mouth: "smile", bob: 0.6, rate: 1, lift: -0.5, text: "hello", chest: 0.8
    },
    celebrating: {
      head: -6, lean: 0, ant: 19, armL: 118, armR: 118, elbL: 8, elbR: 8,
      eye: "happy", mouth: "open", bob: 1.3, rate: 3, lift: -2.5, text: "FOUND", chest: 1
    }
  };

  /* ---------- rig state ---------- */

  var rig = {
    state: "boot",
    reduced: false,
    parts: PARTS.length,
    mount: mount,
    setState: setState,
    setGaze: setGaze,
    update: update,
    celebrate: celebrate,
    assemble: assemble,
    resize: resize,
    draw: draw
  };

  var cv = null, ctx = null;
  var W = 320, H = 360, scale = 6, dpr = 1, hair = 1 / 6;
  var time = 0;
  var state = "boot";
  var cur = STATES.boot;
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

  var blinkT = 0;
  var blinkNext = 3.4;
  var blinkShape = "open";

  var asm = 1, asmAuto = false, lastAsm = 1;
  var squash = 0, squashV = 0;
  var spin = 0, spinT = -1, spinDir = 1;
  var celT = -1, celPrev = null;
  var screenFlash = 0;
  var sparkT = 0;
  var dustT = 0;
  var ps = [];

  var byId = {};
  PARTS.forEach(function (p) {
    p.rot = 0;
    p.ox = 0;
    p.oy = 0;
    p.roX = 0;
    p.roY = 0;
    p.rev = 1;
    p.alpha = 1;
    p.m = [1, 0, 0, 1, 0, 0];
    byId[p.id] = p;
  });

  var ro = null;
  var lastW = 0, lastH = 0;
  var listening = false;
  function onResize() { resize(); }

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

    /* amber corner ticks, the only chrome on his face */
    ctx.fillStyle = "rgba(255,177,92,.85)";
    ctx.fillRect(x + 1.2, y + 1.2, 1.6, hair * 1.2);
    ctx.fillRect(x + 1.2, y + 1.2, hair * 1.2, 1.6);
    ctx.fillRect(x + w - 2.8, y + 1.2, 1.6, hair * 1.2);
    ctx.fillRect(x + w - 1.2 - hair, y + 1.2, hair * 1.2, 1.6);
    ctx.fillRect(x + 1.2, y + h - 1.2 - hair, 1.6, hair * 1.2);
    ctx.fillRect(x + w - 2.8, y + h - 1.2 - hair, 1.6, hair * 1.2);

    if (asm < 1) {
      var sy = y + h * (0.1 + 0.8 * asm);
      ctx.fillStyle = "rgba(255,233,176,.35)";
      ctx.fillRect(x + hair * 2, sy, w - hair * 4, hair * 1.6);
    }

    var label = cur.text;
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
    var shape = blinkT > 0 ? "blink" : (blinkShape || "open");
    if (rig.talking && shape === "open") shape = "open";
    if (cur.text && cur.text.length >= 4) return;
    if (state === "boot" && asm < 0.44 && p.id === "eyeR") return;

    var w = p.w;
    if (shape === "blink") {
      ctx.fillStyle = C.red;
      ctx.fillRect(-w * 0.5, -0.4, w, 0.8);
      return;
    }
    if (shape === "happy") {
      ctx.fillStyle = C.red;
      ctx.fillRect(-w * 0.5, -0.3, w, 0.8);
      ctx.fillRect(-w * 0.5, -1.7, 0.9, 1.5);
      ctx.fillRect(w * 0.5 - 0.9, -1.7, 0.9, 1.5);
      return;
    }
    if (shape === "wide") {
      ctx.fillStyle = "rgba(255,92,59,.16)";
      ctx.fillRect(-w * 0.95, -w * 0.95, w * 1.9, w * 1.9);
      ctx.fillStyle = C.red;
      ctx.fillRect(-2, -2.1, 4, 4.2);
      ctx.fillStyle = C.cream;
      ctx.fillRect(-1.5, -1.6, 0.9, 0.9);
      return;
    }
    ctx.fillStyle = "rgba(255,92,59,.13)";
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.fillStyle = C.red;
    ctx.fillRect(-w * 0.5, -w * 0.5, w, w);
    ctx.fillStyle = C.cream;
    ctx.fillRect(-w * 0.5 + 0.4, -w * 0.5 + 0.4, 0.7, 0.7);
  }

  function paintMouth(p) {
    if (cur.text) return;
    var m = cur.mouth;
    if (rig.talking) {
      m = Math.sin(time * 26) > 0 ? "open" : "flat";
    }
    ctx.fillStyle = C.amber;
    if (m === "smile") {
      ctx.fillRect(-2.2, -0.9, 1, 1);
      ctx.fillRect(1.2, -0.9, 1, 1);
      ctx.fillRect(-1.2, 0.1, 2.4, 0.9);
    } else if (m === "wavy") {
      ctx.fillRect(-2.2, -0.2, 1.4, 0.9);
      ctx.fillRect(-0.6, 0.4, 1.2, 0.9);
      ctx.fillRect(0.8, -0.2, 1.4, 0.9);
    } else if (m === "open") {
      ctx.fillRect(-1.2, -1, 2.4, 2.2);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-0.6, -0.3, 1.2, 1);
    } else if (m === "dot") {
      ctx.fillRect(-0.6, -0.6, 1.2, 1.2);
    } else {
      ctx.fillRect(-2.2, -0.5, 4.4, 0.9);
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
    var a = p.alpha * (0.45 + 0.4 * pulse);
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(255,177,92,.10)";
    ctx.fillRect(-4.2, -4.2, 8.4, 8.4);
    ctx.fillStyle = "rgba(255,177,92,.16)";
    ctx.fillRect(-3, -3, 6, 6);
    ctx.fillStyle = "rgba(255,233,176,.22)";
    ctx.fillRect(-1.8, -1.8, 3.6, 3.6);
    ctx.globalAlpha = p.alpha;
  }

  /* ---------- mount and resize ---------- */

  function mount(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") return rig;
    if (ro && ro.disconnect) { ro.disconnect(); ro = null; }
    cv = canvas;
    ctx = cv.getContext("2d");
    if (!ctx) { cv = null; return rig; }
    if (global.matchMedia) {
      rig.reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
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

  function resize() {
    if (!cv) return;
    var r = cv.getBoundingClientRect ? cv.getBoundingClientRect() : null;
    var w = (r && r.width) || cv.clientWidth || cv.width || 320;
    var h = (r && r.height) || cv.clientHeight || cv.height || 360;
    w = Math.max(40, Math.round(w));
    h = Math.max(40, Math.round(h));
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    if (w === lastW && h === lastH && cv.width === Math.round(w * dpr)) return;
    lastW = w;
    lastH = h;
    W = w;
    H = h;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    scale = Math.min(W / 48, H / 58) * 0.72;
    hair = 1 / scale;
  }

  /* ---------- input ---------- */

  function setGaze(x, y) {
    var nx = Number(x), ny = Number(y);
    gazeX = isFinite(nx) ? clamp(nx, -1, 1) : 0;
    gazeY = isFinite(ny) ? clamp(ny, -1, 1) : 0;
    still = 0;
  }

  function setState(name) {
    if (!STATES[name]) name = "idle";
    var changed = name !== state;
    state = name;
    rig.state = name;
    cur = STATES[name];
    if (changed) {
      stateStart = time;
      if (name !== "celebrating") celT = -1;
    }
    if (name === "boot") {
      asm = rig.reduced ? 1 : 0;
      asmAuto = !rig.reduced;
      lastAsm = asm;
      screenFlash = rig.reduced ? 0 : 1;
      antS.kick(0.6);
    } else if (name === "celebrating") {
      celebrateFx(false);
    } else if (name === "excited") {
      if (changed) puff(12, "spark");
    } else if (name === "confused") {
      if (changed) antS.kick(rnd(-1.2, -0.4));
    } else if (name === "thinking") {
      if (changed) blinkNext = 0.7;
    } else if (name === "proud" || name === "presenting") {
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
      state = "celebrating";
      rig.state = state;
      cur = STATES.celebrating;
      stateStart = time;
    }
    celebrateFx(true);
  }

  function assemble(p) {
    var v = Number(p);
    if (!isFinite(v)) return;
    asmAuto = false;
    asm = clamp(v, 0, 1);
    if (asm >= 1 && lastAsm < 1) completeBoot();
    lastAsm = asm;
  }

  function completeBoot() {
    squashV += rig.reduced ? 1.2 : 2.8;
    puff(20, "dust");
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
    time += dt;

    if (asmAuto) {
      asm = clamp(asm + dt / 2.2, 0, 1);
      if (asm >= 1 && lastAsm < 1) completeBoot();
      lastAsm = asm;
    }

    if (celT > 0) {
      celT -= dt;
      if (celT <= 0) {
        celT = -1;
        if (state === "celebrating") setState(celPrev || "proud");
        celPrev = null;
      }
    }

    /* gaze, with a slow look around when nothing moves for four seconds */
    still += dt;
    var wantX = gazeX, wantY = gazeY;
    if (still > 4) {
      wantX = Math.sin(time * 0.45) * 0.42;
      wantY = Math.sin(time * 0.31) * 0.2;
    }
    gx = damp(gx, wantX, 7, dt);
    gy = damp(gy, wantY, 6, dt);

    /* blink */
    blinkNext -= dt;
    if (blinkNext <= 0) {
      blinkT = 0.14;
      var quick = state === "thinking" || state === "scanning";
      blinkNext = quick ? rnd(1.6, 2.6) : rnd(3.0, 4.4);
      if (Math.random() < 0.16) blinkNext = 0.26;
    }
    if (blinkT > 0) blinkT -= dt;
    blinkShape = cur.eye;

    /* head, antenna, lean */
    var sweep = state === "scanning" ? Math.sin(time * 1.6) * 13 : 0;
    var shake = state === "confused" ? Math.sin(time * 8.4) * Math.sin(time * 1.7) * 3 : 0;
    var headTarget = clamp(cur.head + gx * 9 + sweep + shake, -15, 15) * DEG;
    var headNow = headS.to(headTarget, dt);
    var headDeg = headNow / DEG;

    antS.to((cur.ant + headDeg * 0.85 + gx * 7) * DEG, dt);
    leanS.to((cur.lean + gx * 2.5) * DEG, dt);
    headLift = damp(headLift, cur.lift, 8, dt);

    var armLift = Math.sin(time * (1.1 + cur.rate)) * 2.2;
    armS[0].to((cur.armL + gx * 4 + armLift) * DEG, dt);
    armS[1].to((cur.armR - gx * 4 + armLift) * DEG, dt);
    elbS[0].to((cur.elbL - gy * 3) * DEG, dt);
    elbS[1].to((cur.elbR - gy * 3) * DEG, dt);

    /* squash and spin */
    var sqA = -squash * 190 - squashV * 13;
    squashV += sqA * dt;
    squash += squashV * dt;
    squash = clamp(squash, -1.2, 1.2);

    if (spinT >= 0) {
      spinT += dt;
      var sp = clamp(spinT / 0.85, 0, 1);
      spin = easeOut(sp) * TAU * spinDir;
      if (sp >= 1) { spinT = -1; spin = 0; }
    }

    if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - dt * 2.4);

    /* face and parts */
    var bob = Math.sin(time * (TAU / 1.6) * cur.rate) * cur.bob;
    var breathe = Math.sin(time * 1.3) * 0.06;

    byId.head.rot = headNow;
    byId.head.oy = headLift + gy * 0.6;
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

    byId.eyeL.ox = gx * 1.5;
    byId.eyeR.ox = gx * 1.5;
    byId.eyeL.oy = gy * 0.55;
    byId.eyeR.oy = gy * 0.55;

    /* assembly reveal */
    for (var i = 0; i < PARTS.length; i++) {
      var p = PARTS[i];
      if (asm >= 1) {
        p.alpha = 1;
        p.rev = 1;
        p.roX = 0;
        p.roY = 0;
        continue;
      }
      var t = clamp((asm - p.at) / 0.16, 0, 1);
      var e = easeOut(t);
      p.alpha = e;
      p.rev = 0.72 + 0.28 * e;
      p.roX = p.from[0] * (1 - e);
      p.roY = p.from[1] * (1 - e);
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
    draw(bob, breathe);
  }

  /* ---------- draw ---------- */

  function draw(bob, breathe) {
    bob = bob || 0;
    breathe = breathe || 0;
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W * 0.5, H * 0.40 + 3.7 * scale);
    ctx.scale(scale, scale);

    ctx.fillStyle = "rgba(123,92,255,.05)";
    ctx.fillRect(-14, 21.4, 28, 2.6);
    ctx.fillStyle = "rgba(123,92,255,.08)";
    ctx.fillRect(-9, 21.8, 18, 1.6);
    ctx.fillStyle = "rgba(5,4,12,.55)";
    ctx.fillRect(-7, 22.2, 14, 1);

    drawParticles(true);

    var rm = mTrans(0, bob);
    rm = mMul(rm, mTrans(0, 8));
    rm = mMul(rm, mRot(leanS.x));
    rm = mMul(rm, mTrans(0, -8));
    if (spin) {
      rm = mMul(rm, mTrans(0, 8));
      rm = mMul(rm, mRot(spin));
      rm = mMul(rm, mTrans(0, -8));
    }
    rm = mMul(rm, mScale(1 + squash * 0.03, 1 - squash * 0.05 + breathe * 0.01));

    for (var i = 0; i < PARTS.length; i++) {
      var p = PARTS[i];
      var pm = p.parent === "root" ? rm : byId[p.parent].m;
      var m = mMul(pm, mTrans(p.x + p.ox + p.roX, p.y + p.oy + p.roY));
      m = mMul(m, mRot(p.rot));
      if (p.rev !== 1) m = mMul(m, mScale(p.rev, p.rev));
      p.m = m;
    }

    for (var j = 0; j < DRAW.length; j++) {
      var q = byId[DRAW[j]];
      if (!q || q.alpha <= 0.004) continue;
      ctx.save();
      ctx.transform(q.m[0], q.m[1], q.m[2], q.m[3], q.m[4], q.m[5]);
      ctx.globalAlpha = q.alpha;
      if (q.paint) q.paint(q);
      else block(q);
      ctx.restore();
    }

    if (screenFlash > 0) {
      var s = byId.screen;
      ctx.save();
      ctx.transform(s.m[0], s.m[1], s.m[2], s.m[3], s.m[4], s.m[5]);
      ctx.globalAlpha = screenFlash * 0.35;
      ctx.fillStyle = C.cream;
      ctx.fillRect(-s.w * 0.5, -s.h, s.w, s.h);
      ctx.restore();
    }

    drawParticles(false);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------- boot the module ---------- */

  function setGazeReset() {
    setGaze(0, 0);
    still = 5;
  }
  setGazeReset();

  var api = rig;
  api.version = "1.0";
  global.RustyRig = api;
  return rig;
})(typeof window !== "undefined" ? window : globalThis);
