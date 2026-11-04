# Vendored engine: patched copy

`swarm.js` is a **patched** copy of the Swarm Rebuild engine from
https://github.com/DhvanilPatel/swarm-cursors (`swarm-rebuild/swarm.js`). It is not
the upstream file, and the integration changes are not confined to `site/xenith.js`.
All local edits are listed below; the ones added by the audit also carry
`/* xenith: ... */` comments in the source.

Upstream ships no licence file and grants no rights (all rights reserved). This copy
must not be published or redistributed. Upstream also credits and adapts Joel Califa's
Swarm (https://github.com/califa/swarm-site), which is unlicensed as well.

## Local modifications

Line numbers refer to the current `site/vendor/swarm.js`.

1. `:439-467` — `canvasPixels()` snapshots large canvases through an offscreen proxy
   capped at 1280px on the long edge and calls `toDataURL()` on that; canvases already
   at or below 1280px and the return contract (PNG data URL, or `null` when fully
   transparent) are unchanged.
2. `:1036` — `walk()` skips `#handoff-cover` and `#xenith-story` so those site overlays
   never enter the rebuilt blueprint.
3. `:1561-1562` — `.hud button:focus-visible` gets a 1px mint (`#9ef0c0`) outline with 2px
   offset, because the HUD buttons use `all:unset` and had no focus ring.
4. `:1563-1569` — new `@media (max-width:560px)` HUD block: the row wraps with a 6px
   row gap, is capped at `calc(100% - 24px)`, sets `white-space: normal`, adds
   `padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px))`, slightly shrinks
   button padding and font, and keeps the ✕ at least 28px and last. Desktop is untouched.
5. `:1655-1675` — HUD markup patch, attributes only: `role="status" aria-live="polite"`
   on the progress span rewritten with `innerHTML`, `aria-label="Close the build"` on
   the ✕, `aria-label="Go live and fade back to the real page"` on Go live, and the
   speed button label starts at `0.5×`.
6. `:2138` — `Engine` starts at `this.speed = 0.5` (upstream `1`).
7. `:3495` — the speed cycle is `[0.5, 1, 2]` (upstream `[1, 2, 3]`).
