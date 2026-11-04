/* Xenith intro prototype: void, assemble, greet, menu, gate, handoff.
   Optional modules, looked up on window at boot:
     VoidStage   function(opts) | {create(opts) | mount(canvas, opts)}
                 -> {draw(t, dt), resize(w, h)?}
     RustyRig    function(opts) | {create(opts) | mount(canvas, opts)}
                 -> {draw(t, dt), setState(name)?, face(text, ms)?, ready?}
     IntroMenu   {show(say, options, onPick)} |
                 function(opts) -> {show(say, options, onPick)}
   Missing, broken or throwing modules fall back to the local stage and rig.
   The host only needs window.XenithIntroDone(detail). Everything else is optional. */
(() => {
  "use strict";

  // ---------- copy ----------
  const OPTIONS = [
    { id: "result", label: "check my vols application result", sub: "one file, one line" },
    { id: "explore", label: "explore xenith", sub: "six departments, one page" }
  ];
  const SAY_HELLO = "oh. hello. can i help you with something?";
  const SAY_RESULT = "then i need one thing from you.";
  const SAY_EXPLORE = "six departments. events fills the room, tech keeps it standing, the rest make it loud.";

  // ---------- palette, helpers ----------
  const P = {
    shell: "#e9e3d2", shade: "#bdb6a4", dark: "#241d3a", deep: "#0b0818",
    amber: "#ffb15c", cream: "#ffe9b0", violet: "#7b5cff", mint: "#9ef0c0", red: "#ff5c3b"
  };
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FAST = params.has("fast") ? 0.3 : 1;
  const MUTE = params.get("mute") === "1";
  const D = (ms) => Math.max(70, Math.round(ms * (REDUCE ? 0.38 : 1) * FAST));
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeInQuad = (p) => p * p;
  const easeOutBack = (p) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2);

  // ---------- dom ----------
  const dom = {
    stage: $("#stage"), phase: $("#phase"), meter: $("#meter"),
    log: $("#log"), say: $("#say"), line: $("#line"), lineSr: $("#lineSr"),
    wake: $("#wake"), wakeText: $("#wakeText"), menu: $("#menu"),
    gate: $("#gate"), gateMeta: $("#gateMeta"), gateSkip: $("#gateSkip"),
    skip: $("#skip"), flash: $("#flash"), handoff: $("#handoff")
  };

  // ---------- canvas ----------
  const voidCv = $("#voidCv"), rigCv = $("#rigCv"), xpad = $("#xpad");
  const vctx = voidCv.getContext("2d"), rctx = rigCv.getContext("2d");
  let W = innerWidth, H = innerHeight, DPR = 1;

  function sizeCanvas(cv, ctx) {
    DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.floor(W * DPR);
    cv.height = Math.floor(H * DPR);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ---------- audio, unlocked by the one action ----------
  const audio = (() => {
    let ctx = null, master = null, dead = MUTE;
    function on() {
      if (dead) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { dead = true; return null; }
        try {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.24;
          master.connect(ctx.destination);
        } catch (e) { dead = true; return null; }
      }
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    function tone(freq, dur, type, gain, slide) {
      const c = on();
      if (!c) return;
      try {
        const t = c.currentTime;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type || "square";
        o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
        g.gain.setValueAtTime(gain || 0.035, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + dur + 0.02);
      } catch (e) {}
    }
    function thump() {
      tone(72, 0.22, "sine", 0.14, -26);
      tone(150, 0.09, "triangle", 0.05, -60);
    }
    function tick() { tone(520 + Math.random() * 240, 0.035, "square", 0.02); }
    function chord() {
      [392, 523.25, 659.25].forEach((f, i) => {
        setTimeout(() => tone(f, 0.5, "triangle", 0.055), i * 95);
      });
    }
    return { on, tone, thump, tick, chord };
  })();

  // ---------- module probes ----------
  let extStage = null, extRig = null, extMenu = null;
  let stageMode = "local", rigMode = "local", menuMode = "local";
  let pending = 0;
  const pendingNames = [];

  function waitOn(label, p) {
    if (!p || typeof p.then !== "function") return;
    pending++;
    pendingNames.push(label);
    Promise.resolve(p).then(() => { pending--; }, () => { pending--; });
  }

  function probeRig() {
    const M = window.RustyRig;
    if (!M) return null;
    try {
      const opts = { canvas: rigCv, ctx: rctx, palette: P, reduce: REDUCE };
      let inst = null;
      if (typeof M === "function") inst = M(opts);
      else if (typeof M.create === "function") inst = M.create(opts);
      else if (typeof M.mount === "function") inst = M.mount(rigCv, opts);
      else inst = M;
      if (!inst) return null;
      if (typeof inst.draw !== "function" && typeof inst.frame !== "function" && typeof inst.render !== "function") return null;
      rigMode = "wired";
      waitOn("rig", inst.ready);
      return inst;
    } catch (err) {
      console.warn("xenith intro: RustyRig skipped", err);
      return null;
    }
  }

  function probeStage() {
    const M = window.VoidStage;
    if (!M) return null;
    try {
      const opts = { canvas: voidCv, ctx: vctx, palette: P, reduce: REDUCE };
      let inst = null;
      if (typeof M === "function") inst = M(opts);
      else if (typeof M.create === "function") inst = M.create(opts);
      else if (typeof M.mount === "function") inst = M.mount(voidCv, opts);
      else inst = M;
      if (!inst) return null;
      if (typeof inst.draw !== "function" && typeof inst.frame !== "function" && typeof inst.render !== "function") return null;
      stageMode = "wired";
      return inst;
    } catch (err) {
      console.warn("xenith intro: VoidStage skipped", err);
      return null;
    }
  }

  function probeMenu() {
    const M = window.IntroMenu;
    if (!M) return null;
    try {
      if (typeof M.show === "function") { menuMode = "wired"; return M; }
      if (typeof M === "function") {
        const inst = M({ options: OPTIONS });
        if (inst && typeof inst.show === "function") { menuMode = "wired"; return inst; }
      }
    } catch (err) {
      console.warn("xenith intro: IntroMenu skipped", err);
    }
    return null;
  }

  function callExt(api, t, dt) {
    if (!api) return false;
    try {
      if (typeof api.draw === "function") { api.draw(t, dt); return true; }
      if (typeof api.frame === "function") { api.frame(t, dt); return true; }
      if (typeof api.render === "function") { api.render(t, dt); return true; }
    } catch (err) {
      console.warn("xenith intro: external renderer stopped", err);
      return false;
    }
    return false;
  }

  // ---------- state ----------
  let state = "void";
  let started = false, wakeReady = false, wakeQueued = false, done = false;
  let bootAt = performance.now();
  let assembleAt = 0;
  let A = null;
  let pickLock = false;
  let saySeq = 0, sayTimer = 0;
  const timers = new Set();

  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!done) { try { fn(); } catch (err) { console.error(err); } }
    }, Math.max(0, ms));
    timers.add(id);
    return id;
  }

  function setState(next) {
    state = next;
    dom.phase.textContent = next;
    document.body.dataset.state = next;
    if (extRig && typeof extRig.setState === "function") {
      try { extRig.setState(next); } catch (err) {}
    }
  }

  function log(text) {
    if (!dom.log) return;
    const li = document.createElement("li");
    const secs = assembleAt ? ((performance.now() - assembleAt) / 1000).toFixed(1) : "0.0";
    li.textContent = "[" + secs.padStart(4, " ") + "] " + text;
    dom.log.appendChild(li);
    while (dom.log.children.length > 6) dom.log.removeChild(dom.log.firstChild);
  }

  function flash() {
    dom.flash.classList.remove("fire");
    void dom.flash.offsetWidth;
    dom.flash.classList.add("fire");
  }

  // ================================================================
  // local void
  // ================================================================
  const stage = { motes: [], pixel: 1, pixelTarget: 1 };

  function seedMotes() {
    stage.motes = Array.from({ length: 28 }, () => ({
      x: Math.random(), y: Math.random(),
      v: 0.004 + Math.random() * 0.012,
      drift: (Math.random() - 0.5) * 0.01,
      s: 0.35 + Math.random() * 0.65,
      ph: Math.random() * 6.28
    }));
  }

  function drawStage(t, dt) {
    if (extStage) {
      if (callExt(extStage, t, dt)) return;
      extStage = null;
      stageMode = "local";
    }
    const c = vctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.46;

    stage.pixel += (stage.pixelTarget - stage.pixel) * 0.09;
    if (stage.pixel > 0.01) {
      let blink = 1;
      if (state === "void" && !started) {
        const tt = performance.now() - bootAt;
        blink = tt < 520 ? 1 : tt < 700 ? 0.05 : tt < 900 ? 1 : tt < 1080 ? 0.05 : 1;
      }
      const a = stage.pixel * blink;
      c.save();
      c.globalAlpha = a;
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, 70);
      gr.addColorStop(0, "rgba(255,177,92,.34)");
      gr.addColorStop(0.35, "rgba(255,177,92,.10)");
      gr.addColorStop(1, "rgba(255,177,92,0)");
      c.fillStyle = gr;
      c.fillRect(cx - 74, cy - 74, 148, 148);
      c.shadowColor = P.amber;
      c.shadowBlur = 24;
      c.fillStyle = "#ffcf8a";
      c.fillRect(cx - 1, cy - 1, 2, 2);
      c.fillStyle = "#fff6de";
      c.fillRect(cx, cy, 1, 1);
      c.restore();
    }

    c.save();
    for (const m of stage.motes) {
      m.y -= m.v * dt;
      m.x += (m.drift + Math.sin(t + m.ph) * 0.00012) * dt;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      if (m.x < -0.02) m.x = 1.02;
      else if (m.x > 1.02) m.x = -0.02;
      const x = m.x * W, y = m.y * H;
      const near = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / 160);
      c.globalAlpha = 0.07 + m.s * 0.14 + near * 0.5;
      c.fillStyle = near > 0.28 ? P.cream : "#9a8fd0";
      const s = m.s > 0.72 ? 2 : 1;
      c.fillRect(Math.round(x), Math.round(y), s, s);
    }
    c.restore();
    c.globalAlpha = 1;
  }

  // ================================================================
  // local rig
  // ================================================================
  const G = { baseY: 118, headY: -126 };
  const rig = {
    cam: { x: 0.5, y: 0.46, s: 1 },
    torso: 0, armL: 0, armR: 0,
    head: { vis: false, fall: 0, bounce: 0, boot: 0, landed: false, landedAt: 0 },
    stall: { on: false, p: 0, text: "" },
    mood: "off", faceText: "", faceUntil: 0,
    look: { x: 0, y: 0 }, lookT: { x: 0, y: 0 },
    lean: 0, leanT: 0, squash: 0, ant: 0, nodAt: -1e9,
    talking: false, nextBlink: 0, blinkUntil: 0,
    ptr: { x: 0, y: 0, on: false },
    dust: [], sparkUntil: 0
  };

  function rr(c, x, y, w, h, r) {
    const q = Math.max(0, Math.min(r, Math.min(Math.abs(w), Math.abs(h)) / 2));
    c.beginPath();
    c.moveTo(x + q, y);
    c.arcTo(x + w, y, x + w, y + h, q);
    c.arcTo(x + w, y + h, x, y + h, q);
    c.arcTo(x, y + h, x, y, q);
    c.arcTo(x, y, x + w, y, q);
    c.closePath();
  }

  function block(c, x, y, w, h, r, fill, edge) {
    c.fillStyle = edge || P.dark;
    rr(c, x - 2, y - 2, w + 4, h + 4, r + 2);
    c.fill();
    c.fillStyle = fill;
    rr(c, x, y, w, h, r);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.14)";
    c.fillRect(x + 3, y + 3, Math.max(0, w - 6), 1);
  }

  function puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      rig.dust.push({
        x, y,
        vx: (Math.random() - 0.5) * 130,
        vy: -30 - Math.random() * 80,
        t: 0, ttl: 0.45 + Math.random() * 0.5,
        s: 1 + Math.random() * 2
      });
    }
  }

  function stepParticles(dt) {
    for (let i = rig.dust.length - 1; i >= 0; i--) {
      const p = rig.dust[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 360 * dt;
      if (p.t > p.ttl) rig.dust.splice(i, 1);
    }
  }

  function drawDust(c) {
    for (const p of rig.dust) {
      c.globalAlpha = Math.max(0, 1 - p.t / p.ttl) * 0.8;
      c.fillStyle = Math.random() < 0.5 ? P.amber : P.cream;
      c.fillRect(p.x, p.y, p.s, p.s);
    }
    c.globalAlpha = 1;
  }

  function drawBase(c, t) {
    const gl = c.createRadialGradient(0, 124, 0, 0, 124, 66);
    gl.addColorStop(0, "rgba(158,240,192,.15)");
    gl.addColorStop(1, "rgba(158,240,192,0)");
    c.fillStyle = gl;
    c.fillRect(-70, 82, 140, 72);
    for (const s of [-1, 1]) {
      block(c, s * 34 - 26, 80, 52, 32, 12, "#171233", P.dark);
      c.fillStyle = P.deep;
      rr(c, s * 34 - 21, 85, 42, 22, 7);
      c.fill();
      c.fillStyle = P.shade;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.arc(s * 34 + i * 10, 96, 3.2, 0, 6.3);
        c.fill();
      }
      c.fillStyle = "rgba(158,240,192," + (0.35 + 0.2 * Math.sin(t * 2.4 + s)) + ")";
      c.fillRect(s * 34 - 18, 112, 36, 1);
    }
    block(c, -20, 62, 40, 22, 8, P.shade, P.dark);
  }

  function drawTorso(c, t) {
    block(c, -64, -54, 128, 120, 14, P.shell);
    c.fillStyle = "rgba(36,29,58,.15)";
    c.fillRect(-57, 58, 114, 3);
    c.fillStyle = P.shade;
    for (let i = 0; i < 3; i++) c.fillRect(-24 + i * 10, 44, 5, 9);

    c.fillStyle = P.dark;
    rr(c, -49, -26, 98, 64, 9);
    c.fill();
    c.fillStyle = P.deep;
    rr(c, -45, -22, 90, 56, 6);
    c.fill();

    const beat = Math.sin(t * 4.1);
    c.shadowBlur = 10;
    c.shadowColor = P.amber;
    c.fillStyle = P.amber;
    c.fillRect(-34, -7, 3, 3);
    c.shadowColor = P.mint;
    c.fillStyle = P.mint;
    c.fillRect(-26, -7, 3, 3);
    c.shadowColor = P.red;
    c.fillStyle = P.red;
    c.fillRect(-18, -7, 3, 3);
    c.shadowBlur = 0;

    c.strokeStyle = "rgba(255,233,176,.52)";
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= 40; i += 2) {
      const x = -38 + i;
      let y = 11;
      if (i > 16 && i < 22) y = 11 - (i - 16) * 1.2;
      else if (i >= 22 && i < 27) y = 11 + (i - 22) * 1.7;
      c.lineTo(x, y + beat * 1.1);
    }
    c.stroke();

    for (const s of [-1, 1]) {
      block(c, s * 66 - 10, -42, 20, 20, 7, P.shade, P.dark);
      c.fillStyle = P.deep;
      c.fillRect(s * 66 - 3, -35, 6, 2);
    }
    c.fillStyle = "rgba(158,240,192,.9)";
    c.fillRect(0, 38, 5, 2);
  }

  function drawArm(c, side, p, t) {
    const e = easeOutBack(clamp(p));
    const offX = (1 - e) * (side > 0 ? 360 : 440);
    const offY = (1 - e) * 140;
    const rot = side * 0.14 + (1 - e) * (side > 0 ? 1.15 : -0.95);
    c.save();
    c.translate(side * 62 + offX, -34 + offY);
    c.rotate(rot);
    block(c, -10, -6, 20, 16, 7, P.shade, P.dark);
    block(c, -9, 4, 18, 52, 8, P.shell);
    c.save();
    c.translate(0, 52);
    c.rotate(0.22 + (1 - e) * 0.5 + Math.sin(t * 2.2 + side) * 0.02);
    block(c, -8, 0, 16, 44, 7, P.shell);
    block(c, -10, 42, 20, 18, 6, P.shade, P.dark);
    c.fillStyle = P.dark;
    c.fillRect(-6, 48, 4, 1.5);
    c.fillRect(-1, 48, 4, 1.5);
    c.fillRect(4, 48, 4, 1.5);
    c.restore();
    c.restore();
  }

  function drawNeck(c, now) {
    if (rig.head.vis && rig.head.fall > 0.3) {
      c.fillStyle = P.dark;
      c.fillRect(-13, -84, 26, 32);
      c.fillStyle = P.shade;
      c.fillRect(-10, -82, 20, 30);
      c.fillStyle = P.dark;
      c.fillRect(-12, -58, 24, 3);
      return;
    }
    c.fillStyle = P.dark;
    rr(c, -22, -64, 44, 12, 4);
    c.fill();
    c.fillStyle = P.deep;
    rr(c, -15, -62, 30, 7, 3);
    c.fill();
  }

  function drawEyes(c, t, boot) {
    const now = performance.now();
    const blink = now < rig.blinkUntil ? 1 : 0;
    const lookX = rig.look.x * 2.4, lookY = rig.look.y * 1.6;
    if (rig.mood === "happy") {
      c.strokeStyle = P.amber;
      c.lineWidth = 3;
      c.lineCap = "round";
      c.shadowColor = P.amber;
      c.shadowBlur = 10;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(s * 19, 3, 6, Math.PI * 1.12, Math.PI * 1.88);
        c.stroke();
      }
      c.shadowBlur = 0;
      return;
    }
    const eyeH = (rig.mood === "wide" ? 13 : 10) * (1 - blink * 0.86);
    c.globalAlpha = clamp((boot - 0.5) * 2);
    c.fillStyle = P.amber;
    c.shadowColor = P.amber;
    c.shadowBlur = 10;
    for (const s of [-1, 1]) c.fillRect(s * 19 - 4 + lookX, -1 + lookY - eyeH / 2, 8, eyeH);
    c.fillStyle = P.cream;
    for (const s of [-1, 1]) c.fillRect(s * 19 - 1 + lookX * 1.2, -1 + lookY - Math.min(eyeH, 8) / 2, 2, Math.min(eyeH, 8));
    c.shadowBlur = 0;
    c.globalAlpha = 1;
    const mouth = 3 + Math.abs(Math.sin(t * 7)) * (rig.talking ? 2.4 : 0.4);
    c.fillStyle = "rgba(255,177,92,.8)";
    c.fillRect(-7, 21, 14, mouth);
    c.fillStyle = "rgba(255,233,176,.32)";
    c.fillRect(-7, 21, 14, 1);
  }

  function drawAntenna(c, t) {
    c.save();
    c.translate(0, -45);
    c.rotate(rig.ant);
    c.fillStyle = P.dark;
    c.fillRect(-1.5, -28, 3, 28);
    c.fillStyle = P.shade;
    c.fillRect(-1.5, -28, 1, 28);
    const glow = 0.5 + 0.5 * Math.sin(t * 3.1);
    const gr = c.createRadialGradient(0, -30, 0, 0, -30, 17);
    gr.addColorStop(0, "rgba(255,177,92," + (0.3 + glow * 0.2) + ")");
    gr.addColorStop(1, "rgba(255,177,92,0)");
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, -30, 17, 0, 6.3);
    c.fill();
    c.fillStyle = P.amber;
    c.shadowColor = P.amber;
    c.shadowBlur = 14;
    c.beginPath();
    c.arc(0, -30, 4.2, 0, 6.3);
    c.fill();
    c.fillStyle = P.cream;
    c.fillRect(-1, -31, 2, 2);
    c.shadowBlur = 0;
    if (performance.now() < rig.sparkUntil) {
      c.strokeStyle = P.cream;
      c.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28 + t * 4;
        const r0 = 8 + Math.random() * 3;
        c.beginPath();
        c.moveTo(Math.cos(a) * r0, -30 + Math.sin(a) * r0);
        c.lineTo(Math.cos(a) * (r0 + 7), -30 + Math.sin(a) * (r0 + 7));
        c.stroke();
      }
    }
    c.restore();
  }

  function drawHead(c, t) {
    const h = rig.head;
    if (!h.vis) return;
    let off = 0;
    if (h.fall < 1) off = -(1 - easeInQuad(h.fall)) * 640;
    else if (h.bounce < 1) {
      const q = h.bounce;
      off = Math.sin(q * Math.PI * 3.4) * Math.exp(-5.2 * q) * 12;
    }
    const now = performance.now();
    const nod = now - rig.nodAt < 520
      ? Math.sin(((now - rig.nodAt) / 520) * Math.PI * 2) * (1 - (now - rig.nodAt) / 520) * 0.11
      : 0;
    const rot = rig.lean * 0.1 + rig.look.x * 0.055 + nod;

    c.save();
    c.translate(rig.look.y * 2, G.headY + off);
    c.rotate(rot);

    block(c, -58, -45, 116, 90, 13, P.shell);
    block(c, -70, -13, 13, 32, 5, P.shade);
    block(c, 57, -13, 13, 32, 5, P.shade);
    c.fillStyle = P.dark;
    c.fillRect(-66, -4, 5, 2);
    c.fillRect(61, -4, 5, 2);

    c.fillStyle = P.dark;
    rr(c, -50, -33, 100, 66, 9);
    c.fill();
    c.fillStyle = P.deep;
    rr(c, -46, -29, 92, 58, 5);
    c.fill();

    c.save();
    rr(c, -46, -29, 92, 58, 5);
    c.clip();
    c.fillStyle = "rgba(255,233,176,.035)";
    const shift = (t * 14) % 4;
    for (let y = -29 + shift; y < 29; y += 4) c.fillRect(-46, y, 92, 1);
    if (h.boot < 1) {
      const sweep = -29 + 58 * clamp(h.boot * 1.6);
      c.fillStyle = "rgba(255,233,176,.14)";
      c.fillRect(-46, sweep, 92, 1.5);
      c.fillStyle = "rgba(255,177,92,.06)";
      c.fillRect(-46, -29, 92, Math.max(0, sweep + 29));
    }
    const live = now < rig.faceUntil ? rig.faceText : "";
    if (live) {
      c.fillStyle = P.amber;
      c.shadowColor = P.amber;
      c.shadowBlur = 12;
      c.font = '13px "PS2P", ui-monospace, monospace';
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(live, 0, 1);
      c.shadowBlur = 0;
    } else if (h.landed && h.boot > 0.5) {
      drawEyes(c, t, h.boot);
    }
    c.restore();

    c.fillStyle = "rgba(255,177,92,.75)";
    c.fillRect(-44, 30, 5, 2);
    c.fillStyle = "rgba(158,240,192,.65)";
    c.fillRect(39, 30, 5, 2);
    drawAntenna(c, t);
    c.restore();
  }

  function drawLocalRig(t, dt) {
    const c = rctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);

    const mob = W < 760;
    const target = state === "gate"
      ? (mob ? { x: 0.5, y: 0.17, s: 0.58 } : { x: 0.5, y: 0.18, s: 0.64 })
      : state === "greet" || state === "menu"
        ? (mob ? { x: 0.5, y: 0.33, s: 0.95 } : { x: 0.685, y: 0.46, s: 1 })
        : { x: 0.5, y: 0.46, s: 1 };
    const k = REDUCE ? 1 : 0.055;
    rig.cam.x += (target.x - rig.cam.x) * k;
    rig.cam.y += (target.y - rig.cam.y) * k;
    rig.cam.s += (target.s - rig.cam.s) * k;

    const ax = W * rig.cam.x, ay = H * rig.cam.y;
    if (rig.ptr.on) {
      rig.lookT.x = clamp((rig.ptr.x - ax) / (W * 0.27), -1, 1);
      rig.lookT.y = clamp((rig.ptr.y - ay) / (H * 0.25), -1, 1);
    } else {
      rig.lookT.x = 0;
      rig.lookT.y = 0;
    }
    rig.look.x += (rig.lookT.x - rig.look.x) * 0.12;
    rig.look.y += (rig.lookT.y - rig.look.y) * 0.12;
    rig.lean += (rig.leanT - rig.lean) * 0.08;
    const antTarget = rig.lean * 0.16 + rig.look.x * 0.05;
    rig.ant += (antTarget - rig.ant) * 0.1;
    rig.squash *= 0.92;

    if (t * 1000 > rig.nextBlink && performance.now() > rig.blinkUntil) {
      rig.blinkUntil = performance.now() + 120;
      rig.nextBlink = performance.now() + 3000 + Math.random() * 1700;
    }
    rig.nextBlink = Math.max(rig.nextBlink, performance.now() + 300);

    const bob = REDUCE ? 0 : Math.sin(t * 1.65) * 2.4;
    const unit = Math.max(0.5, Math.min(1.5, Math.min(W / 620, H / 700))) * rig.cam.s;
    c.save();
    c.translate(ax, ay + bob);
    c.scale(unit, unit);

    c.save();
    const te = easeOutBack(clamp(rig.torso));
    c.translate((1 - te) * -520, (1 - te) * 110);
    c.rotate((1 - te) * -0.24);
    if (rig.torso > 0) {
      c.translate(0, G.baseY);
      c.scale(1 + rig.squash * 0.09, 1 - rig.squash * 0.13);
      c.translate(0, -G.baseY);
      drawBase(c, t);
      if (rig.armL > 0) drawArm(c, -1, rig.armL, t);
      if (rig.armR > 0) drawArm(c, 1, rig.armR, t);
      drawTorso(c, t);
      drawNeck(c, performance.now());
    }
    c.restore();

    drawHead(c, t);
    drawDust(c);
    c.restore();
    stepParticles(dt);
  }

  // ================================================================
  // gate placeholder
  // ================================================================
  const gate = {
    c: xpad.getContext("2d"),
    active: false, success: false,
    strokes: [], cur: null,
    ca: 0, cb: 0, cracks: [], particles: [], burstAt: 0
  };

  function gateGuides() {
    const mob = W < 760;
    const h = Math.min(W * 0.28, H * 0.115, mob ? 76 : 90);
    const cx = W * 0.5, cy = H * 0.45;
    return [
      [[cx - h, cy - h], [cx + h, cy + h]],
      [[cx + h, cy - h], [cx - h, cy + h]]
    ];
  }

  function gateSize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    xpad.width = Math.floor(W * DPR);
    xpad.height = Math.floor(H * DPR);
    gate.c.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = clamp(t);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function coverGuide(gd) {
    const n = 18;
    const tol = Math.max(28, Math.min(W, H) * 0.055);
    let hit = 0;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const p = [
        gd[0][0] + (gd[1][0] - gd[0][0]) * f,
        gd[0][1] + (gd[1][1] - gd[0][1]) * f
      ];
      let near = Infinity;
      for (const st of gate.strokes) {
        if (st.length === 1) near = Math.min(near, Math.hypot(p[0] - st[0][0], p[1] - st[0][1]));
        for (let j = 1; j < st.length; j++) {
          const d = distSeg(p, st[j - 1], st[j]);
          if (d < near) near = d;
          if (near < tol) break;
        }
        if (near < tol) break;
      }
      if (near < tol) hit++;
    }
    return hit / n;
  }

  function makeCracks() {
    const [A, B] = gateGuides();
    const cx = (A[0][0] + A[1][0]) / 2;
    const cy = (A[0][1] + A[1][1]) / 2;
    gate.cracks = [];
    gate.particles = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const len = Math.min(W, H) * (0.16 + Math.random() * 0.3);
      const pts = [[cx, cy]];
      for (let j = 1; j <= 4; j++) {
        pts.push([
          cx + Math.cos(a) * len * (j / 4) + (Math.random() - 0.5) * 22,
          cy + Math.sin(a) * len * (j / 4) + (Math.random() - 0.5) * 22
        ]);
      }
      gate.cracks.push(pts);
    }
    const chars = "x+01#";
    for (let i = 0; i < 52; i++) {
      const gd = Math.random() < 0.5 ? A : B;
      const f = Math.random();
      const x = gd[0][0] + (gd[1][0] - gd[0][0]) * f;
      const y = gd[0][1] + (gd[1][1] - gd[0][1]) * f;
      const a = Math.atan2(y - cy, x - cx) + (Math.random() - 0.5) * 1.4;
      const sp = 0.5 + Math.random() * 2.2;
      gate.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        ch: chars[i % chars.length],
        col: [P.amber, P.cream, P.mint, P.violet][i % 4],
        size: 7 + Math.random() * 9
      });
    }
  }

  function drawBurst(c, p) {
    const [A, B] = gateGuides();
    const cx = (A[0][0] + A[1][0]) / 2;
    const cy = (A[0][1] + A[1][1]) / 2;
    c.save();
    c.globalAlpha = clamp(p * 1.8);
    c.strokeStyle = P.cream;
    c.lineWidth = 4;
    c.lineCap = "round";
    c.shadowColor = P.amber;
    c.shadowBlur = 30;
    c.beginPath();
    c.moveTo(A[0][0], A[0][1]);
    c.lineTo(A[1][0], A[1][1]);
    c.moveTo(B[0][0], B[0][1]);
    c.lineTo(B[1][0], B[1][1]);
    c.stroke();
    c.restore();

    c.save();
    c.strokeStyle = "rgba(255,233,176," + (0.55 * (1 - p) + 0.2) + ")";
    c.lineWidth = 1.4;
    c.shadowColor = P.cream;
    c.shadowBlur = 12;
    for (const pts of gate.cracks) {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    }
    c.restore();

    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.3);
    gr.addColorStop(0, "rgba(255,233,176," + 0.3 * (1 - p) + ")");
    gr.addColorStop(1, "rgba(255,233,176,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const q of gate.particles) {
      c.globalAlpha = Math.max(0, 1 - p) * 0.9;
      c.fillStyle = q.col;
      c.font = q.size + "px ui-monospace, monospace";
      c.fillText(q.ch, q.x + q.vx * p * 110, q.y + q.vy * p * 110 + p * p * 22);
    }
    c.globalAlpha = 1;
  }

  function gatePaint(progress) {
    if (!gate.active) return;
    const c = gate.c;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);
    const [A, B] = gateGuides();

    c.save();
    c.setLineDash([6, 9]);
    c.lineWidth = 1.2;
    c.strokeStyle = "rgba(255,233,176,.28)";
    for (const gd of [A, B]) {
      c.beginPath();
      c.moveTo(gd[0][0], gd[0][1]);
      c.lineTo(gd[1][0], gd[1][1]);
      c.stroke();
    }
    c.restore();

    const ca = coverGuide(A), cb = coverGuide(B);
    gate.ca = ca;
    gate.cb = cb;

    for (const pair of [[A, ca], [B, cb]]) {
      const gd = pair[0], cov = pair[1];
      if (cov <= 0.02) continue;
      const ex = gd[0][0] + (gd[1][0] - gd[0][0]) * cov;
      const ey = gd[0][1] + (gd[1][1] - gd[0][1]) * cov;
      c.save();
      c.lineWidth = 1.6;
      c.strokeStyle = "rgba(158,240,192,.72)";
      c.shadowColor = P.mint;
      c.shadowBlur = 8;
      c.beginPath();
      c.moveTo(gd[0][0], gd[0][1]);
      c.lineTo(ex, ey);
      c.stroke();
      c.restore();
    }

    for (const st of gate.strokes) {
      if (st.length < 2) continue;
      c.save();
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = "rgba(255,244,214,.95)";
      c.shadowColor = P.amber;
      c.shadowBlur = 12;
      for (let i = 1; i < st.length; i++) {
        const d = Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
        c.lineWidth = Math.max(1.4, 5.2 - d * 0.12);
        c.beginPath();
        c.moveTo(st[i - 1][0], st[i - 1][1]);
        c.lineTo(st[i][0], st[i][1]);
        c.stroke();
      }
      c.restore();
    }

    if (gate.success) drawBurst(c, progress || 0);

    const pct = Math.min(ca, cb);
    const lines = (ca >= 0.55 ? 1 : 0) + (cb >= 0.55 ? 1 : 0);
    dom.gateMeta.textContent = lines + " / 2 lines   " + Math.round(pct * 100) + "%";

    if (!gate.success) {
      if (pct >= 0.3 && !gate.r1) { gate.r1 = true; rigFace("...", 1000); }
      if (pct >= 0.6 && !gate.r2) { gate.r2 = true; rigFace("almost", 1000); rig.sparkUntil = performance.now() + 300; }
      if (ca >= 0.55 && cb >= 0.55) gateSuccess();
    }
  }

  function gateSuccess() {
    if (gate.success || done) return;
    gate.success = true;
    gate.cur = null;
    gate.burstAt = performance.now();
    makeCracks();
    rigFace("FOUND", 6000);
    rig.mood = "happy";
    rig.sparkUntil = performance.now() + 900;
    flash();
    audio.chord();
    setState("gate");
    dom.gateMeta.textContent = "2 / 2 lines   100%";

    if (REDUCE) {
      later(() => handoff("x"), 260);
      return;
    }
    const start = performance.now();
    const loop = (now) => {
      if (!gate.active) return;
      const p = clamp((now - start) / 820);
      gatePaint(p);
      if (p < 1) requestAnimationFrame(loop);
      else later(() => handoff("x"), 140);
    };
    requestAnimationFrame(loop);
  }

  function gateStart() {
    if (state === "gate" || done) return;
    setState("gate");
    gate.active = true;
    gate.success = false;
    gate.strokes = [];
    gate.cur = null;
    gate.r1 = gate.r2 = false;
    dom.gate.hidden = false;
    dom.say.hidden = true;
    if (dom.skip) dom.skip.hidden = true;
    if (dom.gateSkip) dom.gateSkip.hidden = true;
    dom.menu.hidden = true;
    gateSize();
    gatePaint(0);
    rig.mood = "curious";
    rig.faceUntil = 0;
  }

  // ---------- gate pointer ----------
  function gatePoint(e) {
    const r = xpad.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  xpad.addEventListener("pointerdown", (e) => {
    if (!gate.active || gate.success) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    try { xpad.setPointerCapture(e.pointerId); } catch (err) {}
    gate.cur = [gatePoint(e)];
    gate.strokes.push(gate.cur);
    if (gate.strokes.length === 1) {
      audio.tone(1400, 0.04, "square", 0.018, -900);
      rig.mood = "wide";
      rig.sparkUntil = performance.now() + 380;
      rig.faceUntil = 0;
    }
    gatePaint(0);
  });

  xpad.addEventListener("pointermove", (e) => {
    rig.ptr.x = e.clientX;
    rig.ptr.y = e.clientY;
    rig.ptr.on = true;
    if (!gate.cur || !gate.active || gate.success) return;
    const [x, y] = gatePoint(e);
    const last = gate.cur[gate.cur.length - 1];
    if (Math.hypot(x - last[0], y - last[1]) < 2) return;
    gate.cur.push([x, y]);
    if (Math.random() < 0.25) audio.tone(1700 + Math.random() * 900, 0.02, "triangle", 0.008);
    gatePaint(0);
  });

  const gateUp = () => {
    if (!gate.cur) return;
    gate.cur = null;
    gatePaint(0);
  };
  xpad.addEventListener("pointerup", gateUp);
  xpad.addEventListener("pointercancel", gateUp);

  // ================================================================
  // dialogue, local menu
  // ================================================================
  function blip() {
    if (REDUCE) return;
    audio.tone(420 + Math.random() * 220, 0.028, "square", 0.014);
  }

  function say(text, hold, doneCb) {
    saySeq++;
    const seq = saySeq;
    clearTimeout(sayTimer);
    dom.lineSr.textContent = text;
    dom.say.hidden = false;
    dom.say.classList.add("on");
    dom.line.textContent = "";
    dom.line.classList.add("typing");
    rig.talking = true;
    const mood = /\?\s*$/.test(text) ? "curious"
      : /!\s*$/.test(text) ? "excited"
      : /(one second|still loading|hold on)/i.test(text) ? "confused"
      : "presenting";
    setState(mood);
    let n = 0;
    const step = () => {
      if (seq !== saySeq || done) return;
      n++;
      dom.line.textContent = text.slice(0, n);
      if (n % 3 === 0) blip();
      if (n < text.length) {
        sayTimer = setTimeout(step, REDUCE ? 5 : 26);
      } else {
        dom.line.classList.remove("typing");
        rig.talking = false;
        sayTimer = setTimeout(() => {
          if (seq === saySeq && doneCb) doneCb();
        }, Math.max(250, hold || 700));
      }
    };
    step();
  }

  function rigFace(text, ms) {
    rig.faceText = text;
    rig.faceUntil = text ? performance.now() + (ms || 1200) : 0;
    if (extRig && typeof extRig.face === "function") {
      try { extRig.face(text, ms); } catch (err) {}
    }
  }

  let menuBuilt = false;

  function buildLocalMenu() {
    if (menuBuilt) return;
    menuBuilt = true;
    dom.menu.textContent = "";
    OPTIONS.forEach((opt, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.dataset.pick = opt.id;
      b.style.setProperty("--i", String(i));
      const idx = document.createElement("span");
      idx.className = "idx";
      idx.textContent = String(i + 1).padStart(2, "0");
      const mid = document.createElement("span");
      mid.className = "mid";
      const label = document.createElement("span");
      label.className = "opt-label";
      label.textContent = opt.label;
      const sub = document.createElement("span");
      sub.className = "opt-sub";
      sub.textContent = opt.sub;
      mid.appendChild(label);
      mid.appendChild(sub);
      const x = document.createElement("span");
      x.className = "opt-x";
      x.setAttribute("aria-hidden", "true");
      x.textContent = "x";
      b.appendChild(idx);
      b.appendChild(mid);
      b.appendChild(x);
      b.addEventListener("pointerenter", () => {
        rig.leanT = i === 0 ? -1 : 1;
        audio.tick();
      });
      b.addEventListener("focus", () => { rig.leanT = i === 0 ? -1 : 1; });
      b.addEventListener("click", () => choose(opt.id));
      dom.menu.appendChild(b);
    });
    dom.menu.addEventListener("pointerleave", () => { rig.leanT = 0; });
  }

  function openLocalMenu() {
    if (done || state === "gate" || state === "handoff") return;
    setState("menu");
    document.body.classList.add("menu-open");
    buildLocalMenu();
    dom.menu.hidden = false;
    dom.menu.classList.remove("out");
    requestAnimationFrame(() => dom.menu.classList.add("in"));
    rig.mood = "curious";
    rig.leanT = 0;
    const first = dom.menu.querySelector(".opt");
    if (first) { try { first.focus({ preventScroll: true }); } catch (err) { first.focus(); } }
  }

  function openMenu() {
    if (done || state === "gate" || state === "handoff") return;
    setState("menu");
    if (extMenu) {
      document.body.classList.add("menu-open");
      try {
        extMenu.show(SAY_HELLO, OPTIONS.map((o) => ({ id: o.id, label: o.label })), (i, choice) => {
          const id = choice && choice.id ? choice.id : (OPTIONS[i] && OPTIONS[i].id);
          choose(id);
        });
        return;
      } catch (err) {
        console.warn("xenith intro: IntroMenu.show failed, using local menu", err);
        extMenu = null;
        menuMode = "local";
      }
    }
    openLocalMenu();
  }

  function choose(id) {
    if (pickLock || done) return;
    pickLock = true;
    document.body.classList.remove("menu-open");
    dom.menu.classList.remove("in");
    dom.menu.classList.add("out");
    rig.leanT = 0;
    rig.nodAt = performance.now();
    rig.mood = "listening";
    audio.tone(180, 0.12, "triangle", 0.05, -70);
    later(() => { dom.menu.hidden = true; }, 320);
    if (state === "gate") return;
    setState("menu");
    const line = id === "explore" ? SAY_EXPLORE : SAY_RESULT;
    const go = () => say(line, 600, gateStart);
    if (extMenu) later(go, 540);
    else go();
  }

  // ================================================================
  // state machine
  // ================================================================
  function armWake() {
    if (wakeReady || done || started) return;
    wakeReady = true;
    dom.wake.hidden = false;
    dom.wake.dataset.wait = "0";
    dom.wakeText.textContent = "press or click to wake";
    try { dom.wake.focus({ preventScroll: true }); } catch (err) {}
  }

  function onWake(e) {
    if (started || done || state !== "void") return;
    if (e && e.type === "keydown") {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["Meta", "Control", "Alt", "Shift", "Tab", "CapsLock"].includes(e.key)) return;
    }
    if (!wakeReady) {
      wakeQueued = true;
      dom.wakeText.textContent = "loading";
      dom.wake.dataset.wait = "1";
      return;
    }
    started = true;
    audio.on();
    audio.tone(130, 0.2, "sine", 0.08, -60);
    audio.tone(780, 0.05, "square", 0.025);
    dom.wake.hidden = true;
    document.body.classList.add("awake");
    stage.pixelTarget = 0.35;
    later(startAssemble, REDUCE ? 30 : 420);
  }

  function startAssemble() {
    if (done) return;
    setState("assemble");
    if (extRig && typeof extRig.setState === "function") { try { extRig.setState("boot"); } catch (err) {} }
    assembleAt = performance.now();
    if (dom.skip) dom.skip.hidden = true;
    rig.mood = "idle";
    rig.leanT = 0;
    stage.pixelTarget = 0;
    log("stage: " + stageMode);
    log("rig: " + rigMode);
    log("menu: " + menuMode);
    A = {
      start: assembleAt,
      dTorso: D(780),
      dArm: D(460),
      armLAt: assembleAt + D(660),
      armRAt: assembleAt + D(950),
      dDrop: D(540),
      torso: false, arms: false,
      stallAt: 0, dropAt: 0, landedAt: 0,
      xShown: false, eyes: false, ready: false
    };
    if (extRig && typeof extRig.assemble === "function") {
      try { extRig.assemble(); } catch (err) {}
    }
  }

  function tickAssemble(now) {
    if (state !== "assemble" || !A) return;

    let ap = 0;
    if (!A.dropAt) ap = clamp((now - A.start) / D(1410)) * 0.55;
    else ap = 0.55 + clamp((now - A.dropAt) / A.dDrop) * 0.45;
    if (extRig && typeof extRig.assemble === "function") {
      try { extRig.assemble(ap); } catch (err) {}
    }

    rig.torso = clamp((now - A.start) / A.dTorso);
    if (rig.torso >= 1 && !A.torso) {
      A.torso = true;
      audio.thump();
      puff(0, 112, 10);
      log("torso: landed");
    }
    rig.armL = clamp((now - A.armLAt) / A.dArm);
    rig.armR = clamp((now - A.armRAt) / A.dArm);
    if (rig.armR >= 1 && !A.arms) {
      A.arms = true;
      audio.tone(240, 0.07, "square", 0.03, -60);
      puff(-70, 40, 4);
      puff(70, 40, 4);
      log("arms: 2 of 2");
    }

    if (A.arms && !A.dropAt) {
      A.dropAt = now;
      rig.stall.on = false;
      rig.head.vis = true;
      rig.head.fall = 0;
      log("head: incoming");
      audio.tone(220, 0.04, "square", 0.02);
    }

    if (A.dropAt && !A.landedAt) {
      rig.head.fall = clamp((now - A.dropAt) / A.dDrop);
      if (rig.head.fall >= 1) {
        A.landedAt = now;
        rig.head.landed = true;
        rig.head.landedAt = now;
        rig.head.bounce = 0;
        rig.squash = 1;
        audio.thump();
        puff(0, -74, 16);
        log("head: landed");
      }
    }

    if (A.landedAt) {
      const since = now - A.landedAt;
      rig.head.bounce = clamp(since / D(900));
      rig.head.boot = clamp(since / D(760));
      if (since > D(320) && !A.xShown) {
        A.xShown = true;
        rigFace("x", 380);
        log("face: x");
        audio.tone(680, 0.06, "square", 0.022);
      }
      if (since > D(740) && !A.eyes) {
        A.eyes = true;
        rig.mood = "idle";
        if (extRig && extRig.setState) { try { extRig.setState("idle"); } catch (err) {} }
        audio.tone(520, 0.05, "triangle", 0.02);
      }
      if (since > D(1120) && !A.ready) {
        A.ready = true;
        rig.mood = "curious";
        if (extRig && extRig.setState) { try { extRig.setState("curious"); } catch (err) {} }
        log("rig: ready");
        later(greet, 380);
      }
    }
  }

  function greet() {
    if (state !== "assemble" || done) return;
    setState("greet");
    rig.mood = "listening";
    dom.log.classList.add("fade");
    later(() => { dom.log.hidden = true; }, 460);
    if (extMenu) {
      openMenu();
      return;
    }
    say(SAY_HELLO, 1000, openLocalMenu);
  }

  // ================================================================
  // handoff
  // ================================================================
  function showCard() {
    dom.handoff.hidden = false;
    document.body.classList.add("ended");
  }

  function handoff(via) {
    if (done) return;
    done = true;
    saySeq++;
    clearTimeout(sayTimer);
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    gate.active = false;
    gate.success = via === "x" ? true : gate.success;
    setState("handoff");
    dom.skip.hidden = true;
    dom.gateSkip.hidden = true;

    const detail = {
      via: via || "api",
      x: gate.success,
      state: "handoff",
      ms: Math.round(performance.now() - bootAt),
      modules: { stage: stageMode, rig: rigMode, menu: menuMode }
    };

    document.documentElement.dataset.xenithIntro = "done";
    try {
      document.dispatchEvent(new CustomEvent("xenith:intro-done", { detail }));
    } catch (err) {}

    let hosted = false;
    if (typeof window.XenithIntroDone === "function") {
      hosted = true;
      try { window.XenithIntroDone(detail); } catch (err) { console.error("xenith intro: host handoff threw", err); }
    }

    if (hosted) {
      document.body.classList.add("ended");
    } else {
      setTimeout(showCard, 480);
    }
    setTimeout(() => {
      dom.stage.hidden = true;
      if (extRig && typeof extRig.destroy === "function") {
        try { extRig.destroy(); } catch (err) {}
      }
      if (extStage && typeof extStage.destroy === "function") {
        try { extStage.destroy(); } catch (err) {}
      }
    }, 1100);
  }

  // ================================================================
  // hud, loop, boot
  // ================================================================
  function hud() {
    if (!assembleAt || done) {
      dom.meter.textContent = "00.0";
      return;
    }
    const s = (performance.now() - assembleAt) / 1000;
    dom.meter.textContent = s.toFixed(1).padStart(4, "0");
  }

  let last = 0, lastFrame = 0;

  function frame(now) {
    if (done) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    if (now - lastFrame < 33) return;
    lastFrame = now;
    const dt = last ? Math.min(0.07, (now - last) / 1000) : 0.033;
    last = now;

    tickAssemble(now);
    drawStage(now / 1000, dt);
    if (extRig) {
      if (!callExt(extRig, now / 1000, dt)) { extRig = null; rigMode = "local"; }
    } else {
      drawLocalRig(now / 1000, dt);
    }
    hud();
  }

  function sizeAll() {
    W = innerWidth;
    H = innerHeight;
    sizeCanvas(voidCv, vctx);
    sizeCanvas(rigCv, rctx);
    if (extStage && typeof extStage.resize === "function") {
      try { extStage.resize(W, H); } catch (err) {}
    }
    if (extRig && typeof extRig.resize === "function") {
      try { extRig.resize(W, H); } catch (err) {}
    }
    if (gate.active) {
      gateSize();
      gate.strokes = [];
      gate.cur = null;
      gatePaint(0);
    }
  }

  function boot() {
    extRig = probeRig();
    extStage = probeStage();
    extMenu = probeMenu();
    if (extMenu && MUTE && "blips" in extMenu) extMenu.blips = false;

    sizeAll();
    seedMotes();
    rig.nextBlink = performance.now() + 2600;

    dom.wake.hidden = false;
    dom.wake.dataset.wait = "1";
    dom.wakeText.textContent = "loading";

    const tasks = [];
    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready.catch(() => {}));
    if (extRig && extRig.ready && typeof extRig.ready.then === "function") {
      tasks.push(Promise.resolve(extRig.ready).catch(() => {}));
    }
    const ready = tasks.length
      ? Promise.race([Promise.all(tasks), new Promise((r) => setTimeout(r, 2600))])
      : Promise.resolve();
    ready.then(() => {
      armWake();
      if (wakeQueued) onWake();
    });

    document.addEventListener("pointerdown", onWake, { passive: true });
    document.addEventListener("keydown", onWake);
    document.addEventListener("pointermove", (e) => {
      rig.ptr.x = e.clientX;
      rig.ptr.y = e.clientY;
      rig.ptr.on = true;
      const nx = Math.max(-1, Math.min(1, (e.clientX - innerWidth * 0.5) / (innerWidth * 0.45)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - innerHeight * 0.5) / (innerHeight * 0.45)));
      if (extRig && typeof extRig.setGaze === "function") {
        try { extRig.setGaze(nx, ny); } catch (err) {}
      }
      if (dom.voidCv) {
        dom.voidCv.style.transform = `translate3d(${(-nx * 7).toFixed(1)}px,${(-ny * 5).toFixed(1)}px,0) scale(1.02)`;
      }
    }, { passive: true });
    document.addEventListener("pointerleave", () => { rig.ptr.on = false; });

    dom.wake.addEventListener("click", (e) => { e.preventDefault(); onWake(e); });
    if (dom.skip) dom.skip.addEventListener("click", () => handoff("skip"));
    if (dom.gateSkip) dom.gateSkip.addEventListener("click", () => handoff("skip"));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !done && state !== "void") {
        e.preventDefault();
        handoff("escape");
      }
      if (state === "menu" && !extMenu && !dom.menu.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const rows = Array.from(dom.menu.querySelectorAll(".opt"));
        if (!rows.length) return;
        const at = rows.indexOf(document.activeElement);
        const next = e.key === "ArrowDown"
          ? (at < 0 ? 0 : (at + 1) % rows.length)
          : (at < 0 ? rows.length - 1 : (at - 1 + rows.length) % rows.length);
        e.preventDefault();
        rows[next].focus();
      }
    });

    addEventListener("resize", sizeAll);

    // expose a small surface for the host and for manual testing
    window.XenithIntro = {
      state: () => state,
      modules: () => ({ stage: stageMode, rig: rigMode, menu: menuMode }),
      skip: (why) => handoff(why || "api"),
      gate: () => ({ ca: gate.ca, cb: gate.cb, active: gate.active })
    };

    requestAnimationFrame(frame);
  }

  boot();
})();
