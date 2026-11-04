"use strict";

/* Xenith intro assets. Zero dependencies, Node built-ins only.
   Palette locked. Rectangles only, so every edge is a pixel step.
   Run: node build.js            writes the four SVGs
        node build.js --dump     also prints the six Rusty poses as ASCII */

const fs = require("node:fs");
const path = require("node:path");

const OUT = __dirname;

const PALETTE = Object.freeze({
  void: "#05040c",
  amber: "#ffb15c",
  cream: "#ffe9b0",
  violet: "#7b5cff",
  mint: "#9ef0c0",
});

const KEY = { V: "void", A: "amber", C: "cream", X: "violet", M: "mint" };
const ORDER = ["V", "C", "A", "M", "X"];

/* ---------------------------------------------------------------- grid ---- */

const RW = 42;
const RH = 46;

function grid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(null));
}

function put(g, x, y, w, h, c) {
  if (!c) return;
  for (let j = y; j < y + h; j++) {
    if (j < 0 || j >= g.length) continue;
    for (let i = x; i < x + w; i++) {
      if (i < 0 || i >= g[0].length) continue;
      g[j][i] = c;
    }
  }
}

function cell(g, x, y, c) {
  if (!c) return;
  if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) return;
  g[y][x] = c;
}

function compose(layers) {
  const out = grid(RW, RH);
  for (const layer of layers) {
    const dy = layer.dy || 0;
    for (let y = 0; y < RH; y++) {
      for (let x = 0; x < RW; x++) {
        const c = layer.g[y][x];
        const ty = y + dy;
        if (c && ty >= 0 && ty < RH) out[ty][x] = c;
      }
    }
  }
  return out;
}

function keyOf(c) {
  return c.split(":")[0];
}

function rgba(c) {
  const [k, a] = c.split(":");
  const fill = PALETTE[KEY[k]];
  if (!fill) throw new Error("palette miss: " + c);
  return { fill, op: a ? String(Number(a)) : null };
}

/* Greedy rectangle merge. A grid cell is one colour: rows and columns of the
   same cell become a single path rectangle, which keeps the files small. */
function paths(g, wanted) {
  const h = g.length;
  const w = g[0].length;
  const used = Array.from({ length: h }, () => new Uint8Array(w));
  const rects = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (used[y][x] || g[y][x] !== wanted) continue;
      let bw = 1;
      while (
        x + bw < w &&
        !used[y][x + bw] &&
        g[y][x + bw] === wanted
      ) {
        bw++;
      }
      let bh = 1;
      grow: while (y + bh < h) {
        for (let i = x; i < x + bw; i++) {
          if (used[y + bh][i] || g[y + bh][i] !== wanted) break grow;
        }
        bh++;
      }
      for (let j = y; j < y + bh; j++) {
        for (let i = x; i < x + bw; i++) used[j][i] = 1;
      }
      rects.push([x, y, bw, bh]);
    }
  }
  return rects
    .map(([x, y, bw, bh]) => `M${x} ${y}h${bw}v${bh}H${x}`)
    .join("");
}

function paint(g) {
  const seen = new Set();
  for (const row of g) for (const c of row) if (c) seen.add(c);
  const keys = [...seen].sort((a, b) => {
    const ka = ORDER.indexOf(keyOf(a));
    const kb = ORDER.indexOf(keyOf(b));
    if (ka !== kb) return ka - kb;
    return a.localeCompare(b);
  });
  return keys
    .map((c) => {
      const { fill, op } = rgba(c);
      const attr = op === null ? "" : ` fill-opacity="${op}"`;
      return `<g fill="${fill}"${attr}><path d="${paths(g, c)}"/></g>`;
    })
    .join("");
}

function part(id, g) {
  return `<g id="${id}">${paint(g)}</g>`;
}

/* ---------------------------------------------------------------- rusty --- */

function shadow(kind) {
  const g = grid(RW, RH);
  if (kind === "jump") {
    put(g, 16, 44, 10, 1, "X:0.18");
    put(g, 19, 45, 4, 1, "X:0.1");
  } else if (kind === "low") {
    put(g, 10, 44, 22, 1, "X:0.2");
    put(g, 13, 45, 16, 1, "X:0.1");
  } else {
    put(g, 13, 44, 16, 1, "X:0.22");
    put(g, 16, 45, 10, 1, "X:0.1");
  }
  return g;
}

function treads() {
  const g = grid(RW, RH);
  /* silhouette, stepped corners */
  put(g, 13, 39, 16, 1, "V");
  put(g, 12, 40, 18, 3, "V");
  put(g, 13, 43, 16, 1, "V");
  /* violet belt, shaded before the rollers go on */
  put(g, 14, 40, 14, 1, "X");
  put(g, 13, 41, 16, 2, "X");
  put(g, 14, 42, 14, 1, "V:0.45");
  /* rollers */
  put(g, 15, 41, 2, 2, "C");
  put(g, 20, 41, 2, 2, "C");
  put(g, 25, 41, 2, 2, "C");
  put(g, 16, 41, 1, 1, "X");
  put(g, 21, 41, 1, 1, "X");
  put(g, 26, 41, 1, 1, "X");
  /* side lamps */
  put(g, 13, 41, 1, 2, "A");
  put(g, 28, 41, 1, 2, "A");
  /* belt lights */
  put(g, 17, 40, 1, 1, "A:0.5");
  put(g, 24, 40, 1, 1, "A:0.5");
  return g;
}

function body() {
  const g = grid(RW, RH);
  /* neck, visible for two rows below the head */
  put(g, 18, 25, 6, 4, "V");
  put(g, 19, 25, 4, 3, "C");
  put(g, 21, 26, 1, 2, "X");
  /* shell */
  put(g, 13, 28, 16, 1, "V");
  put(g, 12, 29, 18, 9, "V");
  put(g, 13, 38, 16, 1, "V");
  put(g, 13, 29, 16, 8, "C");
  put(g, 13, 37, 16, 1, "X");
  /* chest bezel and screen */
  put(g, 14, 30, 14, 7, "A");
  put(g, 15, 31, 12, 5, "V");
  /* chest lights and one heartbeat */
  put(g, 16, 31, 1, 1, "A");
  put(g, 20, 31, 1, 1, "M");
  put(g, 24, 31, 1, 1, "A");
  put(g, 16, 33, 3, 1, "M:0.85");
  put(g, 19, 32, 1, 1, "M:0.85");
  put(g, 20, 34, 1, 1, "M:0.85");
  put(g, 21, 33, 5, 1, "M:0.85");
  /* side vents */
  put(g, 13, 32, 1, 3, "X");
  put(g, 28, 32, 1, 3, "X");
  /* rivets and shoulder bolts */
  put(g, 14, 29, 1, 1, "A");
  put(g, 27, 29, 1, 1, "A");
  put(g, 12, 30, 1, 1, "A");
  put(g, 29, 30, 1, 1, "A");
  return g;
}

function head() {
  const g = grid(RW, RH);
  /* ears sit behind the shell */
  for (const side of [-1, 1]) {
    const x = side < 0 ? 7 : 32;
    put(g, x, 15, 3, 8, "V");
    put(g, x + 1, 16, 2, 6, "C");
    put(g, x + 1, 18, 1, 2, "A");
    put(g, side < 0 ? 9 : 32, 17, 1, 1, "X");
  }
  /* shell silhouette with a one cell corner notch */
  put(g, 11, 11, 20, 1, "V");
  put(g, 10, 12, 22, 13, "V");
  put(g, 11, 25, 20, 1, "V");
  /* cream shell */
  put(g, 11, 12, 20, 12, "C");
  put(g, 11, 24, 20, 1, "C");
  /* amber bezel, void screen */
  put(g, 12, 13, 18, 12, "A");
  put(g, 13, 14, 16, 10, "V");
  /* right shell edge takes the shadow */
  put(g, 30, 13, 1, 11, "X");
  /* rivets */
  put(g, 12, 12, 1, 1, "A");
  put(g, 29, 12, 1, 1, "A");
  put(g, 11, 24, 1, 1, "C");
  put(g, 30, 24, 1, 1, "X");
  return g;
}

function screenBase(g) {
  put(g, 13, 14, 16, 1, "X:0.28");
  put(g, 13, 23, 16, 1, "X:0.2");
}

function faceIdle() {
  const g = grid(RW, RH);
  screenBase(g);
  put(g, 16, 17, 3, 3, "A");
  put(g, 23, 17, 3, 3, "A");
  cell(g, 16, 17, "C");
  cell(g, 23, 17, "C");
  put(g, 19, 21, 4, 1, "A");
  cell(g, 19, 21, "C:0.55");
  return g;
}

function faceBlink() {
  const g = grid(RW, RH);
  screenBase(g);
  put(g, 16, 18, 3, 1, "A");
  put(g, 23, 18, 3, 1, "A");
  cell(g, 16, 18, "C");
  cell(g, 23, 18, "C");
  put(g, 19, 21, 4, 1, "A");
  return g;
}

function faceHappy() {
  const g = grid(RW, RH);
  screenBase(g);
  /* two up arcs */
  cell(g, 17, 16, "A");
  put(g, 16, 17, 3, 1, "A");
  cell(g, 24, 16, "A");
  put(g, 23, 17, 3, 1, "A");
  cell(g, 17, 16, "C:0.7");
  cell(g, 24, 16, "C:0.7");
  /* cheeks */
  cell(g, 14, 20, "A:0.4");
  cell(g, 27, 20, "A:0.4");
  /* smile */
  put(g, 18, 21, 6, 1, "A");
  put(g, 19, 22, 4, 1, "A");
  cell(g, 18, 21, "C:0.5");
  return g;
}

function faceExcited() {
  const g = grid(RW, RH);
  screenBase(g);
  /* wide eyes */
  put(g, 15, 16, 4, 4, "A");
  put(g, 23, 16, 4, 4, "A");
  put(g, 15, 16, 2, 1, "C");
  put(g, 23, 16, 2, 1, "C");
  put(g, 15, 19, 1, 1, "X:0.45");
  put(g, 23, 19, 1, 1, "X:0.45");
  /* open mouth */
  put(g, 19, 20, 4, 3, "A");
  put(g, 20, 21, 2, 1, "V");
  cell(g, 19, 20, "C");
  return g;
}

function faceScan() {
  const g = grid(RW, RH);
  screenBase(g);
  /* narrowed eyes */
  put(g, 16, 18, 3, 1, "A");
  put(g, 23, 18, 3, 1, "A");
  cell(g, 16, 18, "C");
  cell(g, 23, 18, "C");
  /* sweeping mint bar, with a stepped ghost on each side */
  put(g, 13, 19, 16, 1, "M:0.18");
  put(g, 13, 20, 16, 1, "M");
  put(g, 13, 21, 16, 1, "M:0.12");
  cell(g, 28, 20, "C");
  /* small mouth */
  put(g, 20, 22, 2, 1, "A");
  return g;
}

function faceSad() {
  const g = grid(RW, RH);
  screenBase(g);
  /* brows fall toward the middle */
  put(g, 16, 16, 2, 1, "A");
  cell(g, 18, 17, "A");
  put(g, 24, 16, 2, 1, "A");
  cell(g, 23, 17, "A");
  /* half lidded eyes */
  put(g, 16, 19, 3, 1, "A");
  put(g, 23, 19, 3, 1, "A");
  cell(g, 16, 19, "C:0.5");
  cell(g, 25, 19, "C:0.5");
  /* one tear and a frown */
  put(g, 17, 20, 1, 2, "C:0.8");
  put(g, 20, 21, 2, 1, "A");
  cell(g, 19, 22, "A");
  cell(g, 22, 22, "A");
  return g;
}

const FACES = {
  idle: faceIdle,
  blink: faceBlink,
  happy: faceHappy,
  excited: faceExcited,
  scan: faceScan,
  sad: faceSad,
};

function antennaBase(g) {
  put(g, 18, 9, 6, 2, "V");
  put(g, 19, 9, 4, 2, "A");
  put(g, 20, 9, 2, 1, "C");
  cell(g, 22, 10, "X");
}

function halo(g, x, y, wide) {
  put(g, x, y, wide, 1, "A:0.1");
  put(g, x - 1, y + 1, wide + 2, 1, "A:0.08");
  put(g, x - 2, y + 2, wide + 4, 2, "A:0.06");
  put(g, x - 1, y + 4, wide + 2, 1, "A:0.05");
}

function antUpright() {
  const g = grid(RW, RH);
  halo(g, 19, 2, 4);
  put(g, 18, 2, 6, 4, "V");
  put(g, 19, 3, 4, 2, "A");
  put(g, 20, 3, 2, 1, "C");
  put(g, 19, 5, 4, 4, "V");
  put(g, 20, 5, 2, 4, "C");
  put(g, 21, 6, 1, 3, "X");
  antennaBase(g);
  return g;
}

function antTiltR() {
  const g = grid(RW, RH);
  halo(g, 22, 2, 4);
  /* stepped rod first, the bulb sits over its top */
  put(g, 19, 7, 4, 3, "V");
  put(g, 20, 7, 2, 3, "C");
  put(g, 20, 5, 4, 2, "V");
  put(g, 21, 5, 2, 2, "C");
  put(g, 21, 3, 4, 2, "V");
  put(g, 22, 3, 2, 2, "C");
  put(g, 21, 2, 6, 5, "V");
  put(g, 22, 3, 4, 3, "A");
  put(g, 23, 3, 2, 1, "C");
  put(g, 22, 6, 1, 1, "X");
  put(g, 21, 8, 1, 1, "X");
  antennaBase(g);
  return g;
}

function antTiltL() {
  const g = grid(RW, RH);
  halo(g, 16, 2, 4);
  put(g, 19, 7, 4, 3, "V");
  put(g, 20, 7, 2, 3, "C");
  put(g, 18, 5, 4, 2, "V");
  put(g, 19, 5, 2, 2, "C");
  put(g, 17, 3, 4, 2, "V");
  put(g, 18, 3, 2, 2, "C");
  put(g, 15, 2, 6, 5, "V");
  put(g, 16, 3, 4, 3, "A");
  put(g, 17, 3, 2, 1, "C");
  put(g, 18, 6, 1, 1, "X");
  put(g, 20, 8, 1, 1, "X");
  antennaBase(g);
  return g;
}

function antSpark() {
  const g = antUpright();
  /* two four point sparks beside the bulb, inside the jump margin */
  cell(g, 16, 2, "A");
  cell(g, 15, 3, "A");
  cell(g, 17, 3, "A");
  cell(g, 16, 4, "A");
  cell(g, 25, 2, "A");
  cell(g, 24, 3, "A");
  cell(g, 26, 3, "A");
  cell(g, 25, 4, "A");
  cell(g, 17, 2, "C:0.7");
  cell(g, 24, 2, "C:0.7");
  return g;
}

function antDroop() {
  const g = grid(RW, RH);
  /* a dim halo because the bulb is low and turned away */
  put(g, 23, 3, 4, 1, "A:0.06");
  put(g, 22, 4, 6, 2, "A:0.04");
  /* rod sags to the right, drawn under the bulb */
  put(g, 19, 8, 4, 2, "V");
  put(g, 20, 8, 2, 2, "C");
  put(g, 20, 6, 4, 2, "V");
  put(g, 21, 6, 2, 2, "C");
  put(g, 22, 4, 4, 2, "V");
  put(g, 23, 4, 2, 2, "C");
  put(g, 22, 3, 6, 5, "V");
  put(g, 23, 4, 4, 3, "A");
  put(g, 24, 4, 2, 1, "C");
  put(g, 23, 8, 1, 1, "X");
  antennaBase(g);
  return g;
}

const ANTS = {
  upright: antUpright,
  tiltR: antTiltR,
  tiltL: antTiltL,
  spark: antSpark,
  droop: antDroop,
};

/* Arms are drawn behind the body, so shoulders disappear into the shell. */
function armDown(g, side) {
  const x = side < 0 ? 9 : 30;
  const cream = side < 0 ? x + 1 : x;
  put(g, x, 29, 3, 5, "V");
  put(g, cream, 29, 2, 4, "C");
  put(g, x, 33, 2, 1, "A");
  put(g, x + 1, 33, 1, 1, "X");
  put(g, x, 34, 3, 4, "V");
  put(g, cream, 34, 2, 3, "C");
  put(g, x, 37, 3, 2, "A");
  cell(g, x, 37, "C:0.4");
}

function armsDown() {
  const g = grid(RW, RH);
  armDown(g, -1);
  armDown(g, 1);
  return g;
}

function armOut(g, side) {
  const x = side < 0 ? 9 : 30;
  const cream = side < 0 ? x + 1 : x;
  /* upper arm stays on the shell, then one clean step outward */
  put(g, x, 29, 3, 5, "V");
  put(g, cream, 29, 2, 4, "C");
  const x1 = side < 0 ? 7 : 32;
  put(g, x1, 33, 3, 4, "V");
  put(g, side < 0 ? x1 + 1 : x1, 33, 2, 3, "C");
  put(g, side < 0 ? 6 : 34, 36, 3, 2, "A");
  cell(g, side < 0 ? 6 : 34, 36, "C:0.5");
  cell(g, side < 0 ? 9 : 32, 33, "X");
}

function armsOut() {
  const g = grid(RW, RH);
  armOut(g, -1);
  armOut(g, 1);
  return g;
}

function armUp(g, side) {
  /* an L shaped arm: out from the shoulder, then straight up and clear of the head */
  if (side < 0) {
    put(g, 7, 29, 5, 3, "V");
    put(g, 8, 29, 3, 2, "C");
    put(g, 4, 18, 3, 14, "V");
    put(g, 5, 18, 2, 12, "C");
    put(g, 2, 15, 4, 4, "V");
    put(g, 3, 16, 2, 2, "A");
    cell(g, 3, 16, "C");
    cell(g, 4, 29, "X");
    cell(g, 6, 29, "A");
  } else {
    put(g, 30, 29, 5, 3, "V");
    put(g, 31, 29, 3, 2, "C");
    put(g, 35, 18, 3, 14, "V");
    put(g, 35, 18, 2, 12, "C");
    put(g, 36, 15, 4, 4, "V");
    put(g, 37, 16, 2, 2, "A");
    cell(g, 37, 16, "C");
    cell(g, 37, 29, "X");
    cell(g, 34, 29, "A");
  }
}

function armsUp() {
  const g = grid(RW, RH);
  armUp(g, -1);
  armUp(g, 1);
  return g;
}

function armsOneUp() {
  const g = grid(RW, RH);
  armDown(g, -1);
  /* right arm points, one straight bar with an amber hand and a mint tip */
  put(g, 30, 29, 5, 3, "V");
  put(g, 31, 29, 3, 2, "C");
  put(g, 35, 29, 3, 3, "A");
  cell(g, 35, 29, "C:0.5");
  put(g, 38, 29, 1, 2, "M");
  cell(g, 30, 31, "X");
  return g;
}

const ARMS = {
  down: armsDown,
  out: armsOut,
  up: armsUp,
  oneUp: armsOneUp,
};

const POSES = [
  { id: "idle", dy: 0, shadow: "normal", arms: "down", ant: "upright", face: "idle" },
  { id: "blink", dy: 0, shadow: "normal", arms: "down", ant: "upright", face: "blink" },
  { id: "happy", dy: -1, shadow: "normal", arms: "out", ant: "tiltR", face: "happy" },
  { id: "excited", dy: -2, shadow: "jump", arms: "up", ant: "spark", face: "excited" },
  { id: "scan", dy: 0, shadow: "normal", arms: "oneUp", ant: "tiltL", face: "scan" },
  { id: "sad", dy: 1, shadow: "low", arms: "down", ant: "droop", face: "sad" },
];

function rustySvg() {
  const shadows = {
    normal: shadow("normal"),
    jump: shadow("jump"),
    low: shadow("low"),
  };
  const faces = {};
  for (const [id, make] of Object.entries(FACES)) faces[id] = make();
  const ants = {};
  for (const [id, make] of Object.entries(ANTS)) ants[id] = make();
  const arms = {};
  for (const [id, make] of Object.entries(ARMS)) arms[id] = make();

  const defs = [];
  for (const [id, g] of Object.entries(shadows)) defs.push(part(`rz-shadow-${id}`, g));
  defs.push(part("rz-treads", treads()));
  defs.push(part("rz-body", body()));
  defs.push(part("rz-head", head()));
  for (const [id, g] of Object.entries(arms)) defs.push(part(`rz-arms-${id}`, g));
  for (const [id, g] of Object.entries(ants)) defs.push(part(`rz-ant-${id}`, g));
  for (const [id, g] of Object.entries(faces)) defs.push(part(`rz-face-${id}`, g));

  for (const p of POSES) {
    defs.push(
      `<symbol id="rz-${p.id}" viewBox="0 0 ${RW} ${RH}">` +
        `<use href="#rz-shadow-${p.shadow}"/>` +
        `<use href="#rz-treads"/>` +
        `<g transform="translate(0 ${p.dy})">` +
        `<use href="#rz-arms-${p.arms}"/>` +
        `<use href="#rz-body"/>` +
        `<use href="#rz-ant-${p.ant}"/>` +
        `<use href="#rz-head"/>` +
        `<use href="#rz-face-${p.face}"/>` +
        `</g>` +
        `</symbol>`
    );
  }

  const sheet = POSES.map(
    (p, i) =>
      `<use href="#rz-${p.id}" x="${2 + i * 44}" y="2" width="${RW}" height="${RH}"/>`
  ).join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 266 50" width="1064" height="200" ` +
    `shape-rendering="crispEdges" role="img" aria-labelledby="rz-title rz-desc">` +
    `<title id="rz-title">Rusty pose sheet, six frames</title>` +
    `<desc id="rz-desc">Idle, blink, happy, excited, scan and sad. Pixel stepped, palette locked. ` +
    `Frames run left to right at 42 by 46 cells.</desc>` +
    `<defs>${defs.join("")}</defs>` +
    `<g id="rusty-sheet">${sheet}</g>` +
    `</svg>\n`
  );
}

/* ---------------------------------------------------------------- debug --- */

function dumpPose(p) {
  const arms = ARMS[p.arms]();
  const bodyG = body();
  const headG = head();
  const ant = ANTS[p.ant]();
  const face = FACES[p.face]();
  const tread = treads();
  const sh = shadow(p.shadow);
  const out = compose([
    { g: sh },
    { g: tread },
    { g: arms, dy: p.dy },
    { g: bodyG, dy: p.dy },
    { g: ant, dy: p.dy },
    { g: headG, dy: p.dy },
    { g: face, dy: p.dy },
  ]);
  const char = { V: "#", C: "c", A: "a", M: "m", X: "x" };
  const lines = out.map((row) =>
    row.map((c) => (c ? char[keyOf(c)] : ".")).join("")
  );
  return `${p.id}\n+${"-".repeat(RW)}+\n${lines
    .map((l) => `|${l}|`)
    .join("\n")}\n+${"-".repeat(RW)}+`;
}

/* ----------------------------------------------------------------- main --- */

function main() {
  const files = {
    "rusty-poses.svg": rustySvg(),
  };

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name), content);
    process.stdout.write(`${name} ${Buffer.byteLength(content)} bytes\n`);
  }

  if (process.argv.includes("--armdump")) {
    const g = armsOut();
    const char = { V: "#", C: "c", A: "a", M: "m", X: "x" };
    for (let y = 26; y < 40; y++) {
      process.stdout.write(String(y).padStart(2, " ") + " " + g[y].map((c) => (c ? char[keyOf(c)] : ".")).join("") + "\n");
    }
  }

  if (process.argv.includes("--dump")) {
    for (const p of POSES) process.stdout.write("\n" + dumpPose(p) + "\n");
  }
}

main();
