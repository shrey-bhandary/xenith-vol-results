/* buttons.js, the two rows as a field.
   window.IntroChoices.mount(el, options, onPick) -> instance

   options
     items        [{ id, label, sub, disabled }] or ["label", ...]
     label        group name for screen readers
     describedby  id of the line that is speaking, wired to aria-describedby
     armed        false mounts as disabled dots until arm() (default true)
     cue          fn(name) owns the sound, replaces the built-in voices
     onCue        fn(name) observer, always fires (the demo ledger)
     onLean       fn(dir, near) dir -1 row 01, +1 row 02, 0 away
     onField      fn({ x, y, lit, near }) once per sampled pointer frame
     onPick       fn(index, item, instance), alternative to the argument
     onDone       fn(result) after the rows fold
     focusAfter   selector or element to receive focus after the fold
     muted        true silences the built-in voices
     id           id for the root element

   instance
     arm(silent), disarm(), pick(i), nudge(i), reset(), focus(i), destroy()
     unlock(), cue(name), muted, rows, root, opts, items, index

   cues: near hover key press select deny arm

   One rAF, one pointer listener, one measure. The pull is 0 while the
   pointer is inside a row: a target that runs from the click is a bug. */
(() => {
  "use strict";

  const global = typeof window !== "undefined" ? window : globalThis;
  const doc = global.document;
  if (!doc) return;

  const VERSION = "1.0";
  const SELF = doc.currentScript;
  const CUES = ["near", "hover", "key", "press", "select", "deny", "arm"];
  const NEAR = 170;
  const LIMIT = { hover: 45, near: 400, deny: 300 };
  const mkMQ = (q) => {
    try { return global.matchMedia ? global.matchMedia(q) : null; } catch (e) { return null; }
  };
  const reduceMQ = mkMQ("(prefers-reduced-motion: reduce)");
  const fineMQ = mkMQ("(pointer: fine)");
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => (global.performance && global.performance.now ? global.performance.now() : Date.now());

  // ---------- one master, five voices, all synthesized ----------
  const audio = { ctx: null, master: null, dead: false };
  let unlocked = false;

  function unlockAudio() {
    unlocked = true;
    return ac();
  }

  function ac() {
    if (audio.dead) return null;
    if (!audio.ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) { audio.dead = true; return null; }
      try {
        audio.ctx = new AC();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.24;
        audio.master.connect(audio.ctx.destination);
      } catch (e) { audio.dead = true; return null; }
    }
    if (audio.ctx.state === "suspended") {
      try {
        const p = audio.ctx.resume();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {}
    }
    return audio.ctx;
  }

  function tone(type, f, dur, gain, to) {
    const c = ac();
    if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(audio.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  function voice(name) {
    if (name === "near") tone("square", 1600, 0.006, 0.006);
    else if (name === "hover") tone("square", 1200 + Math.random() * 60, 0.008, 0.014);
    else if (name === "key") tone("triangle", 900, 0.007, 0.011);
    else if (name === "press") tone("square", 300, 0.014, 0.016, 180);
    else if (name === "select") {
      tone("square", 240, 0.03, 0.02, 120);
      tone("sine", 110, 0.12, 0.05, 60);
    } else if (name === "deny") tone("square", 400, 0.012, 0.009);
    else if (name === "arm") {
      tone("square", 1600, 0.008, 0.014);
      global.setTimeout(() => tone("square", 1200, 0.008, 0.014), 90);
    }
  }

  function fire(inst, name) {
    if (inst.destroyed) return;
    if (typeof inst.cfg.onCue === "function") {
      try { inst.cfg.onCue(name); } catch (e) {}
    }
    if (inst.muted) return;
    if (typeof inst.cfg.cue === "function") {
      try { inst.cfg.cue(name); } catch (e) {}
      return;
    }
    if (!unlocked) return;
    const lim = LIMIT[name];
    if (lim) {
      const t = now();
      if (t - (inst.lastCue[name] || 0) < lim) return;
      inst.lastCue[name] = t;
    }
    voice(name);
  }

  // ---------- mount ----------
  function ensureCSS() {
    const links = doc.querySelectorAll ? doc.querySelectorAll('link[rel="stylesheet"]') : [];
    for (let i = 0; i < links.length; i++) {
      if (/buttons\.css(\?|#|$)/.test(links[i].href || "")) return;
    }
    let href = "buttons.css";
    try { if (SELF && SELF.src) href = new URL("buttons.css", SELF.src).href; } catch (e) {}
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-xchoice", "1");
    (doc.head || doc.documentElement).appendChild(link);
  }

  function normalizeOptions(input) {
    const src = Array.isArray(input) ? input : [];
    const out = [];
    for (let i = 0; i < src.length && out.length < 9; i++) {
      const o = src[i];
      if (typeof o === "string" && o) {
        out.push({ id: "opt" + (out.length + 1), label: o, sub: "", disabled: false });
      } else if (o && o.label) {
        out.push({
          id: o.id || "opt" + (out.length + 1),
          label: String(o.label),
          sub: o.sub ? String(o.sub) : "",
          disabled: o.disabled === true
        });
      }
    }
    return out;
  }

  function make(tag, cls) {
    const el = doc.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  function mount(el, options, onPick) {
    const host = typeof el === "string" ? doc.querySelector(el) : el;
    if (!host || !host.appendChild) return null;
    ensureCSS();

    let cfg = {};
    let raw = options;
    if (typeof options === "function") { onPick = options; raw = null; }
    if (Array.isArray(raw)) cfg = {};
    else if (raw && typeof raw === "object") { cfg = raw; raw = cfg.items || cfg.choices || []; }
    else raw = [];

    const items = normalizeOptions(raw);
    if (!items.length) return null;
    if (typeof onPick !== "function") onPick = typeof cfg.onPick === "function" ? cfg.onPick : null;

    const root = make("div", "xchoice");
    if (cfg.id) root.id = cfg.id;

    const opts = make("div", "xchoice__opts");
    opts.setAttribute("role", "group");
    opts.setAttribute("aria-label", cfg.label || "choose a path");
    if (cfg.describedby) opts.setAttribute("aria-describedby", String(cfg.describedby));

    const rows = [];
    items.forEach((item, i) => {
      const row = make("button", "xchoice__row");
      row.type = "button";
      row.setAttribute("data-index", String(i));
      row.style.setProperty("--i", String(i));
      if (item.id) row.setAttribute("data-id", item.id);
      if (item.sub) row.setAttribute("aria-label", item.label + ". " + item.sub);

      const br = make("span", "xchoice__br");
      br.setAttribute("aria-hidden", "true");

      const idx = make("span", "xchoice__idx");
      idx.setAttribute("aria-hidden", "true");
      idx.textContent = pad(i + 1);

      const label = make("span", "xchoice__label");
      label.textContent = item.label;

      const mark = make("span", "xchoice__mark");
      mark.setAttribute("aria-hidden", "true");

      if (item.sub) {
        const sub = make("span", "xchoice__sub");
        sub.setAttribute("aria-hidden", "true");
        sub.textContent = item.sub;
        label.appendChild(sub);
      }

      row.appendChild(br);
      row.appendChild(idx);
      row.appendChild(label);
      row.appendChild(mark);
      opts.appendChild(row);
      rows.push(row);
    });

    root.appendChild(opts);
    host.appendChild(root);

    const armed = cfg.armed !== false;

    const inst = {
      version: VERSION,
      host,
      root,
      opts,
      rows,
      items,
      cfg,
      index: -1,
      result: null,
      muted: cfg.muted === true,
      armed,
      locked: false,
      destroyed: false,
      lit: -1,
      focusIdx: -1,
      lean: 0,
      rects: null,
      near: rows.map(() => 0),
      nearDur: rows.map(() => ".3s"),
      field: { x: 0, y: 0, on: false },
      raf: 0,
      lastCue: {},
      timers: [],
      reduce: !!(reduceMQ && reduceMQ.matches),
      fine: !!(fineMQ && fineMQ.matches),
      pointerDown: false,
      downX: 0,
      downY: 0,
      touchNear: -1,
      lastDownTouch: false,
      focusTarget: null,
      cancelled: false
    };

    // ---------- field ----------
    function measure() {
      if (inst.destroyed || !rows.length) return;
      opts.style.setProperty("--gx", "0px");
      opts.style.setProperty("--gy", "0px");
      rows.forEach((row) => {
        row.style.setProperty("--mx", "0px");
        row.style.setProperty("--my", "0px");
      });
      root.classList.add("is-measuring");
      try {
        inst.rects = rows.map((row) => {
          const b = row.getBoundingClientRect();
          return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height };
        });
      } finally {
        root.classList.remove("is-measuring");
      }
      if (inst.field.on) schedule();
    }

    function applyNear(i, value) {
      const row = rows[i];
      if (!row) return;
      value = clamp(value, 0, 1);
      const prev = inst.near[i];
      if (Math.abs(value - prev) < 0.002) return;
      inst.near[i] = value;
      row.style.setProperty("--near", value.toFixed(3));
      const dur = inst.reduce ? "0s" : value > prev ? ".3s" : ".22s";
      if (inst.nearDur[i] !== dur) {
        inst.nearDur[i] = dur;
        row.style.setProperty("--veil-dur", dur);
      }
      if (prev < 0.45 && value >= 0.45) fire(inst, "near");
    }

    function forceNear(i, value) {
      const row = rows[i];
      if (!row) return;
      inst.near[i] = value;
      inst.nearDur[i] = "0s";
      row.style.setProperty("--near", value.toFixed(3));
      row.style.setProperty("--veil-dur", "0s");
    }

    function setLit(i, source) {
      if (inst.lit === i) return;
      inst.lit = i;
      rows.forEach((row, j) => row.classList.toggle("is-lit", j === i));
      if (i >= 0 && source) fire(inst, source === "key" ? "key" : "hover");
    }

    function setLean(dir) {
      if (inst.lean === dir) return;
      inst.lean = dir;
      if (typeof cfg.onLean !== "function") return;
      const i = dir < 0 ? 0 : dir > 0 ? 1 : -1;
      try { cfg.onLean(dir, i >= 0 ? inst.near[i] : 0); } catch (e) {}
    }

    function drift(x, y) {
      if (!inst.fine || inst.reduce) {
        opts.style.setProperty("--gx", "0px");
        opts.style.setProperty("--gy", "0px");
        return;
      }
      const w = global.innerWidth || 1;
      const h = global.innerHeight || 1;
      opts.style.setProperty("--gx", clamp((x / w - 0.5) * -4, -2, 2).toFixed(2) + "px");
      opts.style.setProperty("--gy", clamp((y / h - 0.5) * -3, -1.5, 1.5).toFixed(2) + "px");
    }

    function clearField() {
      inst.field.on = false;
      if (inst.raf) { global.cancelAnimationFrame(inst.raf); inst.raf = 0; }
      rows.forEach((row, j) => {
        row.style.setProperty("--mx", "0px");
        row.style.setProperty("--my", "0px");
        applyNear(j, 0);
      });
      opts.style.setProperty("--gx", "0px");
      opts.style.setProperty("--gy", "0px");
      setLean(0);
      if (inst.focusIdx >= 0 && !inst.locked) {
        applyNear(inst.focusIdx, 1);
        setLit(inst.focusIdx, null);
      } else {
        setLit(-1, null);
      }
    }

    function sample() {
      inst.raf = 0;
      if (inst.destroyed || inst.locked || !inst.armed || !inst.field.on || !inst.rects) return;
      const x = inst.field.x;
      const y = inst.field.y;
      drift(x, y);

      let best = -1;
      let bestD = Infinity;
      let bestDY = Infinity;
      inst.rects.forEach((b, i) => {
        if (b.w <= 0 && b.h <= 0) return;
        const dx = x < b.l ? b.l - x : x > b.r ? x - b.r : 0;
        const dy = y < b.t ? b.t - y : y > b.b ? y - b.b : 0;
        const d = Math.sqrt(dx * dx + dy * dy);
        const dyMid = Math.abs((b.t + b.b) / 2 - y);
        if (d < bestD - 0.5 || (Math.abs(d - bestD) <= 0.5 && dyMid < bestDY)) {
          best = i;
          bestD = d;
          bestDY = dyMid;
        }
      });

      const nearBest = best >= 0 ? Math.pow(clamp(1 - bestD / NEAR, 0, 1), 1.15) : 0;
      const pullMax = (global.innerWidth || 0) > 1023 ? 3 : (global.innerWidth || 0) > 760 ? 2 : 0;
      let lit = -1;

      rows.forEach((row, i) => {
        const off = row.getAttribute("aria-disabled") === "true";
        const mine = i === best && !off;
        const near = mine ? nearBest : 0;
        applyNear(i, near);

        let mx = 0;
        let my = 0;
        if (mine) {
          const b = inst.rects[i];
          const inside = x >= b.l && x <= b.r && y >= b.t && y <= b.b;
          if (inside) lit = i;
          else if (near > 0 && inst.fine && !inst.reduce && pullMax > 0) {
            const p = pullMax * Math.pow(clamp(1 - bestD / NEAR, 0, 1), 2.2);
            const cx = (b.l + b.r) / 2;
            const cy = (b.t + b.b) / 2;
            const len = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) || 1;
            mx = ((x - cx) / len) * p;
            my = ((y - cy) / len) * p * 0.55;
          }
        }
        row.style.setProperty("--mx", mx.toFixed(2) + "px");
        row.style.setProperty("--my", my.toFixed(2) + "px");
      });

      setLit(lit >= 0 ? lit : inst.focusIdx, lit >= 0 ? "pointer" : null);
      setLean(best >= 0 && nearBest > 0.35 ? (best === 0 ? -1 : best === 1 ? 1 : 0) : 0);

      if (typeof cfg.onField === "function") {
        try { cfg.onField({ x, y, lit, near: nearBest, index: best }); } catch (e) {}
      }
    }

    function schedule() {
      if (!inst.raf) inst.raf = global.requestAnimationFrame(sample);
    }

    // ---------- pointer ----------
    function onPointerMove(e) {
      if (inst.destroyed || inst.locked) return;
      if (inst.touchNear >= 0 && e.pointerType === "touch") {
        const dx = e.clientX - inst.downX;
        const dy = e.clientY - inst.downY;
        if (Math.sqrt(dx * dx + dy * dy) > 12) {
          inst.cancelled = true;
          inst.touchNear = -1;
          rows.forEach((row, j) => {
            row.classList.remove("is-press");
            forceNear(j, 0);
          });
          setLit(-1, null);
        }
        return;
      }
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (!inst.armed) return;
      inst.field.x = e.clientX;
      inst.field.y = e.clientY;
      inst.field.on = true;
      if (!inst.rects || !inst.rects.length || (inst.rects[0] && inst.rects[0].w === 0)) measure();
      schedule();
    }

    function onPointerUp() {
      global.setTimeout(() => { inst.pointerDown = false; }, 0);
      rows.forEach((row) => row.classList.remove("is-press"));
      if (inst.touchNear >= 0 && !inst.locked) {
        inst.touchNear = -1;
        rows.forEach((row, j) => forceNear(j, 0));
        setLit(-1, null);
      }
      inst.touchNear = -1;
    }

    function onLeaveWindow(e) {
      if (e.relatedTarget) return;
      clearField();
    }

    // ---------- press and pick ----------
    function press(i, on) {
      const row = rows[i];
      if (!row) return;
      row.classList.toggle("is-press", !!on);
    }

    function down(e, i) {
      if (inst.destroyed || inst.locked || !inst.armed) return;
      const row = rows[i];
      if (!row) return;
      inst.pointerDown = true;
      inst.downX = e.clientX || 0;
      inst.downY = e.clientY || 0;
      inst.cancelled = false;
      inst.lastDownTouch = e.pointerType === "touch" || !inst.fine;
      if (row.getAttribute("aria-disabled") === "true") {
        fire(inst, "deny");
        inst.pointerDown = false;
        return;
      }
      press(i, true);
      fire(inst, "press");
      if (e.pointerType === "touch" || !inst.fine) {
        inst.touchNear = i;
        rows.forEach((r, j) => forceNear(j, j === i ? 1 : 0));
        setLit(i, null);
      }
    }

    function click(e, i) {
      if (inst.cancelled) { inst.cancelled = false; return; }
      pick(i);
    }

    function releaseFocus() {
      const f = cfg.focusAfter;
      if (!f) return null;
      if (typeof f === "string") { try { return doc.querySelector(f); } catch (e) { return null; } }
      return f && typeof f.focus === "function" ? f : null;
    }

    function pick(i) {
      if (inst.destroyed || inst.locked || !inst.armed) return;
      const row = rows[i];
      const item = items[i];
      if (!row || !item) return;
      if (row.getAttribute("aria-disabled") === "true") { fire(inst, "deny"); return; }

      inst.locked = true;
      inst.index = i;
      inst.result = { index: i, id: item.id, label: item.label, item };
      fire(inst, "select");
      press(i, true);
      inst.timers.push(global.setTimeout(() => { if (!inst.destroyed) press(i, false); }, 90));
      row.setAttribute("aria-current", "true");

      rows.forEach((r, j) => {
        r.classList.remove("is-lit");
        r.classList.toggle("is-picked", j === i);
        r.classList.toggle("is-gone", j !== i);
        r.setAttribute("aria-disabled", String(j !== i));
      });
      rows.forEach((r, j) => forceNear(j, j === i ? 1 : 0));
      setLean(0);

      if (typeof onPick === "function") {
        try { onPick(i, item, inst); } catch (err) { if (global.console) global.console.error(err); }
      }
      if (inst.destroyed) return;
      if (typeof global.CustomEvent === "function") {
        try {
          root.dispatchEvent(new global.CustomEvent("xchoice:pick", { bubbles: true, detail: inst.result }));
        } catch (e) {}
      }

      if (inst.lastDownTouch && global.navigator && typeof global.navigator.vibrate === "function") {
        try { global.navigator.vibrate(8); } catch (e) {}
      }

      inst.timers.push(global.setTimeout(() => {
        if (inst.destroyed) return;
        root.classList.add("is-out");
        inst.focusTarget = releaseFocus();
        if (inst.focusTarget) {
          try { inst.focusTarget.focus({ preventScroll: true }); } catch (e) { try { inst.focusTarget.focus(); } catch (e2) {} }
        }
      }, 460));

      inst.timers.push(global.setTimeout(() => {
        if (inst.destroyed) return;
        if (inst.focusTarget) {
          opts.inert = true;
          opts.setAttribute("inert", "");
          root.setAttribute("aria-hidden", "true");
          root.classList.add("is-done");
        }
        if (typeof cfg.onDone === "function") {
          try { cfg.onDone(inst.result); } catch (e) {}
        }
      }, 760));
    }

    function nudge(i) {
      if (inst.destroyed || inst.locked || !inst.armed) return;
      const row = rows[typeof i === "number" ? i : 0];
      if (!row) return;
      row.classList.remove("is-nudge");
      void row.offsetWidth;
      row.classList.add("is-nudge");
      fire(inst, "near");
      inst.timers.push(global.setTimeout(() => {
        if (!inst.destroyed) row.classList.remove("is-nudge");
      }, 1250));
    }

    // ---------- keyboard ----------
    function indexOf(target) {
      for (let i = 0; i < rows.length; i++) if (rows[i] === target) return i;
      return -1;
    }

    function focusRow(i) {
      if (!inst.armed) return;
      const row = rows[i];
      if (!row) return;
      try { row.focus({ preventScroll: true }); } catch (e) { try { row.focus(); } catch (e2) {} }
    }

    function onKey(e) {
      if (inst.destroyed || inst.locked || !inst.armed) return;
      const key = e.key;
      const from = indexOf(e.target);
      inst.lastDownTouch = false;

      if (key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End") {
        e.preventDefault();
        const n = rows.length;
        let next;
        if (key === "Home") next = 0;
        else if (key === "End") next = n - 1;
        else if (key === "ArrowDown") next = from < 0 ? 0 : (from + 1) % n;
        else next = from < 0 ? n - 1 : (from - 1 + n) % n;
        rows.forEach((row) => {
          row.style.setProperty("--mx", "0px");
          row.style.setProperty("--my", "0px");
        });
        opts.style.setProperty("--gx", "0px");
        opts.style.setProperty("--gy", "0px");
        inst.field.on = false;
        focusRow(next);
        return;
      }

      if (/^[1-9]$/.test(key)) {
        const i = Number(key) - 1;
        if (rows[i]) { e.preventDefault(); pick(i); }
        return;
      }

      if (key === "Enter" || key === " " || key === "Spacebar") {
        if (from < 0) return;
        if (rows[from].getAttribute("aria-disabled") === "true") return;
        press(from, true);
        fire(inst, "press");
        global.setTimeout(() => { if (!inst.destroyed) press(from, false); }, 120);
      }
    }

    function onFocusIn(e) {
      if (inst.destroyed || inst.locked) return;
      const i = indexOf(e.target);
      if (i < 0) return;
      if (rows[i].getAttribute("aria-disabled") === "true") {
        inst.focusIdx = -1;
        return;
      }
      inst.focusIdx = i;
      if (!inst.field.on) {
        rows.forEach((row, j) => forceNear(j, j === i ? 1 : 0));
      }
      setLit(i, inst.pointerDown ? null : "key");
    }

    function onFocusOut(e) {
      if (inst.destroyed) return;
      if (e.relatedTarget && opts.contains(e.relatedTarget)) return;
      inst.focusIdx = -1;
      if (!inst.field.on) {
        rows.forEach((row, j) => applyNear(j, 0));
        setLit(-1, null);
      } else {
        schedule();
      }
    }

    // ---------- arm, reset, destroy ----------
    function setArmed(on, silent) {
      if (inst.destroyed) return inst;
      on = !!on;
      inst.armed = on;
      rows.forEach((row, j) => {
        row.setAttribute("aria-disabled", String(!on || items[j].disabled));
      });
      if (on) {
        opts.removeAttribute("inert");
        opts.inert = false;
        measure();
        if (!silent) fire(inst, "arm");
      } else {
        clearField();
        opts.setAttribute("inert", "");
        opts.inert = true;
      }
      return inst;
    }

    function arm(silent) {
      if (inst.armed) return inst;
      return setArmed(true, silent === true);
    }

    function disarm() {
      if (!inst.armed) return inst;
      return setArmed(false, true);
    }

    function reset() {
      if (inst.destroyed) return inst;
      inst.timers.forEach((t) => global.clearTimeout(t));
      inst.timers = [];
      inst.locked = false;
      inst.index = -1;
      inst.result = null;
      inst.lit = -1;
      inst.focusIdx = -1;
      inst.lean = 0;
      inst.field.on = false;
      inst.touchNear = -1;
      inst.cancelled = false;
      inst.pointerDown = false;
      inst.lastDownTouch = false;
      inst.focusTarget = null;
      inst.lastCue = {};
      root.classList.remove("is-out", "is-done", "is-in");
      root.removeAttribute("aria-hidden");
      rows.forEach((row, j) => {
        row.classList.remove("is-picked", "is-gone", "is-lit", "is-press", "is-nudge");
        row.removeAttribute("aria-current");
        row.style.setProperty("--mx", "0px");
        row.style.setProperty("--my", "0px");
        row.style.setProperty("--near", "0");
        row.style.setProperty("--veil-dur", ".3s");
      });
      inst.near = rows.map(() => 0);
      inst.nearDur = rows.map(() => ".3s");
      opts.style.setProperty("--gx", "0px");
      opts.style.setProperty("--gy", "0px");
      setArmed(inst.armed, true);
      measure();
      global.requestAnimationFrame(() => {
        if (!inst.destroyed) root.classList.add("is-in");
      });
      return inst;
    }

    function onOptsSettle(e) {
      if (e.target === opts) measure();
    }

    function destroy() {
      if (inst.destroyed) return;
      inst.destroyed = true;
      if (inst.raf) global.cancelAnimationFrame(inst.raf);
      inst.raf = 0;
      inst.timers.forEach((t) => global.clearTimeout(t));
      inst.timers = [];
      global.removeEventListener("pointermove", onPointerMove);
      global.removeEventListener("pointerup", onPointerUp);
      global.removeEventListener("pointercancel", onPointerUp);
      global.removeEventListener("resize", measure);
      global.removeEventListener("blur", clearField);
      doc.removeEventListener("pointerout", onLeaveWindow);
      opts.removeEventListener("transitionend", onOptsSettle);
      if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
      unbindMQ(reduceMQ, onMQ);
      unbindMQ(fineMQ, onMQ);
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    function onMQ() {
      inst.reduce = !!(reduceMQ && reduceMQ.matches);
      inst.fine = !!(fineMQ && fineMQ.matches);
      if (inst.reduce) {
        opts.style.setProperty("--gx", "0px");
        opts.style.setProperty("--gy", "0px");
        rows.forEach((row) => {
          row.style.setProperty("--mx", "0px");
          row.style.setProperty("--my", "0px");
        });
      }
    }

    // ---------- wire ----------
    rows.forEach((row, i) => {
      row.addEventListener("pointerdown", (e) => down(e, i));
      row.addEventListener("click", (e) => click(e, i));
    });
    opts.addEventListener("keydown", onKey);
    opts.addEventListener("focusin", onFocusIn);
    opts.addEventListener("focusout", onFocusOut);
    opts.addEventListener("transitionend", onOptsSettle);

    global.addEventListener("pointermove", onPointerMove, { passive: true });
    global.addEventListener("pointerup", onPointerUp, { passive: true });
    global.addEventListener("pointercancel", onPointerUp, { passive: true });
    global.addEventListener("resize", measure, { passive: true });
    global.addEventListener("blur", clearField);
    doc.addEventListener("pointerout", onLeaveWindow);

    let ro = null;
    if (global.ResizeObserver && typeof global.ResizeObserver === "function") {
      try {
        ro = new global.ResizeObserver(() => measure());
        ro.observe(root);
      } catch (e) { ro = null; }
    }
    if (doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === "function") {
      try {
        doc.fonts.ready.then(() => { if (!inst.destroyed) measure(); }).catch(() => {});
      } catch (e) {}
    }
    bindMQ(reduceMQ, onMQ);
    bindMQ(fineMQ, onMQ);

    // ---------- public ----------
    inst.arm = arm;
    inst.disarm = disarm;
    inst.reset = reset;
    inst.destroy = destroy;
    inst.pick = pick;
    inst.nudge = nudge;
    inst.focus = focusRow;
    inst.cue = (name) => fire(inst, name);
    inst.unlock = () => { unlockAudio(); return inst; };
    inst.measure = measure;
    inst.isArmed = () => inst.armed;

    setArmed(armed, true);
    measure();
    global.requestAnimationFrame(() => {
      if (!inst.destroyed) root.classList.add("is-in");
    });
    return inst;
  }

  function bindMQ(mq, fn) {
    if (!mq) return;
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", fn);
    else if (typeof mq.addListener === "function") mq.addListener(fn);
  }

  function unbindMQ(mq, fn) {
    if (!mq) return;
    if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", fn);
    else if (typeof mq.removeListener === "function") mq.removeListener(fn);
  }

  const wake = () => unlockAudio();
  global.addEventListener("pointerdown", wake, { once: true, capture: true, passive: true });
  global.addEventListener("keydown", wake, { once: true, capture: true });

  global.IntroChoices = { version: VERSION, mount, cues: CUES.slice() };
})();
