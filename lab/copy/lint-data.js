#!/usr/bin/env node
// Lint the copy that actually ships. Node stdlib only.
//   node lab/copy/lint-data.js
//
// triage.js lints the drafting deck in lab/copy/lines.js, which is not what a
// visitor sees. This lints site/data.js directly, including the tags that
// render on the shared card. Run it before deploying.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DATA = path.join(__dirname, "..", "..", "site", "data.js");

const MIN = 55;
const MAX = 120;
const TAG_MAX = 44;

const BANNED = [
  "thrilled", "excited", "exciting", "proud", "honoured", "honored",
  "journey", "passion", "passionate", "amazing", "incredible", "rockstar",
  "superstar", "blessed", "grateful", "family", "can't wait", "cannot wait",
  "not just", "not only", "more than just", "at the end of the day"
];

// Acronyms and proper nouns that are legitimately capitalised mid-sentence.
const CAPS_OK = new Set([
  "PM", "AM", "ID", "AV", "OK", "TV", "DJ", "MC", "MIT", "ISRO", "CTO", "CEO",
  "AI", "SSL", "IT", "JPMORGAN", "RAZORPAY", "XENITH", "BHANDARY", "CHAKROBORTY",
  "FITOOR", "CHANDRAYAAN", "SOMANATH"
]);

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(DATA, "utf8"), sandbox, { filename: "data.js" });
const PEOPLE = sandbox.window.XENITH_PEOPLE;

if (!PEOPLE) {
  console.error("FAIL  site/data.js did not set window.XENITH_PEOPLE");
  process.exit(1);
}

function chars(s) { return Array.from(s).length; }
function sentences(s) { return s.split(/(?<=[.!?])\s+/).filter(Boolean); }
function words(s) { return s.toLowerCase().match(/[a-z']+/g) || []; }

const failures = [];
function fail(slug, field, msg) {
  failures.push(`${slug}.${field}: ${msg}`);
}

const slugs = Object.keys(PEOPLE).filter((k) => k !== "default");
let tagOverlapWarn = 0;

for (const slug of slugs) {
  const p = PEOPLE[slug];
  const line = String(p.line || "").trim();
  const tag = String(p.tag || "").trim();

  for (const field of ["name", "dept", "role", "line", "tag"]) {
    if (!String(p[field] || "").trim()) fail(slug, field, "is empty");
  }

  const n = chars(line);
  if (n < MIN) fail(slug, "line", `${n} chars, under ${MIN}`);
  if (n > MAX) fail(slug, "line", `${n} chars, over ${MAX}`);
  if (sentences(line).length > 2) fail(slug, "line", "more than two sentences");
  if (!line.endsWith(".")) fail(slug, "line", "does not end with a period");
  if (line.includes("!")) fail(slug, "line", "has an exclamation mark");
  if (/[\u2013\u2014]/.test(line)) fail(slug, "line", "has an en or em dash");
  if (!/\byou\b/i.test(line)) fail(slug, "line", "never addresses the reader as you");
  if (!/^[A-Z]/.test(line)) fail(slug, "line", "does not start with a capital");

  const lower = line.toLowerCase();
  for (const b of BANNED) if (lower.includes(b)) fail(slug, "line", `banned phrase "${b}"`);

  for (const w of line.split(/\s+/)) {
    const bare = w.replace(/[^A-Za-z]/g, "");
    if (bare.length > 1 && bare === bare.toUpperCase() && !CAPS_OK.has(bare)) {
      fail(slug, "line", `all-caps word "${bare}" outside the allowlist`);
    }
  }

  // tags: a second beat, not a restatement
  const tn = chars(tag);
  if (tn > TAG_MAX) fail(slug, "tag", `${tn} chars, over ${TAG_MAX}`);
  if (tag.endsWith(".")) fail(slug, "tag", "ends with a period");
  if (tag === tag.toUpperCase() && /[A-Z]{4,}/.test(tag)) fail(slug, "tag", "is all caps");
  for (const w of tag.split(/\s+/)) {
    const bare = w.replace(/[^A-Za-z]/g, "");
    if (bare.length > 1 && bare === bare.toUpperCase() && !CAPS_OK.has(bare)) {
      fail(slug, "tag", `all-caps word "${bare}" outside the allowlist`);
    }
  }

  const lineWords = new Set(words(line));
  const fresh = words(tag).filter((w) => !lineWords.has(w) && w.length > 3);
  if (fresh.length === 0) {
    fail(slug, "tag", "shares every content word with its line, so it adds nothing");
  } else if (fresh.length <= 1) {
    tagOverlapWarn += 1;
    console.log(`warn  ${slug}.tag: only one word is new ("${fresh[0]}")`);
  }
}

console.log(`\n${slugs.length} shipped records, ${failures.length} failure(s)`);
for (const f of failures) console.log("FAIL  " + f);
if (tagOverlapWarn) console.log(`${tagOverlapWarn} tag(s) barely add a facet`);
process.exit(failures.length ? 1 : 0);
