# Agent review log

Two waves. The first (4 ideation agents + 3 builders) produced the copy, motion,
interaction and perf notes in `lab/`, plus the personalisation engine. The share
and gate builders stalled, so those were built directly. The second wave ran a
design review and a code review, then the fixes were applied by hand.

## What the reviews found and what changed

| Finding | Fix |
|---|---|
| A pointer move before the campus image loaded set `W` to 0, produced `Infinity`, then `NaN`, killing the X and Rusty's eyes | size initialised at declaration, pointer handler guarded |
| `data.js` missing threw before any listener attached | `window.XENITH_PEOPLE || {}` fallback |
| Campus image failure left a blank page with no X | `onerror` + X drawn independently of the photo |
| Scrim CSS was duplicated and `#scrim{opacity:1}` overrode the gate state | removed duplicate, one `body.entered #scrim` rule |
| `drawX()` call was dropped in a refactor, gate had no object | restored in the frame loop, verified in browser |
| Three uncapped rAF loops, one re-arming before its guard | main loop throttled to 30fps, pauses when the tab is hidden |
| Live region sat inside `visibility:hidden` content | moved to `#stage`, focus moves to the name |
| No focus target or announcement after unlock | `tabindex="-1"` on the name, polite live region |
| No-JS users stuck on a locked black page | `noscript` fallback unlocks the layout |
| Skip link 27px tall, 2.29:1 contrast | 44px min height, safe-area inset, 4.5:1+ |
| Reduced motion only killed CSS transitions | JS honours the media query for the slab, X and Rusty |
| Resize rebuilt the whole ASCII grid on every event | 180ms debounce |
| X redrew 450 points with per-point shadow and font strings | shadow removed, fonts fixed, draw paused when nothing changes |
| Multi-touch and right-drag could corrupt strokes | pointer id, button and burst guards |
| Share card download used `toDataURL`, ignored on iOS | `toBlob` path plus an iOS image-tab fallback |

## Still open

- `drawX` still re-renders every frame while the X rotates. Fine on desktop, worth
  caching on low-end phones.
- The share card is centred while the page is left aligned. Deliberate for now.
- The personalisation sample lines in `lab/personal/people.sample.csv` are
  placeholders. Real lines must come from the actual form answers.
