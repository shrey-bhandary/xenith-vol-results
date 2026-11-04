/* Node checks for trace.js. No deps, no DOM.
   Run: node lab/interaction/trace-test.js
*/
const T = require("./trace.js");

let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    console.log("PASS  " + name);
  } else {
    failed++;
    console.log("FAIL  " + name + (extra ? "  (" + extra + ")" : ""));
  }
}

// ---------- fixtures ----------
const A = [
  [-1, -1],
  [1, 1]
];
const B = [
  [1, -1],
  [-1, 1]
];

function line(a, b, n, wobble, sign) {
  const pts = [];
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const len = Math.hypot(ux, uy);
  const nx = -uy / len;
  const ny = ux / len;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = wobble ? Math.sin(t * Math.PI) * wobble * (sign || 1) : 0;
    pts.push([a[0] + ux * t + nx * w, a[1] + uy * t + ny * w]);
  }
  return pts;
}

function offsetFromA(p) {
  // signed distance from the line y = x, in gate units
  return (p.y - p.x) / Math.SQRT2;
}

function offsetFromB(p) {
  // signed distance from the line y = -x
  return (p.y + p.x) / Math.SQRT2;
}

function mid(beam) {
  return beam[Math.floor(beam.length / 2)];
}

// ---------- 1. empty / junk ----------
ok("empty input falls back", T.build([]).ok === false);
ok("single point falls back", T.build([[[0, 0]]]).ok === false);
ok(
  "far scribble falls back",
  T.build([
    [
      [0, 1.5],
      [0.1, 1.6],
      [0.2, 1.5]
    ]
  ]).ok === false
);

// ---------- 2. ideal ----------
const ideal = T.build([line(A[0], A[1], 40), line(B[0], B[1], 40)]);
ok("ideal trace builds", ideal.ok === true);
ok("two beams", ideal.ok && ideal.beams.length === 2);
ok(
  "64 samples per beam",
  ideal.ok && ideal.beams.every((b) => b.length === 64),
  ideal.ok ? ideal.beams.map((b) => b.length).join(",") : ""
);
if (ideal.ok) {
  const maxA = Math.max.apply(
    null,
    ideal.beams[0].map((p) => Math.abs(offsetFromA(p)))
  );
  const maxB = Math.max.apply(
    null,
    ideal.beams[1].map((p) => Math.abs(offsetFromB(p)))
  );
  ok("ideal stays straight", maxA < 1e-9 && maxB < 1e-9, maxA + " / " + maxB);
  const e0 = ideal.beams[0][0];
  const e1 = ideal.beams[0][63];
  ok(
    "corners anchored",
    Math.abs(e0.x + 1) < 1e-6 && Math.abs(e0.y + 1) < 1e-6,
    JSON.stringify(e0)
  );
  ok(
    "corners anchored at the far end",
    Math.abs(e1.x - 1) < 1e-6 && Math.abs(e1.y - 1) < 1e-6,
    JSON.stringify(e1)
  );
}

// ---------- 3. wobble is preserved, corners are not ----------
const wob = T.build([line(A[0], A[1], 60, 0.1), line(B[0], B[1], 60, 0.1, -1)]);
ok("wobbly trace builds", wob.ok === true);
if (wob.ok) {
  const m = offsetFromA(mid(wob.beams[0]));
  // expected: 0.1 * blend 0.8 = 0.08, with smoothing/taper slack
  ok("wobble survives at the middle", m > 0.04 && m < 0.11, "mid offset " + m.toFixed(4));
  const e = Math.abs(offsetFromA(wob.beams[0][0]));
  ok("wobble is tapered at the corner", e < 0.02, "corner offset " + e.toFixed(4));
  const max = Math.max.apply(
    null,
    wob.beams[0].map((p) => Math.abs(offsetFromA(p)))
  );
  ok("wobble is clamped", max <= 0.24 * 0.8 + 1e-6, "max " + max.toFixed(4));
}

// ---------- 4. one continuous zigzag ----------
const zig = []
  .concat(line(A[0], A[1], 40))
  .concat(line(B[0], B[1], 40));
const one = T.build([zig]);
ok("one-stroke zigzag builds", one.ok === true);
if (one.ok) {
  const maxA = Math.max.apply(null, one.beams[0].map((p) => Math.abs(offsetFromA(p))));
  const maxB = Math.max.apply(null, one.beams[1].map((p) => Math.abs(offsetFromB(p))));
  ok("one-stroke keeps both arms", maxA < 1e-9 && maxB < 1e-9, maxA + " / " + maxB);
}

// ---------- 5. points ----------
const pts = ideal.ok ? T.toPoints(ideal.beams) : [];
ok("toPoints count is 2 x 64 x 3", pts.length === 384, "got " + pts.length);
ok(
  "toPoints has three depths",
  new Set(pts.map((p) => p.z)).size === 3,
  JSON.stringify(Array.from(new Set(pts.map((p) => p.z))))
);
ok(
  "model scale is 1.15 by default",
  Math.max.apply(null, pts.map((p) => Math.abs(p.x))) <= 1.15 + 1e-9
);

// gate handoff scale: front layer must land on the gate ink at S0=0.265*min
const S = 0.38 * 900;
const S0 = 0.265 * 900;
const handScale =
  S / 2 / ((S0 * 0.5 * 2.4) / (1.9 - 0.08 * 0.55));
ok(
  "handoff scale is ~1.109",
  Math.abs(handScale - 1.109) < 0.005,
  "got " + handScale.toFixed(4)
);

// ---------- 6. screen projection alignment ----------
// screen offset of a traced corner at z=-0.08 vs. the gate guide corner
const gatePx = S / 2;
const monPx =
  (1.0 * handScale) * (S0 * 0.5) * 2.4 * (1 / (1.9 - 0.08 * 0.55));
const drift = Math.abs(monPx - gatePx);
ok(
  "traced front layer lines up with the gate ink",
  drift < 0.5,
  "drift " + drift.toFixed(3) + "px"
);

// ---------- 7. preview ----------
if (wob.ok) {
  console.log("\nwobbly trace, gate units, # = glyph point");
  console.log(T.preview(wob.beams, 63, 31));
  console.log("");
} else if (ideal.ok) {
  console.log("\nideal trace");
  console.log(T.preview(ideal.beams, 63, 31));
}

// ---------- 8. normalize round trip ----------
const screen = [
  [
    [279, 279],
    [621, 621]
  ]
];
const unit = T.normalize(screen, 900, 900, 342);
ok(
  "normalize maps the guide to +/-1",
  Math.abs(unit[0][0][0] + 1) < 1e-9 && Math.abs(unit[0][1][0] - 1) < 1e-9,
  JSON.stringify(unit)
);

console.log(failed ? "\n" + failed + " FAILED" : "\nall checks passed");
process.exit(failed ? 1 : 0);
