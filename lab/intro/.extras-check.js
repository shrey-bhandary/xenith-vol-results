/* Headless check for void-extras.js. No browser, no deps. Stubs one canvas
   context, mounts twice, parts the dust, bursts it and lets it close.
   Run: node lab/intro/.extras-check.js */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

class Grad {
  addColorStop() {}
}

class Ctx {
  constructor(el) {
    this.el = el;
    this.calls = { clear: 0, fillRect: 0, stroke: 0, image: 0, clip: 0 };
    this.globalAlpha = 1;
    this.fillStyle = "";
    this.strokeStyle = "";
    this.lineWidth = 1;
  }
  setTransform() {}
  save() { return this; }
  restore() { return this; }
  translate() {}
  rotate() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  clip() { this.calls.clip++; }
  stroke() { this.calls.stroke++; }
  fill() {}
  clearRect() { this.calls.clear++; }
  fillRect() { this.calls.fillRect++; }
  drawImage() { this.calls.image++; }
  createRadialGradient() { return new Grad(); }
  createLinearGradient() { return new Grad(); }
}

class Canvas {
  constructor(w, h) {
    this.width = w || 0;
    this.height = h || 0;
    this.clientWidth = 0;
    this.clientHeight = 0;
    this.style = {};
    this._ctx = new Ctx(this);
  }
  getContext() { return this._ctx; }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width || 1200, height: this.height || 800 };
  }
}

const doc = {
  createElement(tag) { return new Canvas(0, 0); }
};

const sandbox = {
  document: doc,
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  Error,
  isFinite,
  devicePixelRatio: 2,
  performance: { now: () => 0 },
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "void-extras.js"), "utf8"),
  sandbox,
  { filename: "void-extras.js" }
);

const VE = sandbox.VoidExtras;
assert.ok(VE, "VoidExtras exposed");
assert.strictEqual(typeof VE.mount, "function");
assert.strictEqual(VE.version, "1.0.0");
for (const k of ["setCursor", "setDepth", "update", "burst"]) {
  assert.strictEqual(typeof VE[k], "function", "namespace has " + k);
}

const main = new Canvas(1200, 800);
const room = VE.mount(main);
assert.ok(room, "mount returns an instance");
assert.strictEqual(main.width, 2400, "dpr 2 backing store");
assert.strictEqual(main.height, 1600);
for (const k of ["setCursor", "setDepth", "update", "burst", "resize", "destroy", "stats"]) {
  assert.strictEqual(typeof room[k], "function", "instance has " + k);
}
assert.strictEqual(main.__voidExtras, room, "canvas marker");

function run(api, frames, step) {
  for (let i = 0; i < frames; i++) api.update(step || 16.667);
}

// still room, no cursor
run(room, 90);
let s = room.stats();
assert.strictEqual(s.motes, 96);
assert.strictEqual(s.lit === 0, false, "light reaches the dust after the bloom");
const rest = s.push;
assert.ok(rest < 40, "the lamp keeps its own clearing, " + rest.toFixed(2));

// the cursor parts the dust
room.setCursor(300, 650);
run(room, 45);
s = room.stats();
assert.ok(s.presence > 0.9, "hole opens, presence " + s.presence.toFixed(2));
assert.ok(s.push > rest + 3, "dust moves off the cursor, push " + s.push.toFixed(2));
assert.strictEqual(main.getContext().calls.clear > 100, true, "one clear per frame");

// a fast hand pushes harder than a slow one
room.setCursor(900, 400);
run(room, 3);
assert.ok(room.stats().speed > 0, "pointer speed measured");

// lift: the bore closes
room.setCursor(null);
run(room, 120);
s = room.stats();
assert.ok(s.presence < 0.05, "presence closes, got " + s.presence.toFixed(3));
assert.ok(s.push < rest + 2, "dust returns, push " + s.push.toFixed(2));

// burst: two rings, dust kicked, light pulsed
const before = room.stats();
room.setCursor(600, 400);
run(room, 20);
room.burst(600, 400);
run(room, 1);
const peak = room.stats();
assert.strictEqual(peak.rings, 2, "two pressure rings");
assert.ok(peak.light.power > 1, "the light pulses");
run(room, 70);
assert.strictEqual(room.stats().rings, 0, "rings expire");

// depth is capped per plane, not per camera
room.setDepth(4000, -4000);
run(room, 60);
assert.ok(Math.abs(room.stats().depth.x) > 100, "camera follows the depth vector");

// seconds are read as seconds
const t = room.stats().presence;
room.setCursor(null);
run(room, 10, 0.016);
assert.ok(room.stats().presence < t, "update(0.016) advances");

// reduced motion: still room, hole off
const still = new Canvas(800, 600);
const quiet = VE.mount(still, { reduced: true });
quiet.setCursor(400, 300);
quiet.setDepth(200, 200);
run(quiet, 90);
const q = quiet.stats();
assert.ok(q.presence < 0.01, "no hole on reduced motion");
assert.ok(q.push < 0.01, "no dust travel on reduced motion");
assert.ok(Math.abs(q.depth.x) < 0.01, "no camera on reduced motion");
run(quiet, 1);
assert.ok(quiet.stats().rings === 0, "burst stays a still frame");
quiet.burst(400, 300);
assert.strictEqual(quiet.stats().rings, 1, "one still ring");
run(quiet, 30);
assert.strictEqual(quiet.stats().rings, 0);

// bloom off starts at full radius, and the namespace drives the last mount
const quick = VE.mount(new Canvas(800, 600), { bloom: false });
assert.ok(quick.stats().light.radius > 250, "bloom off starts lit");
VE.setCursor(100, 100);
VE.update(16);
assert.ok(quick.stats().presence > 0, "namespace forwards to the last mount");
quick.destroy();

// remount replaces, destroy unhooks
const third = VE.mount(main);
assert.ok(main.__voidExtras === third, "remount owns the canvas");
assert.strictEqual(typeof room.update, "function");
room.update(16);
third.destroy();
assert.ok(!main.__voidExtras, "destroy clears the marker");

// size and file budget
const size = fs.statSync(path.join(__dirname, "void-extras.js")).size;
assert.ok(size < 60 * 1024, "under 60KB, got " + size);
const src = fs.readFileSync(path.join(__dirname, "void-extras.js"), "utf8");
assert.ok(!/shadowBlur\s*=|\.filter\s*=/.test(src), "no shadowBlur, no ctx.filter");

console.log("void extras check: ok");
