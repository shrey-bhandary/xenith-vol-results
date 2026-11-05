// Swarm cursors: a small crew of named pointers that trail the real cursor,
// keep their distance, and drift into a slow orbit when the pointer rests.
// One full-screen canvas, one rAF loop capped at 30fps, no dependencies.
// Tuning notes: docs/swarm.md
(() => {
  "use strict";

  const host = document.getElementById("stage");
  if (!host) return;

  // ---------- crew ----------
  // Lowercase names match the site voice; colours are palette tokens.
  const CREW = [
    ["rusty", "#ff5c3b"],
    ["xenith", "#ffb15c"],
    ["events", "#ffe9b0"],
    ["admin", "#7b5cff"],
    ["creatives", "#9ef0c0"],
    ["tech", "#ffb15c"],
    ["publicity", "#9ef0c0"],
    ["finance", "#ffe9b0"],
    ["docs", "#8a83a6"],
    ["design", "#7b5cff"]
  ];

  // ---------- tuning ----------
  const FPS = 30;
  const FRAME_MS = 1000 / FPS;
  const DPR_MAX = 1.5;
  const MOBILE_W = 720;
  const DESKTOP_N = 10;
  const MOBILE_N = 6;

  const IDLE_AFTER = 650;      // ms of stillness before the orbit takes over
  const IDLE_EASE = 2.4;       // how fast idle mixes in (1/s)
  const SPRING = [17, 33];     // per-cursor stiffness
  const DAMPING = [6.4, 8.8];  // per-cursor velocity drag
  const RADIUS = [26, 82];     // pointer offset while moving (px)
  const IDLE_RADIUS = 1.65;    // offset multiplier at full idle
  const SPIN = [0.22, 0.5];    // orbit speed at full idle (rad/s)
  const WOBBLE = [0.45, 0.95]; // drift wobble frequency (rad/s)
  const SEP_RADIUS = 48;       // flock personal space (px)
  const SEP_FORCE = 700;       // separation acceleration (px/s^2)
  const MAX_SPEED = 1100;      // px/s
  const TRAIL = 9;             // trail samples per cursor
  const TOUCH_SLEEP = 2600;    // hide again after touch goes quiet (ms)

  const TAU = Math.PI * 2;
  const TAG_H = 14;
  const TAG_FONT = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  // Classic arrow pointer, tip at 0,0.
  const ARROW = [0, 0, 0, 17, 4.3, 12.7, 7.1, 19, 9.7, 17.9, 6.9, 11.9, 12.7, 11.2];

  // ---------- canvas ----------
  const cv = document.createElement("canvas");
  cv.id = "swarm";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;display:block;" +
    "pointer-events:none;z-index:4;opacity:0;transition:opacity .6s ease;";
  const ctx = cv.getContext("2d", { alpha: true });
  if (!ctx) return;
  const hud = host.querySelector(".hud");
  host.insertBefore(cv, hud || null);

  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const fineMQ = matchMedia("(pointer: fine)");
  const coarseMQ = matchMedia("(pointer: coarse)");
  const touchOnly = coarseMQ.matches && !fineMQ.matches;

  // ---------- state ----------
  let W = innerWidth;
  let H = innerHeight;
  let count = W < MOBILE_W ? MOBILE_N : DESKTOP_N;
  let clock = 0;
  let idle = 1;
  let pointerX = W * 0.62;
  let pointerY = H * 0.46;
  let pointerKnown = false;
  let lastMove = -1e9;
  let active = !touchOnly;
  let running = false;
  let raf = 0;
  let lastDraw = 0;

  const cursors = [];
  for (let i = 0; i < CREW.length; i++) {
    cursors.push({
      name: CREW[i][0],
      color: CREW[i][1],
      tagW: 64,
      x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
      k: 24, damp: 7.4,
      radius: 50, angle: 0, spin: 0.35, wob: 0.7, phase: 0,
      hist: new Float32Array(TRAIL * 2),
      histN: 0
    });
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  function fillHistory(c) {
    for (let k = 0; k < TRAIL; k++) {
      c.hist[k * 2] = c.x;
      c.hist[k * 2 + 1] = c.y;
    }
    c.histN = 0;
  }

  function seedCursors() {
    for (let i = 0; i < count; i++) {
      const c = cursors[i];
      const a0 = (i / count) * TAU + rand(-0.35, 0.35);
      const r0 = rand(34, 96);
      c.x = pointerX + Math.cos(a0) * r0;
      c.y = pointerY + Math.sin(a0) * r0;
      c.vx = 0;
      c.vy = 0;
      c.ax = 0;
      c.ay = 0;
      c.angle = a0;
      c.radius = rand(RADIUS[0], RADIUS[1]);
      c.k = rand(SPRING[0], SPRING[1]);
      c.damp = rand(DAMPING[0], DAMPING[1]);
      c.spin = rand(SPIN[0], SPIN[1]) * (i % 2 ? -1 : 1);
      c.wob = rand(WOBBLE[0], WOBBLE[1]);
      c.phase = rand(0, TAU);
      fillHistory(c);
    }
  }

  function resizeCanvas() {
    W = innerWidth;
    H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, DPR_MAX);
    cv.width = Math.max(1, Math.floor(W * dpr));
    cv.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = TAG_FONT;

    const next = W < MOBILE_W ? MOBILE_N : DESKTOP_N;
    if (next !== count) {
      count = next;
      seedCursors();
    }
    if (!pointerKnown) {
      pointerX = W * 0.62;
      pointerY = H * 0.46;
    }
    for (let i = 0; i < cursors.length; i++) {
      const c = cursors[i];
      c.x = Math.max(16, Math.min(W - 16, c.x));
      c.y = Math.max(16, Math.min(H - 16, c.y));
      fillHistory(c);
    }
  }

  function measureTags() {
    ctx.font = TAG_FONT;
    for (let i = 0; i < cursors.length; i++) {
      cursors[i].tagW = Math.ceil(ctx.measureText(cursors[i].name).width) + 8;
    }
  }

  // ---------- loop ----------
  function start() {
    if (running || document.hidden || reduceMQ.matches || !active) return;
    running = true;
    lastDraw = 0;
    cv.style.display = "block";
    cv.style.opacity = "1";
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastDraw = 0;
  }

  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (lastDraw && now - lastDraw < FRAME_MS - 1) return;
    const dt = lastDraw ? Math.min(0.05, (now - lastDraw) / 1000) : 1 / FPS;
    lastDraw = now;
    clock += dt;
    step(dt, now);
    if (!running) return;
    draw();
  }

  function step(dt, now) {
    // On touch-only screens the cloud sleeps when the finger stops.
    if (touchOnly && active && now - lastMove > TOUCH_SLEEP) {
      active = false;
      cv.style.opacity = "0";
      stop();
      return;
    }

    const wantIdle = now - lastMove > IDLE_AFTER ? 1 : 0;
    idle += (wantIdle - idle) * Math.min(1, dt * IDLE_EASE);

    // Springs: every cursor has its own stiffness, damping, radius and angle.
    for (let i = 0; i < count; i++) {
      const c = cursors[i];
      c.angle += c.spin * (0.07 + 0.93 * idle) * dt;
      const rad = c.radius * (0.7 + (IDLE_RADIUS - 0.7) * idle) +
        Math.sin(clock * 0.7 + c.phase) * 4;
      const a = c.angle + Math.sin(clock * c.wob + c.phase) * (0.08 + 0.12 * idle);
      const tx = pointerX + Math.cos(a) * rad;
      const ty = pointerY + Math.sin(a) * rad;
      c.ax = (tx - c.x) * c.k - c.vx * c.damp;
      c.ay = (ty - c.y) * c.k - c.vy * c.damp;
    }

    // Gentle flock separation so labels do not stack.
    const sep2 = SEP_RADIUS * SEP_RADIUS;
    for (let i = 0; i < count; i++) {
      const a = cursors[i];
      for (let j = i + 1; j < count; j++) {
        const b = cursors[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < sep2) {
          const d = Math.sqrt(d2);
          const f = (1 - d / SEP_RADIUS) * SEP_FORCE / d;
          a.ax += dx * f;
          a.ay += dy * f;
          b.ax -= dx * f;
          b.ay -= dy * f;
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const c = cursors[i];
      c.vx += c.ax * dt;
      c.vy += c.ay * dt;
      const v2 = c.vx * c.vx + c.vy * c.vy;
      if (v2 > MAX_SPEED * MAX_SPEED) {
        const s = MAX_SPEED / Math.sqrt(v2);
        c.vx *= s;
        c.vy *= s;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      if (c.x < 16) { c.x = 16; if (c.vx < 0) c.vx *= -0.25; }
      else if (c.x > W - 16) { c.x = W - 16; if (c.vx > 0) c.vx *= -0.25; }
      if (c.y < 16) { c.y = 16; if (c.vy < 0) c.vy *= -0.25; }
      else if (c.y > H - 16) { c.y = H - 16; if (c.vy > 0) c.vy *= -0.25; }

      pushTrail(c);
    }
  }

  function pushTrail(c) {
    const h = c.hist;
    for (let k = TRAIL - 1; k > 0; k--) {
      h[k * 2] = h[(k - 1) * 2];
      h[k * 2 + 1] = h[(k - 1) * 2 + 1];
    }
    h[0] = c.x;
    h[1] = c.y;
    if (c.histN < TRAIL) c.histN++;
  }

  // ---------- paint ----------
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) drawTrail(cursors[i]);
    ctx.globalAlpha = 1;
    for (let i = 0; i < count; i++) drawMark(cursors[i]);
    // Labels paint last so no arrow can sit on top of a name.
    for (let i = 0; i < count; i++) drawTag(cursors[i]);
    ctx.globalAlpha = 1;
  }

  function drawTrail(c) {
    const n = c.histN;
    if (n < 2) return;
    const h = c.hist;
    ctx.strokeStyle = c.color;

    // Three overlapping bands fade the tail without per-segment work.
    ctx.globalAlpha = 0.58;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    const head = Math.min(3, n);
    for (let k = 0; k < head; k++) ctx.lineTo(h[k * 2], h[k * 2 + 1]);
    ctx.stroke();

    if (n > 3) {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(h[4], h[5]);
      const mid = Math.min(6, n);
      for (let k = 3; k < mid; k++) ctx.lineTo(h[k * 2], h[k * 2 + 1]);
      ctx.stroke();
    }

    if (n > 6) {
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.moveTo(h[10], h[11]);
      for (let k = 6; k < n; k++) ctx.lineTo(h[k * 2], h[k * 2 + 1]);
      ctx.stroke();
    }
  }

  function drawMark(c) {
    const x = c.x;
    const y = c.y;

    ctx.globalAlpha = 0.96;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 2; k < ARROW.length; k += 2) {
      ctx.lineTo(x + ARROW[k], y + ARROW[k + 1]);
    }
    ctx.closePath();
    ctx.fillStyle = c.color;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(6,5,15,.9)";
    ctx.stroke();
  }

  function drawTag(c) {
    const x = c.x;
    const y = c.y;
    // Tags point away from the pointer so the cluster's labels fan out.
    let lx = x >= pointerX ? x + 14 : x - c.tagW - 10;
    let ly = y >= pointerY ? y + 17 : y - TAG_H - 9;
    if (lx < 4) lx = x + 14;
    if (lx + c.tagW > W - 4) lx = x - c.tagW - 10;
    if (ly < 4) ly = y + 17;
    if (ly + TAG_H > H - 4) ly = y - TAG_H - 9;
    if (lx < 4) lx = 4;
    if (ly < 4) ly = 4;

    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "#06050f";
    ctx.fillRect(lx, ly, c.tagW, TAG_H);
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = c.color;
    ctx.fillText(c.name, lx + 4, ly + 2);
    ctx.globalAlpha = 1;
  }

  // ---------- input & lifecycle ----------
  function onPointerMove(e) {
    if (reduceMQ.matches) return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (touchOnly && !active) {
      active = true;
      if (!pointerKnown) seedCursors();
      cv.style.opacity = "1";
    }
    pointerKnown = true;
    lastMove = performance.now();
    cv.style.opacity = "1";
    start();
  }

  function onVisibility() {
    if (document.hidden) stop();
    else if (active && !reduceMQ.matches) start();
  }

  function onReduceChange() {
    if (reduceMQ.matches) {
      stop();
      ctx.clearRect(0, 0, W, H);
      cv.style.display = "none";
    } else {
      cv.style.display = "block";
      if (active) start();
    }
  }

  // ---------- boot ----------
  resizeCanvas();
  seedCursors();
  measureTags();

  addEventListener("pointermove", onPointerMove, { passive: true });
  addEventListener("resize", resizeCanvas, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onReduceChange);

  if (reduceMQ.matches) {
    cv.style.display = "none";
  } else if (!touchOnly) {
    start();
  }
  // exposed so the reveal can shut the ambient crew down when the
  // vendored engine takes over the screen.
  window.XenithSwarm = { start, stop };
})();
