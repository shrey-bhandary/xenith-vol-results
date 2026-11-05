// Xenith selected: ASCII campus slab in 3D, draw-X gate, Rusty. No dependencies.
(() => {
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);

  // ---------- person ----------
  // XENITH_PEOPLE is a plain object literal, so "constructor" and friends are
  // inherited keys. Resolve records by own property only.
  const key = (params.get("p") || "default").toLowerCase();
  const all = window.XENITH_PEOPLE || {};
  const own = Object.prototype.hasOwnProperty.call(all, key) ? all[key] : null;
  const overrides = {};
  ["name", "dept", "role"].forEach((k) => {
    if (params.get(k)) overrides[k] = params.get(k);
  });
  // The line is the written part of the reveal, so a shared link cannot rewrite
  // it. Only a dev host may.
  if (params.get("line")) {
    const devHost = location.protocol === "file:" ||
      /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (devHost) overrides.line = params.get("line");
    else console.warn("[xenith] ignoring ?line=: it is only allowed on a dev host");
  }
  const wantsOverride = Object.keys(overrides).length > 0;
  // Overrides only patch the record the link actually asked for; otherwise they
  // build a neutral record instead of borrowing the author's line.
  let person;
  if (own && params.get("p")) person = { ...own, ...overrides };
  else if (wantsOverride) person = { name: "", dept: "", role: "", line: "", tag: "", ...overrides };
  else person = { ...(all.default || { name: "", dept: "", role: "", line: "", tag: "" }) };

  // ---------- departments directory (for option 2 / explore mode) ----------
  const DEPARTMENTS = [
    {
      id: "events",
      name: "Events",
      role: "DEPARTMENT 01 / 06 · EVENTS & COMPETITIONS",
      title: "The Arenas",
      line: "Where code meets adrenaline. 48 hours of hackathons, algorithmic sprints, game jams, and flagship cyber challenges."
    },
    {
      id: "talks",
      name: "Talks & Panels",
      role: "DEPARTMENT 02 / 06 · TALKS & PANELS",
      title: "The Keynotes",
      line: "Frontier conversations with founders, researchers, and engineers building AI, distributed systems, and open protocols."
    },
    {
      id: "tech",
      name: "Tech & Systems",
      role: "DEPARTMENT 03 / 06 · TECH & SYSTEMS",
      title: "The Core",
      line: "The architects of Xenith's digital realm. Real-time scoring dashboards, hidden terminal easter eggs, and resilient campus infra."
    },
    {
      id: "hospitality",
      name: "Hospitality",
      role: "DEPARTMENT 04 / 06 · HOSPITALITY & LOGISTICS",
      title: "The Welcoming Crew",
      line: "Guiding over a thousand participants, college contingents, and keynote dignitaries through seamless campus hospitality."
    },
    {
      id: "production",
      name: "Production",
      role: "DEPARTMENT 05 / 06 · VENUE & PRODUCTION",
      title: "The Stage & Sound",
      line: "Transforming the heritage campus into a neon-lit cyberpunk arena with synchronized soundscapes, monument rigs, and visuals."
    },
    {
      id: "media",
      name: "Creatives & Media",
      role: "DEPARTMENT 06 / 06 · CREATIVES & MEDIA",
      title: "The Visuals",
      line: "Crafting the pixel aesthetics, lore, motion teasers, and broadcast photography that define Xenith's distinctive identity."
    }
  ];

  // ---------- whatsapp group links ----------
  // Replace "#" with the respective WhatsApp group invite links when available.
  const WHATSAPP_GROUPS = {
    "Assistance & Hospitality": "#",
    "Creatives & Documentation": "#",
    "Events & Admin": "#",
    "Publicity": "#",
    "Talks and Panels": "#",
    "default": "#"
  };

  let activeMode = (params.get("mode") === "explore") ? "explore" : "result";
  let activeDeptId = "events";
  let currentStampWord = (activeMode === "explore") ? "XENITH" : "SELECTED";

  function renderView() {
    const deptNav = $("#deptNav");
    const saveBtn = $("#save");
    const waBtn = $("#whatsapp");
    const srOnly = document.querySelector(".stamp-wrap .sr-only");

    if (activeMode === "explore") {
      currentStampWord = "XENITH";
      if (srOnly) srOnly.textContent = "xenith";
      if (deptNav) {
        deptNav.hidden = false;
        deptNav.innerHTML = "";
        DEPARTMENTS.forEach((dept) => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "dept-pill" + (dept.id === activeDeptId ? " active" : "");
          pill.textContent = dept.name;
          pill.addEventListener("click", () => {
            activeDeptId = dept.id;
            renderView();
          });
          deptNav.appendChild(pill);
        });
      }
      const cur = DEPARTMENTS.find((d) => d.id === activeDeptId) || DEPARTMENTS[0];
      $("#role").textContent = cur.role;
      $("#line").textContent = cur.line;
      $("#name").textContent = cur.title;
      if (saveBtn) saveBtn.style.display = "none";
      if (waBtn) waBtn.style.display = "none";
    } else {
      currentStampWord = "SELECTED";
      if (srOnly) srOnly.textContent = "selected";
      if (deptNav) deptNav.hidden = true;
      $("#role").textContent = person.dept || "";
      $("#line").textContent = person.line || "";
      $("#name").textContent = person.name || "";
      if (saveBtn) saveBtn.style.display = "";
      if (waBtn) {
        waBtn.style.display = "";
        const waLink = WHATSAPP_GROUPS[person.dept] || WHATSAPP_GROUPS.default || "#";
        waBtn.href = waLink;
        if (waLink === "#") {
          waBtn.onclick = (e) => {
            e.preventDefault();
            alert("WhatsApp group invite link will be active shortly.");
          };
        } else {
          waBtn.onclick = null;
        }
      }
    }
  }

  renderView();

  // ---------- cosmic starfield & shooting stars ----------
  const cv = $("#scene");
  const ctx = cv.getContext("2d");
  const skyCv = $("#sky");
  const skyCtx = skyCv.getContext("2d");
  const contentEl = $("#content");
  const photoEl = $("#photo");

  let W = innerWidth, H = innerHeight, ready = false;
  let mx = 0, my = 0, tx = 0, ty = 0;
  let zoom = 1.0, zoomTarget = 1.0;
  let enteredMix = 0, enteredTarget = 0;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let stars = [];
  let shootingStars = [];
  let lastShootingStar = 0;

  function initCosmos() {
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

    const count = Math.min(100, Math.floor((W * H) / 10000));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() < 0.18 ? 3 : Math.random() < 0.5 ? 2 : 1,
        flare: Math.random() < 0.16,
        speedY: -(0.06 + Math.random() * 0.18),
        speedX: (Math.random() - 0.5) * 0.06,
        depth: 0.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        freq: 1.2 + Math.random() * 2.5,
        color: Math.random() < 0.45 ? "254,210,53" : Math.random() < 0.75 ? "255,177,92" : "199,125,255"
      });
    }
    ready = true;
  }

  function spawnShootingStar(now) {
    shootingStars.push({
      x: Math.random() * W * 0.85 + W * 0.05,
      y: Math.random() * H * 0.35,
      len: 70 + Math.random() * 110,
      speed: 12 + Math.random() * 10,
      angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.2,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.02
    });
    lastShootingStar = now + 4000 + Math.random() * 6000;
  }

  function drawCosmos(t) {
    if (!W || !H || !ready) return;
    const time = t / 1000;
    ctx.clearRect(0, 0, W, H);

    const ox = tx * 22;
    const oy = ty * 16;

    for (const s of stars) {
      s.y += s.speedY;
      s.x += s.speedX;
      if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W; }
      if (s.x < -10) s.x = W + 10;
      if (s.x > W + 10) s.x = -10;

      const px = s.x - ox * s.depth;
      const py = s.y - oy * s.depth;
      const tw = 0.35 + 0.65 * Math.sin(time * s.freq + s.phase);
      const a = (tw * (0.4 + s.depth * 0.6)).toFixed(3);

      ctx.fillStyle = `rgba(${s.color},${a})`;
      ctx.fillRect(Math.round(px), Math.round(py), s.size, s.size);

      if (s.flare && tw > 0.75) {
        ctx.fillStyle = `rgba(${s.color},${(tw * 0.32).toFixed(3)})`;
        ctx.fillRect(Math.round(px) - 2, Math.round(py), s.size + 4, s.size);
        ctx.fillRect(Math.round(px), Math.round(py) - 2, s.size, s.size + 4);
      }
    }

    if (t > lastShootingStar && Math.random() < 0.035) {
      spawnShootingStar(t);
    }
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.life -= ss.decay;
      if (ss.life <= 0 || ss.x > W + 100 || ss.y > H + 100) {
        shootingStars.splice(i, 1);
        continue;
      }
      const tailX = ss.x - Math.cos(ss.angle) * ss.len;
      const tailY = ss.y - Math.sin(ss.angle) * ss.len;
      const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
      grad.addColorStop(0, "rgba(254,210,53,0)");
      grad.addColorStop(0.7, `rgba(255,177,92,${(ss.life * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(255,248,220,${(ss.life * 0.95).toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(ss.x, ss.y);
      ctx.stroke();
    }
  }

  initCosmos();

  let resizeTimer;
  addEventListener("resize", () => {
    W = innerWidth; H = innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { initCosmos(); stillFrame(); }, 180);
  });

  addEventListener("pointermove", (e) => {
    if (!W || !H) return;
    mx = (e.clientX / W - 0.5) * 2;
    my = (e.clientY / H - 0.5) * 2;
  });

  let lastFrame = 0;
  let frameRaf = 0;
  let ambientPaused = false;
  function frame(t) {
    frameRaf = 0;
    if (ambientPaused || !cv.clientWidth) { frameRaf = requestAnimationFrame(frame); return; }
    if (!reduceMotion) frameRaf = requestAnimationFrame(frame);
    if (!reduceMotion && (document.hidden || t - lastFrame < 33)) return;
    lastFrame = t;
    if (reduceMotion) { enteredMix = enteredTarget; tx = mx; ty = my; zoom = zoomTarget; }
    tx += (mx - tx) * 0.04;
    ty += (my - ty) * 0.04;
    enteredMix += (enteredTarget - enteredMix) * 0.05;
    zoom += (zoomTarget - zoom) * 0.035;

    const px = tx * 24, py = ty * 16;
    const sceneScale = 1.02 + Math.sin((t / 1000) * 0.04) * 0.008;

    cv.style.transform =
      `translate3d(${(-px).toFixed(1)}px,${(-py).toFixed(1)}px,0) scale(${sceneScale.toFixed(3)})`;
    photoEl.style.transform =
      `translate3d(${(-px * 0.25).toFixed(1)}px,${(-py * 0.25).toFixed(1)}px,0) scale(1.05)`;
    contentEl.style.transform =
      `translate(${(px * 0.2).toFixed(1)}px, calc(-50% + ${(py * 0.2).toFixed(1)}px))`;

    drawCosmos(t);
  }

  function stillFrame() {
    if (reduceMotion && !ambientPaused) frameRaf = requestAnimationFrame(frame);
  }
  frameRaf = requestAnimationFrame(frame);

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

  // The reveal is hidden behind the handoff cover / glass prelude until the
  // engine hands the page back, so the stamp waits for real visibility rather
  // than a fixed delay. Otherwise it prints to nobody.
  const STAMP_DELAY = 1000;
  const BUILD_DELAY = 500;
  // set while a build is queued but has not mounted its cover yet, so the
  // stamp cannot start printing in that window
  let buildPending = false;

  // ---------- the stamp: a dot-matrix word that prints itself in ----------
  // Deliberately small and thrown-away looking. It presses onto the page like a
  // mark on a form, rather than announcing anything across the screen.
  const STAMP_GLYPHS = {
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"]
  };
  const STAMP_CELL = 7;
  const STAMP_COLS = 47;
  let stampDims = null;
  let stampRaf = 0;
  let stampCtx = null;

  function stampBits(word) {
    const lit = [];
    const w = word || currentStampWord || "SELECTED";
    const wordCols = w.length * 6 - 1;
    let x0 = Math.max(0, Math.floor((STAMP_COLS - wordCols) / 2));
    for (const ch of w) {
      const g = STAMP_GLYPHS[ch];
      if (!g) { x0 += 1; continue; }
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 5; x++) {
          if (g[y][x] === "1") lit.push([x0 + x, y]);
        }
      }
      x0 += 6;
    }
    return lit;
  }

  // Size the canvas before the page is revealed. Doing it inside the print
  // would change the row height mid-reveal and shift the whole centred block.
  function sizeStamp() {
    const cv = document.getElementById("selectStamp");
    if (!cv) return;
    const avail = (cv.parentElement && cv.parentElement.clientWidth) || 329;
    const cell = Math.max(3, Math.min(STAMP_CELL, Math.floor(avail / STAMP_COLS)));
    const W = STAMP_COLS * cell;
    const H = 7 * cell;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = W + "px";
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    stampDims = { cell, W, H, dpr };
    stampCtx = cv.getContext("2d");
    if (stampCtx) stampCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // The engine mounts an opaque host over the whole page and keeps it until the
  // visitor reveals the page. A mounted host counts as covering, so this only
  // clears when the page is genuinely in front of the visitor.
  function covered() {
    if (buildPending) return true;
    if (document.getElementById("handoff-cover")) return true;
    if (document.querySelector("swarm-rebuild")) return true;
    return false;
  }

  function whenVisible(cb) {
    let tries = 0;
    const check = () => {
      if (++tries > 600) { cb(); return; }
      if (covered()) { setTimeout(check, 100); return; }
      setTimeout(() => { if (!covered()) cb(); else setTimeout(check, 100); }, 400);
    };
    setTimeout(check, 100);
  }

  function pixelStamp(word) {
    if (word) currentStampWord = word;
    const cv = document.getElementById("selectStamp");
    if (!cv || !stampDims) return;
    const { cell, W, H } = stampDims;
    const c = stampCtx;
    if (!c) return;
    const lit = stampBits(currentStampWord);
    if (stampRaf) { cancelAnimationFrame(stampRaf); stampRaf = 0; }

    function pixelColor(y, alpha) {
      if (y <= 1) return `rgba(254,210,53,${alpha})`;
      if (y <= 3) return `rgba(255,152,0,${alpha})`;
      if (y <= 5) return `rgba(230,74,25,${alpha})`;
      return `rgba(180,25,35,${alpha})`;
    }

    function settle() {
      c.clearRect(0, 0, W, H);
      for (const [x, y] of lit) {
        c.fillStyle = pixelColor(y, 0.95);
        c.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      }
    }

    function print(head) {
      c.clearRect(0, 0, W, H);
      for (const [x, y] of lit) {
        if (x > head) continue;
        const age = head - x;
        const heat = Math.max(0, 1 - age / 6);
        const a = 0.5 + 0.45 * Math.min(1, age / 12);
        c.fillStyle = heat > 0
          ? `rgba(255,248,220,${(a + heat * 0.32).toFixed(3)})`
          : pixelColor(y, a.toFixed(3));
        c.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      }
    }

    if (reduceMotion) { settle(); return; }
    print(-1);
    const t0 = performance.now();
    const run = (now) => {
      const p = Math.min(1, (now - t0) / 820);
      print(-1 + p * (STAMP_COLS + 6));
      if (p < 1) { stampRaf = requestAnimationFrame(run); return; }
      stampRaf = 0;
      settle();
    };
    stampRaf = requestAnimationFrame(run);
  }

  function finishUnlock() {
    document.body.classList.remove("locked", "building");
    document.body.classList.add("entered", "built");
    zoomTarget = 1.0;
    enteredTarget = 1;
    celebrateUntil = performance.now() + 1500;
    if (!reduceMotion) fireConfetti();
    startRusty();
    stillFrame();
    // size first so the reveal never shifts when the print begins
    sizeStamp();
    let stampSeen = false;
    let playedCovered = false;
    const playStamp = () => {
      if (stampSeen) return;
      stampSeen = true;
      // if it had to draw while something was still over the page, the visitor
      // did not see it print, so allow exactly one replay on the real reveal
      playedCovered = covered();
      pixelStamp();
    };
    // prints once the page is actually in front of the visitor; on the engine
    // route that is after the build is dismissed
    whenVisible(() => setTimeout(playStamp, reduceMotion ? 0 : STAMP_DELAY));
    // and a backstop so the canvas is never blank
    setTimeout(playStamp, reduceMotion ? 0 : 9000);
    // one replay, only if the first attempt was hidden
    whenVisible(() => {
      if (!playedCovered) return;
      playedCovered = false;
      setTimeout(() => pixelStamp(), reduceMotion ? 0 : STAMP_DELAY);
    });
    const live = $("#live");
    if (live) {
      const who = String(person.name || "").trim();
      live.textContent = who ? `You are in. ${who}, ${String(person.dept || "").trim()}.` : "You are in.";
    }
    const h = $("#name");
    if (h) h.focus({ preventScroll: true });
  }

  let handoffTimer = 0;

  // Six seconds is the whole budget for the engine handoff. The timer is
  // re-armed when the engine script is injected, so a slow prelude is not
  // charged against the engine.
  function armHandoffTimeout(ms) {
    clearTimeout(handoffTimer);
    handoffTimer = setTimeout(() => {
      handoffTimer = 0;
      if (!document.getElementById("handoff-cover") && !document.documentElement.classList.contains("engine-pending")) return;
      console.error("[xenith] engine handoff timed out; revealing the page");
      clearHandoff();
    }, ms);
  }

  function clearHandoff() {
    clearTimeout(handoffTimer);
    handoffTimer = 0;
    const c = document.getElementById("handoff-cover");
    if (c) c.remove();
    document.documentElement.classList.remove("engine-pending");
  }

  function showHandoffCover() {
    if (document.getElementById("handoff-cover")) return;
    document.documentElement.classList.add("engine-pending");
    const c = document.createElement("div");
    c.id = "handoff-cover";
    c.style.cssText = "position:fixed;inset:0;background:#05040c;z-index:2147483646;pointer-events:none";
    document.body.appendChild(c);
    armHandoffTimeout(6000);
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

  // The engine paints its own opaque full-screen host, so the page's ambient
  // loops have nothing left to show. Called from loadSwarmEngine.
  function pauseAmbient() {
    if (ambientPaused) return;
    ambientPaused = true;
    // the ambient cursor crew draws into a canvas the engine has hidden
    try { if (window.XenithSwarm && window.XenithSwarm.stop) window.XenithSwarm.stop(); } catch (e) {}
  }

  // Give the page its life back once the build is dismissed.
  function resumeAmbient() {
    if (!ambientPaused) return;
    ambientPaused = false;
    try { if (window.XenithSwarm && window.XenithSwarm.start) window.XenithSwarm.start(); } catch (e) {}
    startRusty();
    if (!frameRaf) frameRaf = requestAnimationFrame(frame);
    stillFrame();
    if (!xpts.length) buildX();
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
      // Hand the page over by itself. Waiting for someone to find "Go live"
      // meant visitors sat on the engine's static rebuild, which has no stamp
      // and no ambient art, and reasonably concluded the page was broken.
      revealWhenBuilt();
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

  // Dismiss the build once it has finished, so the real page (with the stamp,
  // the rain, the slab X and Rusty) is what the visitor is left looking at.
  let revealTried = 0;
  function revealWhenBuilt() {
    if (revealTried > 40) return;
    const host = document.querySelector("swarm-rebuild");
    if (!host) { revealTried = 0; return; }
    revealTried++;
    const root = host.shadowRoot;
    const liveBtn = root && root.querySelector('[data-a="live"]');
    if (revealTried > 6 && liveBtn) {
      try { liveBtn.click(); return; } catch (e) {}
    }
    if (revealTried > 6 && window.__swarmRebuild && typeof window.__swarmRebuild.stop === "function") {
      try { window.__swarmRebuild.stop(true); return; } catch (e) {}
    }
    setTimeout(revealWhenBuilt, 250);
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
    // The mark is the centrepiece of this beat, so it is sized off the shorter
    // edge and centred. It used to be capped at 24px and pinned to the top-left
    // corner, which read as a smudge rather than a logo.
    const short = Math.min(g.W, g.H);
    const size = Math.round(Math.max(44, Math.min(short * 0.34, g.W * 0.14)));
    ctx.font = "600 " + size + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const track = Math.round(size * 0.18);
    const chars = ["x", "e", "n", "i", "t", "h"];
    const widths = chars.map((c) => ctx.measureText(c).width);
    let total = track * (chars.length - 1);
    for (const w of widths) total += w;
    return {
      size, track, chars, widths, total,
      x: Math.round((g.W - total) / 2),
      y: Math.round(g.H / 2 + size * 0.34)
    };
  }

  function storyWord(ctx, wg, p) {
    const reveal = wg.total * p;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wg.x - 10, wg.y - wg.size * 1.6, reveal + 10, wg.size * 2.2);
    ctx.clip();
    ctx.fillStyle = "#ffe9b0";
    ctx.shadowColor = "rgba(255,177,92,.75)";
    ctx.shadowBlur = Math.round(wg.size * 0.5);
    let x = wg.x;
    for (let i = 0; i < wg.chars.length; i++) {
      ctx.fillText(wg.chars[i], x, wg.y);
      x += wg.widths[i] + wg.track;
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#ffb15c";
    ctx.fillRect(wg.x - 2, wg.y + Math.round(wg.size * 0.2), reveal, 1);
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


  function storyDraw(el) {
    const ctx = STORY.ctx;
    if (!ctx || !STORY.W || !STORY.H) return;
    ctx.clearRect(0, 0, STORY.W, STORY.H);
    const g = storyGeom();
    const wg = storyWordGeom(ctx, g);
    // No border pass. Tracing a frame around the whole page read as a stray
    // box arriving over the build and fighting the wordmark, so the logo gets
    // the screen to itself: the cursor glides in and draws it, nothing else.
    const arriveMs = 700;
    const drawIn = storyEase(storyClamp(el / arriveMs));
    const writeP = storyClamp((el - arriveMs) / 900);

    if (writeP > 0) storyWord(ctx, wg, writeP);

    let px, py;
    if (el < arriveMs) {
      px = wg.x - 110 * (1 - drawIn);
      py = wg.y - 4 - 46 * (1 - drawIn);
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
      if (el > 260 && el < 900) STORY.label.style.opacity = "1";
      else if (el >= 900) STORY.label.style.opacity = "0";
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
    if (cover) setTimeout(clearHandoff, 900);

    STORY.t0 = 0;
    STORY.t0 = performance.now();
    STORY.noFrame = true;
    setTimeout(() => {
      if (STORY.stopped) return;
      const bg = STORY.root && STORY.root.querySelector ? STORY.root.querySelector(".bg") : null;
      if (bg) { bg.style.transition = "opacity 1.3s ease"; bg.style.opacity = "0"; }
      if (STORY.veil) { STORY.veil.style.transition = "opacity 1.3s ease"; STORY.veil.style.opacity = "0"; }
      // The story canvas carries the frame trace and the wordmark, so it stays
      // lit for the whole arc and is faded on its own schedule below. It used to
      // be killed here at 600ms, which is what cut the logo off mid-draw.
      // The engine has finished capturing by now, so this is also the right
      // moment to take the real page out of the way: the build should happen on
      // an empty canvas, not over the finished page.
      document.body.classList.add("swarm-build");
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
    // The mark finishes writing at ~1.6s and then holds. Clearing it at 2.05s
    // meant the completed logo was on screen for less than half a second, which
    // read as the animation being cut off.
    storyLater(() => {
      STORY.fading = true;
      if (STORY.label) STORY.label.style.opacity = "0";
    }, 3200);
    storyLater(() => { if (STORY.canvas) STORY.canvas.style.opacity = "0"; }, 3400);
    storyLater(storyCaptions, 3700);
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

  function startSwarmEngine() {
    buildPending = false;
    showHandoffCover();
    loadSwarmEngine();
  }

  function loadSwarmEngine() {
    if (window.__swarmRebuild || document.getElementById("swarm-engine")) return;
    document.body.classList.add("engine");
    enteredMix = 1;
    try { drawX(performance.now()); } catch (e) {}
    showHandoffCover();
    pauseAmbient();

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearHandoff();
    };
    // The engine paints its own opaque backdrop to turn the page into a blank
    // canvas. Until that backdrop is actually opaque, anything behind it can be
    // seen, so the cover must outlive it. Dropping the cover on a fixed timer
    // was what let the finished page flash for half a second before the build.
    const bgOpacity = () => {
      const host = document.querySelector("swarm-rebuild");
      const bg = host && host.shadowRoot && host.shadowRoot.querySelector(".bg");
      return bg ? Number(getComputedStyle(bg).opacity) : -1;
    };
    const engineBlanked = () => bgOpacity() >= 0.9;

    // The engine draws a schematic rebuild over whatever is underneath it and
    // never hides the real page, so without this the visitor sees the finished
    // page with cursors drawn on top of it. Once the backdrop has gone fully
    // opaque the capture is done, so the real page can be taken out of the way
    // until the build is dismissed.
    let sawBlank = false;
    let watchingBuild = false;
    const watchBuild = () => {
      if (watchingBuild) return;
      watchingBuild = true;
      const t = setInterval(() => {
        const host = document.querySelector("swarm-rebuild");
        if (!host) {
          clearInterval(t);
          document.body.classList.remove("swarm-build");
          // the page is the visitor's again: rain, slab X and Rusty come back
          resumeAmbient();
          return;
        }
        const o = bgOpacity();
        if (o >= 0.98) sawBlank = true;
        else if (sawBlank && o < 0.95) document.body.classList.add("swarm-build");
      }, 60);
    };
    // The engine creates <swarm-rebuild> from a promise chain, so poll for it.
    let hostTries = 0;
    let blankTries = 0;
    const drop = () => {
      if (settled) return;
      const host = document.querySelector("swarm-rebuild");
      if (!host) {
        if (++hostTries >= 60) {
          if (document.getElementById("handoff-cover")) {
            console.error("[xenith] the engine never produced <swarm-rebuild>; revealing the page");
          }
          settle();
          return;
        }
        setTimeout(drop, 100);
        return;
      }
      // host is up: wait for it to be blank, then hand over
      if (engineBlanked() || ++blankTries >= 60) {
        watchBuild();
        setTimeout(settle, 120);
        return;
      }
      setTimeout(drop, 100);
    };

    // A real script element, not new Function(src): that keeps the page CSP-safe.
    const s = document.createElement("script");
    s.id = "swarm-engine";
    s.src = "vendor/swarm.js?v=10";
    s.onload = () => setTimeout(startSwarmStory, 600);
    s.onerror = () => {
      console.error("[xenith] engine boot failed: vendor/swarm.js did not load");
      settled = true;
      clearHandoff();
    };
    document.body.appendChild(s);
    // The six second budget starts here, not when the prelude began.
    armHandoffTimeout(6000);
    drop();
  }

  function unlock(skipBuild) {
    if (document.body.classList.contains("entered")) return;
    const gate = $("#gate");
    if (gate) gate.classList.add("done");
    buildPending = !skipBuild && !reduceMotion;
    finishUnlock();
    if (buildPending) {
      setTimeout(startSwarmEngine, BUILD_DELAY);
    }
  }

  function announce(msg) {
    const live = $("#live");
    if (live) live.textContent = msg;
  }

  // Fallback for browsers without the async clipboard API, or an insecure origin.
  function legacyCopy(text) {
    if (!document.execCommand) return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  const copyBtn = $("#copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const label = copyBtn.textContent;
      let ok = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(location.href);
          ok = true;
        } catch (e) { ok = false; }
      }
      if (!ok) ok = legacyCopy(location.href);
      if (ok) {
        copyBtn.textContent = "copied.";
        announce("link copied.");
      } else {
        copyBtn.textContent = "copy failed";
        announce("could not copy the link. copy it from the prompt.");
        try { window.prompt("copy this link", location.href); } catch (e) {}
      }
      setTimeout(() => { copyBtn.textContent = label; }, 1800);
    });
  }

  const saveBtn = $("#save");
  if (saveBtn && window.XenithCard) {
    saveBtn.addEventListener("click", async () => {
      if (saveBtn.disabled) return;
      saveBtn.disabled = true;
      const label = saveBtn.textContent;
      let ok = false;
      try {
        ok = await window.XenithCard.download(person);
      } catch (e) {
        ok = false;
        console.error("[xenith] save card failed", e);
      }
      if (ok) {
        saveBtn.textContent = "saved.";
        announce("card saved.");
      } else {
        saveBtn.textContent = "could not save";
        announce("could not save the card.");
      }
      setTimeout(() => { saveBtn.textContent = label; saveBtn.disabled = false; }, 1800);
    });
  }

  const skipBtn = $("#skip");
  if (skipBtn) skipBtn.addEventListener("click", () => unlock(true));
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
  let blink = 0, lastBlink = 0, rustStarted = false, lastRust = 0;

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
    if (ambientPaused) return;
    // rAF runs at the display's rate; draw at ~30fps, ~10fps under reduced motion.
    if (t - lastRust < (reduceMotion ? 100 : 33)) return;
    lastRust = t;
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
  if (params.get("engine")) {
    // Reduced motion keeps the revealed page: no prelude, no cover, no build.
    if (reduceMotion) clearHandoff();
    else showHandoffCover();
  }
  if (params.get("entered")) {
    setTimeout(() => {
      unlock(true);
      if (params.get("engine") && !reduceMotion) setTimeout(startSwarmEngine, BUILD_DELAY);
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
