#!/usr/bin/env node
// Xenith selected: lint the copy deck. Node stdlib only.
//   node triage.js
// Checks the tone rules in PERSONAL-LINES.md that can be checked by machine.
"use strict";

const { XENITH_COPY } = require("./lines.js");

const MIN = 55;
const MAX = 120;
const FALLBACK_MAX = 130;

const FAMILIES = ["placement", "record", "craft", "pitch"];
const FIELDS = ["WEAK", "PAST", "WORK", "IDEA", "FREE", "WHY"];

const BANNED = [
  "thrilled", "excited", "exciting", "proud", "honoured", "honored",
  "journey", "passion", "passionate", "amazing", "incredible", "rockstar",
  "superstar", "blessed", "grateful", "family", "can't wait", "cannot wait",
  "not just", "not only", "more than just", "at the end of the day"
];

const CAPS_OK = new Set(["PM", "AM", "ID", "AV", "OK", "TV", "DJ", "MC"]);

const records = Object.entries(XENITH_COPY);
const seen = new Map();
let failures = 0;

function chars(s) {
  return Array.from(s).length;
}

function words(s) {
  return s.trim().split(/\s+/).filter(Boolean);
}

function sentences(s) {
  return s.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function checkLine(label, text, opts) {
  const bad = [];
  const notes = [];
  const len = chars(text);

  if (opts.max && len > opts.max) bad.push(`${len} chars, over ${opts.max}`);
  if (opts.min && len < opts.min) bad.push(`${len} chars, under ${opts.min}`);
  if (text !== text.trim()) bad.push("leading or trailing space");
  if (/\s{2,}/.test(text)) bad.push("double space");
  if (/[\u2014\u2013]/.test(text)) bad.push("em or en dash");
  if (text.includes("!")) bad.push("exclamation mark");
  if (/[“”]/.test(text)) bad.push("curly double quote");
  if (!opts.noPeriod && !text.endsWith(".")) bad.push("does not end with a period");
  if (!/\byou\b|\byour\b|\byou're\b|\byou've\b/i.test(text)) bad.push("does not address the person");

  const lower = text.toLowerCase();
  for (const term of BANNED) {
    if (lower.includes(term)) bad.push(`banned: ${term}`);
  }

  const caps = text.match(/\b[A-Z]{2,}\b/g) || [];
  for (const c of caps) {
    if (!CAPS_OK.has(c)) bad.push(`all caps: ${c}`);
  }

  if (!opts.noSentences) {
    const parts = sentences(text);
    if (parts.length > 3) bad.push(`${parts.length} sentences, max 3`);
    for (let i = 2; i < parts.length; i++) {
      const n = words(parts[i]).length;
      if (n > 4) bad.push(`third sentence has ${n} words, max 4`);
    }
    if (parts.length === 3) notes.push("3 sentences, short tail");
  }

  if (opts.dupe) {
    const key = text.toLowerCase();
    if (seen.has(key)) bad.push(`duplicate of ${seen.get(key)}`);
    else seen.set(key, label);
  }

  return { bad, notes, len };
}

console.log(`xenith copy lint · ${records.length} records\n`);

for (const [slug, rec] of records) {
  const problems = [];

  for (const key of ["family", "field", "answer", "line", "fallback"]) {
    if (!rec[key] || !String(rec[key]).trim()) problems.push(`missing ${key}`);
  }
  if (rec.family && !FAMILIES.includes(rec.family)) problems.push(`unknown family ${rec.family}`);
  if (rec.field && !FIELDS.includes(rec.field)) problems.push(`unknown field ${rec.field}`);
  if (rec.mode && rec.family !== "placement") problems.push("mode set on a non placement line");
  if (rec.beat !== undefined && !Number.isInteger(rec.beat)) problems.push("beat is not an integer");
  if (rec.beat !== undefined && rec.beat < -1) problems.push("beat below -1");

  if (rec.line) {
    const r = checkLine(slug, rec.line, { min: MIN, max: MAX, dupe: true });
    problems.push(...r.bad);
  }
  if (rec.fallback) {
    const f = checkLine(slug, rec.fallback, { max: FALLBACK_MAX, noSentences: true });
    if (f.bad.length) problems.push(...f.bad.map((b) => `fallback: ${b}`));
  }
  if (rec.fallback && rec.line && rec.fallback === rec.line) problems.push("fallback repeats the line");

  const len = rec.line ? chars(rec.line) : 0;
  const shape = [rec.family, rec.mode].filter(Boolean).join("/");
  if (problems.length) {
    failures++;
    console.log(`${slug.padEnd(12)} FAIL  ${String(len).padStart(3)}ch  ${rec.field || "?"} ${shape}`);
    for (const p of problems) console.log(`  - ${p}`);
  } else {
    console.log(`${slug.padEnd(12)} ok    ${String(len).padStart(3)}ch  ${rec.field} ${shape}`);
  }
}

console.log("\n" + "-".repeat(52));
console.log(`${records.length} records, ${failures} failure${failures === 1 ? "" : "s"}`);
process.exit(failures ? 1 : 0);
