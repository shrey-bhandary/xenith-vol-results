/* Headless smoke test for menu.js. No browser, no deps.
   Stubs just enough DOM to run the component, then types, skips, arrows,
   hovers, picks and dismisses. Fails on any thrown error or bad state.

   Run: node lab/intro/smoke-test.js
*/
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach((x) => this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  toggle(c, force) {
    if (force === undefined) {
      if (this.set.has(c)) this.set.delete(c); else this.set.add(c);
    } else if (force) this.set.add(c);
    else this.set.delete(c);
  }
  contains(c) { return this.set.has(c); }
}

class El {
  constructor(doc, tag) {
    this.doc = doc;
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.style = { props: {}, setProperty: (k, v) => { this.style.props[k] = v; } };
    this.classList = new ClassList();
    this.listeners = {};
    this.textContent = "";
    this.innerHTML = "";
    this.inert = false;
    this.id = "";
    this.type = "";
  }
  get className() { return this.classList.toString(); }
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
  addEventListener(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); }
  removeEventListener(type, fn) {
    const arr = this.listeners[type];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  contains(node) {
    let p = node;
    while (p) { if (p === this) return true; p = p.parentNode; }
    return false;
  }
  focus() { this.doc.setActive(this); }
  getBoundingClientRect() {
    if (this.classList.contains("xmenu__row")) {
      const i = Number(this.attrs["data-index"] || 0);
      return { left: 40, right: 540, top: 300 + i * 58, bottom: 350 + i * 58, width: 500, height: 50 };
    }
    return { left: 0, right: 560, top: 0, bottom: 400, width: 560, height: 400 };
  }
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
  }
  createElement(tag) { return new El(this, tag); }
  addEventListener(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); }
  removeEventListener(type, fn) {
    const arr = this.listeners[type];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
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
  setActive(el) {
    if (this.activeElement === el) return;
    const old = this.activeElement;
    this.activeElement = el;
    if (old) bubble(old, "focusout", { target: old, relatedTarget: el });
    bubble(el, "focusin", { target: el, relatedTarget: old });
  }
}

function bubble(el, type, ev) {
  let p = el;
  while (p) {
    const arr = p.listeners && p.listeners[type];
    if (arr) for (const fn of arr.slice()) fn(ev);
    p = p.parentNode;
  }
}

function fire(el, type, ev) {
  const e = ev || {};
  if (!e.target) e.target = el;
  if (!e.preventDefault) e.preventDefault = () => { e.defaultPrevented = true; };
  bubble(el, type, e);
  return e;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function rowsOf(root) {
  const inner = root.children[0];
  const opts = inner.children[1];
  return { inner, opts, rows: opts.children };
}

(async () => {
  const doc = new Doc();
  const sandbox = { window: null, document: doc, setTimeout, clearTimeout, console, Date };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "menu.js"), "utf8"),
    sandbox,
    { filename: "menu.js" }
  );

  const api = sandbox.window.IntroMenu;
  assert.ok(api, "IntroMenu is exposed");
  assert.strictEqual(typeof api.show, "function");
  assert.strictEqual(api.charMs, 26, "26ms per char");
  assert.strictEqual(api.blips, true, "blips can be turned off");
  api.charMs = 1;

  let picked = null;
  const h1 = api.show("oh. hello. can i help you with something?", undefined, (i, choice) => {
    picked = { i, choice };
  });
  await wait(160);

  const root = doc.getElementById("xmenu-root");
  assert.ok(root, "root is mounted");
  assert.ok(root.classList.contains("is-open"), "root opened");
  assert.ok(root.classList.contains("is-ready"), "line finished typing");
  const { inner, opts, rows } = rowsOf(root);
  assert.strictEqual(rows.length, 2, "two rows");
  assert.strictEqual(rows[0].children[1].textContent, "check my vols application result");
  assert.strictEqual(rows[1].children[1].textContent, "explore xenith");
  assert.strictEqual(opts.inert, false, "options are live after typing");
  assert.strictEqual(doc.activeElement, rows[0], "first row focused");
  assert.ok(rows[0].classList.contains("is-lit"), "one row lit");

  const say = inner.children[0].children[1].children[1].children[0];
  assert.strictEqual(say.textContent, "oh. hello. can i help you with something?", "full line typed");

  fire(opts, "keydown", { key: "ArrowDown" });
  assert.strictEqual(doc.activeElement, rows[1], "arrow moves focus");
  assert.ok(rows[1].classList.contains("is-lit"), "arrow lights the row");
  assert.ok(!rows[0].classList.contains("is-lit"), "only one row lit");

  fire(opts, "pointermove", { clientX: 300, clientY: 372 });
  assert.strictEqual(rows[1].style.props["--near"], "1.000", "veil peaks under the pointer");
  assert.strictEqual(rows[0].style.props["--near"], "0.000", "far row stays dark");

  fire(opts, "keydown", { key: "1" });
  assert.strictEqual(picked.i, 0, "index 1 picks the first row");
  assert.strictEqual(picked.choice.id, "result");
  assert.ok(rows[0].classList.contains("is-picked"), "picked row marked");
  assert.ok(rows[1].classList.contains("is-gone"), "other row recedes");
  assert.strictEqual(opts.inert, true, "options lock after pick");
  const done1 = await h1.done;
  assert.strictEqual(done1.index, 0, "done carries the index");
  assert.strictEqual(done1.id, "result", "done carries the id");
  assert.strictEqual(done1.label, "check my vols application result", "done carries the label");

  await wait(520);
  assert.strictEqual(api.isOpen(), false, "menu dismisses after pick");
  assert.strictEqual(doc.getElementById("xmenu-root"), null, "root removed");

  const h2 = api.show("skip me please");
  await wait(40);
  const root2 = doc.getElementById("xmenu-root");
  assert.ok(root2.classList.contains("is-typing"), "typing in progress");
  fire(doc.body, "keydown", { key: "x" });
  assert.ok(root2.classList.contains("is-ready"), "keypress skips the type");
  const typed2 = root2.children[0].children[0].children[1].children[1].children[0];
  assert.strictEqual(typed2.textContent, "skip me please", "skip reveals the whole line");
  const rows2 = rowsOf(root2).rows;
  assert.strictEqual(rows2[0].children[1].textContent, "check my vols application result", "defaults used");

  h2.hide();
  assert.strictEqual(api.isOpen(), false, "hide closes");
  assert.strictEqual(doc.getElementById("xmenu-root"), null, "hide removes the root");
  assert.strictEqual(await h2.done, null, "hide resolves done with null");

  console.log("menu smoke test: ok");
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
