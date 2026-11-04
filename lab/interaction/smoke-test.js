/* Headless smoke test for prototype.js. No browser, no deps.
   Stubs just enough DOM/canvas to execute the page, then simulates a visitor
   tracing both diagonals and unlocks. Fails on any thrown error.

   Run: node lab/interaction/smoke-test.js
*/
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const listeners = new Map();
const timers = [];

function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get(t, k) {
        if (k in t) return t[k];
        if (k === "createRadialGradient" || k === "createLinearGradient") return () => grad;
        if (k === "getImageData") return () => ({ data: [] });
        if (k === "canvas") return { width: 0, height: 0 };
        return () => {};
      },
      set(t, k, v) {
        t[k] = v;
        return true;
      }
    }
  );
}

function makeClassList() {
  const set = new Set();
  return {
    add(c) { set.add(c); },
    remove(c) { set.delete(c); },
    contains(c) { return set.has(c); },
    toString() { return Array.from(set).join(" "); }
  };
}

function el(sel) {
  return {
    sel,
    width: 0,
    height: 0,
    offsetWidth: 1,
    style: {},
    dataset: {},
    classList: makeClassList(),
    getContext() { return makeCtx(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1366, height: 649 }; },
    addEventListener(type, fn) {
      const key = sel + ":" + type;
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(fn);
    },
    setPointerCapture() {}
  };
}

const els = new Map();
const body = { classList: makeClassList(), dataset: {} };
const document = {
  querySelector(sel) {
    if (!els.has(sel)) els.set(sel, el(sel));
    return els.get(sel);
  },
  body
};

let rafCb = null;
const win = {
  document,
  innerWidth: 1366,
  innerHeight: 649,
  devicePixelRatio: 1,
  location: { search: "" },
  requestAnimationFrame(cb) {
    if (!rafCb) rafCb = cb;
    return 1;
  },
  addEventListener() {}
};

const ctx = vm.createContext(Object.assign(win, {
  window: win,
  globalThis: win,
  URLSearchParams,
  console,
  Math,
  Set,
  Map,
  Array,
  Object,
  JSON,
  isFinite,
  setTimeout: (fn) => { timers.push(fn); return timers.length; },
  clearTimeout: () => {}
}));

let failed = 0;
function ok(name, cond, extra) {
  if (cond) console.log("PASS  " + name);
  else {
    failed++;
    console.log("FAIL  " + name + (extra ? "  (" + extra + ")" : ""));
  }
}

const traceCode = fs.readFileSync(path.join(__dirname, "trace.js"), "utf8");
vm.runInContext(traceCode, ctx, { filename: "trace.js" });

const code = fs.readFileSync(path.join(__dirname, "prototype.js"), "utf8");
vm.runInContext(code, ctx, { filename: "prototype.js" });

ok("page boots without throwing", true);
ok("first frame runs", typeof rafCb === "function");

// one frame at t=16
rafCb(16);
ok("drawX survives a frame", true);

// trace the two guides
const W = 1366;
const H = 649;
const cx = W / 2;
const cy = H / 2;
const h = (Math.min(W, H) * 0.38) / 2;
const pad = els.get("#xpad");
const down = listeners.get("#xpad:pointerdown")[0];
const move = listeners.get("#xpad:pointermove")[0];
const up = listeners.get("#xpad:pointerup")[0];

const event = (x, y) => ({
  clientX: x,
  clientY: y,
  pointerId: 1,
  preventDefault() {},
  getCoalescedEvents() { return [{ clientX: x, clientY: y }]; }
});

const trace = (a, b, bow) => {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const len = Math.hypot(ux, uy);
  const nx = -uy / len;
  const ny = ux / len;
  const n = 40;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = Math.sin(t * Math.PI) * bow;
    const x = a[0] + ux * t + nx * w;
    const y = a[1] + uy * t + ny * w;
    if (i === 0) down(event(x, y));
    else move(event(x, y));
  }
  up(event(b[0], b[1]));
};

const A = [[cx - h, cy - h], [cx + h, cy + h]];
const B = [[cx + h, cy - h], [cx - h, cy + h]];
trace(A[0], A[1], 10);
trace(B[0], B[1], -8);
ok("two traced strokes recorded", true);

// unlock now, before the 320ms timer, via skip (same code path)
const skip = listeners.get("#skip:click")[0];
skip();
while (timers.length) timers.shift()();
ok("entered class added", body.classList.contains("entered"), body.classList.toString());
ok("trace was used, not the fallback", body.dataset.source === "hand", String(body.dataset.source));

for (const t of [100, 400, 900, 1600, 2600]) rafCb(t);
ok("post-unlock frames run", true);

console.log(failed ? "\n" + failed + " FAILED" : "\nall checks passed");
process.exit(failed ? 1 : 0);
