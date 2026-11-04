# Fixes: copy-paste patches

Every JS block below is checked with `node --check` (see `check-snippets.py`).
Line numbers refer to the current `site/xenith.js` and `site/style.css`.
Do not apply these blindly; the init order matters in three places, flagged `ORDER`.

---

## 1. Stop the NaN cascade (`xenith.js:23`, `:167-170`)

`W`/`H` are 0 until the campus JPEG finishes decoding, and `pointermove` divides
by them. One mouse move during load sets `tx = Infinity`, then `NaN`, and the X
and Rusty's pupils never draw again.

```js
let W = innerWidth, H = innerHeight;   // was: let W = 0, H = 0

addEventListener("pointermove", (e) => {
  if (!W || !H) return;                // NEW, the whole fix
  mx = (e.clientX / W - 0.5) * 2;
  my = (e.clientY / H - 0.5) * 2;
});
```

Belt and braces, where `tx`/`ty` are consumed (`:60`, `:179`, `:336`):

```js
const safe = (v, fallback) => (Number.isFinite(v) ? v : (fallback || 0));
tx = safe(tx);
ty = safe(ty);
```

---

## 2. Never let the X depend on the JPEG (`xenith.js:114`, `:164`, `:172-174`)

```js
img.onerror = () => { W = innerWidth; H = innerHeight; ready = true; };
img.onload = build;
```

ORDER: call `drawX(0)` once from boot, and drop the `ready` guard from the X path.
The backdrop can arrive late; the trace target cannot.

```js
function frame(t) {
  requestAnimationFrame(frame);
  if (!ready) { drawX(t); return; }   // X draws even with no backdrop
  // ...
}
```

---

## 3. Guard a missing `data.js` (`xenith.js:8`)

```js
const people = window.XENITH_PEOPLE || {};
const person = { ...(people[key] || people.default || {
  name: "Xenith", dept: "Crew", line: "You are in."
}) };
```

---

## 4. Focus and announce the unlock (`xenith.js:311-318`)

```js
function unlock() {
  if (document.body.classList.contains("entered")) return;
  document.body.classList.remove("locked");
  document.body.classList.add("entered");
  zoomTarget = 1.0;
  enteredTarget = 1;
  startRusty();

  // NEW: move focus out of the subtree we are about to hide
  const name = document.getElementById("name");
  if (name) {
    name.setAttribute("tabindex", "-1");
    name.focus({ preventScroll: true });
  }
  const live = document.getElementById("live");
  if (live) live.textContent = "You're in. " + person.name + ", " + person.dept + ".";
}
```

Add to `index.html`, right after `<main id="content">`:

```html
<p id="live" class="sr-only" aria-live="polite" aria-atomic="true"></p>
```

and to `style.css`:

```css
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
#name:focus{outline:none}
```

---

## 5. A real keyboard path (`index.html:31-38`)

`design.md:43` already specifies this button. It is the accessibility fix and a
design-spec fix in one.

```html
<div id="gate">
  <canvas id="xpad" aria-hidden="true"></canvas>
  <div class="prompt" id="prompt">
    <span class="p1">draw x</span>
    <span class="p2">to enter</span>
  </div>
  <button id="enter" type="button" class="gate-btn">[ enter xenith ]</button>
  <button id="skip" type="button">skip and enter</button>
</div>
```

```js
document.getElementById("enter").addEventListener("click", unlock);
document.getElementById("skip").addEventListener("click", unlock);
```

```css
.gate-btn,#skip{
  min-height:44px;min-width:44px;padding:14px 18px;
  color:rgba(255,233,176,.72);          /* 8.75:1, was .30 / 2.29:1 */
  background:none;border:0;font:inherit;font-size:11px;letter-spacing:.3em;
  text-transform:lowercase;cursor:pointer;
}
.gate-btn{position:absolute;left:50%;bottom:calc(74px + env(safe-area-inset-bottom));
  transform:translateX(-50%);z-index:2}
#skip{position:absolute;left:50%;bottom:calc(20px + env(safe-area-inset-bottom));
  transform:translateX(-50%);z-index:2}
.gate-btn:focus-visible,#skip:focus-visible{
  outline:2px solid var(--mint);outline-offset:4px;color:rgba(255,233,176,.9);
}
```

---

## 6. Respect reduced motion (`xenith.js:172`, `:367`)

```js
const RM = matchMedia("(prefers-reduced-motion: reduce)");
let still = RM.matches;
RM.addEventListener("change", (e) => { still = e.matches; });

function frame(t) {
  requestAnimationFrame(frame);
  if (still) {                 // one static pose, no parallax, no bob
    drawX(1200);
    return;
  }
  // ...existing body
}
```

For Rusty, `startRusty()` should draw one frame and skip the loop:

```js
function startRusty() {
  if (rustStarted) return;
  rustStarted = true;
  if (still) { drawRusty(0); return; }
  requestAnimationFrame(rustyLoop);
}
```

---

## 7. 30 fps cap and frame-rate-independent easing (`xenith.js:172-187`)

The brief asks for 30 fps. The code runs an uncapped rAF, and the lerps at
`:175-177` are per-frame constants, so a 120 Hz screen plays the reveal twice as
fast. These two changes must land together.

```js
let lastT = 0;
const STEP = 1000 / 30;

// exponential smoothing that is correct at any refresh rate
function approach(cur, target, k, dt) {
  return cur + (target - cur) * (1 - Math.pow(1 - k, dt / 16.667));
}

function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(50, t - lastT || 16.667);
  if (t - lastT < STEP) return;          // 30 fps budget, high refresh included
  lastT = t;
  if (!ready) { drawX(t); return; }

  tx = approach(tx, mx, 0.04, dt);
  ty = approach(ty, my, 0.04, dt);
  zoom = approach(zoom, zoomTarget, 0.035, dt);
  enteredMix = approach(enteredMix, enteredTarget, 0.03, dt);
  // ...rest unchanged
}
```

`rustyLoop` (`:367`) should be folded into this same tick. Two rAF loops on a
120 Hz display is two callbacks per refresh for one visual.

---

## 8. Kill the per-frame shadow churn (`xenith.js:83-93`)

This is the single biggest win on the hottest path: 540 glyphs, each with an
11 px shadow, 60 to 120 times a second. Bake two sprites and `drawImage` them.

```js
let sprH, sprL;
function bakeSprites() {
  const bake = (ch, size, color, alpha, blur) => {
    const pad = blur * 2 + 2;
    const c = document.createElement("canvas");
    const g = c.getContext("2d");
    g.font = size + "px ui-monospace, Menlo, monospace";
    const w = Math.ceil(g.measureText(ch).width) + pad;
    const h = Math.ceil(size * 1.6) + pad;
    c.width = Math.ceil(w * 2); c.height = Math.ceil(h * 2);
    g.scale(2, 2);
    g.font = size + "px ui-monospace, Menlo, monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.globalAlpha = alpha;
    g.shadowColor = "rgba(255,157,61,.85)";
    g.shadowBlur = blur;
    g.fillStyle = color;
    g.fillText(ch, w / 2, h / 2);
    return { c, w, h };
  };
  sprH = bake("#", 12, "rgba(255,214,150,.98)", 0.8, 11);   // front, matches :88
  sprL = bake(":", 8, "rgba(150,120,240,.75)", 0.45, 11);   // back, matches :90
}
```

Then replace the draw loop body:

```js
function drawPass(points, spr) {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    mctx.drawImage(spr.c, p.sx - spr.w / 2, p.sy - spr.h / 2, spr.w, spr.h);
  }
}
```

Split `proj` into `front` and `back` arrays during projection (`:71-78`) and drop
the in-loop `sort` and the per-point `mctx.font` assignment (`:91`). Two state
setups per frame instead of about 1,620.

Also stop allocating: preallocate `const proj = new Array(xpts.length)` at module
scope and reuse the objects instead of `proj.push({...})` (`:77`).

---

## 9. Debounce rebuilds (`xenith.js:165`, `:205`)

```js
let rebuildQueued = false;
function queueRebuild() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    if (ready) build();
  });
}
addEventListener("resize", queueRebuild, { passive: true });

let padQueued = false;
function queuePad() {
  if (padQueued) return;
  padQueued = true;
  requestAnimationFrame(() => { padQueued = false; sizePad(); });
}
addEventListener("resize", queuePad, { passive: true });
```

A 4K rebuild is 103,896 `fillText` calls. One per frame is already generous; one
per resize event is not.

---

## 10. Make the gate cheap under the finger (`xenith.js:302-306`, `:228`, `:208`)

```js
let lastPt = null;
pad.addEventListener("pointermove", (e) => {
  if (!cur) return;
  const p = pt(e);
  if (lastPt && Math.abs(p[0] - lastPt[0]) < 2 && Math.abs(p[1] - lastPt[1]) < 2) return;
  lastPt = p;
  if (cur.length > 400) return;        // cap: cover() is O(points) per sample
  cur.push(p);
  queuePaint();
});

let paintQueued = false;
function queuePaint() {
  if (paintQueued) return;
  paintQueued = true;
  requestAnimationFrame(() => { paintQueued = false; paint(); });
}
```

Cache the rect instead of reading it per event (`:208`):

```js
let padRect;
function sizePad() {
  // ...existing
  padRect = pad.getBoundingClientRect();
}
const pt = (e) => [e.clientX - padRect.left, e.clientY - padRect.top];
```

And loosen the tolerance, which is currently stricter on touch than on mouse:
`:231` `Math.max(18, S * 0.085)` gives 18 px at 320 wide. `design.md:62` specifies
26 px.

```js
const tol = Math.max(26, S * 0.1);
```

---

## 11. Font swap (`style.css:3-7`, `index.html:8`)

`assets/fonts/ps2p-subset.woff2` is 1,880 bytes against the TTF's 118,204. Use it.

```css
@font-face{
  font-family:"PS2P";
  src:url("../assets/fonts/ps2p-subset.woff2") format("woff2"),
      url("../assets/fonts/PressStart2P.ttf") format("truetype");
  font-display:swap;
  font-weight:400;
  unicode-range:U+0020-007E;
}
/* fallback with matching metrics: PS2P advance is exactly 1.000em per glyph */
@font-face{
  font-family:"PS2P-fallback";
  src:local("Menlo"),local("Consolas"),local("DejaVu Sans Mono");
  size-adjust:166%;   /* 0.6em mono to 1.0em pixel font */
  ascent-override:100%;
  descent-override:20%;
}
#name{font-family:"PS2P","PS2P-fallback",ui-monospace,monospace}
```

```html
<link rel="preload" href="../assets/fonts/ps2p-subset.woff2" as="font"
      type="font/woff2" crossorigin>
```

Verify the subset covers every letter in every name, plus space, apostrophe,
hyphen and period. It is 1.8 KB, so it is a real subset, not the full latin set.

---

## 12. Backdrop asset (`xenith.js:20`)

270 KB JPEG, rendered as ASCII at 11 px cells and then covered by a 92% opaque
scrim on the left. `assets/img/xaviers-campus.webp` is 76 KB and already in the
repo. At 11 px cells a 480 px wide source is plenty.

```js
img.src = "../assets/img/xaviers-campus.webp";
```

---

## 13. Rusty on fractional pixels (`xenith.js:329-347`)

```js
const U = 6, CW = 42 * U, CHH = 46 * U;
const RD = Math.min(devicePixelRatio || 1, 2);
rc.width = CW * RD; rc.height = CHH * RD;
rx.setTransform(RD, 0, 0, RD, 0, 0);

function drawRusty(t) {
  const bob = Math.round(Math.sin(t * 1.5) * 1.1);      // was fractional
  const lx = Math.round(Math.max(-1.2, Math.min(1.2, tx * 1.2)));
  // ...
}
```

Then set the CSS width from the backing store so the pixel grid is integral:

```css
#rusty{width:calc(clamp(84px,11vw,150px));image-rendering:pixelated}
```

and, if the sprite still looks soft, use `image-rendering:crisp-edges` and a width
that is an integer multiple of 252 / DPR.

---

## 14. Landscape overlap (`style.css:146-155`)

At 568x320 `#content` spans y 80-239 and `#rusty` spans y 210-302. Text on the
robot's face. Either drop Rusty below the copy or lose him on short viewports.

```css
@media (max-width:720px) and (max-height:520px){
  #rusty{width:64px;bottom:10px;right:10px;opacity:.55}
  #content{top:44%;left:18px;right:96px}
  #name{font-size:clamp(20px,5.4vw,28px)}
  #line{font-size:12px;line-height:1.6;margin-top:10px}
  #role{margin-top:12px}
}
```

---

## 15. One source of truth for viewport height (`index.html:5`)

`#scene` gets inline `innerHeight` px from JS, `#monument` gets `inset:0` from CSS.
On iOS those disagree by the toolbar height, so the X drifts off the backdrop.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```js
function viewport() {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv ? vv.width : innerWidth),
    h: Math.round(vv ? vv.height : innerHeight)
  };
}
```

Use it in `build()` and `sizePad()`, and set `#monument` from the same `W`/`H`
rather than trusting `inset:0`.

Add a pixel budget so a large CSS viewport cannot ask for a 33 Mpx canvas:

```js
function dprFor(w, h, cap) {
  const base = Math.min(devicePixelRatio || 1, cap || 2);
  return Math.max(1, Math.min(base, Math.sqrt(12e6 / Math.max(1, w * h))));
}
```

---

## 16. Delete this CSS (`style.css:40-49`, `:118`, `:160`)

`#scrim` is declared at `opacity:0` with a transition and then immediately
overridden to `opacity:1`. It never animates, and it permanently hides the left
40% of the ASCII backdrop you paid 26,400 `fillText` calls to draw. Either drive
it from `.entered` properly, or delete the transition and the duplicated
`body.entered #monument` block (`:45-48`). `#gate.done` (`:118`) is never applied
by JS. `@media (max-width:720px){.prompt{top:76%}}` (`:160`) duplicates `:124`.

Also: `--violet`, `--red`, `--mint` and `--dim` are declared and never read through
`var()`, and `docs/design.md` says `--ink #070614` while both the CSS and the JS
paint `#06050f`. Pick one.

---

## 17. Contrast pass (`style.css:63-69`, `:133-142`)

Measured against the painted backdrop `#06050f`:

```
#skip     .30 alpha  2.29:1  FAIL  -> .72 alpha gives 8.75:1
.hud      .40 alpha  3.28:1  FAIL  -> .62 alpha gives 6.61:1
.p2       .42 alpha  3.53:1  FAIL  -> .62 alpha
guides    .40 alpha  3.28:1  FAIL  -> .72 alpha, or raise lineWidth to 2
#line     .62 alpha  6.61:1  pass
#role     #ffb15c   11.29:1  pass
```

Nine-pixel text at 3.28:1 is the smallest and faintest thing on the page, and one
of those strings is the only way out of the gate.

---

## 18. Page title (`xenith.js:12`)

```js
document.title = "Xenith · " + person.name;
```
