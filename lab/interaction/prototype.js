/* Xenith interaction prototype: the X remembers your hand.
   Everything here is a trimmed copy of site/xenith.js plus three additions:
     1. the gate strokes are normalized and fitted into the monument at unlock
     2. the back depth layers bloom in over ~600ms (lift)
     3. a flash masks the swap
   Query params for a human demo without drawing:
     ?demo=straight   auto traces a perfect X
     ?demo=wobble     auto traces a bowed X, easiest way to see the trace land
*/
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const dpr = () => Math.min(devicePixelRatio || 1, 2);

  let W = 0;
  let H = 0;

  // ---------- backdrop ----------
  const cv = $("#scene");
  const ctx = cv.getContext("2d");

  function buildScene() {
    const r = dpr();
    cv.width = Math.floor(W * r);
    cv.height = Math.floor(H * r);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    ctx.setTransform(r, 0, 0, r, 0, 0);
    ctx.fillStyle = "#06050f";
    ctx.fillRect(0, 0, W, H);

    const cell = W < 720 ? 8 : 11;
    const lineH = cell * 1.34;
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    ctx.font = Math.round(cell * 1.2) + "px ui-monospace, Menlo, monospace";
    ctx.textBaseline = "top";
    for (let y = 0; y < H; y += lineH) {
      for (let x = 0; x < W; x += cell) {
        const near = Math.max(0, 1 - Math.abs(x / W - 0.64) * 1.9);
        const v = rnd();
        if (v < 0.955 - near * 0.08) continue;
        const ch = v > 0.994 ? "#" : v > 0.985 ? "+" : v > 0.97 ? ":" : ".";
        ctx.globalAlpha = 0.035 + near * 0.05 + v * 0.03;
        ctx.fillStyle = v > 0.98 ? "rgba(176,128,220,1)" : "rgba(255,214,170,1)";
        ctx.fillText(ch, x, y);
      }
    }
    ctx.globalAlpha = 1;

    const grad = ctx.createRadialGradient(
      W * 0.64, H * 0.52, 0,
      W * 0.64, H * 0.52, Math.max(W, H) * 0.55
    );
    grad.addColorStop(0, "rgba(255,157,61,.055)");
    grad.addColorStop(1, "rgba(255,157,61,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- monument ----------
  const mon = $("#monument");
  const mctx = mon.getContext("2d");
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let zoom = 1.2;
  let zoomTarget = 1.2;
  let enteredMix = 0;
  let enteredTarget = 0;
  let lift = 1;
  let liftTarget = 1;
  let xpts = [];

  const LAYERS = [-0.08, 0, 0.08];

  function idealPoints() {
    const beams = [
      [-1.15, -1.15, 1.15, 1.15],
      [1.15, -1.15, -1.15, 1.15]
    ];
    const pts = [];
    for (const [ax, ay, bx, by] of beams) {
      for (let t = 0.01; t <= 0.99; t += 0.011) {
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        for (const z of LAYERS) pts.push({ x: x, y: y, z: z });
      }
    }
    return pts;
  }

  xpts = idealPoints();

  function drawX(t) {
    if (!W || !H) return;
    const r = dpr();
    if (mon.width !== Math.floor(W * r) || mon.height !== Math.floor(H * r)) {
      mon.width = Math.floor(W * r);
      mon.height = Math.floor(H * r);
      mon.style.width = W + "px";
      mon.style.height = H + "px";
      mctx.setTransform(r, 0, 0, r, 0, 0);
    }
    mctx.clearRect(0, 0, W, H);
    if (!xpts.length) return;

    const time = t / 1000;
    const ay = (Math.sin(time * 0.32) * 0.3 + tx * 0.14) * enteredMix;
    const ax = (Math.sin(time * 0.21) * 0.05 + ty * 0.07) * enteredMix;
    const cyv = Math.cos(ay);
    const syv = Math.sin(ay);
    const cxv = Math.cos(ax);
    const sxv = Math.sin(ax);
    const mobile = W < 720;
    const cX = W * (0.5 + (mobile ? 0.3 : 0.2) * enteredMix);
    const cY = H * (0.5 - (mobile ? 0.14 : 0) * enteredMix);
    const S0 = Math.min(W, H) * (0.265 + 0.05 * enteredMix) * (1 - (mobile ? 0.22 : 0) * enteredMix);
    const base = S0 * 0.5;

    const proj = [];
    for (const p of xpts) {
      const x = p.x * cyv - p.z * syv;
      const z1 = p.x * syv + p.z * cyv;
      const y = p.y * cxv - z1 * sxv;
      const z2 = p.y * sxv + z1 * cxv;
      const sc = 1 / (1.9 + z2 * 0.55);
      proj.push({
        sx: cX + x * base * sc * 2.4,
        sy: cY + y * base * sc * 2.4,
        sc: sc,
        z: z2
      });
    }
    proj.sort((a, b) => a.sc - b.sc);

    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.shadowColor = "rgba(255,157,61,.85)";
    mctx.shadowBlur = 11;
    for (const p of proj) {
      const front = p.z < 0;
      const alpha = front ? 0.8 : 0.45 * lift;
      if (alpha < 0.01) continue;
      mctx.globalAlpha = alpha;
      mctx.fillStyle = front
        ? "rgba(255,214,150,.98)"
        : "rgba(150,120,240,.75)";
      mctx.font = (front ? 12 : 8) + "px ui-monospace, Menlo, monospace";
      mctx.fillText(front ? "#" : ":", p.sx, p.sy);
    }
    mctx.globalAlpha = 1;
    mctx.shadowBlur = 0;
  }

  // ---------- frame ----------
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;

    tx += (mx - tx) * 0.04;
    ty += (my - ty) * 0.04;
    zoom += (zoomTarget - zoom) * 0.035;
    enteredMix += (enteredTarget - enteredMix) * 0.03;
    lift += (liftTarget - lift) * 0.055;

    const time = now / 1000;
    const ry = -7 + Math.sin(time * 0.1) * 1.8 + tx * 3.4;
    const rx = 2.2 + Math.sin(time * 0.08) * 0.9 + ty * 2.2;
    const sc = zoom + Math.sin(time * 0.06) * 0.008;
    cv.style.transform =
      "perspective(1100px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" +
      ry.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";

    drawX(now);
  }

  // ---------- gate ----------
  const pad = $("#xpad");
  const g = pad.getContext("2d");
  const strokes = [];
  let cur = null;
  let padW = 0;
  let padH = 0;
  let S = 0;
  let pending = false;
  let done = false;

  function sizePad() {
    const r = dpr();
    padW = innerWidth;
    padH = innerHeight;
    pad.width = Math.floor(padW * r);
    pad.height = Math.floor(padH * r);
    g.setTransform(r, 0, 0, r, 0, 0);
    S = Math.min(padW, padH) * 0.38;
    paint();
  }

  const pt = (e) => {
    const r = pad.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const guides = () => {
    const cx = padW / 2;
    const cy = padH / 2;
    const h = S / 2;
    return [
      [[cx - h, cy - h], [cx + h, cy + h]],
      [[cx + h, cy - h], [cx - h, cy + h]]
    ];
  };

  function distSeg(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function cover(guide) {
    let hit = 0;
    const n = 22;
    const tol = Math.max(18, S * 0.085);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const p = [
        guide[0][0] + (guide[1][0] - guide[0][0]) * t,
        guide[0][1] + (guide[1][1] - guide[0][1]) * t
      ];
      let near = Infinity;
      for (const st of strokes) {
        for (let j = 1; j < st.length; j++) {
          near = Math.min(near, distSeg(p, st[j - 1], st[j]));
        }
        if (st.length === 1) near = Math.min(near, Math.hypot(p[0] - st[0][0], p[1] - st[0][1]));
      }
      if (near < tol) hit++;
    }
    return hit / n;
  }

  function paint() {
    g.clearRect(0, 0, padW, padH);
    const pair = guides();
    const A = pair[0];
    const B = pair[1];

    g.save();
    g.setLineDash([6, 9]);
    g.lineWidth = 1.5;
    g.strokeStyle = "rgba(255,233,176,.4)";
    for (const gd of [A, B]) {
      g.beginPath();
      g.moveTo(gd[0][0], gd[0][1]);
      g.lineTo(gd[1][0], gd[1][1]);
      g.stroke();
    }
    g.restore();

    const ca = cover(A);
    const cb = cover(B);
    for (const pair2 of [[A, ca], [B, cb]]) {
      const gd = pair2[0];
      const c = pair2[1];
      if (c <= 0.05) continue;
      g.save();
      g.globalAlpha = Math.min(0.4, c * 0.45);
      g.lineWidth = 4;
      g.lineCap = "round";
      g.strokeStyle = "#9ef0c0";
      g.shadowColor = "#9ef0c0";
      g.shadowBlur = 18;
      g.beginPath();
      g.moveTo(gd[0][0], gd[0][1]);
      g.lineTo(gd[1][0], gd[1][1]);
      g.stroke();
      g.restore();
    }

    for (const st of strokes) {
      if (st.length < 2) continue;
      g.save();
      g.lineWidth = 2;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "rgba(255,244,214,.95)";
      g.shadowColor = "#ffb15c";
      g.shadowBlur = 14;
      g.beginPath();
      g.moveTo(st[0][0], st[0][1]);
      for (let i = 1; i < st.length; i++) g.lineTo(st[i][0], st[i][1]);
      g.stroke();
      g.restore();
    }

    if (!done && !pending && ca >= 0.8 && cb >= 0.8) {
      pending = true;
      setTimeout(unlock, 320);
    }
  }

  pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    cur = [pt(e)];
    strokes.push(cur);
    $("#prompt").classList.add("fade");
    paint();
  });

  pad.addEventListener("pointermove", (e) => {
    if (!cur) return;
    // Coalesced events make fast strokes smoother and keep more of the hand.
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) cur.push(pt(ev));
    paint();
  });

  const end = () => {
    cur = null;
    paint();
  };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);

  // ---------- unlock ----------
  function flash() {
    const f = $("#flash");
    f.classList.remove("on");
    void f.offsetWidth;
    f.classList.add("on");
  }

  function unlock() {
    if (done) return;
    done = true;

    let built = { ok: false };
    if (strokes.length) {
      const units = XenithTrace.normalize(strokes, padW, padH, S);
      // Accept exactly what the gate accepted: its 18px floor is a bigger
      // fraction of the X on small screens, so pass the tolerance in units.
      const tol = Math.max(18, S * 0.085) / (S / 2);
      built = XenithTrace.build(units, { tol: tol });
    }

    if (built.ok) {
      // Land the front layer (z = -0.08) exactly on the ink the visitor drew.
      const s0 = Math.min(W, H) * 0.265;
      const scale = (S / 2) / ((s0 * 0.5 * 2.4) / (1.9 - 0.08 * 0.55));
      xpts = XenithTrace.toPoints(built.beams, scale);
      lift = 0;
      liftTarget = 1;
    }
    document.body.dataset.source = built.ok ? "hand" : "ideal";

    document.body.classList.remove("locked");
    document.body.classList.add("entered");
    flash();
    // Hold the X exactly where the ink was for a beat, then let it become
    // the object. Without this the X starts sliding while the gate is still
    // fading and the handoff reads as a cut instead of a transformation.
    setTimeout(() => {
      zoomTarget = 1.0;
      enteredTarget = 1;
    }, 240);
  }

  $("#skip").addEventListener("click", unlock);
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") unlock();
  });

  // ---------- parallax ----------
  addEventListener("pointermove", (e) => {
    mx = (e.clientX / W - 0.5) * 2;
    my = (e.clientY / H - 0.5) * 2;
  });

  addEventListener("resize", () => {
    W = innerWidth;
    H = innerHeight;
    buildScene();
    sizePad();
  });

  // ---------- boot ----------
  W = innerWidth;
  H = innerHeight;
  buildScene();
  sizePad();
  requestAnimationFrame(frame);

  const demo = params.get("demo");
  if (demo) {
    setTimeout(() => {
      const pair = guides();
      const make = (a, b, bow) => {
        const pts = [];
        const ux = b[0] - a[0];
        const uy = b[1] - a[1];
        const len = Math.hypot(ux, uy);
        const nx = -uy / len;
        const ny = ux / len;
        for (let i = 0; i < 40; i++) {
          const t = i / 39;
          const w = Math.sin(t * Math.PI) * bow;
          pts.push([a[0] + ux * t + nx * w, a[1] + uy * t + ny * w]);
        }
        return pts;
      };
      strokes.push(make(pair[0][0], pair[0][1], demo === "wobble" ? 10 : 0));
      strokes.push(make(pair[1][0], pair[1][1], demo === "wobble" ? -8 : 0));
      $("#prompt").classList.add("fade");
      paint();
    }, 700);
  }
})();
