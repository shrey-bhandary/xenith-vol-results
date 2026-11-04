/* verify.js
   Run: node verify.js
   Checks the parts of the motion system that can be checked without a browser:
   curves, frame-rate independence, the timeline, and pose geometry. It cannot
   tell you whether 104ms per name band looks right. Nothing can. */

const M = require("./motion.js");
let checks = 0, fail = 0;

function ok(c, m) {
  checks++;
  if (c) { console.log("  ok   " + m); }
  else { fail++; console.log("  FAIL " + m); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps); }

console.log("\ncurves");
for (const [n, f] of [["outQuint", M.outQuint], ["outCubic", M.outCubic],
                      ["inCubic", M.inCubic], ["inOutCubic", M.inOutCubic]]) {
  ok(near(f(0), 0) && near(f(1), 1), `${n} hits 0 and 1 exactly`);
  let mono = true, prev = -1;
  for (let i = 0; i <= 200; i++) { const v = f(i / 200); if (v < prev - 1e-12) mono = false; prev = v; }
  ok(mono, `${n} is monotonic over 200 samples`);
  ok(near(f(-5), 0) && near(f(9), 1), `${n} clamps outside 0..1`);
}
ok(near(M.pulse(0), 0) && near(M.pulse(1), 0) && near(M.pulse(.5), 1),
   "pulse() is one 0->1->0 for the cream flash");

console.log("\nframe independence");
const T = 0.1, tau = 0.1;
const substeps = (n) => { let x = 0; for (let i = 0; i < n; i++) x = M.smooth(x, 1, tau, T / n); return x; };
const ref = M.smooth(0, 1, tau, T);
const rates = [3, 6, 10, 12, 24, 60].map(substeps);
ok(rates.every(r => near(r, ref, 1e-12)),
   `6 refresh rates agree: ${rates.map(r => r.toFixed(6)).join(" ")}`);
ok(near(ref, 1 - Math.exp(-1)), "100ms at tau=100ms is exactly 1 - 1/e");
ok(M.smooth(7, 7, 0.1, 0.016) === 7, "smooth() is a no-op when already settled");
const oldRun = (hz) => { let x = 0; for (let i = 0; i < Math.round(hz * 0.1); i++) x += (1 - x) * 0.04; return x; };
ok(Math.abs(oldRun(60) - oldRun(144)) > 0.2,
   `the old per-frame lerp was not (60:${oldRun(60).toFixed(3)} 144:${oldRun(144).toFixed(3)})`);

console.log("\nsteps");
ok(M.stepEnd(0, 5) === 0 && M.stepEnd(1, 5) === 1, "stepEnd(5) starts at 0 and lands on 1");
ok(M.stepEnd(0.99, 5) === 0.8 && M.stepEnd(0.21, 5) === 0.2, "stepEnd quantises like steps(n,end)");

console.log("\ntimeline");
ok(M.TIMELINE.length === 10, "10 beats");
ok(M.TIMELINE.every(b => b.dur > 0 && b.at >= 0), "every beat has a positive duration");
ok(M.TIMELINE.every((b, i, a) => i === 0 || b.at >= a[i - 1].at), "beats start in order");
const lastEnd = Math.max(...M.TIMELINE.map(b => b.at + b.dur));
ok(lastEnd === M.TOTAL, `TOTAL ${M.TOTAL} equals the last beat end ${lastEnd}`);
ok(M.progressAt("name", 0) === 0 && M.progressAt("name", 260) === 0, "name waits for its delay");
ok(near(M.progressAt("name", 520), 0.5), "name is half printed at 520ms");
ok(M.progressAt("name", 780) === 1 && M.progressAt("name", 9e6) === 1, "progress clamps to 1");
ok(M.progressAt("nope", 500) === 0, "unknown beat returns 0");
ok(!M.ended(1659) && M.ended(1660), "ended() flips exactly at TOTAL");
ok(M.TIMELINE.find(b => b.id === "drop").at >
   M.TIMELINE.find(b => b.id === "line").at + M.TIMELINE.find(b => b.id === "line").dur - 40,
   "Rusty starts after the line has essentially landed");

console.log("\nposes");
for (const [w, h] of [[320, 568], [375, 667], [720, 900], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
  const v = M.view(w, h), g = M.gatePose(v), p = M.heroPose(v);
  const mid = M.lerpPose(g, p, 0.5);
  ok(Object.values(mid).every(Number.isFinite) && g.s > 0 && p.s > 0,
     `${w}x${h} poses finite, mobile=${v.mobile}`);
}
const d = M.view(1440, 900), mo = M.view(375, 667);
ok(near(M.gatePose(d).cx, 720) && near(M.gatePose(d).cy, 450), "gate pose holds the centre");
ok(M.heroPose(d).cx > M.gatePose(d).cx && M.heroPose(d).s > M.gatePose(d).s,
   "desktop hero moves right and grows");
ok(M.heroPose(mo).cy < M.gatePose(mo).cy && M.heroPose(mo).s < M.gatePose(mo).s,
   "mobile hero rises and recedes");
ok(M.heroPose(mo).alpha < 1, "mobile hero dims into a watermark");
ok(JSON.stringify(M.lerpPose(M.gatePose(d), M.heroPose(d), 0)) === JSON.stringify(M.gatePose(d)) &&
   JSON.stringify(M.lerpPose(M.gatePose(d), M.heroPose(d), 1)) === JSON.stringify(M.heroPose(d)),
   "lerpPose hits both ends exactly, so a settle never snaps");
for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const p = M.heroPose(M.view(w, h)), half = p.s * 0.62;
  ok(p.cx + half < w && p.cx - half > w * 0.45,
     `${w}x${h}: settled X is on screen and clear of the name`);
}

console.log("\npointer");
ok(Math.abs(M.PARALLAX.mon.yaw * 180 / Math.PI) < 2, "X parallax under 2 degrees");
ok(Math.abs(M.PARALLAX.slab.yaw * 180 / Math.PI) < 3, "slab parallax under 3 degrees");
ok(M.PARALLAX.eye.tau < M.PARALLAX.slab.tau && M.PARALLAX.slab.tau < M.PARALLAX.mon.tau,
   "eyes respond fastest, then slab, then X");
let maxYaw = 0, maxPitch = 0;
for (let t = 0; t < 120; t += 0.1) {
  const b = M.breath(t);
  maxYaw = Math.max(maxYaw, Math.abs(b.yaw));
  maxPitch = Math.max(maxPitch, Math.abs(b.pitch));
}
ok(near(maxYaw, M.BREATH.yaw, 2e-3) && near(maxPitch, M.BREATH.pitch, 2e-3),
   "gate breath stays inside its amplitude");
ok(M.breath(0).yaw === 0, "breath starts level so the first settle cannot snap");

console.log(fail ? `\n${fail} of ${checks} FAILED\n` : `\nall ${checks} checks passed\n`);
process.exit(fail ? 1 : 0);
