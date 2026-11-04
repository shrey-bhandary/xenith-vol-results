// Xenith lite mode: detection, budget and static-render helpers.
// No dependencies. Load before xenith.js, or paste at the top of the IIFE.
// Everything here is inert until you call it.
//
// Wiring (5 call sites in xenith.js):
//   1. boot:            const LITE = XenithLite.detect();
//   2. after build():   if (LITE) XenithLite.freeze();      // draws one static frame
//   3. frame():         if (LITE) return;                   // no rAF loop at all
//   4. drawRusty():     const bob = LITE ? 0 : Math.sin(t * 1.5) * 1.1;
//   5. paint():         XenithLite.gateStroke(g);           // no shadow on old phones
//
// Auto-downgrade: call XenithLite.watchFrames(rafFn) with the rAF you already run.
// After 90 frames it samples p75 and freezes if the phone cannot keep up.

window.XenithLite = (() => {
  "use strict";

  const STORE_KEY = "xenithLite";

  function connection() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  }

  function stored() {
    try {
      return sessionStorage.getItem(STORE_KEY) === "1";
    } catch (e) {
      return false; // private mode, file://, or storage disabled
    }
  }

  let frozen = false;
  let downgraded = false;

  function detect() {
    const q = new URLSearchParams(location.search);
    if (q.get("lite") === "0") return false; // explicit opt out of lite
    if (q.get("lite") === "1") return true;

    const c = connection();
    if (c.saveData === true) return true;
    if (/^(slow-2g|2g)$/.test(c.effectiveType || "")) return true;
    if (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 2) return true;
    if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2) return true;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    if (stored()) return true;
    return false;
  }

  // Canvas pixel budget. devicePixelRatio alone will happily ask for
  // 7680 x 4320 (33 Mpx, 132 MB) on a big CSS viewport, which Safari
  // and old Android WebViews refuse to allocate.
  const MAX_PIXELS = 12e6;

  function dprFor(w, h, cap) {
    const base = Math.min(window.devicePixelRatio || 1, cap || 2);
    const area = Math.max(1, w * h);
    const byArea = Math.sqrt(MAX_PIXELS / area);
    return Math.max(1, Math.min(base, byArea));
  }

  // Pre-rendered glyph sprite: the reason drawX is slow is shadowBlur
  // applied 540 times per frame. Bake it once, then drawImage.
  function sprite(text, size, color, blur, glowColor, dpr) {
    const d = dpr || 1;
    const pad = Math.ceil(blur * 2 + 2);
    const c = document.createElement("canvas");
    const g = c.getContext("2d");
    g.font = size + "px ui-monospace, Menlo, monospace";
    const w = Math.ceil(g.measureText(text).width) + pad * 2;
    const h = Math.ceil(size * 1.6) + pad * 2;
    c.width = Math.ceil(w * d);
    c.height = Math.ceil(h * d);
    g.scale(d, d);
    g.font = size + "px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = glowColor || "rgba(255,157,61,.85)";
    g.shadowBlur = blur;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    return { canvas: c, w: w, h: h };
  }

  // Call from the lite branch of frame(): one static X, no rotation, no parallax.
  function freeze() {
    frozen = true;
  }

  function isFrozen() {
    return frozen;
  }

  function isDowngraded() {
    return downgraded;
  }

  function gateStroke(ctx) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 3;
  }

  // p75 of frame deltas over N frames. Returns null if the loop never ran.
  function watchFrames(rafFn, opts) {
    const o = opts || {};
    const N = o.frames || 90;
    const budget = o.budget || 40;
    const samples = [];
    let last = 0;
    let n = 0;
    let done = false;

    function tick(t) {
      if (last) samples.push(t - last);
      last = t;
      n++;
      if (n >= N + 1 && !done) {
        done = true;
        samples.sort((a, b) => a - b);
        const p75 = samples[Math.floor(samples.length * 0.75)] || 0;
        if (p75 > budget && !downgraded) {
          downgraded = true;
          frozen = true;
          try {
            sessionStorage.setItem(STORE_KEY, "1");
          } catch (e) { /* ignore */ }
          if (typeof o.onDowngrade === "function") o.onDowngrade(p75);
        }
        return; // stop sampling, the caller's own loop continues
      }
      rafFn(t);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  return {
    detect: detect,
    dprFor: dprFor,
    sprite: sprite,
    freeze: freeze,
    isFrozen: isFrozen,
    isDowngraded: isDowngraded,
    gateStroke: gateStroke,
    watchFrames: watchFrames,
  };
})();
