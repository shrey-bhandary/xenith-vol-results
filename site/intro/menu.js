/* Xenith intro, the two choices. window.IntroMenu.
   show(rustyLine, options, onPick) returns { hide, done }.
   - Rusty types at 26ms per char, small voice blips every third char
   - options are flat pixel rows, one lit at a time on hover or focus
   - proximity veil ramps over 300ms as the pointer nears a row
   - arrows, home, end, 1-4, enter, space and tab all work
   Options may be strings or { id, label }. Defaults to the intro pair. */
(() => {
  "use strict";

  const global = typeof window !== "undefined" ? window : globalThis;
  const CSS_ID = "intro-menu-css";
  const ROOT_ID = "xmenu-root";
  const LINE_ID = "xmenu-said";
  const CHAR_MS = 26;
  const BLIP_EVERY = 3;
  const NEAR_PX = 170;

  const DEFAULT_SAY = "oh. hello. can i help you with something?";
  const DEFAULT_OPTIONS = [
    { id: "result", label: "check my vols application result" },
    { id: "explore", label: "explore xenith" }
  ];

  const FACE_SVG =
    '<svg viewBox="0 0 22 24" shape-rendering="crispEdges" focusable="false" aria-hidden="true">' +
    '<g fill="#241d3a">' +
    '<rect x="4" y="6" width="14" height="12"/>' +
    '<rect x="2" y="9" width="2" height="5"/>' +
    '<rect x="18" y="9" width="2" height="5"/>' +
    '<rect x="7" y="19" width="8" height="3"/>' +
    '<rect x="6" y="22" width="10" height="2"/>' +
    "</g>" +
    '<rect x="5" y="7" width="12" height="10" fill="#e9e3d2"/>' +
    '<rect x="6" y="8" width="10" height="8" fill="#0b0818"/>' +
    '<g fill="#ffb15c" class="xmenu__eyes">' +
    '<rect x="8" y="10" width="2" height="2"/>' +
    '<rect x="12" y="10" width="2" height="2"/>' +
    "</g>" +
    '<rect x="10" y="14" width="2" height="1" fill="#ffb15c" opacity=".8"/>' +
    '<rect x="9" y="18" width="4" height="1" fill="#bdb6a4"/>' +
    '<rect x="8" y="20" width="6" height="1" fill="#0b0818"/>' +
    '<rect x="9" y="20" width="1" height="1" fill="#ffb15c"/>' +
    '<rect x="12" y="20" width="1" height="1" fill="#9ef0c0"/>' +
    '<rect x="10" y="2" width="2" height="4" fill="#bdb6a4"/>' +
    '<rect x="9" y="0" width="4" height="2" fill="#ffb15c"/>' +
    "</svg>";

  const CSS = `
.xmenu,.xmenu *{box-sizing:border-box}
.xmenu{
  --void:#05040c;--amber:#ffb15c;--cream:#ffe9b0;--violet:#7b5cff;--mint:#9ef0c0;
  position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;
  padding:clamp(16px,5vh,56px) clamp(14px,6vw,72px) clamp(28px,8vh,78px);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color:var(--cream);pointer-events:none;opacity:0;visibility:hidden;
  transition:opacity .5s ease,visibility .5s;
  -webkit-font-smoothing:antialiased;
}
.xmenu.is-open{opacity:1;visibility:visible}
.xmenu__inner{position:relative;width:min(560px,100%);pointer-events:none}
.xmenu.is-open .xmenu__inner{pointer-events:auto}

.xmenu__say{display:flex;align-items:flex-end;gap:clamp(10px,1.4vw,16px);margin-bottom:clamp(16px,3vh,28px)}
.xmenu__face{
  flex:0 0 auto;display:block;width:clamp(30px,4.4vw,46px);height:auto;
  image-rendering:pixelated;transform-origin:50% 100%;
  animation:xmenuHover 5.2s ease-in-out infinite;
  filter:drop-shadow(0 0 12px rgba(255,177,92,.14));
}
.xmenu__bubble{min-width:0;flex:1 1 auto;padding-left:clamp(9px,1.4vw,14px);border-left:1px solid rgba(255,177,92,.3)}
.xmenu__who{
  display:block;margin-bottom:9px;font-size:8px;line-height:1;
  letter-spacing:.34em;text-transform:uppercase;color:rgba(255,177,92,.6);
}
.xmenu__line{
  margin:0;min-height:4em;max-width:36ch;
  font-family:"Press Start 2P","PS2P",ui-monospace,monospace;
  font-size:clamp(9px,1.35vw,11px);line-height:1.95;letter-spacing:.01em;
  color:var(--cream);text-shadow:0 0 14px rgba(255,177,92,.13);
  white-space:pre-wrap;overflow-wrap:break-word;
}
.xmenu__caret{
  display:inline-block;width:.6em;height:.9em;margin-left:.22em;
  vertical-align:-.08em;background:var(--amber);opacity:0;
}
.xmenu.is-typing .xmenu__caret{opacity:1;animation:xmenuBlink 1s steps(1,end) infinite}

.xmenu__opts{
  display:flex;flex-direction:column;gap:8px;
  opacity:0;visibility:hidden;transform:translateY(8px);
  transition:opacity .4s ease,transform .4s ease,visibility .4s;
}
.xmenu.is-ready .xmenu__opts{opacity:1;visibility:visible;transform:none}

.xmenu__row{
  position:relative;display:grid;grid-template-columns:2.2em minmax(0,1fr) 8px;
  align-items:center;gap:clamp(8px,1.4vw,14px);width:100%;margin:0;
  padding:clamp(11px,1.7vh,15px) clamp(9px,1.5vw,14px);
  background:rgba(5,4,12,.34);border:1px solid rgba(255,233,176,.14);
  border-radius:0;appearance:none;-webkit-appearance:none;
  font-family:"Press Start 2P","PS2P",ui-monospace,monospace;
  font-size:clamp(8px,1.1vw,10px);line-height:1.9;letter-spacing:0;
  color:rgba(255,233,176,.64);text-align:left;cursor:pointer;
  overflow:hidden;-webkit-tap-highlight-color:transparent;
  transition:border-color .3s ease,color .3s ease,background-color .3s ease,opacity .3s ease;
}
.xmenu__row::before{
  content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
  background:
    linear-gradient(90deg,rgba(255,177,92,.18) 0%,rgba(255,177,92,.07) 46%,rgba(255,177,92,0) 82%),
    repeating-linear-gradient(0deg,rgba(255,233,176,.055) 0 1px,rgba(0,0,0,0) 1px 3px);
  opacity:var(--near,0);transition:opacity .3s ease;
}
.xmenu__row > *{position:relative;z-index:1}
.xmenu__row.is-lit{
  border-color:rgba(255,177,92,.78);color:var(--cream);
  background-color:rgba(255,177,92,.03);
}
.xmenu__row.is-lit::before{opacity:1}
.xmenu__row:focus{outline:none}
.xmenu__row:focus-visible{outline:2px solid var(--mint);outline-offset:3px}

.xmenu__idx{
  font-size:9px;line-height:1;letter-spacing:.14em;
  color:rgba(158,138,255,.82);transition:color .3s ease;
}
.xmenu__row.is-lit .xmenu__idx{color:#b9a6ff}
.xmenu__label{min-width:0;overflow-wrap:break-word}
.xmenu__mark{
  justify-self:end;width:7px;height:7px;
  border:1px solid rgba(255,177,92,.42);background:transparent;
  transition:background-color .3s ease,border-color .3s ease,box-shadow .3s ease;
}
.xmenu__row.is-lit .xmenu__mark{
  background:var(--amber);border-color:var(--amber);
  box-shadow:0 0 12px rgba(255,177,92,.6);
}

.xmenu__row.is-picked{
  border-color:var(--amber);color:var(--cream);
  background-color:rgba(255,177,92,.06);
}
.xmenu__row.is-picked::before{opacity:1}
.xmenu__row.is-gone{opacity:.16}
.xmenu__row.is-gone::before{opacity:0}

.sr-only{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}

@keyframes xmenuBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes xmenuHover{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes xmenuEyes{0%,93%,97%,100%{transform:scaleY(1)}94%,96%{transform:scaleY(.14)}}
.xmenu__eyes rect{transform-box:fill-box;transform-origin:center;animation:xmenuEyes 5.6s steps(1,end) infinite}

@media (max-width:520px){
  .xmenu__row{grid-template-columns:1.9em minmax(0,1fr) 7px;gap:8px}
  .xmenu__idx{font-size:8px}
  .xmenu__line{max-width:none}
}
@media (max-height:520px){
  .xmenu{padding-top:12px;padding-bottom:64px}
  .xmenu__say{margin-bottom:12px}
  .xmenu__face{width:28px}
  .xmenu__line{min-height:2em;line-height:1.8}
  .xmenu__row{padding-top:9px;padding-bottom:9px}
}
@media (prefers-reduced-motion:reduce){
  .xmenu,.xmenu *{animation:none!important;transition-duration:.01ms!important}
}
`;

  const api = {
    blips: true,
    charMs: CHAR_MS,
    show,
    hide,
    isOpen: () => !!ui
  };

  let ui = null;
  const audio = { ctx: null, armed: false };

  // ---------- helpers ----------
  function reducedMotion() {
    try {
      return global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function isField(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
  }

  function normalizeOptions(input) {
    const src = Array.isArray(input) && input.length ? input : DEFAULT_OPTIONS;
    const out = [];
    for (let i = 0; i < src.length && out.length < 4; i++) {
      const o = src[i];
      if (typeof o === "string") out.push({ id: "opt" + (out.length + 1), label: o });
      else if (o && o.label) out.push({ id: o.id || "opt" + (out.length + 1), label: String(o.label) });
    }
    return out.length ? out : DEFAULT_OPTIONS.slice();
  }

  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement("style");
    style.id = CSS_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  // ---------- audio, off until a real gesture unlocks it ----------
  function makeCtx() {
    if (audio.ctx) {
      if (audio.ctx.state === "suspended") {
        try { audio.ctx.resume(); } catch (e) {}
      }
      return;
    }
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    try { audio.ctx = new AC(); } catch (e) { audio.ctx = null; return; }
    if (audio.ctx.state === "suspended") {
      try { audio.ctx.resume(); } catch (e) {}
    }
  }

  function armAudio() {
    if (audio.armed) return;
    audio.armed = true;
    const wake = () => makeCtx();
    document.addEventListener("pointerdown", wake, { once: true, capture: true });
    document.addEventListener("keydown", wake, { once: true, capture: true });
  }

  function blip(index, total) {
    if (!api.blips || !audio.ctx || audio.ctx.state !== "running") return;
    const ch = ui && ui.say.charAt(index);
    if (!ch || ch === " " || ch === "\n") return;
    try {
      const t = audio.ctx.currentTime;
      const progress = total > 1 ? index / total : 0;
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(300 + progress * 190, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.028, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain);
      gain.connect(audio.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // ---------- show ----------
  function show(rustyLine, options, onPick) {
    if (typeof options === "function" && onPick === undefined) {
      onPick = options;
      options = null;
    }
    hide();
    injectCSS();

    const old = document.getElementById(ROOT_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);

    const choices = normalizeOptions(options);
    const say = typeof rustyLine === "string" ? rustyLine : DEFAULT_SAY;
    armAudio();
    makeCtx();

    const root = make("div", "xmenu");
    root.id = ROOT_ID;
    root.setAttribute("aria-hidden", "true");

    const inner = make("div", "xmenu__inner");
    const sayWrap = make("div", "xmenu__say");

    const face = make("span", "xmenu__face");
    face.setAttribute("aria-hidden", "true");
    face.innerHTML = FACE_SVG;

    const bubble = make("div", "xmenu__bubble");
    const who = make("span", "xmenu__who", "rusty");
    const line = make("p", "xmenu__line");
    const typed = make("span", "xmenu__typed");
    typed.setAttribute("aria-hidden", "true");
    const caret = make("span", "xmenu__caret");
    caret.setAttribute("aria-hidden", "true");
    line.appendChild(typed);
    line.appendChild(caret);

    const full = make("p", "xmenu__full sr-only", say);
    full.id = LINE_ID;

    const opts = make("div", "xmenu__opts");
    opts.setAttribute("role", "group");
    opts.setAttribute("aria-label", "choose a path");
    opts.setAttribute("aria-describedby", LINE_ID);
    opts.inert = true;

    const rows = [];
    choices.forEach((choice, i) => {
      const row = make("button", "xmenu__row");
      row.type = "button";
      row.setAttribute("data-index", String(i));
      const idx = make("span", "xmenu__idx", String(i + 1).padStart(2, "0"));
      idx.setAttribute("aria-hidden", "true");
      const label = make("span", "xmenu__label", choice.label);
      const mark = make("span", "xmenu__mark");
      mark.setAttribute("aria-hidden", "true");
      row.appendChild(idx);
      row.appendChild(label);
      row.appendChild(mark);
      opts.appendChild(row);
      rows.push(row);
    });

    bubble.appendChild(who);
    bubble.appendChild(line);
    bubble.appendChild(full);
    sayWrap.appendChild(face);
    sayWrap.appendChild(bubble);
    inner.appendChild(sayWrap);
    inner.appendChild(opts);
    root.appendChild(inner);

    const u = {
      root,
      inner,
      opts,
      rows,
      choices,
      say,
      onPick,
      typed,
      full,
      timer: 0,
      i: 0,
      typing: false,
      locked: false,
      lit: -1,
      skipKey: null,
      resolve: null,
      reduce: reducedMotion()
    };

    ui = u;

    let resolveDone = null;
    const done = new Promise((resolve) => { resolveDone = resolve; });
    u.resolve = resolveDone;

    rows.forEach((row, i) => {
      row.addEventListener("pointerenter", () => setLit(u, i));
      row.addEventListener("click", () => pick(u, i));
    });

    opts.addEventListener("pointermove", (e) => onMove(u, e));
    opts.addEventListener("pointerleave", () => {
      if (ui !== u) return;
      u.rows.forEach((row) => row.style.setProperty("--near", "0"));
      let focused = -1;
      try { focused = u.rows.indexOf(document.activeElement); } catch (e) {}
      setLit(u, focused);
    });
    opts.addEventListener("focusin", (e) => {
      if (ui !== u) return;
      const i = u.rows.indexOf(e.target);
      if (i >= 0) setLit(u, i);
    });
    opts.addEventListener("focusout", (e) => {
      if (ui !== u) return;
      if (!e.relatedTarget || !u.opts.contains(e.relatedTarget)) setLit(u, -1);
    });
    opts.addEventListener("keydown", (e) => onKeyDown(u, e));

    root.addEventListener("pointerdown", () => {
      makeCtx();
      if (ui === u && u.typing) skipTyping(u);
    });

    document.body.appendChild(root);

    setTimeout(() => {
      if (ui !== u) return;
      u.root.classList.add("is-open");
      u.root.setAttribute("aria-hidden", "false");
      typeLine(u);
    }, 24);

    return {
      hide: () => { if (ui === u) dismiss(); },
      done
    };
  }

  // ---------- typing ----------
  function typeLine(u) {
    u.typed.textContent = "";
    u.full.textContent = u.say;
    u.i = 0;
    u.typing = true;
    u.root.classList.add("is-typing");

    if (u.reduce || !u.say.length) {
      u.typed.textContent = u.say;
      finishTyping(u);
      return;
    }

    u.skipKey = (e) => {
      if (e.key === "Tab" || e.metaKey || e.ctrlKey || e.altKey) return;
      skipTyping(u);
    };
    document.addEventListener("keydown", u.skipKey, true);

    const step = () => {
      if (ui !== u) return;
      u.i += 1;
      u.typed.textContent = u.say.slice(0, u.i);
      if (u.i % BLIP_EVERY === 0) blip(u.i - 1, u.say.length);
      if (u.i >= u.say.length) {
        finishTyping(u);
        return;
      }
      u.timer = setTimeout(step, Math.max(0, api.charMs));
    };
    u.timer = setTimeout(step, Math.max(0, api.charMs));
  }

  function skipTyping(u) {
    if (ui !== u || !u.typing) return;
    u.i = u.say.length;
    u.typed.textContent = u.say;
    finishTyping(u);
  }

  function finishTyping(u) {
    if (ui !== u || !u.typing) return;
    u.typing = false;
    clearTimeout(u.timer);
    u.timer = 0;
    if (u.i < u.say.length) u.typed.textContent = u.say;
    u.root.classList.remove("is-typing");
    u.root.classList.add("is-ready");
    u.opts.inert = false;
    if (u.skipKey) {
      document.removeEventListener("keydown", u.skipKey, true);
      u.skipKey = null;
    }
    if (u.locked || !u.rows.length) return;
    if (!isField(document.activeElement)) {
      try { u.rows[0].focus({ preventScroll: true }); } catch (e) { u.rows[0].focus(); }
    }
  }

  // ---------- light and proximity ----------
  function setLit(u, i) {
    if (ui !== u || u.locked) return;
    if (u.lit === i) return;
    u.lit = i;
    u.rows.forEach((row, j) => {
      row.classList.toggle("is-lit", j === i);
    });
  }

  function onMove(u, e) {
    if (ui !== u || u.locked) return;
    const x = e.clientX || 0;
    const y = e.clientY || 0;
    let best = -1;
    let bestD = Infinity;
    u.rows.forEach((row, i) => {
      const r = row.getBoundingClientRect();
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    u.rows.forEach((row, i) => {
      const near = i === best ? Math.max(0, 1 - bestD / NEAR_PX) : 0;
      row.style.setProperty("--near", near.toFixed(3));
    });
  }

  // ---------- keys ----------
  function onKeyDown(u, e) {
    if (ui !== u || u.locked) return;
    const key = e.key;
    if (key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End") {
      e.preventDefault();
      const n = u.rows.length;
      const current = u.rows.indexOf(document.activeElement);
      let next;
      if (key === "Home") next = 0;
      else if (key === "End") next = n - 1;
      else if (key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % n;
      else next = current < 0 ? n - 1 : (current - 1 + n) % n;
      const row = u.rows[next];
      if (!row) return;
      try { row.focus({ preventScroll: true }); } catch (err) { row.focus(); }
      setLit(u, next);
      return;
    }
    if (/^[1-9]$/.test(key)) {
      const i = Number(key) - 1;
      if (u.rows[i]) {
        e.preventDefault();
        pick(u, i);
      }
    }
  }

  // ---------- pick and dismiss ----------
  function pick(u, i) {
    if (ui !== u || u.locked) return;
    const row = u.rows[i];
    const choice = u.choices[i];
    if (!row || !choice) return;

    u.locked = true;
    u.typing = false;
    clearTimeout(u.timer);
    u.timer = 0;
    if (u.skipKey) {
      document.removeEventListener("keydown", u.skipKey, true);
      u.skipKey = null;
    }
    if (u.i < u.say.length) u.typed.textContent = u.say;
    u.opts.inert = true;
    u.root.classList.remove("is-typing");
    u.root.classList.add("is-picked");

    u.rows.forEach((r, j) => {
      r.classList.remove("is-lit");
      r.classList.add(j === i ? "is-picked" : "is-gone");
    });

    const resolve = u.resolve;
    u.resolve = null;
    if (resolve) resolve({ index: i, id: choice.id, label: choice.label });

    setTimeout(() => { if (ui === u) dismiss(); }, 460);

    if (typeof u.onPick === "function") {
      try {
        u.onPick(i, choice);
      } catch (err) {
        if (global.console) global.console.error(err);
      }
    }
  }

  function dismiss() {
    const u = ui;
    if (!u) return;
    ui = null;
    clearTimeout(u.timer);
    u.timer = 0;
    if (u.skipKey) {
      document.removeEventListener("keydown", u.skipKey, true);
      u.skipKey = null;
    }
    if (u.resolve) {
      u.resolve(null);
      u.resolve = null;
    }
    u.opts.inert = true;
    u.root.setAttribute("aria-hidden", "true");
    u.root.classList.remove("is-open", "is-ready", "is-typing");
    if (u.root.parentNode) u.root.parentNode.removeChild(u.root);
  }

  function hide() {
    dismiss();
  }

  global.IntroMenu = api;
})();
