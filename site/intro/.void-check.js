/* Headless check for void.js. No browser, no deps. Stubs the DOM enough to
   mount the stage, drive progress, stall, flash, say and cut. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach((x) => this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  contains(c) { return this.set.has(c); }
}

class Ctx {
  constructor() { this.fills = 0; this.clears = 0; this.transforms = []; this.globalAlpha = 1; this.fillStyle = ""; }
  clearRect() { this.clears++; }
  fillRect() { this.fills++; }
  setTransform(...a) { this.transforms.push(a); }
}

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.style = {};
    this.classList = new ClassList();
    this.listeners = {};
    this.textContent = "";
    this.id = "";
    this.width = 0;
    this.height = 0;
    this._ctx = null;
    this.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800 });
  }
  get offsetWidth() { return 1200; }
  get className() { return [...this.classList.set].join(" "); }
  set className(v) {
    this.classList = new ClassList();
    String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
  }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parentNode = null;
    return child;
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); }
  addEventListener(t, fn) { (this.listeners[t] || (this.listeners[t] = [])).push(fn); }
  removeEventListener(t, fn) {
    const a = this.listeners[t];
    if (!a) return;
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
  dispatchEvent(ev) {
    let p = this;
    while (p) {
      const fns = p.listeners && p.listeners[ev.type];
      if (fns) fns.slice().forEach((fn) => fn(ev));
      p = p.parentNode;
    }
    return true;
  }
  getContext() {
    if (!this._ctx) this._ctx = new Ctx();
    return this._ctx;
  }
}

class Doc {
  constructor() {
    this.listeners = {};
    this.head = new El("head");
    this.body = new El("body");
    this.documentElement = new El("html");
    this.head.parentNode = this.documentElement;
    this.body.parentNode = this.documentElement;
    this.documentElement.parentNode = this;
    this.hidden = false;
  }
  createElement(tag) { return new El(tag); }
  createElementNS(ns, tag) { const el = new El(tag); el.ns = ns; return el; }
  getElementById(id) {
    const walk = (n) => {
      if (n.id === id) return n;
      for (const c of n.children) {
        const hit = walk(c);
        if (hit) return hit;
      }
      return null;
    };
    return walk(this.body) || walk(this.head);
  }
}

function findAll(node, pred, out = []) {
  if (pred(node)) out.push(node);
  for (const c of node.children) findAll(c, pred, out);
  return out;
}
const byClass = (node, name) => findAll(node, (n) =>
  n.classList.contains(name) ||
  String((n.attrs && n.attrs["class"]) || "").split(/\s+/).includes(name));

const doc = new Doc();
let clock = 0;
const queue = new Map();
let nextRaf = 1;

const sandbox = {
  document: doc,
  console,
  setTimeout,
  clearTimeout,
  Math,
  Date,
  Number,
  String,
  Object,
  Array,
  Error,
  isFinite,
  devicePixelRatio: 2,
  performance: { now: () => clock },
  requestAnimationFrame: (fn) => { const id = nextRaf++; queue.set(id, fn); return id; },
  cancelAnimationFrame: (id) => { queue.delete(id); },
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false }),
  CustomEvent: class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; this.bubbles = !!(init && init.bubbles); }
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "void.js"), "utf8"), sandbox, { filename: "void.js" });

function flush(frames, step = 40) {
  for (let i = 0; i < frames; i++) {
    clock += step;
    const batch = [...queue.entries()];
    queue.clear();
    for (const [, fn] of batch) fn(clock);
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const VS = sandbox.window.VoidStage;
  assert.ok(VS, "VoidStage exposed");
  assert.strictEqual(typeof VS.mount, "function");
  assert.strictEqual(VS.version, "1.0.0");

  const host = doc.createElement("div");
  doc.body.appendChild(host);
  let doneCount = 0;
  let doneDetail = null;
  host.addEventListener("void:done", (e) => { doneCount++; doneDetail = e.detail; });

  const api = VS.mount(host, { onDone: (d) => { assert.strictEqual(d.progress, 100); } });
  const root = host.children[0];
  assert.ok(root.classList.contains("void-root"), "root mounted");
  assert.strictEqual(root.children.length, 7, "hum, dust, scan, vig, hud, slot, flash");

  const stateEl = byClass(root, "void-state")[0];
  const cap = byClass(root, "void-cap")[0];
  const count = byClass(root, "void-count")[0];
  const canvas = byClass(root, "void-dust")[0];
  const flashEl = byClass(root, "void-flash")[0];
  const line = byClass(root, "void-line")[0];
  const typed = byClass(root, "void-typed")[0];
  const sr = byClass(root, "void-sr")[0];
  assert.strictEqual(stateEl.textContent, "loading");
  assert.strictEqual(cap.textContent, "signal 40hz");
  assert.strictEqual(count.getAttribute("role"), "progressbar");
  assert.strictEqual(count.getAttribute("aria-valuenow"), "0");

  // full bleed canvas at dpr 2
  assert.strictEqual(canvas.width, 2400);
  assert.strictEqual(canvas.height, 1600);
  const ctx = canvas.getContext("2d");
  assert.deepStrictEqual(ctx.transforms[ctx.transforms.length - 1], [2, 0, 0, 2, 0, 0]);

  // 28 motes, one pixel each
  ctx.fills = 0;
  flush(1);
  assert.strictEqual(ctx.fills, 28, "28 dust motes");

  // three cells: X zero, tens, ones
  const tensCol = findAll(root, (n) => n.attrs["data-col"] === "tens")[0];
  const onesCol = findAll(root, (n) => n.attrs["data-col"] === "ones")[0];
  const onesStrip = onesCol.children[0];
  const tensStrip = tensCol.children[0];
  assert.strictEqual(tensStrip.children.length, 10, "tens strip");
  assert.strictEqual(onesStrip.children.length, 110, "ones strip has two digit cycles");
  assert.strictEqual(onesStrip.children[0].textContent, "0");
  assert.strictEqual(onesStrip.children[9].textContent, "9");
  assert.strictEqual(onesStrip.children[10].textContent, "0");
  assert.strictEqual(onesStrip.children[99].textContent, "9");
  assert.ok(byClass(root, "void-ghost")[0], "ghost x guide");
  assert.ok(byClass(root, "void-s1")[0] && byClass(root, "void-s2")[0], "two drawn strokes");

  // roll: 37
  api.setProgress(37);
  assert.strictEqual(count.getAttribute("aria-valuenow"), "37");
  flush(40);
  const onesY = Math.abs(parseFloat(onesStrip.style.transform.match(/-?[\d.]+em/)[0]));
  assert.ok(Math.abs(onesY - 37) < 0.01, "ones wheel settles at 37, got " + onesY);
  const tensY = Math.abs(parseFloat(tensStrip.style.transform.match(/-?[\d.]+em/)[0]));
  assert.ok(Math.abs(tensY - 3) < 0.01, "tens wheel settles at 3, got " + tensY);
  const s1 = byClass(root, "void-s1")[0];
  const s2 = byClass(root, "void-s2")[0];
  assert.ok(Math.abs(parseFloat(s1.style.strokeDashoffset) - 0.26) < 0.01, "first x stroke at 52%");
  assert.strictEqual(parseFloat(s2.style.strokeDashoffset), 1, "second x stroke has not started");

  // fraction input, and the x closing
  api.setProgress(0.6);
  assert.strictEqual(count.getAttribute("aria-valuenow"), "60", "0.6 reads as 60 percent");
  flush(40);
  assert.strictEqual(parseFloat(s1.style.strokeDashoffset), 0);
  assert.ok(Math.abs(parseFloat(s2.style.strokeDashoffset) - 0.7407) < 0.01, "second x stroke follows");

  // honest hold
  api.stall(true);
  assert.ok(root.hasAttribute("data-stall"));
  assert.strictEqual(stateEl.textContent, "holding");
  assert.strictEqual(cap.textContent, "signal held");
  api.stall(false);
  assert.ok(!root.hasAttribute("data-stall"));
  assert.strictEqual(stateEl.textContent, "loading");
  assert.strictEqual(cap.textContent, "signal 40hz");

  // one soft flash
  api.flash();
  assert.ok(flashEl.classList.contains("go"));
  await wait(360);
  assert.ok(!flashEl.classList.contains("go"), "flash clears");

  // the number leaves, dialogue takes the slot
  api.say("oh. hello.");
  assert.ok(count.classList.contains("off"));
  assert.ok(line.classList.contains("on"));
  assert.strictEqual(sr.textContent, "oh. hello.");
  await wait(400);
  assert.strictEqual(typed.textContent, "oh. hello.");
  api.say(null);
  assert.ok(!line.classList.contains("on"));
  assert.ok(!count.classList.contains("off"));

  // hard cut at 100
  api.setProgress(100);
  assert.strictEqual(count.getAttribute("aria-valuenow"), "100");
  assert.ok(root.hasAttribute("data-sealed"), "seals before the cut");
  assert.strictEqual(stateEl.textContent, "ready");
  assert.strictEqual(parseFloat(s2.style.strokeDashoffset), 0, "x closes at 100");
  assert.ok(!root.hasAttribute("data-cut"), "one painted frame before the cut");
  flush(1);
  assert.ok(root.hasAttribute("data-cut"), "hard cut");
  assert.strictEqual(api.done, true);
  assert.strictEqual(doneCount, 1, "void:done fired once");
  assert.strictEqual(doneDetail.progress, 100);

  api.flash();
  assert.ok(!flashEl.classList.contains("go"), "nothing flashes after the cut");

  // remount replaces, destroy removes
  api.destroy();
  assert.strictEqual(host.children.length, 0, "destroy removes the root");
  assert.strictEqual(host.__voidStage, undefined);
  const again = VS.mount(host);
  assert.strictEqual(host.children.length, 1);
  const third = VS.mount(host);
  assert.strictEqual(host.children.length, 1, "mount cleans the previous root");
  third.destroy();
  assert.strictEqual(host.children.length, 0);

  console.log("void smoke test: ok");
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
