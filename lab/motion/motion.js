/* motion.js v2
   The canvas half of the motion system. No dependencies, no DOM assumptions at
   load time. Mirrors motion.css: same timeline, same curves.

   What it replaces in the current xenith.js:
     - three separate requestAnimationFrame loops (frame, rustyLoop, gate)  -> one loop
     - `x += (target - x) * 0.04` frame-rate-dependent smoothing            -> smooth()
     - enteredMix 0.03, zoom 0.035, pointer 0.04, all tied to 60fps         -> dt-based
     - Math.sin(time * 0.32) * enteredMix, which is zero on the gate        -> breath()

   Usage:
     const M = XMOTION;                       // or require("./motion.js")
     const p = M.pointer().attach();
     const stop = M.loop((t, dt) => { ... });
   See MOTION.md 9.2 for the wiring. */

(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) { module.exports = api; }
  else { root.XMOTION = api; }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ---------- 1. math ---------- */

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function lerp(a, b, e) { return a + (b - a) * e; }

  // CSS --e-out: cubic-bezier(.22,1,.36,1), about 1 - (1-t)^5
  function outQuint(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 5); }
  function outCubic(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
  function inCubic(t) { t = clamp01(t); return t * t * t; }
  function inOutCubic(t) {
    t = clamp01(t);
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // CSS steps(n, end): floor(t*n)/n, and it does land exactly on 1.
  function stepEnd(t, n) {
    t = clamp01(t);
    return t >= 1 ? 1 : Math.floor(t * n) / n;
  }

  // 0 -> 1 -> 0 over [0,1]. The cream flash on unlock, one shot.
  function pulse(t) { return Math.sin(Math.PI * clamp01(t)); }

  /* Exponential approach. Frame-rate independent by construction: at 60fps and
     120fps the state after 100ms is identical. tau is "time to get ~63% there".
     The naive `x += (target - x) * k` is what the current file does, and it
     makes every transition run twice as fast on a 120Hz display. */
  function smooth(cur, target, tau, dt) {
    if (!(tau > 0)) return target;
    var k = Math.exp(-Math.max(0, dt) / tau);
    return target + (cur - target) * k;
  }

  /* ---------- 2. the one timeline (milliseconds after unlock) ----------
     Keep in sync with motion.css :root. TOTAL is when the last thing stops. */

  var TIMELINE = [
    { id: "flash",   at: 0,    dur: 260  },
    { id: "gateOut", at: 0,    dur: 320  },
    { id: "room",    at: 100,  dur: 1000 },
    { id: "settle",  at: 120,  dur: 1480 },
    { id: "slab",    at: 120,  dur: 1200 },
    { id: "scrim",   at: 240,  dur: 700  },
    { id: "name",    at: 260,  dur: 520  },
    { id: "role",    at: 640,  dur: 220  },
    { id: "line",    at: 840,  dur: 380  },
    { id: "drop",    at: 1200, dur: 460  }
  ];
  var TOTAL = 1660;

  function find(id) {
    for (var i = 0; i < TIMELINE.length; i++) {
      if (TIMELINE[i].id === id) return TIMELINE[i];
    }
    return null;
  }

  // Raw 0..1 progress for a beat. 0 before it starts, 1 after it ends.
  function progressAt(id, ms) {
    var b = find(id);
    if (!b) return 0;
    return clamp01((ms - b.at) / b.dur);
  }

  function ended(ms) { return ms >= TOTAL; }

  /* ---------- 3. poses ----------
     The X has exactly two poses and one interpolation. Nothing else. */

  function view(w, h) {
    var unit = Math.min(w, h);
    // 720 matches the CSS breakpoint. Do not invent a second one.
    return { w: w, h: h, unit: unit, mobile: w < 720 };
  }

  function gatePose(v) {
    return { yaw: 0, pitch: 0, cx: .5 * v.w, cy: .5 * v.h, s: .265 * v.unit, alpha: 1 };
  }

  function heroPose(v) {
    if (v.mobile) {
      // portrait: the X cannot go left or right, so it rises and recedes
      // into a watermark above the name instead of squeezing the type.
      return { yaw: -.50, pitch: .12, cx: .50 * v.w, cy: .26 * v.h, s: .16 * v.unit, alpha: .70 };
    }
    return { yaw: -.62, pitch: .10, cx: .70 * v.w, cy: .50 * v.h, s: .315 * v.unit, alpha: 1 };
  }

  function lerpPose(a, b, e) {
    return {
      yaw:   lerp(a.yaw,   b.yaw,   e),
      pitch: lerp(a.pitch, b.pitch, e),
      cx:    lerp(a.cx,    b.cx,    e),
      cy:    lerp(a.cy,    b.cy,    e),
      s:     lerp(a.s,     b.s,     e),
      alpha: lerp(a.alpha, b.alpha, e)
    };
  }

  // Gate only. Stops the instant a pointer touches the pad (see MOTION.md 5).
  var BREATH = { yaw: .070, pitch: .025, period: 26 };

  function breath(t) {
    var w = (Math.PI * 2) / BREATH.period;
    return {
      yaw:   Math.sin(t * w) * BREATH.yaw,
      pitch: Math.sin(t * w * .62 + 1.1) * BREATH.pitch
    };
  }

  /* ---------- 4. pointer contract ----------
     Three things react, in this order of speed. Nothing else does. */

  var PARALLAX = {
    mon:  { yaw: .021, pitch: .014, tau: .12 },  // 1.2 deg / 0.8 deg
    slab: { yaw: .038, pitch: .024, tau: .09 },  // 2.2 deg / 1.4 deg
    eye:  { x: 1.20, y: .70, tau: .06 }          // Rusty, in sprite units
  };

  function pointer() {
    var s = { x: 0, y: 0, sx: 0, sy: 0, seen: false };

    function home() { s.x = 0; s.y = 0; }

    function onMove(e) {
      s.x = (e.clientX / root.innerWidth - .5) * 2;
      s.y = (e.clientY / root.innerHeight - .5) * 2;
      s.seen = true;
      // A finger never leaves. Let it drift home so the object is not
      // frozen wherever the signature ended.
      if (e.pointerType === "touch") {
        clearTimeout(s._t);
        s._t = setTimeout(home, 600);
      }
    }

    s.attach = function (el) {
      var t = el || root;
      t.addEventListener("pointermove", onMove, { passive: true });
      t.addEventListener("pointerleave", home);
      t.addEventListener("pointercancel", home);
      root.addEventListener("blur", home);
      return s;
    };

    s.step = function (dt, tau) {
      s.sx = smooth(s.sx, s.x, tau || .1, dt);
      s.sy = smooth(s.sy, s.y, tau || .1, dt);
      return s;
    };

    return s;
  }

  /* ---------- 5. one loop, with dt ----------
     cb(tSeconds, dt, ms). dt is clamped so a stalled tab does not teleport
     the world when it wakes up. */

  function loop(cb) {
    var prev = 0, dead = false;
    function tick(now) {
      if (dead) return;
      root.requestAnimationFrame(tick);
      var dt = prev ? Math.min((now - prev) / 1000, 1 / 30) : 1 / 60;
      prev = now;
      cb(now / 1000, dt, now);
    }
    root.requestAnimationFrame(tick);
    return function stop() { dead = true; };
  }

  function reduce() {
    return typeof root.matchMedia === "function" &&
      root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- 6. export ---------- */

  return {
    clamp01: clamp01,
    lerp: lerp,
    outQuint: outQuint,
    outCubic: outCubic,
    inCubic: inCubic,
    inOutCubic: inOutCubic,
    stepEnd: stepEnd,
    pulse: pulse,
    smooth: smooth,
    TIMELINE: TIMELINE,
    TOTAL: TOTAL,
    progressAt: progressAt,
    ended: ended,
    view: view,
    gatePose: gatePose,
    heroPose: heroPose,
    lerpPose: lerpPose,
    BREATH: BREATH,
    breath: breath,
    PARALLAX: PARALLAX,
    pointer: pointer,
    loop: loop,
    reduce: reduce
  };
});
