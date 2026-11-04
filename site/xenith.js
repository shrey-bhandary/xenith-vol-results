// Xenith selected: ASCII campus slab in 3D, draw-X gate, Rusty. No dependencies.
(() => {
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);

  // ---------- person ----------
  const key = (params.get("p") || "default").toLowerCase();
  const all = window.XENITH_PEOPLE || {};
  const person = { ...(all[key] || all.default || { name: "", dept: "", line: "" }) };
  ["name", "dept", "role", "line"].forEach((k) => {
    if (params.get(k)) person[k] = params.get(k);
  });
  $("#name").textContent = person.name;
  $("#role").textContent = person.dept;
  $("#line").textContent = person.line;

  // ---------- ascii slab ----------
  const cv = $("#scene");
  const ctx = cv.getContext("2d");
  const skyCv = $("#sky");
  const skyCtx = skyCv.getContext("2d");
  const contentEl = $("#content");
  const photoEl = $("#photo");
  const img = new Image();
  img.src = "../assets/img/campus-wide.jpg";

  const CH = " .:-=+*#%@";
  let W = innerWidth, H = innerHeight, ready = false;
  let mx = 0, my = 0, tx = 0, ty = 0;
  let zoom = 1.2, zoomTarget = 1.2;
  let enteredMix = 0, enteredTarget = 0;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mon = $("#monument");
  const mctx = mon.getContext("2d");
  let xpts = [];

  function buildX() {
    xpts = [];
    const beams = [[-1.15, -1.15, 1.15, 1.15], [1.15, -1.15, -1.15, 1.15]];
    for (const [ax, ay, bx, by] of beams) {
      for (let t = 0.01; t <= 0.99; t += 0.011) {
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        for (const z of [-0.08, 0, 0.08]) {
          xpts.push({ x, y, z });
        }
      }
    }
  }

  function drawX(t) {
    if (!W || !H) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (mon.width !== Math.floor(W * dpr) || mon.height !== Math.floor(H * dpr)) {
      mon.width = Math.floor(W * dpr);
      mon.height = Math.floor(H * dpr);
      mon.style.width = W + "px";
      mon.style.height = H + "px";
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    mctx.clearRect(0, 0, W, H);
    if (!xpts.length) return;

    const time = t / 1000;
    const ay = reduceMotion ? 0.04 * enteredMix : Math.sin(time * 0.33) * 0.02 + (Math.sin(time * 0.32) * 0.3 + tx * 0.14) * enteredMix;
    const ax = reduceMotion ? 0.01 * enteredMix : Math.cos(time * 0.27) * 0.01 + (Math.sin(time * 0.21) * 0.05 + ty * 0.07) * enteredMix;
    const cyv = Math.cos(ay), syv = Math.sin(ay);
    const cxv = Math.cos(ax), sxv = Math.sin(ax);
    const mobile = W < 720;
    const cX = W * (0.5 + (mobile ? 0.46 : 0.2) * enteredMix) + tx * 22 * enteredMix;
    const cY = H * (0.5 - (mobile ? 0.2 : 0) * enteredMix) + ty * 18 * enteredMix;
    const breathe = reduceMotion ? 1 : 1 + Math.sin(time * 0.9) * 0.012;
    const S0 = Math.min(W, H) * (0.265 + 0.05 * enteredMix) * (1 - (mobile ? 0.44 : 0) * enteredMix) * breathe;
    const base = S0 * 0.5;

    function project(px, py, pz) {
      const x = px * cyv - pz * syv;
      const z1 = px * syv + pz * cyv;
      const y = py * cxv - z1 * sxv;
      const z2 = py * sxv + z1 * cxv;
      const sc = 1 / (1.9 + z2 * 0.55);
      return [cX + x * base * sc * 2.4, cY + y * base * sc * 2.4];
    }

    const g1 = project(-1.15, -1.15, 0), g2 = project(1.15, 1.15, 0);
    const g3 = project(1.15, -1.15, 0), g4 = project(-1.15, 1.15, 0);
    mctx.save();
    mctx.strokeStyle = "rgba(255,170,90,.34)";
    mctx.lineWidth = 3;
    mctx.shadowColor = "rgba(255,150,60,.95)";
    mctx.shadowBlur = 34;
    mctx.beginPath();
    mctx.moveTo(g1[0], g1[1]); mctx.lineTo(g2[0], g2[1]);
    mctx.moveTo(g3[0], g3[1]); mctx.lineTo(g4[0], g4[1]);
    mctx.stroke();
    mctx.restore();

    const proj = [];
    for (const p of xpts) {
      const x = p.x * cyv - p.z * syv;
      const z1 = p.x * syv + p.z * cyv;
      const y = p.y * cxv - z1 * sxv;
      const z2 = p.y * sxv + z1 * cxv;
      const sc = 1 / (1.9 + z2 * 0.55);
      proj.push({ sx: cX + x * base * sc * 2.4, sy: cY + y * base * sc * 2.4, sc, z: z2 });
    }
    proj.sort((a, b) => a.sc - b.sc);

    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.shadowBlur = 0;
    const gate = enteredMix < 0.05;
    for (const p of proj) {
      const front = gate || p.z < 0;
      mctx.globalAlpha = gate ? 1 : front ? 0.8 : 0.45;
      mctx.fillStyle = front
        ? "rgba(255,214,150,.98)"
        : "rgba(150,120,240,.75)";
      mctx.font = front ? "12px ui-monospace, Menlo, monospace" : "8px ui-monospace, Menlo, monospace";
      mctx.fillText(front ? "#" : ":", p.sx, p.sy);
    }
    if (!sparks) {
      sparks = Array.from({ length: 28 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        v: 0.12 + Math.random() * 0.35,
        ch: ".:+*"[Math.floor(Math.random() * 4)],
        s: 0.4 + Math.random() * 0.7,
      }));
    }
    mctx.fillStyle = "rgba(255,177,92,.55)";
    for (const sp of sparks) {
      sp.y -= sp.v;
      if (sp.y < -10) { sp.y = H + 10; sp.x = Math.random() * W; }
      mctx.globalAlpha = 0.18 + sp.s * 0.12;
      mctx.font = Math.round(9 * sp.s + 5) + "px ui-monospace, monospace";
      mctx.fillText(sp.ch, sp.x, sp.y);
    }

    mctx.globalAlpha = 1;
    mctx.shadowBlur = 0;
  }

  let sparks = null;
  buildX();

  // ---------- digital rain ----------
  const rainCv = $("#rain");
  const rainCtx = rainCv.getContext("2d");
  let rainCols = [], rainW = 0, rainH = 0, lastRain = 0;

  function initRain() {
    if (reduceMotion) { rainCv.style.display = "none"; return; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    rainW = innerWidth; rainH = innerHeight;
    rainCv.width = Math.floor(rainW * dpr);
    rainCv.height = Math.floor(rainH * dpr);
    rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const step = rainW < 720 ? 9 : 12;
    const n = Math.ceil(rainW / step) + 1;
    rainCols = [];
    for (let i = 0; i < n; i++) {
      rainCols.push({
        x: i * step + step / 2,
        y: -Math.random() * rainH,
        sp: 45 + Math.random() * 85,
        len: 14 + Math.floor(Math.random() * 12),
        chars: [],
      });
    }
  }

  function drawRain(dt) {
    if (!rainCols.length) return;
    rainCtx.clearRect(0, 0, rainW, rainH);
    rainCtx.font = "13px ui-monospace, Menlo, monospace";
    rainCtx.textAlign = "center";
    const lineH = 15;
    for (const c of rainCols) {
      for (let k = 0; k < c.len; k++) {
        const y = c.y - k * lineH;
        if (y < -20 || y > rainH + 20) continue;
        if (!c.chars[k]) c.chars[k] = Math.random() < 0.5 ? "0" : "1";
        const a = k === 0 ? 1 : Math.pow(1 - k / c.len, 1.15) * 0.95;
        rainCtx.fillStyle = k === 0
          ? `rgba(255,246,220,${a})`
          : `rgba(255,157,61,${a})`;
        rainCtx.shadowColor = "rgba(255,177,92,.9)";
        rainCtx.shadowBlur = k === 0 ? 16 : 0;
        rainCtx.fillText(c.chars[k], c.x, y);
      }
      if (Math.random() < 0.12) {
        c.chars[Math.floor(Math.random() * c.len)] = Math.random() < 0.5 ? "0" : "1";
      }
      c.y += c.sp * dt / 1000;
      if (c.y - c.len * lineH > rainH + 40) {
        c.y = -Math.random() * 240;
        c.sp = 45 + Math.random() * 85;
        c.chars = [];
      }
    }
    rainCtx.shadowBlur = 0;
  }

  function isSky(r, g, b, l) {
    return b > 110 && b > r * 1.08 && g > r * 1.01 && l > 0.32;
  }

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    skyCv.width = Math.floor(W * dpr);
    skyCv.height = Math.floor(H * dpr);
    skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    skyCtx.clearRect(0, 0, W, H);
    if (!img.complete || !img.naturalWidth) return;

    const cell = W < 720 ? 7 : 8;
    const lineH = cell * 1.34;
    const cols = Math.ceil(W / cell) + 1;
    const rows = Math.ceil(H / lineH) + 1;

    const s = document.createElement("canvas");
    s.width = cols; s.height = rows;
    const sc = s.getContext("2d", { willReadFrequently: true });
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cols / rows;
    let sw, sh, sx, sy;
    if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) * 0.38; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) * 0.06; }
    sc.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
    const d = sc.getImageData(0, 0, cols, rows).data;

    ctx.font = Math.round(cell * 1.2) + "px ui-monospace, Menlo, monospace";
    ctx.textBaseline = "top";
    skyCtx.font = Math.round(cell * 1.2) + "px ui-monospace, Menlo, monospace";
    skyCtx.textBaseline = "top";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const sky = isSky(r, g, b, l);
        const px = x * cell, py = y * lineH;
        if (sky) {
          if (Math.random() > 0.05) continue;
          skyCtx.globalAlpha = 0.12 + l * 0.22;
          skyCtx.fillStyle = "rgba(158,138,230,.9)";
          skyCtx.fillText(".", px, py);
          continue;
        }
        if (l < 0.14) continue;
        const ch = CH[Math.min(9, Math.max(1, Math.floor(l * 9.6)))];

        ctx.globalAlpha = 0.1 + l * 0.08;
        ctx.fillStyle = "rgba(123,92,255,.9)";
        ctx.fillText(ch, px + 1.1, py + 1.1);

        ctx.globalAlpha = 0.3 + l * 0.38;
        ctx.fillStyle = l < 0.32 ? "rgba(168,120,220,.95)"
          : l < 0.62 ? "rgba(255,157,61,.97)"
          : "rgba(255,238,196,1)";
        ctx.fillText(ch, px, py);
      }
    }
    ctx.globalAlpha = 1;
    skyCtx.globalAlpha = 1;
    ready = true;
  }

  img.onload = build;
  img.onerror = () => { ready = true; };
  if (img.complete && img.naturalWidth) build();
  let resizeTimer;
  addEventListener("resize", () => {
    W = innerWidth; H = innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (ready) build(); initRain(); }, 180);
  });

  addEventListener("pointermove", (e) => {
    if (!W || !H) return;
    mx = (e.clientX / W - 0.5) * 2;
    my = (e.clientY / H - 0.5) * 2;
  });

  let lastFrame = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden || t - lastFrame < 33) return;
    lastFrame = t;
    if (!xpts.length) return;
    tx += (mx - tx) * 0.04;
    enteredMix += (enteredTarget - enteredMix) * 0.05;
    drawX(t);
    if (!ready) return;
    ty += (my - ty) * 0.04;
    zoom += (zoomTarget - zoom) * 0.035;
    const time = t / 1000;
    const px = tx * 30, py = ty * 20;
    const skyScale = 1.06 + Math.sin(time * 0.05) * 0.012;
    const sceneScale = 1.03 + Math.sin(time * 0.04) * 0.008;
    skyCv.style.transform =
      `translate3d(${(-px * 0.4 + Math.sin(time * 0.05) * 8).toFixed(1)}px,${(-py * 0.4 + Math.cos(time * 0.04) * 6).toFixed(1)}px,0) scale(${skyScale.toFixed(3)})`;
    cv.style.transform =
      `perspective(1300px) translate3d(${(-px).toFixed(1)}px,${(-py).toFixed(1)}px,0) rotateX(${(-ty * 1.4).toFixed(2)}deg) rotateY(${(tx * 1.8).toFixed(2)}deg) scale(${sceneScale.toFixed(3)})`;
    rainCv.style.transform =
      `translate3d(${(-px * 1.15).toFixed(1)}px,${(-py * 1.15).toFixed(1)}px,0)`;
    photoEl.style.transform =
      `translate3d(${(-px * 0.3).toFixed(1)}px,${(-py * 0.3).toFixed(1)}px,0) scale(1.06)`;
    contentEl.style.transform =
      `translate(${(px * 0.3).toFixed(1)}px, calc(-50% + ${(py * 0.3).toFixed(1)}px))`;
    if (t - lastRain > 45) { drawRain(Math.min(120, t - lastRain)); lastRain = t; }
  }
  requestAnimationFrame(frame);

  // ---------- gate ----------
  const pad = $("#xpad");
  const g = pad.getContext("2d");
  const strokes = [];
  let cur = null, unlocked = false;
  let padW = 0, padH = 0, S = 0, padRect = null;

  function sizePad() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    padW = innerWidth; padH = innerHeight;
    pad.width = Math.floor(padW * dpr);
    pad.height = Math.floor(padH * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    padRect = pad.getBoundingClientRect();
    S = Math.min(padW, padH) * 0.38;
    paint();
  }
  addEventListener("resize", sizePad);

  const pt = (e) => {
    const r = padRect || pad.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const guides = () => {
    const cx = padW / 2, cy = padH / 2, h = S / 2;
    return [
      [[cx - h, cy - h], [cx + h, cy + h]],
      [[cx + h, cy - h], [cx - h, cy + h]],
    ];
  };

  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function cover(guide) {
    let hit = 0;
    const n = 16;
    const tol = Math.max(34, S * 0.16);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const p = [
        guide[0][0] + (guide[1][0] - guide[0][0]) * t,
        guide[0][1] + (guide[1][1] - guide[0][1]) * t,
      ];
      let near = Infinity;
      for (const st of strokes) {
        for (let j = 1; j < st.length; j++) near = Math.min(near, distSeg(p, st[j - 1], st[j]));
        if (st.length === 1) near = Math.min(near, Math.hypot(p[0] - st[0][0], p[1] - st[0][1]));
      }
      if (near < tol) hit++;
    }
    return hit / n;
  }

  function paint(burst = 0) {
    g.clearRect(0, 0, padW, padH);
    const [A, B] = guides();

    g.save();
    g.setLineDash([6, 9]);
    g.lineWidth = 1.5;
    g.strokeStyle = "rgba(255,233,176,.55)";
    for (const gd of [A, B]) {
      g.beginPath(); g.moveTo(gd[0][0], gd[0][1]); g.lineTo(gd[1][0], gd[1][1]); g.stroke();
    }
    g.restore();

    const ca = cover(A), cb = cover(B);
    for (const [gd, c] of [[A, ca], [B, cb]]) {
      if (c <= 0.05) continue;
      g.save();
      g.globalAlpha = Math.min(0.4, c * 0.45);
      g.lineWidth = 4;
      g.lineCap = "round";
      g.strokeStyle = "#9ef0c0";
      g.shadowColor = "#9ef0c0"; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(gd[0][0], gd[0][1]); g.lineTo(gd[1][0], gd[1][1]); g.stroke();
      g.restore();
    }

    for (const st of strokes) {
      if (st.length < 2) continue;
      g.save();
      g.lineCap = "round"; g.lineJoin = "round";
      g.strokeStyle = "rgba(255,244,214,.95)";
      g.shadowColor = "#ffb15c"; g.shadowBlur = 12;
      for (let i = 1; i < st.length; i++) {
        const dx = st[i][0] - st[i - 1][0];
        const dy = st[i][1] - st[i - 1][1];
        const d = Math.hypot(dx, dy);
        g.lineWidth = Math.max(1.4, 5.4 - d * 0.12);
        g.beginPath();
        g.moveTo(st[i - 1][0], st[i - 1][1]);
        g.lineTo(st[i][0], st[i][1]);
        g.stroke();
      }
      g.restore();
    }

    if (particles) {
      g.save();
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (const p of particles) {
        g.globalAlpha = Math.max(0, 1 - burst) * 0.9;
        g.fillStyle = Math.random() < 0.5 ? "#ffb15c" : "#9ef0c0";
        g.font = p.size + "px ui-monospace, monospace";
        g.fillText(p.ch, p.x + p.vx * burst * 46, p.y + p.vy * burst * 46 + burst * burst * 26);
      }
      g.globalAlpha = 1;
      g.restore();
      if (burst < 0.25) {
        g.save();
        g.globalAlpha = (0.25 - burst) * 1.6;
        g.fillStyle = "#fff4d6";
        g.fillRect(0, 0, padW, padH);
        g.restore();
      }
    }

    if (!unlocked && ca >= 0.55 && cb >= 0.55) {
      unlocked = true;
      if (reduceMotion) { unlock(); return; }
      startBurst();
    }
  }

  let particles = null, burstStart = 0;

  function startBurst() {
    const [A, B] = guides();
    particles = [];
    for (let i = 0; i < 42; i++) {
      const gd = Math.random() < 0.5 ? A : B;
      const t = Math.random();
      const px = gd[0][0] + (gd[1][0] - gd[0][0]) * t;
      const py = gd[0][1] + (gd[1][1] - gd[0][1]) * t;
      const ang = Math.atan2(py - padH / 2, px - padW / 2) + (Math.random() - 0.5) * 1.5;
      const sp = 1.2 + Math.random() * 3.6;
      particles.push({
        x: px, y: py,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        ch: "01<>[]{}/*#"[Math.floor(Math.random() * 10)],
        size: 9 + Math.random() * 7,
      });
    }
    burstStart = performance.now();
    requestAnimationFrame(burstLoop);
  }

  function burstLoop(t) {
    const p = Math.min(1, (t - burstStart) / 520);
    paint(p);
    if (p >= 1) { particles = null; unlock(); return; }
    requestAnimationFrame(burstLoop);
  }

  pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (cur || particles) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pad.setPointerCapture(e.pointerId);
    cur = [pt(e)];
    strokes.push(cur);
    $("#prompt").classList.add("fade");
    paint();
  });
  pad.addEventListener("pointermove", (e) => {
    if (!cur || particles) return;
    cur.push(pt(e));
    paint();
  });
  const end = () => { cur = null; paint(); };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);

  function fireConfetti() {
    const c = $("#confetti");
    if (!c) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr);
    c.style.width = w + "px"; c.style.height = h + "px";
    const x = c.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.classList.add("on");
    const chars = "01<>[]{}/*#X";
    const cols = ["#ffb15c", "#ffe9b0", "#9ef0c0", "#7b5cff"];
    const ps = Array.from({ length: 90 }, (_, i) => ({
      x: w / 2 + (Math.random() - 0.5) * 120,
      y: h / 2 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 6,
      vy: -3.5 - Math.random() * 5.5,
      g: 0.12 + Math.random() * 0.08,
      ch: chars[i % chars.length],
      col: cols[i % cols.length],
      sz: 8 + Math.random() * 13,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.32,
    }));
    const t0 = performance.now();
    (function tick(t) {
      const p = (t - t0) / 2200;
      if (p >= 1) { c.classList.remove("on"); x.clearRect(0, 0, w, h); return; }
      x.clearRect(0, 0, w, h);
      for (const q of ps) {
        q.vy += q.g; q.x += q.vx; q.y += q.vy; q.rot += q.vr;
        x.save();
        x.globalAlpha = Math.max(0, 1 - p);
        x.translate(q.x, q.y);
        x.rotate(q.rot);
        x.fillStyle = q.col;
        x.font = q.sz + "px ui-monospace, monospace";
        x.fillText(q.ch, 0, 0);
        x.restore();
      }
      requestAnimationFrame(tick);
    })(t0);
  }

  let celebrateUntil = 0;

  function finishUnlock() {
    document.body.classList.remove("locked", "building");
    document.body.classList.add("entered", "built");
    zoomTarget = 1.0;
    enteredTarget = 1;
    celebrateUntil = performance.now() + 1500;
    if (!reduceMotion) fireConfetti();
    startRusty();
    const live = $("#live");
    if (live) live.textContent = `You are in. ${person.name}, ${person.dept}.`;
    const h = $("#name");
    if (h) h.focus({ preventScroll: true });
  }

  function showHandoffCover() {
    if (document.getElementById("handoff-cover")) return;
    document.documentElement.classList.add("engine-pending");
    const c = document.createElement("div");
    c.id = "handoff-cover";
    c.style.cssText = "position:fixed;inset:0;background:#05040c;z-index:2147483646;pointer-events:none";
    document.body.appendChild(c);
    setTimeout(() => { if (c.isConnected) c.remove(); document.documentElement.classList.remove("engine-pending"); }, 12000);
  }

  // ---------- story layer: ricco's gold pass, then the heads ----------
  const STORY_CAST = [
    ["ricco · built this","i built this one","#ffe9b0"],
    ["aaditya · events","we make the room full","#ff5c3b"],
    ["shreyash · talks","we bring the room to listen","#7b5cff"],
    ["glynnis · hospi","we look after everyone","#9ef0c0"],
    ["ashley · tech","we keep it standing","#1abcfe"],
    ["harsh · venue","we keep the lights on","#ffc700"],
    ["omkar · finance","we make it add up","#0acf83"],
    ["mogithh · publicity","we make them show up","#ff8a00"],
    ["tejas · admin","we make the chaos run on time","#e8467c"],
    ["nigel · hospi","we make sure nobody is lost","#00b5ce"],
    ["naren · fnd","we film it so it happened","#14ae5c"],
    ["sarvika · creatives","we make it look like something","#ff9ecb"]
  ];
  // Ricco gets the solo frame pass. The reel that follows is the heads.
  const HEAD_CAPTIONS = STORY_CAST.slice(1);
  const STORY = {
    started: false, stopped: false, root: null, layer: null, canvas: null, ctx: null,
    veil: null, cap: null, tag: null, label: null, W: 0, H: 0, t0: 0, raf: 0,
    timers: [], misses: 0, fading: false, trail: [], px: -1, py: -1,
    hostObs: null, rootObs: null, poll: 0, onMove: null, onResize: null
  };

  const storyClamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const storyEase = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  function storyLater(fn, ms) {
    const id = setTimeout(() => {
      STORY.timers = STORY.timers.filter((v) => v !== id);
      if (!STORY.stopped) { try { fn(); } catch (err) { console.error(err); } }
    }, ms);
    STORY.timers.push(id);
    return id;
  }

  function storyStop() {
    if (STORY.stopped) return;
    STORY.stopped = true;
    if (STORY.raf) cancelAnimationFrame(STORY.raf);
    STORY.raf = 0;
    STORY.timers.forEach(clearTimeout);
    STORY.timers = [];
    if (STORY.hostObs) STORY.hostObs.disconnect();
    if (STORY.rootObs) STORY.rootObs.disconnect();
    if (STORY.poll) clearInterval(STORY.poll);
    if (STORY.onMove) document.removeEventListener("pointermove", STORY.onMove);
    if (STORY.onResize) removeEventListener("resize", STORY.onResize);
    if (STORY.layer && STORY.layer.parentNode) STORY.layer.parentNode.removeChild(STORY.layer);
    STORY.layer = null;
  }

  // The engine swaps its host on Replay. Keep the layer in whichever shadow
  // root is current, and put it back if the engine resets that root.
  function storyAttach(root) {
    if (!STORY.layer) return false;
    if (STORY.root === root && STORY.layer.parentNode === root) return true;
    STORY.root = root;
    root.appendChild(STORY.layer);
    if (STORY.rootObs) STORY.rootObs.disconnect();
    STORY.rootObs = new MutationObserver(() => {
      if (STORY.stopped || STORY.layer === null || STORY.root !== root) return;
      if (STORY.layer.parentNode !== root) root.appendChild(STORY.layer);
    });
    STORY.rootObs.observe(root, { childList: true });
    return true;
  }

  function storySync() {
    if (STORY.stopped || !STORY.layer) return;
    const hudEl = STORY.root && STORY.root.querySelector ? STORY.root.querySelector(".hud") : null;
    if (hudEl && !STORY.revealed && /Rebuilt by/.test(hudEl.textContent)) {
      STORY.revealed = true;
      const bg = STORY.root.querySelector(".bg");
      if (bg) { bg.style.transition = "opacity 1.1s ease"; bg.style.opacity = "0"; }
      if (STORY.veil) { STORY.veil.style.opacity = "0"; }
      if (STORY.canvas) { STORY.canvas.style.transition = "opacity .6s ease"; STORY.canvas.style.opacity = "0"; }
    }
    const host = document.querySelector("swarm-rebuild");
    const root = host && host.shadowRoot;
    if (root) {
      STORY.misses = 0;
      storyAttach(root);
      return;
    }
    if (STORY.root && STORY.root !== document.body) {
      STORY.misses++;
      if (STORY.misses > 8) storyStop();
    }
  }

  function storySize() {
    const cv = STORY.canvas, ctx = STORY.ctx;
    if (!cv || !ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    STORY.W = innerWidth;
    STORY.H = innerHeight;
    STORY.dpr = dpr;
    cv.width = Math.floor(STORY.W * dpr);
    cv.height = Math.floor(STORY.H * dpr);
    cv.style.width = STORY.W + "px";
    cv.style.height = STORY.H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function storyGeom() {
    const W = STORY.W, H = STORY.H;
    const pad = Math.max(10, Math.min(18, Math.round(Math.min(W, H) * 0.022)));
    return { W, H, pad, x0: pad, y0: pad, x1: W - pad, y1: H - pad };
  }

  function storyFrame(ctx, g, p) {
    if (p <= 0) return;
    const w = g.x1 - g.x0, h = g.y1 - g.y0;
    let d = p * 2 * (w + h);
    const edges = [
      [g.x0, g.y0, g.x1, g.y0, w],
      [g.x1, g.y0, g.x1, g.y1, h],
      [g.x1, g.y1, g.x0, g.y1, w],
      [g.x0, g.y1, g.x0, g.y0, h]
    ];
    ctx.beginPath();
    ctx.moveTo(g.x0, g.y0);
    for (const e of edges) {
      if (d <= 0) break;
      const t = Math.min(1, d / e[4]);
      ctx.lineTo(e[0] + (e[2] - e[0]) * t, e[1] + (e[3] - e[1]) * t);
      d -= e[4];
    }
    ctx.stroke();
  }

  function storyFramePoint(g, p) {
    const w = g.x1 - g.x0, h = g.y1 - g.y0;
    let d = p * 2 * (w + h);
    if (d <= w) return [g.x0 + d, g.y0];
    d -= w;
    if (d <= h) return [g.x1, g.y0 + d];
    d -= h;
    if (d <= w) return [g.x1 - d, g.y1];
    d -= w;
    return [g.x0, g.y1 - Math.min(h, d)];
  }

  function storyWordGeom(ctx, g) {
    const size = Math.round(Math.max(16, Math.min(24, Math.min(g.W, g.H) * 0.055)));
    ctx.font = "600 " + size + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const track = Math.max(2, Math.round(size * 0.16));
    const chars = ["x", "e", "n", "i", "t", "h"];
    const widths = chars.map((c) => ctx.measureText(c).width);
    let total = track * (chars.length - 1);
    for (const w of widths) total += w;
    return {
      size, track, chars, widths, total,
      x: g.pad + Math.max(18, Math.round(size * 0.9)),
      y: g.pad + Math.max(30, Math.round(size * 1.8))
    };
  }

  function storyWord(ctx, wg, p) {
    const reveal = wg.total * p;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wg.x - 8, wg.y - wg.size * 1.5, reveal + 8, wg.size * 2);
    ctx.clip();
    ctx.fillStyle = "#ffe9b0";
    ctx.shadowColor = "rgba(255,177,92,.75)";
    ctx.shadowBlur = 16;
    let x = wg.x;
    for (let i = 0; i < wg.chars.length; i++) {
      ctx.fillText(wg.chars[i], x, wg.y);
      x += wg.widths[i] + wg.track;
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#ffb15c";
    ctx.fillRect(wg.x - 2, wg.y + 7, reveal, 1);
    ctx.restore();
  }

  function storyCursor(ctx, x, y, blink) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = "rgba(255,177,92,.95)";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 16);
    ctx.lineTo(4.4, 12);
    ctx.lineTo(7, 18);
    ctx.lineTo(9.6, 16.8);
    ctx.lineTo(7, 10.8);
    ctx.lineTo(12, 10.8);
    ctx.closePath();
    ctx.fillStyle = "#ffe9b0";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffb15c";
    ctx.lineWidth = 1;
    ctx.stroke();
    // pixel star at the tail
    ctx.fillStyle = blink ? "#fff6de" : "#ffb15c";
    ctx.fillRect(-3.5, 13, 1.6, 6);
    ctx.fillRect(-5.5, 15.2, 7.2, 1.6);
    ctx.fillRect(-3.5, 9.2, 1.6, 2.4);
    ctx.restore();
  }

  function storyLogoDraw(a) {
    const c = STORY.ctx;
    if (!c || !STORY.W || !STORY_LOGO.complete) return;
    const iw = Math.min(STORY.W * 0.44, 560), ih = iw * (400 / 1200);
    c.save();
    c.globalAlpha = a;
    c.shadowColor = "rgba(255,177,92,.5)";
    c.shadowBlur = 24;
    c.drawImage(STORY_LOGO, (STORY.W - iw) / 2, (STORY.H - ih) / 2, iw, ih);
    c.restore();
  }

  function storyDraw(el) {
    const ctx = STORY.ctx;
    if (!ctx || !STORY.W || !STORY.H) return;
    ctx.clearRect(0, 0, STORY.W, STORY.H);
    const g = storyGeom();
    const wg = storyWordGeom(ctx, g);
    const frameP = storyEase(storyClamp(el / 1500));
    const writeP = storyClamp((el - 1620) / 900);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,233,176,.92)";
    ctx.shadowColor = "rgba(255,177,92,.85)";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.2;
    storyFrame(ctx, g, frameP);
    ctx.restore();

    if (writeP > 0) storyWord(ctx, wg, writeP);

    let px, py;
    if (el < 1500) {
      const p = storyFramePoint(g, frameP);
      px = p[0]; py = p[1];
    } else if (el < 1620) {
      const a = storyFramePoint(g, 1);
      const t = (el - 1500) / 120;
      px = a[0] + (wg.x - a[0]) * t;
      py = a[1] + (wg.y - 4 - a[1]) * t;
    } else {
      px = wg.x + wg.total * writeP;
      py = wg.y - 4;
    }

    const now = performance.now();
    const tr = STORY.trail;
    if (!tr.length || Math.hypot(px - tr[tr.length - 1].x, py - tr[tr.length - 1].y) > 2.5) {
      tr.push({ x: px, y: py, t: now });
    }
    while (tr.length && now - tr[0].t > 280) tr.shift();
    if (tr.length > 1) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,177,92,.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < tr.length; i++) {
        ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
        ctx.lineTo(tr[i].x, tr[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // keep the pointer glyph inside the canvas while it runs the frame edge
    const dx = Math.min(px, STORY.W - 14);
    const dy = Math.min(py, STORY.H - 20);
    storyCursor(ctx, dx, dy, Math.floor(now / 220) % 2 === 0);

    if (STORY.label) {
      const lx = Math.min(Math.max(10, px + 16), Math.max(10, STORY.W - 170));
      const ly = Math.min(Math.max(10, py + 18), Math.max(10, STORY.H - 44));
      STORY.label.style.transform = "translate(" + Math.round(lx) + "px," + Math.round(ly) + "px)";
      // the tag is for the frame pass only; it clears before the wordmark
      if (el > 320 && el < 1400) STORY.label.style.opacity = "1";
      else if (el >= 1400) STORY.label.style.opacity = "0";
    }
  }

  const STORY_LOGO = new Image();
  STORY_LOGO.src = "../assets/brand/xenith-logo-amber.svg";
  function storyRound(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function storyGlass(p) {
    const c = STORY.ctx; if (!c) return;
    const W = STORY.W, H = STORY.H;
    c.setTransform(STORY.dpr || 1, 0, 0, STORY.dpr || 1, 0, 0);
    c.clearRect(0, 0, W, H);
    const iw = Math.min(W * 0.44, 560), ih = iw * (400 / 1200);
    const lx = (W - iw) / 2, ly = (H - ih) / 2;
    const la = Math.max(0, Math.min(1, (p - 0.55) / 0.35));
    if (STORY_LOGO.complete && STORY_LOGO.naturalWidth && la > 0) {
      c.globalAlpha = la;
      c.shadowColor = "rgba(255,177,92,.55)";
      c.shadowBlur = 26;
      c.drawImage(STORY_LOGO, lx, ly, iw, ih);
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }
    const grow = Math.min(1, p / 0.42);
    const morph = Math.max(0, Math.min(1, (p - 0.28) / 0.36));
    const R = Math.min(W, H) * 0.30 * (0.2 + 0.8 * (1 - Math.pow(1 - grow, 3)));
    const tileW = iw * 1.16, tileH = ih * 2.1;
    const cx = W / 2, cy = H / 2;
    const bw = R * 2 + (tileW - R * 2) * morph;
    const bh = R * 2 + (tileH - R * 2) * morph;
    const rad = (Math.min(bw, bh) * 0.5) * (1 - morph) + Math.min(bw, bh) * 0.14 * morph;
    const ga = Math.max(0, 1 - (p - 0.7) / 0.3);
    if (ga <= 0.001) return;
    c.save();
    c.globalAlpha = ga;
    storyRound(c, cx - bw / 2, cy - bh / 2, bw, bh, rad);
    c.clip();
    const g = c.createLinearGradient(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2);
    g.addColorStop(0, "rgba(255,255,255,.18)");
    g.addColorStop(0.45, "rgba(170,215,255,.07)");
    g.addColorStop(1, "rgba(255,255,255,.02)");
    c.fillStyle = g;
    c.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
    c.lineWidth = 1.4;
    c.strokeStyle = "rgba(255,255,255,.55)";
    storyRound(c, cx - bw / 2, cy - bh / 2, bw, bh, rad);
    c.stroke();
    c.strokeStyle = "rgba(255,255,255,.5)";
    c.lineWidth = 2.2;
    c.beginPath();
    c.ellipse(cx - bw * 0.16, cy - bh * 0.2, bw * 0.2, bh * 0.05, -0.5, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  function storyTick(now) {
    if (STORY.stopped) return;
    if (!STORY.t0) { STORY.raf = requestAnimationFrame(storyTick); return; }
    const el = now - STORY.t0;
    storyDraw(el);
    if (el < 3900) {
      STORY.raf = requestAnimationFrame(storyTick);
    } else {
      STORY.raf = 0;
      if (STORY.ctx) { STORY.ctx.clearRect(0, 0, STORY.W, STORY.H); }
    }
  }

  function storyCaptions() {
    if (STORY.stopped) return;
    const tag = STORY.tag;
    if (tag) {
      if (STORY.px < 0 || STORY.py < 0) {
        STORY.px = innerWidth * 0.62;
        STORY.py = innerHeight * 0.56;
      }
      tag.style.opacity = "1";
      tag.style.transform = "translate(" + (STORY.px + 14) + "px," + (STORY.py + 12) + "px)";
    }
    let i = 0;
    const show = () => {
      if (STORY.stopped || !STORY.cap) return;
      if (i >= HEAD_CAPTIONS.length) { STORY.cap.style.opacity = "0"; return; }
      const row = HEAD_CAPTIONS[i++];
      STORY.cap.textContent = row[0] + "   " + row[1];
      STORY.cap.style.color = row[2];
      STORY.cap.style.opacity = "1";
      storyLater(() => {
        if (STORY.cap) STORY.cap.style.opacity = "0";
        storyLater(show, 380);
      }, 2300);
    };
    show();
  }

  function storyBuild() {
    const layer = document.createElement("div");
    layer.id = "xenith-story";
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;contain:layout style";

    const veil = document.createElement("div");
    veil.style.cssText = "position:absolute;inset:0;background:#05040c;opacity:1;transition:opacity .9s ease";
    layer.appendChild(veil);
    STORY.veil = veil;

    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:1;transition:opacity .7s ease";
    layer.appendChild(cv);
    STORY.canvas = cv;
    STORY.ctx = cv.getContext("2d");

    const cap = document.createElement("div");
    cap.style.cssText = "position:absolute;left:clamp(18px,4vw,48px);bottom:88px;max-width:min(74vw,620px);color:#ffe9b0;font-size:clamp(9.5px,1.1vw,11.5px);line-height:1.5;letter-spacing:.14em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .4s ease;text-shadow:0 1px 16px rgba(5,4,12,.95)";
    layer.appendChild(cap);
    STORY.cap = cap;

    const tag = document.createElement("div");
    const who = (person.name || params.get("p") || "you").replace(/[^a-z0-9 ]/gi, "").trim() || "you";
    tag.textContent = who + " · you";
    tag.style.cssText = "position:absolute;left:0;top:0;color:#9ef0c0;font-size:10px;letter-spacing:.12em;padding:2px 5px;border:1px solid rgba(158,240,192,.55);background:rgba(5,4,12,.55);opacity:0;transition:opacity .5s ease;transform:translate(-9999px,-9999px)";
    layer.appendChild(tag);
    STORY.tag = tag;

    const label = document.createElement("div");
    label.textContent = "ricco · built this";
    label.style.cssText = "position:absolute;left:0;top:0;color:#ffe9b0;font-size:11px;letter-spacing:.14em;padding:2px 5px;border:1px solid rgba(255,177,92,.65);background:rgba(5,4,12,.6);opacity:0;transition:opacity .35s ease;transform:translate(-9999px,-9999px);white-space:nowrap";
    layer.appendChild(label);
    STORY.label = label;

    const hero = document.createElement("img");
    hero.src = "../assets/brand/xenith-logo-amber.svg";
    hero.alt = "";
    hero.style.cssText = "display:none";
    layer.appendChild(hero);
    STORY.hero = hero;

    STORY.layer = layer;
    STORY.onResize = storySize;
    addEventListener("resize", STORY.onResize);
    STORY.onMove = (e) => {
      STORY.px = e.clientX;
      STORY.py = e.clientY;
      if (STORY.tag) {
        STORY.tag.style.transform = "translate(" + (e.clientX + 14) + "px," + (e.clientY + 12) + "px)";
      }
    };
    document.addEventListener("pointermove", STORY.onMove, { passive: true });
    storySize();
  }

  const GLASS_CSS = "/*\n  Glass Logo Reveal: the stage the reveal is drawn on and the mark it lands on. The mark is the\n  real image, laid out by the page; the canvas paints over it while the glass moves and steps\n  aside once it has landed. Size the mark with --lg-logo-reveal-size.\n\n  Vanilla port of the MIT-licensed Glassy UI stylesheet. The original @layer wrappers are\n  dropped: link this file directly instead of compiling it into Tailwind.\n*/\n\n.lg-logo-reveal {\n  --lg-logo-reveal-stage: #1c1c1e;\n  --lg-logo-reveal-ink: #f5f5f7;\n\n  position: relative;\n  display: grid;\n  place-items: center;\n  aspect-ratio: 16 / 9;\n  margin: 0;\n  overflow: hidden;\n  container-type: size;\n  background-color: var(--lg-logo-reveal-stage);\n  color: var(--lg-logo-reveal-ink);\n}\n\n[data-lg-theme='light'] .lg-logo-reveal {\n  --lg-logo-reveal-stage: #faf9f7;\n  --lg-logo-reveal-ink: #222224;\n}\n\n/* The glass tile grows to a little under twice the mark, so nearly half the stage leaves room. */\n.lg-logo-reveal-mark {\n  display: block;\n  /* The box keeps the mark's own proportions, so nothing drawn from it is ever squashed. */\n  width: auto;\n  height: var(--lg-logo-reveal-size, 46cqmin);\n}\n\n.lg-logo-reveal-canvas {\n  position: absolute;\n  inset: 0;\n  display: block;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  user-select: none;\n}\n\n.lg-logo-reveal[data-state='ended'] .lg-logo-reveal-canvas {\n  opacity: 0;\n  transition: opacity 240ms var(--lg-ease-out, cubic-bezier(0.32, 0.72, 0, 1));\n}\n\n/* With scripting the canvas draws everything until the glass has gone. */\n@media (scripting: enabled) {\n  .lg-logo-reveal:not([data-state='ended']) .lg-logo-reveal-mark {\n    visibility: hidden;\n  }\n}\n\n/* Reduced motion and reduced transparency keep the mark and drop the glass. */\nhtml[data-lg-reduce-motion='1'] .lg-logo-reveal-mark,\nhtml[data-lg-reduce-transparency='1'] .lg-logo-reveal-mark {\n  visibility: visible;\n}\n\nhtml[data-lg-reduce-motion='1'] .lg-logo-reveal-canvas,\nhtml[data-lg-reduce-transparency='1'] .lg-logo-reveal-canvas {\n  visibility: hidden;\n}\n\n@media (prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce) {\n  .lg-logo-reveal-mark {\n    visibility: visible;\n  }\n\n  .lg-logo-reveal-canvas {\n    visibility: hidden;\n  }\n}\n\n.lg-logo-reveal-error {\n  position: absolute;\n  inset: auto 0 0;\n  padding: 12px;\n  font-size: 0.875rem;\n  text-align: center;\n}\n";

  function storyGlassMount() {
    if (!window.GlassReveal) return;
    const root = STORY.root || document.body;
    if (!root.querySelector("style[data-glass]")) {
      const st = document.createElement("style");
      st.setAttribute("data-glass", "");
      st.textContent = GLASS_CSS + "\n.lg-logo-reveal{width:min(62vw,400px);height:min(40vh,225px);background:#06050f;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6)}@media(max-width:720px){.lg-logo-reveal{width:min(78vw,320px);height:180px}}";
      root.appendChild(st);
    }
    const stage = document.createElement("div");
    stage.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;z-index:2;--lg-logo-reveal-size:36px;--lg-logo-reveal-stage:#06050f";
    STORY.layer.appendChild(stage);
    try {
      STORY.glass = window.GlassReveal.mount(stage, {
        markSrc: "../assets/brand/xenith-logo-amber.svg",
        label: "Xenith",
        duration: 2600,
        play: "mount",
        onComplete: () => { STORY.t0 = performance.now(); setTimeout(() => { stage.style.transition = "opacity .5s ease"; stage.style.opacity = "0"; setTimeout(() => stage.remove(), 650); }, 250); }
      });
    } catch (e) { STORY.t0 = performance.now(); }
  }

  function storyBegin(parent) {
    if (STORY.stopped || STORY.layer) return;
    storyBuild();
    if (parent && parent !== document.body) storyAttach(parent);
    else {
      STORY.root = document.body;
      document.body.appendChild(STORY.layer);
    }

    STORY.hostObs = new MutationObserver(storySync);
    STORY.hostObs.observe(document.documentElement, { childList: true });
    STORY.poll = setInterval(storySync, 1200);

    const cover = document.getElementById("handoff-cover");
    if (cover) setTimeout(() => { if (cover.isConnected) cover.remove(); document.documentElement.classList.remove("engine-pending"); }, 900);

    STORY.t0 = 0;
    STORY.t0 = performance.now();
    STORY.noFrame = true;
    setTimeout(() => {
      if (STORY.stopped) return;
      const bg = STORY.root && STORY.root.querySelector ? STORY.root.querySelector(".bg") : null;
      if (bg) { bg.style.transition = "opacity 1.3s ease"; bg.style.opacity = "0"; }
      if (STORY.veil) { STORY.veil.style.transition = "opacity 1.3s ease"; STORY.veil.style.opacity = "0"; }
      if (STORY.canvas) STORY.canvas.style.opacity = "0";
      if (STORY.hero) { STORY.hero.style.transition = "opacity 1.1s ease"; STORY.hero.style.opacity = "0"; setTimeout(() => STORY.hero.remove(), 1200); }
    }, 600);
    if (reduceMotion) {
      storyDraw(1e6);
      STORY.veil.style.opacity = ".45";
      storyLater(() => { STORY.veil.style.opacity = "0"; STORY.label.style.opacity = "0"; }, 600);
      storyLater(() => { if (STORY.canvas) STORY.canvas.style.opacity = "0"; }, 1000);
      storyLater(storyCaptions, 1100);
      storyLater(() => { if (STORY.ctx) STORY.ctx.clearRect(0, 0, STORY.W, STORY.H); }, 1900);
      return;
    }

    STORY.raf = requestAnimationFrame(storyTick);
    storyLater(() => {
      STORY.fading = true;
      if (STORY.label) STORY.label.style.opacity = "0";
    }, 2750);
    storyLater(() => { if (STORY.canvas) STORY.canvas.style.opacity = "0"; }, 3050);
    storyLater(storyCaptions, 3250);
  }

  function startSwarmStory() {
    if (STORY.started) return;
    STORY.started = true;
    let tries = 0;
    const wait = () => {
      if (STORY.stopped) return;
      const host = document.querySelector("swarm-rebuild");
      const root = host && host.shadowRoot;
      if (root) { storyBegin(root); return; }
      if (++tries > 36) { storyBegin(document.body); return; }
      setTimeout(wait, 300);
    };
    wait();
  }

  function glassPrelude(done) {
    if (!window.GlassReveal) { done(); return; }
    if (!document.querySelector("style[data-glass-page]")) {
      const st = document.createElement("style");
      st.setAttribute("data-glass-page", "");
      st.textContent = GLASS_CSS + "\n\n#xp-glass{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#05040c;opacity:1;transition:opacity .45s ease}\n#xp-glass .lg-logo-reveal{width:min(62vw,400px);height:min(40vh,225px);border-radius:16px;background:#06050f;border:1px solid rgba(255,233,176,.14);box-shadow:0 40px 120px rgba(0,0,0,.8)}\n@media(max-width:720px){#xp-glass .lg-logo-reveal{width:min(78vw,320px);height:180px}}";
      document.head.appendChild(st);
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      wrap.style.opacity = "0";
      setTimeout(() => { wrap.remove(); done(); }, 520);
    };
    const watchdog = setTimeout(finish, 4600);
    const wrap = document.createElement("div");
    wrap.id = "xp-glass";
    wrap.style.setProperty("--lg-logo-reveal-size", "36px");
    const plate = document.createElement("div");
    wrap.appendChild(plate);
    document.body.appendChild(wrap);
    try {
      window.GlassReveal.mount(plate, {
        markSrc: "../assets/brand/xenith-logo-amber.svg",
        label: "Xenith",
        duration: 2600,
        play: "mount",
        onComplete: () => {
          clearTimeout(watchdog);
          setTimeout(finish, 380);
        }
      });
    } catch (e) { wrap.remove(); done(); }
  }

  function startSwarmWithPrelude() {
    showHandoffCover();
    glassPrelude(() => setTimeout(loadSwarmEngine, 160));
  }

  function loadSwarmEngine() {
    if (window.__swarmRebuild || document.getElementById("swarm-engine")) return;
    document.body.classList.add("engine");
    enteredMix = 1;
    try { drawX(performance.now()); } catch (e) {}
    showHandoffCover();
    const done = () => setTimeout(startSwarmStory, 600);
    fetch("vendor/swarm.js?v=6").then((r) => r.text()).then((src) => {
      try { new Function(src)(); } catch (err) { console.error("[xenith] engine boot failed", err); }
      const drop = () => {
        if (document.querySelector("swarm-rebuild")) {
          setTimeout(() => {
            const c = document.getElementById("handoff-cover");
            if (c) c.remove();
            document.documentElement.classList.remove("engine-pending");
          }, 700);
        } else setTimeout(drop, 100);
      };
      drop();
      done();
    }).catch(() => {
      const s = document.createElement("script");
      s.id = "swarm-engine";
      s.src = "vendor/swarm.js?v=6";
      s.onload = () => { const c = document.getElementById("handoff-cover"); if (c) c.remove(); document.documentElement.classList.remove("engine-pending"); done(); };
      s.onerror = () => { const c = document.getElementById("handoff-cover"); if (c) c.remove(); document.documentElement.classList.remove("engine-pending"); };
      document.body.appendChild(s);
    });
  }

  function unlock(skipBuild) {
    if (document.body.classList.contains("entered")) return;
    const gate = $("#gate");
    if (gate) gate.classList.add("done");
    finishUnlock();
    if (!skipBuild && !reduceMotion) {
      startSwarmWithPrelude();
    }
  }

  const copyBtn = $("#copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const label = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(location.href);
        copyBtn.textContent = "copied.";
      } catch (e) {
        copyBtn.textContent = "copy failed";
      }
      setTimeout(() => { copyBtn.textContent = label; }, 1800);
    });
  }

  const saveBtn = $("#save");
  if (saveBtn && window.XenithCard) {
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      const label = saveBtn.textContent;
      try {
        await window.XenithCard.download(person);
        saveBtn.textContent = "saved.";
        setTimeout(() => { saveBtn.textContent = label; saveBtn.disabled = false; }, 1800);
      } catch (e) {
        saveBtn.textContent = label;
        saveBtn.disabled = false;
      }
    });
  }

  $("#skip").addEventListener("click", () => unlock(true));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") unlock(true);
  });

  // ---------- rusty ----------
  const rc = $("#rusty");
  const rx = rc.getContext("2d");
  const U = 6, CW = 42 * U, CHH = 46 * U;
  rc.width = CW; rc.height = CHH;
  const C = { white: "#e9e3d2", shade: "#bdb6a4", dark: "#241d3a", screen: "#0b0818", red: "#ff5c3b", amber: "#ffb15c", cream: "#ffe9b0" };
  const px = (x, y, w, h, c) => { rx.fillStyle = c; rx.fillRect(x * U, y * U, w * U, h * U); };
  let blink = 0, lastBlink = 0, rustStarted = false;

  function drawRusty(t) {
    const party = performance.now() < celebrateUntil;
    const bob = reduceMotion ? 0 : Math.sin(t * (party ? 4.2 : 1.5)) * (party ? 2.6 : 1.1);
    const lx = Math.max(-1.2, Math.min(1.2, tx * 1.2));
    rx.clearRect(0, 0, CW, CHH);
    px(20, 6 + bob, 2, 6, C.amber);
    px(19, 3 + bob, 4, 3, C.amber);
    px(20, 2 + bob, 2, 1, C.cream);
    px(11, 12 + bob, 20, 14, C.dark);
    px(12, 13 + bob, 18, 12, C.white);
    px(13, 14 + bob, 16, 10, C.screen);
    const bh = blink ? 1 : 3;
    rx.shadowColor = C.red; rx.shadowBlur = 10;
    px(16 + lx, 17 + bob + (blink ? 1 : 0), 3, bh, C.red);
    px(24 + lx, 17 + bob + (blink ? 1 : 0), 3, bh, C.red);
    rx.shadowBlur = 0;
    px(19, 21 + bob, 4, 1, C.amber);
    px(9, 16 + bob, 2, 6, C.dark);
    px(31, 16 + bob, 2, 6, C.dark);
    px(19, 26 + bob, 4, 2, C.shade);
    px(14, 28 + bob, 14, 10, C.dark);
    px(15, 29 + bob, 12, 8, C.white);
    px(16, 30 + bob, 10, 6, C.screen);
    px(17, 32 + bob, 2, 2, C.amber);
    px(20, 32 + bob, 2, 2, "#9ef0c0");
    px(23, 32 + bob, 2, 2, C.red);
    if (party) {
      px(9, 25 + bob, 2, 4, C.shade);
      px(31, 25 + bob, 2, 4, C.shade);
      px(8, 23 + bob, 3, 2, C.amber);
      px(31, 23 + bob, 3, 2, C.amber);
    } else {
      px(11, 29 + bob, 2, 7, C.shade);
      px(29, 29 + bob, 2, 7, C.shade);
    }
    px(14, 38 + bob, 14, 4, C.dark);
    px(15, 39 + bob, 3, 2, C.shade);
    px(20, 39 + bob, 3, 2, C.shade);
    px(25, 39 + bob, 3, 2, C.shade);
  }

  function rustyLoop(t) {
    if (!rustStarted) return;
    requestAnimationFrame(rustyLoop);
    if (t - lastBlink > 3400) { blink = 1; lastBlink = t; setTimeout(() => (blink = 0), 130); }
    drawRusty(t / 1000);
  }

  function startRusty() {
    if (rustStarted) return;
    rustStarted = true;
    requestAnimationFrame(rustyLoop);
  }

  // ---------- boot ----------
  sizePad();
  initRain();
  if (params.get("engine")) showHandoffCover();
  if (params.get("entered")) {
    setTimeout(() => {
      unlock(true);
      if (params.get("engine")) setTimeout(startSwarmWithPrelude, 500);
    }, 300);
  }
  if (params.get("gate") === "auto") {
    setTimeout(() => {
      const [A, B] = guides();
      strokes.push([...Array(16)].map((_, i) => [A[0][0] + (A[1][0] - A[0][0]) * i / 15, A[0][1] + (A[1][1] - A[0][1]) * i / 15]));
      strokes.push([...Array(16)].map((_, i) => [B[0][0] + (B[1][0] - B[0][0]) * i / 15, B[0][1] + (B[1][1] - B[0][1]) * i / 15]));
      paint();
    }, 400);
  }
})();
