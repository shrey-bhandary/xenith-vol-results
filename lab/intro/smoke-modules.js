/* smoke-modules.js, headless checks for the finished but unwired intro modules.

   Loads site/intro/rusty.js, lab/intro/face.js and lab/intro/buttons.js into a
   fake DOM, then asserts:
     - draw accepts the unitless (bob, breathe) call and a seconds (t, dt) call
     - every expression the face atlas advertises exists and renders rects
     - talkCycle's syllable index changes the mouth
     - buttons.js mounts two rows with real labels
     - nothing throws and nothing logs an error

   No browser, no deps. Run: node lab/intro/smoke-modules.js */

"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const HERE = __dirname;
const ROOT = path.resolve(HERE, "..", "..");
const FILES = {
  rusty: path.join(ROOT, "site", "intro", "rusty.js"),
  face: path.join(HERE, "face.js"),
  buttons: path.join(HERE, "buttons.js")
};

/* ---------- tiny fake DOM ---------- */

class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach((x) => this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  toggle(c, force) {
    if (force === undefined) {
      if (this.set.has(c)) this.set.delete(c); else this.set.add(c);
    } else if (force) this.set.add(c);
    else this.set.delete(c);
    return this.set.has(c);
  }
  contains(c) { return this.set.has(c); }
  toString() { return Array.from(this.set).join(" "); }
}

class El {
  constructor(doc, tag) {
    this.doc = doc;
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.classList = new ClassList();
    this.listeners = {};
    this.textContent = "";
    this.innerHTML = "";
    this.id = "";
    this.type = "";
    this.rel = "";
    this.href = "";
    this.inert = false;
    this.style = {
      props: {},
      setProperty(k, v) { this.props[k] = String(v); },
      getPropertyValue(k) { return this.props[k] || ""; }
    };
  }
  get className() { return this.classList.toString(); }
  set className(v) {
    this.classList = new ClassList();
    String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
  }
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parentNode = null;
    return child;
  }
  insertBefore(child, ref) {
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) return this.appendChild(child);
    child.parentNode = this;
    this.children.splice(i, 0, child);
    return child;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); }
  addEventListener(type, fn) {
    (this.listeners[type] || (this.listeners[type] = [])).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this.listeners[type];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  dispatchEvent(ev) {
    const type = ev && ev.type;
    const arr = this.listeners[type];
    if (arr) arr.slice().forEach((fn) => fn(ev));
    return true;
  }
  contains(node) {
    let p = node;
    while (p) { if (p === this) return true; p = p.parentNode; }
    return false;
  }
  focus() { this.doc.activeElement = this; }
  getBoundingClientRect() {
    if (this.classList.contains("xchoice__row")) {
      const i = Number(this.attrs["data-index"] || 0);
      return { left: 40, right: 540, top: 300 + i * 54, bottom: 354 + i * 54, width: 500, height: 54 };
    }
    return { left: 0, right: 560, top: 0, bottom: 400, width: 560, height: 400 };
  }
  get offsetWidth() { return this.getBoundingClientRect().width; }
  get offsetHeight() { return this.getBoundingClientRect().height; }
}

class Doc {
  constructor() {
    this.listeners = {};
    this.head = new El(this, "head");
    this.body = new El(this, "body");
    this.documentElement = new El(this, "html");
    this.head.parentNode = this.documentElement;
    this.body.parentNode = this.documentElement;
    this.documentElement.parentNode = this;
    this.activeElement = this.body;
    this.currentScript = null;
    this.hidden = false;
    this.fonts = null;
  }
  createElement(tag) { return new El(this, tag); }
  createTextNode(text) {
    const el = new El(this, "#text");
    el.textContent = String(text);
    return el;
  }
  addEventListener(type, fn) {
    (this.listeners[type] || (this.listeners[type] = [])).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this.listeners[type];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  querySelector(sel) {
    if (typeof sel === "string" && sel[0] === "#") return this.getElementById(sel.slice(1));
    return null;
  }
  querySelectorAll() { return []; }
  getElementById(id) {
    const walk = (node) => {
      if (node.id === id) return node;
      for (const c of node.children) {
        const hit = walk(c);
        if (hit) return hit;
      }
      return null;
    };
    return walk(this.body) || walk(this.head);
  }
}

/* ---------- fake canvas, records transformed fillRects ---------- */

function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}

class Ctx {
  constructor() {
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.log = [];
    this.fillStyle = "#000";
    this.strokeStyle = "#000";
    this.globalAlpha = 1;
    this.font = "";
    this.textAlign = "left";
    this.textBaseline = "alphabetic";
    this.lineWidth = 1;
  }
  save() { this.stack.push(this.m.slice()); }
  restore() { if (this.stack.length) this.m = this.stack.pop(); }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  transform(a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
  rotate(r) {
    const c = Math.cos(r);
    const s = Math.sin(r);
    this.transform(c, s, -s, c, 0, 0);
  }
  clearRect() {}
  fillRect(x, y, w, h) {
    const m = this.m;
    const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map((p) => [
      m[0] * p[0] + m[2] * p[1] + m[4],
      m[1] * p[0] + m[3] * p[1] + m[5]
    ]);
    this.log.push(pts);
  }
  strokeRect() {}
  fillText() {}
  measureText(t) { return { width: String(t).length * 6 }; }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  rect() {}
  fill() {}
  stroke() {}
  begin() { this.log = []; }
  bbox() {
    if (!this.log.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pts of this.log) {
      for (const p of pts) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }
    }
    return {
      minX, minY, maxX, maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: maxX - minX,
      h: maxY - minY,
      n: this.log.length
    };
  }
  digest() {
    return JSON.stringify(this.log.map((pts) => pts.map((p) => [
      p[0].toFixed(4), p[1].toFixed(4)
    ])));
  }
}

function makeCanvas() {
  const ctx = new Ctx();
  const canvas = {
    width: 0,
    height: 0,
    clientWidth: 560,
    clientHeight: 480,
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 560, bottom: 480, width: 560, height: 480 };
    },
    getContext() { return ctx; }
  };
  return { canvas, ctx };
}

/* ---------- sandbox ---------- */

const doc = new Doc();
const consoleErrors = [];
const consoleWarns = [];
const hostConsole = {
  log: (...a) => process.stdout.write(a.join(" ") + "\n"),
  info: (...a) => process.stdout.write(a.join(" ") + "\n"),
  warn: (...a) => consoleWarns.push(a.map(String).join(" ")),
  error: (...a) => consoleErrors.push(a.map(String).join(" ")),
  debug: () => {}
};
const rafQueue = [];
const sandbox = {
  document: doc,
  console: hostConsole,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  performance: { now: () => performance.now() },
  devicePixelRatio: 1,
  innerWidth: 1024,
  innerHeight: 768,
  navigator: { vibrate: () => {} },
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);

const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({ ok: true, name, detail: detail === undefined ? "" : String(detail) });
  } catch (err) {
    results.push({ ok: false, name, detail: err && err.message ? err.message : String(err) });
  }
}
function must(cond, msg) { if (!cond) throw new Error(msg); }
function near(actual, want, tol, label) {
  must(Math.abs(actual - want) <= tol, label + ": got " + actual.toFixed(2) + ", want " + want.toFixed(2) + " +-" + tol);
}

function load(file, label) {
  const src = fs.readFileSync(file, "utf8");
  vm.runInContext(src, context, { filename: path.relative(ROOT, file) || label });
}

/* ---------- load ---------- */

check("load site/intro/rusty.js", () => {
  load(FILES.rusty, "rusty.js");
  must(sandbox.RustyRig && typeof sandbox.RustyRig.mount === "function", "RustyRig.mount missing");
  return "RustyRig v" + sandbox.RustyRig.version;
});
check("load lab/intro/face.js", () => {
  load(FILES.face, "face.js");
  must(sandbox.RustyFace && typeof sandbox.RustyFace.shapes === "function", "RustyFace.shapes missing");
  return "RustyFace v" + sandbox.RustyFace.version;
});
check("load lab/intro/buttons.js", () => {
  load(FILES.buttons, "buttons.js");
  must(sandbox.IntroChoices && typeof sandbox.IntroChoices.mount === "function", "IntroChoices.mount missing");
  return "IntroChoices v" + sandbox.IntroChoices.version;
});

const Rig = sandbox.RustyRig;
const Face = sandbox.RustyFace;
const Choices = sandbox.IntroChoices;

/* ---------- draw signatures ---------- */

const { canvas, ctx } = makeCanvas();
let rig = null;
check("mount rusty rig on a fake canvas", () => {
  rig = Rig.mount(canvas, { reduce: false });
  must(rig && typeof rig.draw === "function", "rig.draw missing");
  rig.reduced = true; // keep particles out of the geometry measurement
  rig.setState("idle");
  rig.assemble(1);
  for (let i = 0; i < 12; i++) rig.update(16.667); // settle the springs
  must(canvas.width === 560 && canvas.height === 480, "canvas not sized: " + canvas.width + "x" + canvas.height);
  return canvas.width + "x" + canvas.height + ", parts " + rig.parts;
});

const SCALE = Math.min(560 / 48, 480 / 58) * 0.72; // rusty's documented scale
function frame(bob, breathe) {
  ctx.begin();
  rig.draw(bob, breathe);
  return ctx.bbox();
}
function digest(bob, breathe) {
  ctx.begin();
  rig.draw(bob, breathe);
  return ctx.digest();
}

let baseFrame = null;
check("draw(bob, breathe) accepts the unitless signature", () => {
  baseFrame = frame(0, 0);
  const f = frame(0.8, 0.06);
  must(baseFrame && baseFrame.n > 40, "draw produced no rects");
  must(f && f.n > 40, "draw(0.8, 0.06) produced no rects");
  // Measure the top edge, not the bbox centre: the floor shadow is drawn
  // outside the bob transform and would anchor the centre.
  const dy = f.minY - baseFrame.minY;
  near(dy, 0.8 * SCALE, 1.0, "bob should move the rig " + (0.8 * SCALE).toFixed(2) + "px");
  return "bob 0.8 -> dy " + dy.toFixed(2) + "px, " + f.n + " rects";
});

check("draw(bob, breathe) uses the second argument (breathe)", () => {
  const a = digest(0, 0);
  const b = digest(0, 0.5);
  must(a !== b, "breathe did not change the frame");
  return "breathe 0 vs 0.5 changes geometry";
});

check("draw(t, dt) accepts the seconds signature intro.js uses", () => {
  // intro.js calls draw(now / 1000, dt) for the life of the scene. If t is read
  // as bob, the rig slides one unit (about 6px) per second.
  const f = frame(10, 0.016);
  must(f && f.n > 40, "draw(10, 0.016) produced no rects");
  const dy = f.minY - baseFrame.minY;
  must(Math.abs(dy) < 15, "10s clock moved the rig " + dy.toFixed(2) + "px vertically (want < 15px); t is being read as bob");
  return "t=10s -> dy " + dy.toFixed(2) + "px";
});

/* ---------- expressions ---------- */

check("all canonical expressions exist and render", () => {
  must(Array.isArray(Face.names), "Face.names missing");
  must(Face.names.length === 15, "expected 15 names, got " + Face.names.length);
  const kinds = new Set();
  Face.names.forEach((name) => {
    const s = Face.shapes(name);
    must(s && s.name === name, "expression " + name + " resolved to " + (s && s.name));
    must(s.eyes && Array.isArray(s.eyes.l) && s.eyes.l.length, name + " has no left eye rects");
    must(Array.isArray(s.eyes.r) && s.eyes.r.length, name + " has no right eye rects");
    must(Array.isArray(s.mouth) && s.mouth.length, name + " has no mouth rects");
    must(Face.eyeKinds.indexOf(s.eyeKind) >= 0, name + " eyeKind " + s.eyeKind + " unknown");
    must(Face.mouthKinds.indexOf(s.mouthKind) >= 0, name + " mouthKind " + s.mouthKind + " unknown");
    s.eyes.l.concat(s.eyes.r, s.mouth).forEach((r) => {
      must(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.w) && Number.isFinite(r.h),
        name + " has a non-finite rect");
      must(typeof r.c === "string" && r.c.length > 0, name + " has a rect with no color");
    });
    kinds.add(s.eyeKind + "/" + s.mouthKind);
  });
  return Face.names.length + " names, " + kinds.size + " distinct eye/mouth pairs";
});

check("every alias resolves to a real expression", () => {
  const aliases = Face.aliases || {};
  const names = Object.keys(aliases);
  must(names.length > 0, "no aliases");
  names.forEach((a) => {
    const s = Face.shapes(a);
    must(s && s.name === aliases[a], "alias " + a + " -> " + (s && s.name) + ", want " + aliases[a]);
  });
  return names.length + " aliases";
});

check("every rusty.js state has a face", () => {
  const src = fs.readFileSync(FILES.rusty, "utf8");
  const block = src.match(/var STATES = \{([\s\S]*?)\n  \};/);
  must(block, "could not find the STATES block");
  const states = Array.from(block[1].matchAll(/^\s{4}([a-zA-Z]+): \{/gm)).map((m) => m[1]);
  must(states.length >= 10, "only parsed " + states.length + " states");
  states.forEach((state) => {
    const want = Face.aliases[state] || state;
    const s = Face.shapes(state);
    must(s && s.name === want, "state " + state + " resolved to " + (s && s.name) + ", want " + want);
  });
  return states.length + " states: " + states.join(", ");
});

/* ---------- talk ---------- */

check("talk index changes the mouth", () => {
  const rate = 4.6 + 1 * 1.8; // intensity 1, the loud case
  const cycles = [];
  for (let i = 0; i < 8; i++) {
    const c = Face.talkCycle((i + 0.5) / rate, 1);
    must(c && c.syllable === i, "syllable at i=" + i + " was " + (c && c.syllable));
    must(Array.isArray(c.rects) && c.rects.length >= 1, "no mouth rects at i=" + i);
    cycles.push(c);
  }
  const heights = cycles.map((c) => c.h);
  const unique = new Set(heights.map((h) => h.toFixed(3)));
  const spread = Math.max(...heights) - Math.min(...heights);
  must(unique.size >= 4, "only " + unique.size + " distinct mouth heights across 8 syllables");
  must(spread > 0.15, "mouth height spread only " + spread.toFixed(3) + " units");

  const a = cycles[0];
  const b = cycles[1];
  const sa = Face.shapes("neutral", { talk: a });
  const sb = Face.shapes("neutral", { talk: b });
  must(sa.mouthKind === "talk" && sb.mouthKind === "talk", "talk option did not replace the mouth kind");
  must(JSON.stringify(sa.mouth) === JSON.stringify(a.rects), "shape mouth does not use the cycle rects");
  must(JSON.stringify(sa.mouth) !== JSON.stringify(sb.mouth), "two cycles produced the same mouth");
  return "8 syllables, " + unique.size + " heights, spread " + spread.toFixed(3) + " units";
});

/* ---------- menu ---------- */

check("buttons.js mounts two rows", () => {
  const host = doc.createElement("div");
  doc.body.appendChild(host);
  const picked = [];
  const inst = Choices.mount(host, [
    { id: "result", label: "check my vols application result", sub: "one file, one line" },
    { id: "explore", label: "explore xenith", sub: "" }
  ], (i) => picked.push(i));
  must(inst, "mount returned null");
  must(inst.rows && inst.rows.length === 2, "expected 2 rows, got " + (inst.rows && inst.rows.length));
  must(host.children.length === 1 && host.children[0] === inst.root, "root not attached to the host");
  must(inst.root.classList.contains("xchoice"), "root has no xchoice class");
  must(inst.opts.getAttribute("role") === "group", "opts is not a group");
  const labels = inst.rows.map((r) => {
    const span = r.children.find((c) => c.classList.contains("xchoice__label"));
    return span && span.textContent;
  });
  must(labels[0] === "check my vols application result", "row 0 label is " + JSON.stringify(labels[0]));
  must(labels[1] === "explore xenith", "row 1 label is " + JSON.stringify(labels[1]));
  must(inst.rows.every((r, i) => r.getAttribute("data-index") === String(i)), "data-index wrong");
  must(inst.rows.every((r) => r.tagName === "BUTTON"), "rows are not buttons");

  while (rafQueue.length) rafQueue.shift()();
  must(inst.root.classList.contains("is-in"), "mount rAF did not add is-in");
  inst.destroy();
  must(host.children.length === 0, "destroy did not unmount the root");
  return "2 rows: " + labels.join(" | ");
});

/* ---------- no exceptions ---------- */

check("no console errors or warnings", () => {
  must(consoleErrors.length === 0, "console.error: " + consoleErrors.join(" / "));
  must(consoleWarns.length === 0, "console.warn: " + consoleWarns.join(" / "));
  return "0 errors, 0 warnings";
});

/* ---------- report ---------- */

const failed = results.filter((r) => !r.ok);
console.log("\nsmoke-modules: " + (results.length - failed.length) + "/" + results.length + " checks passed");
for (const r of results) {
  console.log((r.ok ? "PASS " : "FAIL ") + r.name + (r.detail ? "  [" + r.detail + "]" : ""));
}
if (failed.length) {
  console.log("\n" + failed.length + " failed");
  process.exitCode = 1;
} else {
  console.log("\nall checks passed");
}
