/* Checks the intro beat sheet against script.md and its own clock.
   Run: node lab/intro/verify.js
   Exit 1 on any failure. No dependencies. */
"use strict";

const fs = require("fs");
const path = require("path");
const sheet = require("./beats.js");

const DIR = __dirname;
const doc = fs.readFileSync(path.join(DIR, "script.md"), "utf8");
const files = ["script.md", "beats.js", "verify.js"];
const TYPED = { voice: 26, site: 18 };
const DASH = /[\u2013\u2014]/;
let fails = 0;

function ok(cond, msg) {
  if (!cond) {
    fails += 1;
    console.log("FAIL  " + msg);
  }
}

function near(a, b, eps) {
  return Math.abs(a - b) <= (eps || 0.001);
}

const { intro, scenes, at } = sheet;

// ---------- shape ----------
ok(Array.isArray(scenes) && scenes.length === 6, "six scenes");
ok(scenes[0].in === 0, "first scene starts at 0");
ok(near(scenes[5].out, intro.toGate + intro.gate), "last scene ends at the handoff");

let chars = 0;
let typedMs = 0;
let beats = 0;

for (let i = 0; i < scenes.length; i++) {
  const s = scenes[i];
  ok(typeof s.id === "string" && s.id.length > 0, "scene " + (i + 1) + " has an id");
  ok(s.out > s.in, "scene " + s.id + " has positive length");
  ok(s.beats.length > 0, "scene " + s.id + " has beats");
  ok(Array.isArray(s.beats) && s.beats.every((b) => b.out > b.in), "scene " + s.id + " beats have length");
  ok(near(s.beats[0].in, s.in), "scene " + s.id + " starts on its first beat");
  ok(near(s.beats[s.beats.length - 1].out, s.out), "scene " + s.id + " ends on its last beat");

  for (let j = 0; j < s.beats.length; j++) {
    const b = s.beats[j];
    beats += 1;
    ok(["none", "site", "screen", "voice", "choice", "prompt"].includes(b.kind), "beat kind: " + b.kind);
    ok(b.kind === "none" ? b.copy === null : typeof b.copy === "string", "copy matches kind at " + b.in);
    if (b.copy) {
      ok(b.copy === b.copy.toLowerCase(), "lowercase: " + b.copy);
      ok(!DASH.test(b.copy), "no dash in copy: " + b.copy);
      ok(b.copy.length <= 52, "copy under 52 chars: " + b.copy);
      ok(doc.includes(b.copy), "copy in script.md: " + b.copy);
      chars += b.copy.length;
      typedMs += b.copy.length * (TYPED[b.kind] || 0);
    }
    if (j > 0) {
      ok(near(s.beats[j - 1].out, b.in), "beats join in " + s.id);
    }
  }

  if (i > 0) ok(near(scenes[i - 1].out, s.in), "scenes join at " + s.id);
}

// ---------- clock ----------
ok(near(intro.toGate, 22), "22.00 to the gate");
ok(near(scenes[4].out, intro.toGate), "gate scene starts at 22.00");
ok(near(intro.gate, 8), "gate is 8.00");
ok(near(scenes[5].out - scenes[5].in, intro.gate), "gate scene length is 8.00");
ok(near(intro.handoff, 30), "handoff at 30.00");
ok(near(intro.engine, 30.95), "engine at 30.95");
ok(near(intro.autoPick + intro.pickLead, 16), "auto pick plus lead lands on scene 5");
ok(near(intro.autoPulse, 15.2) && near(intro.autoPick, 15.5), "auto pulse and pick sit in the choose scene");

const sum = scenes.reduce((n, s) => n + (s.out - s.in), 0);
const sumToGate = scenes.slice(0, 5).reduce((n, s) => n + (s.out - s.in), 0);
ok(near(sumToGate, intro.toGate), "scenes 1 to 5 sum to 22.00");
ok(near(sum, intro.handoff), "all six scenes sum to the handoff");

// ---------- lookup ----------
const t0 = at(0);
ok(t0 && t0.scene === "void", "at(0) is void");
const t1 = at(29);
ok(t1 && t1.scene === "gate" && t1.beat && t1.beat.copy === "found.", "at(29.0) is found.");
ok(at(29.99) !== null && at(29.99).beat.copy === null, "at(29.99) is the hold");
ok(at(30) === null, "at(30) is the handoff");
const t2 = at(15.9);
ok(t2 && t2.scene === "choose" && t2.beat && t2.beat.kind === "none", "at(15.9) is the auto pick");

// ---------- document ----------
ok(!DASH.test(doc), "no dash in script.md");
ok(doc.includes("that's the tour. the glass is still warm."), "explore branch exit line");
const heads = doc.match(/^## Scene \d/gm) || [];
ok(heads.length === 6, "six scene headings in script.md");
ok((doc.match(/^## Scene 6: gate/m) || []).length === 1, "scene 6 heading");
ok(doc.includes("Handoff"), "handoff section");

for (let i = 0; i < scenes.length; i++) {
  ok(doc.includes("## Scene " + (i + 1) + ":"), "scene heading " + (i + 1));
}

// ---------- size ----------
for (const f of files) {
  const size = fs.statSync(path.join(DIR, f)).size;
  ok(size < 60 * 1024, f + " under 60KB");
}

// ---------- report ----------
const secs = (ms) => (ms / 1000).toFixed(2);
if (fails) {
  console.log("\n" + fails + " failure" + (fails === 1 ? "" : "s"));
  process.exit(1);
}
console.log("ok  6 scenes, " + beats + " beats, " + sumToGate.toFixed(2) + "s to gate, " + intro.gate.toFixed(2) + "s gate");
console.log("ok  " + chars + " characters of copy, " + secs(typedMs) + "s typed");
console.log("ok  handoff " + intro.handoff.toFixed(2) + "s, engine " + intro.engine.toFixed(2) + "s");
console.log("ok  script.md, beats.js and verify.js agree");
