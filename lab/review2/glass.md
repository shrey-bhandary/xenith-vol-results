# Glass reveal: exact size and exit

## The ball is the constraint, not the plate

`extent = max(mark w, h) x 0.95 x size`, and `size` peaks at 1.06 (`site/vendor/glass-renderer.js:350,360,368`), so the glass ball is **2.01x the mark's larger side**. The lockup is 3:1, so that side is its width.

| mark | mark box | ball |
|---|---|---|
| 120px high (old) | 360 x 120 | 725 |
| 62px high (committed) | 186 x 62 | 375 |
| 34.5px high | 103.5 x 34.5 | 208 |

At 120px the ball is 165px past the old 560px plate and 366px wider than the 359px phone plate. The committed 62px still gives a 375px ball: 115px past a 440x260 plate, and taller and wider than a 320x240 phone plate. Setting both `width` and `height` (`site/xenith.js:1023`) also overrides `aspect-ratio: 16/9`, so 440x260 is arbitrary.

## Numbers

| | desktop | mobile, `max-width: 720px` | short, `max-height: 480px` |
|---|---|---|---|
| stage | **400 x 225** | **200 x 200** | **320 x 180** |
| aspect | **16 / 9** | **1 / 1** | **16 / 9** |
| mark | **103.5 x 34.5** | **92 x 30.7** | **82.8 x 27.6** |
| ball | **208.4** (92.6% of 225) | **185.3** (92.6% of 200) | **166.8** |
| radius | 16px | 14px | 12px |

Mark width is 46% of the plate's short side; height is `46cqmin / 3`.

## Paste

Replace the string at `site/xenith.js:1023`:

```js
st.textContent = GLASS_CSS + "\n.lg-logo-reveal{width:400px;max-width:88vw;height:auto;aspect-ratio:16/9;--lg-logo-reveal-size:calc(46cqmin / 3);--lg-logo-reveal-stage:#06050f;border-radius:16px;box-shadow:0 0 0 1px rgba(255,233,176,.1),0 24px 64px -24px rgba(0,0,0,.85)}.lg-logo-reveal[data-state='ended']{opacity:0;pointer-events:none;transition:opacity 240ms cubic-bezier(.32,.72,0,1) 180ms}@media(max-width:720px){.lg-logo-reveal{width:200px;max-width:54vw;aspect-ratio:1/1;border-radius:14px}}@media(max-height:480px){.lg-logo-reveal{width:320px;max-width:58vw;aspect-ratio:16/9;border-radius:12px}}";
```

The wrapper at `:1027` drops the transparent stage and the fixed mark:

```js
stage.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;z-index:2;pointer-events:none";
```

## Opaque backdrop

**`#06050f`, rgb(6 5 15), alpha 1**, on the figure. `readColour` then passes `[0.0235, 0.0196, 0.0588, 1]` and `dark = true` (`glass-reveal.js:262-273`). Remove `background: transparent` and `--lg-logo-reveal-stage: transparent`. Transparent alpha 0 zeroes the stage terms and lets the page show through; upstream `#1c1c1e` reads as a grey slab. `#05040c`, the story veil, is 1-3 levels darker and also opaque, if matching it matters.

## Exit

The CSS starts the fade 180ms after `ended`, runs 240ms, and clears at **3020ms**. Timeline: 0 mount, 2600 ended (canvas cross-fades 240ms), 2780 figure fade, 3020 clear, 3080 removed. That is before the story canvas fades at 3050 and captions start at 3250 (`xenith.js:1074-1075`).

The committed code fades 250ms after `ended` over 500ms: clear at 3350, removed at 3500. That still covers the 3050 canvas fade and the first 100ms of captions.

Replace the mount's `onComplete` with this, so the context is freed even if the story stops first:

```js
onComplete: () => {
  STORY.t0 = performance.now();
  setTimeout(() => {
    try { if (STORY.glass) STORY.glass.destroy(); } catch (e) {}
    STORY.glass = null;
    stage.remove();
  }, 480);
}
```

Also set `STORY.t0 = performance.now()` in the `if (!window.GlassReveal) return;` guard at `:1018`; otherwise a missing script leaves `storyTick` waiting at `t0 = 0`.
