# Mobile audit: glass stage, intro layout, gate

Source-only review of `site/xenith.js` (`storyGlassMount`, `GLASS_CSS`), `site/intro/intro.js` (`choose`, `audio`, gate), `site/intro/index.html`, `site/vendor/glass-reveal.css`, plus the maths in `glass-reveal.js` / `glass-renderer.js`. No browser, no screenshots; every number below is derived from the CSS/JS, so treat it as "highly likely", not "observed".

Viewports: **390x844** (iPhone 12-14, insets 47 top / 34 bottom, DPR 3) and **360x640** (mid Android, DPR 3).

---

## 1. Glass stage (handoff on `site/index.html`)

The injected override in `xenith.js:1022` is:

```css
.lg-logo-reveal{width:min(92vw,1000px);height:min(78vh,560px);background:transparent}
```

| | 390x844 | 360x640 |
|---|---|---|
| stage box | 359x560 | 331x499 |
| mark (`--lg-logo-reveal-size:74px`, SVG is 1200x400) | 222x74 | 222x74 |
| glass plate at peak (`2*0.95*unit*1.06`) | 447px | 447px |
| clipped per side (`overflow:hidden`) | 44px | 58px |

1. **The plate is wider than the stage.** Both width and height are set, so the declared `aspect-ratio:16/9` is dead and the effect plays portrait (0.64). The silhouette is sized from the *mark* (`unit = max(layout.width, layout.height)`, then `extent = unit*0.95*size`), not from the stage, so a fixed 74px mark gives a 447px plate in a 359px stage. Widest moment is `t≈1.4` (`size` peaks at 1.060); the glass is visibly sliced by the stage edge.
   Fix: `--lg-logo-reveal-size: min(74px, 15vw)` (58px at 390, 54px at 360 -> plate <= stage), and put it **in the same injected string after the base rule** (equal specificity, so source order decides; the var is set inline on the wrapper, and a value declared on the figure beats the inherited one). Alternatively `height:auto;aspect-ratio:16/9;max-height:78svh`.
2. **`78vh` is the large viewport on iOS.** Use `78svh` so the box tracks the visible area when toolbars show.
3. **The reveal does not own the screen.** `STORY.layer` is `pointer-events:none` for the full 2600ms, so taps go through the veil to whatever page UI sits underneath. Give the stage `pointer-events:auto` until `data-state="ended"` (or block touches for the duration), then drop it.
4. **Quality is fixed at `high`** (`ratio 2`, `taps 5`): a 718x1120 buffer, plus a full-size `still` canvas and a 2.5x `sharp` canvas, at 60fps while the 2D story canvas also animates at DPR 2. Mid-range Android will drop frames. Set `document.documentElement.dataset.lgQuality = 'medium'` under `(max-width:760px)` or `hardwareConcurrency <= 4`.

## 2. Intro layout (`site/intro/index.html`)

5. **No safe-area handling anywhere**, despite `viewport-fit=cover`. At 390x844: `.hud` has 15px top padding at <=760, so the 8px HUD line sits in the 47px status-bar/notch band; `.skip` (bottom 28.7px), `.gate-tag` (30.4px) and `.console` (20px) sit inside the 34px home-indicator band, shrinking the effective tap area of "skip".
   Fix in the `max-width:760px` block:
   ```css
   .hud{padding-top:calc(15px + env(safe-area-inset-top))}
   .console{bottom:calc(20px + env(safe-area-inset-bottom))}
   .skip{bottom:calc(clamp(12px,3.4vh,30px) + env(safe-area-inset-bottom))}
   .gate-tag{bottom:calc(clamp(16px,3.6vh,32px) + env(safe-area-inset-bottom))}
   ```
6. **Local-menu fallback is taller than the buttons renderer.** Press Start 2P advance is exactly 1em (`unitsPerEm 1000`, `hmtx 1000`) and `.opt-label` adds `.02em`: 32 chars x 9.69px = 310px for "check my vols application result" against ~282px of `.mid` at 390 (252px at 360) -> wraps to two lines, rows grow to ~85px, menu top ~392 at 360. And `.opt-sub` is still visible below 420 while `buttons.css` hides `.xchoice__sub` at the same width, so menu height jumps depending on which renderer mounted.
   Fix at `max-width:420px`: `.opt-sub{display:none}` plus `.opt-label{font-size:9px}` to match `buttons.css`.
7. `#line{max-width:none}` at <=760 is fine (longest line ~2 lines, console top ~110px, clears `.wake` at `24vh` = 202/154px), and the mobile `.menu{bottom:76px}` clears `.skip`. No scroll is possible (`body{overflow:hidden}`), so nothing is unreachable.

## 3. Gate

8. **One swipe can clear both lines.** `gateGuides()` uses `h = min(W,H)*0.17` (66px at 390, 61px at 360) while tolerance is `max(28, min(W,H)*0.055)` = 28px, and `coverGuide()` finishes at 55% of *each* arm. A near-horizontal drag through the centre is within 28px of both arms for `|dx| <= 28*sqrt(2) = 39.6` -> 60% (390) / 65% (360) of both arms, so `ca` and `cb` cross 0.55 together and the X is never drawn. Holds for every viewport whose short side is <= 423px (`h <= 2.57*tol`); 430px-wide phones sit just outside.
   Fix: count a sample only when the nearest stroke segment runs roughly along the arm (`|cos| > 0.8`); a perpendicular swipe then scores 0 and the 28px forgiveness stays for real diagonal traces. A tighter `tol` alone is not the fix: it makes the gate harder for thumbs, so pair it with longer arms (`h = min*0.22`).
9. **A resize wipes the drawing.** `sizeAll()` calls `gateSize()` and resets `gate.strokes = []`, so an iOS URL-bar collapse or a rotation mid-draw silently returns the user to "0 / 2 lines". Keep strokes when only the width changes, clear (with a line of copy) on orientation change.
10. **CSS and JS measure different viewports.** `gate-note{top:70%}` / `gate-meta{top:calc(70% + 40px)}` use the fixed ICB, while `gateGuides()` uses `innerWidth/innerHeight` (visual viewport). With toolbars up on iOS the X sits ~35px higher than the note assumes; the tight case is 360x640, where the X frame ends at 432 and the note starts at 448 (16px). Position the note from the same numbers, or move the CSS to `svh`.
11. **Drawing surface hygiene.** `#xpad` has no `user-select:none` / `-webkit-touch-callout:none` (long-press can interrupt a stroke) and `touch-action:none` across the full screen blocks pinch-zoom while the instruction text is 10.5px. Add both, bump `.gate-note` to 12px at <=760, and keep pinch-zoom off only over the X box if zoom matters.
12. **No `pointerId` filter**: a second finger's `pointerdown` starts another stroke (a palm resting on the glass adds free coverage). Ignore `pointerdown` while `gate.cur` is set, or track the active id.

## Breakpoints to add

- `max-width:760px` — safe-area padding, `.gate-note{font-size:12px}`, `#xpad{user-select:none;-webkit-touch-callout:none}`, glass `--lg-logo-reveal-size:min(74px,15vw)` + `height:min(78svh,560px)`.
- `max-width:420px` — hide `.opt-sub`, `.opt-label{font-size:9px}` (aligns with `buttons.css`).
- `max-height:520px` (already exists) — landscape gate collides: at 844x390 the note moves to 66% = 257px, but the X frame ends at `0.54*390 + 0.17*390 + 26 = 303px`, so the copy lands on top of the box the user must trace. Gate the note off geometry, not a percentage.
- JS, not CSS: gate direction test, resize-preserving strokes, `data-lg-quality` switch.
