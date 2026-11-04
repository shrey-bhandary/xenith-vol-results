/* Xenith, the void. A loading stage that tells the truth, then gets out of the way.

   window.VoidStage = { mount(host, opts), version }
     .setProgress(0..100)  monotonic by nature. 100 seals the X and cuts, hard.
                           Values in (0,1] are read as a fraction of the load.
     .stall(true|false)    honest hold. pulse, scan and dust stop pretending.
     .flash()              one soft cream frame.
     .say(text)            the counter leaves, dialogue takes the same bottom slot.
     .cut()                hand off now, no fade.
     .destroy()            remove the stage and stop the loop.

   host   element or selector. It must be positioned, the stage fills it.
   opts   { onDone(detail) }. The stage also emits a bubbling "void:done" on
          the host, so a page can hand off without passing a callback.

   Three cells sit where the speech will sit: a drawn X that stands in for the
   zero, then the tens and the ones. No bar, no spinner. The X closes exactly
   when the load does. The number never shows 100: at 100 it is already gone.
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const STYLE_ID = "void-stage-css";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MOTES = 28;

  const CSS = `
.void-root{
  --v-pad:clamp(18px,3.4vw,46px);
  --v-num:clamp(84px,min(18.5vw,31vh),292px);
  --v-cream:#ffe9b0;--v-amber:#ffb15c;--v-violet:#7b5cff;--v-mint:#9ef0c0;
  position:absolute;inset:0;overflow:hidden;isolation:isolate;
  background:#05040c;color:var(--v-cream);
  font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
  -webkit-font-smoothing:antialiased;
  user-select:none;-webkit-user-select:none;pointer-events:none;
}
.void-root *{box-sizing:border-box}

/* the room. one slow 40hz bloom, never more than a breath */
.void-hum{
  position:absolute;inset:-2%;z-index:0;pointer-events:none;
  background:
    radial-gradient(38% 32% at 22% 80%, rgba(255,177,92,.10), rgba(255,177,92,0) 72%),
    radial-gradient(58% 52% at 50% 46%, rgba(123,92,255,.12), rgba(123,92,255,0) 70%);
  animation:v-hum 5.4s ease-in-out infinite;
  transform-origin:50% 52%;will-change:transform,opacity;
}
@keyframes v-hum{0%,100%{opacity:.5;transform:scale(.985)}50%{opacity:1;transform:scale(1.03)}}

/* 28 motes, one pixel each */
.void-dust{position:absolute;inset:0;z-index:1;width:100%;height:100%;display:block;pointer-events:none}

/* one scanline, slow enough to forget it is there */
.void-scan{
  position:absolute;left:0;right:0;top:0;height:1px;z-index:1;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(255,233,176,.13) 18%,rgba(255,233,176,.24) 50%,rgba(255,233,176,.13) 82%,transparent);
  box-shadow:0 0 22px rgba(255,233,176,.10);
  animation:v-scan 10.5s linear infinite;
  will-change:transform;
}
.void-scan::after{
  content:"";position:absolute;left:0;right:0;top:1px;height:72px;
  background:linear-gradient(to bottom, rgba(255,233,176,.032), transparent);
}
@keyframes v-scan{
  0%{transform:translate3d(0,-4vh,0);opacity:0}
  6%{opacity:1}
  94%{opacity:1}
  100%{transform:translate3d(0,104vh,0);opacity:0}
}

/* heavy edges, the void reads as a room */
.void-vig{
  position:absolute;inset:0;z-index:2;pointer-events:none;
  background:
    radial-gradient(120% 95% at 50% 44%, rgba(3,2,10,0) 30%, rgba(3,2,10,.55) 76%, rgba(2,1,7,.86) 100%),
    linear-gradient(to bottom, rgba(2,1,6,.5), transparent 24%, transparent 72%, rgba(2,1,6,.7));
}

/* minimal hud */
.void-hud{
  position:absolute;z-index:4;left:var(--v-pad);right:var(--v-pad);top:var(--v-pad);
  display:flex;justify-content:space-between;align-items:center;
  font-size:9px;letter-spacing:.32em;text-transform:lowercase;
  color:rgba(255,233,176,.5);pointer-events:none;
}
.void-brand{color:rgba(255,233,176,.66)}
.void-status{display:inline-flex;align-items:center;gap:10px;color:rgba(255,233,176,.55)}
.void-led{
  display:inline-block;width:4px;height:4px;background:var(--v-amber);
  box-shadow:0 0 9px rgba(255,177,92,.45);
  animation:v-led 2.8s steps(1,end) infinite;
}
@keyframes v-led{0%,88%{opacity:1}89%,100%{opacity:.18}}
.void-state{transition:color .25s linear}

/* the slot: one huge number, later one line of speech */
.void-slot{
  position:absolute;z-index:4;left:var(--v-pad);right:var(--v-pad);
  bottom:calc(var(--v-pad) + env(safe-area-inset-bottom,0px) - 4px);
  pointer-events:none;
}
.void-count{
  display:flex;align-items:flex-end;height:1em;
  font-size:var(--v-num);line-height:1;
  color:rgba(255,233,176,.93);letter-spacing:-.02em;
  text-shadow:0 0 .07em rgba(255,177,92,.16);
}
.void-count.off{display:none}

.void-xcol{position:relative;display:block;flex:0 0 1ch;width:1ch;height:1em}
.void-xcol svg{
  position:absolute;left:50%;top:50%;width:.66em;height:.8em;
  transform:translate(-50%,-49.5%);overflow:visible;display:block;
}
.void-xcol path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.void-ghost path{stroke:rgba(255,233,176,.20);stroke-width:2;stroke-dasharray:3 7}
.void-s1,.void-s2{stroke:var(--v-amber);stroke-width:4.6;stroke-dasharray:1;stroke-dashoffset:1}

.void-col{position:relative;display:block;flex:0 0 1ch;width:1ch;height:1em;overflow:hidden}
.void-strip{display:block;transform:translate3d(0,0,0)}
.void-cell{display:block;height:1em;line-height:1;text-align:center}

.void-meta{
  margin-top:clamp(9px,1.3vw,16px);
  display:flex;align-items:center;gap:16px;
  font-size:9px;letter-spacing:.30em;text-transform:lowercase;
  color:rgba(255,233,176,.42);
}
.void-cap{display:inline-flex;align-items:center;gap:12px;white-space:nowrap}
.void-cap::before{
  content:"";display:inline-block;width:26px;height:1px;
  background:rgba(255,177,92,.55);
}

.void-line{
  display:none;margin:0 0 12px;max-width:34ch;
  font-size:clamp(13px,1.15vw,17px);line-height:1.75;letter-spacing:.005em;
  color:rgba(255,233,176,.9);
}
.void-line.on{display:block}
.void-typed{white-space:pre-wrap}
.void-caret{
  display:inline-block;width:.55ch;height:1em;margin-left:.12em;vertical-align:-.14em;
  background:rgba(255,177,92,.8);animation:v-caret 1.05s steps(1,end) infinite;
}
@keyframes v-caret{0%,55%{opacity:1}56%,100%{opacity:.1}}

.void-sr{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0;
}

/* one soft cream frame, never a white bomb */
.void-flash{
  position:absolute;inset:0;z-index:6;pointer-events:none;
  background:#ffe9b0;opacity:0;mix-blend-mode:screen;
}
.void-flash.go{animation:v-flash .28s ease-out both}
@keyframes v-flash{0%{opacity:0}7%{opacity:.15}40%{opacity:.05}100%{opacity:0}}

/* holding is a state, not an animation */
.void-root[data-stall] .void-scan{animation-play-state:paused;opacity:.45}
.void-root[data-stall] .void-hum{animation-play-state:paused;opacity:.5}
.void-root[data-stall] .void-led{animation-duration:6.5s;background:var(--v-violet);box-shadow:0 0 9px rgba(123,92,255,.55)}
.void-root[data-stall] .void-meta{color:rgba(255,177,92,.55)}
.void-root[data-stall] .void-cap::before{background:rgba(123,92,255,.7)}
.void-root[data-stall] .void-count{opacity:.82}

/* the seal. one painted frame, then nothing at all */
.void-root[data-sealed] .void-count{color:#fff4d6}
.void-root[data-sealed] .void-s1,.void-root[data-sealed] .void-s2{stroke:#fff4d6}
.void-root[data-sealed] .void-led{animation:none;background:var(--v-cream);box-shadow:0 0 9px rgba(255,233,176,.6);opacity:1}
.void-root[data-sealed] .void-state{color:var(--v-cream)}

.void-root[data-cut="1"]{visibility:hidden;pointer-events:none}
.void-root[data-cut="1"] *{animation-play-state:paused!important}

@media (max-width:720px){
  .void-root{--v-pad:18px;--v-num:clamp(58px,min(30vw,26vh),148px)}
  .void-hud{font-size:8px;letter-spacing:.26em}
  .void-meta{font-size:8px;letter-spacing:.24em;gap:12px}
  .void-cap::before{width:18px}
  .void-line{font-size:13px;max-width:none}
}
@media (prefers-reduced-motion:reduce){
  .void-root .void-hum{animation:none;opacity:.55}
  .void-root .void-scan{animation:none;opacity:.28;transform:translate3d(0,36vh,0)}
  .void-root .void-caret{animation:none;opacity:1}
  .void-root .void-flash.go{animation:v-flash-soft .3s ease-out both}
}
@keyframes v-flash-soft{0%{opacity:0}30%{opacity:.06}100%{opacity:0}}
`;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const nowMs = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

  function inject(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function build(doc, host) {
    const el = (tag, cls, parent) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (parent) parent.appendChild(n);
      return n;
    };
    const svgEl = (tag, parent) => {
      const n = doc.createElementNS(SVG_NS, tag);
      if (parent) parent.appendChild(n);
      return n;
    };

    const root = el("div", "void-root", host);

    const hum = el("div", "void-hum", root);
    hum.setAttribute("aria-hidden", "true");

    const canvas = el("canvas", "void-dust", root);
    canvas.setAttribute("aria-hidden", "true");

    const scan = el("div", "void-scan", root);
    scan.setAttribute("aria-hidden", "true");

    const vig = el("div", "void-vig", root);
    vig.setAttribute("aria-hidden", "true");

    const hud = el("div", "void-hud", root);
    const brand = el("span", "void-brand", hud);
    brand.textContent = "xenith";
    const status = el("span", "void-status", hud);
    const led = el("i", "void-led", status);
    led.setAttribute("aria-hidden", "true");
    const stateEl = el("span", "void-state", status);
    stateEl.textContent = "loading";
    stateEl.setAttribute("aria-live", "polite");

    const slot = el("div", "void-slot", root);
    const count = el("div", "void-count", slot);
    count.setAttribute("role", "progressbar");
    count.setAttribute("aria-valuemin", "0");
    count.setAttribute("aria-valuemax", "100");
    count.setAttribute("aria-valuenow", "0");
    count.setAttribute("aria-label", "xenith loading");

    const xcol = el("span", "void-xcol", count);
    xcol.setAttribute("aria-hidden", "true");
    const svg = svgEl("svg", xcol);
    svg.setAttribute("viewBox", "0 0 100 120");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const ghost = svgEl("g", svg);
    ghost.setAttribute("class", "void-ghost");
    ["M9 10 L91 110", "M91 10 L9 110"].forEach((d) => {
      svgEl("path", ghost).setAttribute("d", d);
    });
    const s1 = svgEl("path", svg);
    s1.setAttribute("class", "void-s1");
    s1.setAttribute("d", "M9 10 L91 110");
    s1.setAttribute("pathLength", "1");
    const s2 = svgEl("path", svg);
    s2.setAttribute("class", "void-s2");
    s2.setAttribute("d", "M91 10 L9 110");
    s2.setAttribute("pathLength", "1");

    const column = (name, cells, parent) => {
      const col = el("span", "void-col", parent);
      col.setAttribute("data-col", name);
      col.setAttribute("aria-hidden", "true");
      const strip = el("span", "void-strip", col);
      for (let i = 0; i < cells; i++) {
        const cell = el("span", "void-cell", strip);
        cell.textContent = String(i % 10);
      }
      return strip;
    };
    const tensStrip = column("tens", 10, count);
    const onesStrip = column("ones", 110, count);

    const line = el("p", "void-line", slot);
    const typed = el("span", "void-typed", line);
    typed.setAttribute("aria-hidden", "true");
    const caret = el("span", "void-caret", line);
    caret.setAttribute("aria-hidden", "true");

    const meta = el("div", "void-meta", slot);
    const cap = el("span", "void-cap", meta);
    cap.textContent = "signal 40hz";
    const sr = el("span", "void-sr", meta);
    sr.setAttribute("aria-live", "polite");

    const flashEl = el("div", "void-flash", root);
    flashEl.setAttribute("aria-hidden", "true");

    return {
      root, canvas, stateEl, count, cap, sr, typed, line, flashEl,
      s1, s2, onesStrip, tensStrip,
    };
  }

  function mount(target, options) {
    const opts = options || {};
    const doc = global.document;
    const host = typeof target === "string" ? doc.querySelector(target) : target;
    if (!host) throw new Error("VoidStage.mount: host element not found");

    inject(doc);
    if (host.__voidStage) host.__voidStage.destroy();

    const reduced = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const ref = build(doc, host);
    const { root, canvas, stateEl, count, cap, sr, typed, line, flashEl } = ref;

    const ctx = canvas.getContext ? canvas.getContext("2d") : null;
    const raf = global.requestAnimationFrame ? global.requestAnimationFrame.bind(global) : null;
    const cancel = global.cancelAnimationFrame ? global.cancelAnimationFrame.bind(global) : null;

    const st = {
      value: 0, target: 0, xTarget: 0,
      ones: 0, tens: 0, x: 0,
      stall: false, cut: false, finishing: false, dead: false, word: "loading",
    };

    let W = 0, H = 0, dpr = 0;
    let rafId = 0, cutRaf = 0, cutTimer = 0, last = 0;
    let flashTimer = 0, sayTimer = 0;
    let ro = null;
    let wOnes = "", wTens = "", wA = "", wB = "";

    // 28 motes, weighted to the palette. deterministic spread, not a clump.
    const TINTS = [];
    for (let i = 0; i < 20; i++) TINTS.push("#ffe9b0");
    for (let i = 0; i < 3; i++) TINTS.push("#ffb15c");
    for (let i = 0; i < 3; i++) TINTS.push("#7b5cff");
    for (let i = 0; i < 2; i++) TINTS.push("#9ef0c0");
    const TINT_A = { "#ffe9b0": 1, "#ffb15c": .85, "#7b5cff": .5, "#9ef0c0": .7 };
    const motes = [];
    for (let i = 0; i < MOTES; i++) {
      const col = TINTS[(i * 11) % MOTES];
      motes.push({
        x: Math.random(), y: Math.random(),
        vy: .004 + Math.random() * .014,
        sw: .002 + Math.random() * .012,
        hz: .1 + Math.random() * .3,
        ph: Math.random() * Math.PI * 2,
        a: (.05 + Math.random() * .2) * TINT_A[col],
        col,
      });
    }

    function setWord(w) {
      if (w === st.word) return;
      st.word = w;
      stateEl.textContent = w;
    }

    function drawDust(dt, ms) {
      if (!ctx || !W || !H) return;
      ctx.clearRect(0, 0, W, H);
      const t = ms / 1000;
      const speed = st.stall ? .16 : 1;
      const litX = W * .24, litY = H * .8;
      const reach = Math.min(W, H) * .55;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        if (dt > 0) {
          m.y -= m.vy * speed * (dt / 1000);
          if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
        }
        let x = m.x;
        if (dt > 0) {
          x += Math.sin(t * m.hz + m.ph) * m.sw;
          if (x < 0) x += 1;
          else if (x > 1) x -= 1;
        }
        const px = (x * W) | 0;
        const py = (m.y * H) | 0;
        const dx = px - litX, dy = py - litY;
        const lit = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / reach);
        const twinkle = .8 + .2 * Math.sin(t * m.hz * 2.4 + m.ph);
        let a = m.a * (.75 + lit * 1.5) * twinkle;
        if (st.stall) a *= .6;
        ctx.globalAlpha = a > .9 ? .9 : a;
        ctx.fillStyle = m.col;
        ctx.fillRect(px, py, 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    function sizeCanvas() {
      if (st.dead) return;
      const r = root.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width || 0));
      const h = Math.max(1, Math.round(r.height || 0));
      const d = Math.min(global.devicePixelRatio || 1, 2);
      if (w === W && h === H && d === dpr) return;
      W = w; H = h; dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      if (ctx) {
        ctx.setTransform(d, 0, 0, d, 0, 0);
        drawDust(0, nowMs());
      }
    }

    function writeWheels() {
      const a = (-st.ones).toFixed(3);
      if (a !== wOnes) {
        ref.onesStrip.style.transform = "translate3d(0," + a + "em,0)";
        wOnes = a;
      }
      const b = (-st.tens).toFixed(3);
      if (b !== wTens) {
        ref.tensStrip.style.transform = "translate3d(0," + b + "em,0)";
        wTens = b;
      }
    }

    function writeX() {
      const x = st.x;
      const a = clamp(x / .5, 0, 1);
      const b = clamp((x - .46) / .54, 0, 1);
      const oa = (1 - a).toFixed(4);
      const ob = (1 - b).toFixed(4);
      if (oa !== wA) {
        ref.s1.style.strokeDashoffset = oa;
        wA = oa;
      }
      if (ob !== wB) {
        ref.s2.style.strokeDashoffset = ob;
        wB = ob;
      }
    }

    function step(dt, ms) {
      if (st.dead) return;
      const k = reduced ? 1 : 1 - Math.exp(-dt / 95);
      const tensTarget = Math.floor(st.target / 10);
      st.ones += (st.target - st.ones) * k;
      st.tens += (tensTarget - st.tens) * k;
      st.x += (st.xTarget - st.x) * k;
      if (Math.abs(st.target - st.ones) < .005) st.ones = st.target;
      if (Math.abs(tensTarget - st.tens) < .005) st.tens = tensTarget;
      if (Math.abs(st.xTarget - st.x) < .0005) st.x = st.xTarget;
      writeWheels();
      writeX();
      if (!reduced) drawDust(dt, ms);
    }

    function tick(ms) {
      if (st.dead) return;
      rafId = raf ? raf(tick) : 0;
      if (doc.hidden) {
        last = ms;
        return;
      }
      if (!last) last = ms - 33;
      const dt = ms - last;
      if (dt < 31) return;
      last = ms;
      step(Math.min(100, dt), ms);
    }

    function setProgress(raw) {
      if (st.dead || st.cut || st.finishing) return;
      let v = Number(raw);
      if (!isFinite(v)) return;
      if (v > 0 && v <= 1) v *= 100;
      v = clamp(v, 0, 100);
      st.value = v;
      if (v >= 100) {
        finish();
        return;
      }
      st.target = Math.min(99, Math.floor(v));
      st.xTarget = v / 100;
      count.setAttribute("aria-valuenow", String(st.target));
      if (reduced) step(0, nowMs());
    }

    function stall(on) {
      if (st.dead) return;
      const v = !!on;
      if (v === st.stall) return;
      st.stall = v;
      if (v) root.setAttribute("data-stall", "");
      else root.removeAttribute("data-stall");
      cap.textContent = v ? "signal held" : "signal 40hz";
      if (!st.finishing) setWord(v ? "holding" : "loading");
    }

    function flash() {
      if (st.dead || st.cut) return;
      flashEl.classList.remove("go");
      void flashEl.offsetWidth;
      flashEl.classList.add("go");
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => flashEl.classList.remove("go"), 320);
    }

    function finish() {
      if (st.dead || st.cut || st.finishing) return;
      st.finishing = true;
      st.target = 99;
      st.xTarget = 1;
      st.ones = 99;
      st.tens = 9;
      st.x = 1;
      writeWheels();
      writeX();
      st.stall = false;
      root.removeAttribute("data-stall");
      root.setAttribute("data-sealed", "");
      setWord("ready");
      cap.textContent = "signal open";
      count.setAttribute("aria-valuenow", "100");
      if (raf) cutRaf = raf(cut);
      else cutTimer = setTimeout(cut, 16);
    }

    function cut() {
      if (st.dead || st.cut) return;
      st.cut = true;
      st.finishing = true;
      cutRaf = 0;
      cutTimer = 0;
      if (rafId) {
        if (cancel) cancel(rafId);
        rafId = 0;
      }
      root.setAttribute("data-cut", "1");
      const detail = { progress: 100 };
      const Ctor = global.CustomEvent;
      if (Ctor) root.dispatchEvent(new Ctor("void:done", { bubbles: true, detail: detail }));
      if (typeof opts.onDone === "function") opts.onDone(detail);
    }

    function say(text) {
      if (st.dead || st.cut) return;
      const msg = text == null ? "" : String(text).slice(0, 240);
      clearTimeout(sayTimer);
      if (!msg) {
        line.classList.remove("on");
        count.classList.remove("off");
        typed.textContent = "";
        sr.textContent = "";
        return;
      }
      count.classList.add("off");
      line.classList.add("on");
      typed.textContent = "";
      sr.textContent = msg;
      if (reduced) {
        typed.textContent = msg;
        return;
      }
      let i = 1;
      const type = () => {
        if (st.dead) return;
        typed.textContent = msg.slice(0, i);
        if (i < msg.length) {
          i += 1;
          sayTimer = setTimeout(type, 16 + Math.random() * 24);
        }
      };
      sayTimer = setTimeout(type, 60);
    }

    function destroy() {
      if (st.dead) return;
      st.dead = true;
      if (rafId && cancel) cancel(rafId);
      rafId = 0;
      if (cutRaf && cancel) cancel(cutRaf);
      cutRaf = 0;
      clearTimeout(cutTimer);
      cutTimer = 0;
      clearTimeout(flashTimer);
      clearTimeout(sayTimer);
      if (ro) { ro.disconnect(); ro = null; }
      global.removeEventListener("resize", sizeCanvas);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (host.__voidStage === api) {
        try { delete host.__voidStage; } catch (e) { host.__voidStage = null; }
      }
    }

    const api = {
      root, setProgress, stall, flash, say, cut, destroy,
      version: VERSION,
      get value() { return st.value; },
      get done() { return st.cut; },
    };

    sizeCanvas();
    if (typeof global.ResizeObserver === "function") {
      ro = new global.ResizeObserver(sizeCanvas);
      ro.observe(root);
    }
    global.addEventListener("resize", sizeCanvas);

    if (reduced) {
      step(0, nowMs());
    } else if (raf) {
      rafId = raf(tick);
    }

    host.__voidStage = api;
    return api;
  }

  global.VoidStage = { mount, version: VERSION };
})(typeof window !== "undefined" ? window : globalThis);
