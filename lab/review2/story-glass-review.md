# Review 2 — story glass mount, intro choose/audio, intro page, glass CSS

Read: `site/xenith.js` (STORY, storyGlassMount), `site/intro/intro.js` (choose, audio),
`site/intro/index.html`, `site/vendor/glass-reveal.css`. No browser used.
`node --check` passes on xenith.js, intro.js, glass-reveal.js, glass-renderer.js.

## Findings, worst first

| # | Sev | File:line | Finding |
|---|-----|-----------|---------|
| 1 | high | xenith.js:1030-1037 vs 1040-1076 | The story clock only starts when the glass completes (`onComplete` sets `STORY.t0` after 2600 ms), but the veil/canvas fades are fixed timers from `storyBegin` (2750 / 3050 ms). The gold frame + wordmark therefore get ~450 ms of a 3900 ms animation before the canvas fades out. Everything after `el ≈ 450` is invisible; captions start over a blank canvas at 3250 ms. |
| 2 | high | xenith.js:784-792 + 1029-1036 | `storyDraw` still calls `storyLogoDraw(1)`, painting the 560 px amber mark centre-screen while GlassReveal paints the same mark at `--lg-logo-reveal-size:120px` in the same spot. Two logos, two sizes. The old hand-drawn `storyGlass(p)` / `storyRound()` (877-955) are dead code from the superseded approach and get it wrong twice. |
| 3 | high | xenith.js:958 | `#xenith-story` is `aria-hidden="true"`, yet it carries the only narrative (frame, wordmark, 11 heads + roles). Screen readers get a 35 s silent overlay and never hear the story. Needs a `role="status"`/`aria-live` caption mirror or off-screen text. |
| 4 | med | xenith.js:1014-1013 | `GLASS_CSS` is an 87-line JS string copy of `site/vendor/glass-reveal.css`. Two sources of truth already drift (the string appends `width:min(92vw,1000px);height:min(78vh,560px)`). Also the `html[data-lg-reduce-motion]`/`[data-lg-reduce-transparency]` rules can never match inside a shadow root, so those two overrides are dead in the copy. |
| 5 | med | xenith.js:629-641 + 1016-1026 | `storyAttach` re-parents the layer when the engine swaps roots, but the injected `<style data-glass>` stays behind in the old shadow root. After an engine Replay the glass stage renders unstyled. |
| 6 | med | intro.js:1425-1440 | `choose()` sets `pickLock`, tears down the menu, then checks `if (state === "gate") return` — the guard is too late to prevent the teardown, and nothing restores focus after `menu.hidden = true` (the first option had focus from 1345). Focus falls to `<body>`; the next Tab starts from the top. |
| 7 | med | intro.js:1471-1482 | No `visibilitychange`/`pagehide` handler. `audio.ambientStart()` and `audio.voice()` keep playing in a hidden tab or on bfcache navigation; only `handoff()` calls `stop()`. |
| 8 | med | intro/index.html:206-241, 383-390 | The handoff card is unreachable: `window.XenithIntroDone` is always defined at 398, so `hosted` is always true and `showCard()`/`body.ended`/`.card`/`.xmark` never run. Two conflicting destinations exist: script does `../?`, card links `../../site/index.html`. |
| 9 | med | intro/index.html:316-338 / 355 | The X gate is pointer-only: `#xpad` is a canvas with `aria-label` but no role or tabindex; the only keyboard route is `skip the x`. Fine as a stated fallback, but say so in the note. |
| 10 | med | glass-reveal.css:59-80 | Specificity trap: `@media (scripting: enabled) .lg-logo-reveal:not([data-state='ended']) .lg-logo-reveal-mark` (0,3,0) beats the reduced-motion `visibility: visible` rule (0,1,0). It only works because glass-reveal.js calls `finish()` synchronously under `stillness()`. One order change and the mark disappears for reduced-motion users. |
| 11 | low | xenith.js:1093-1101 | Engine boot is `new Function(src)()` on a fetched file: needs `unsafe-eval` under CSP and loses the script URL. Also the early return skips `startSwarmStory`, so a second `engine=1` call never restarts the story. |
| 12 | low | xenith.js:592-598, 646-647, 1030 | Undeclared STORY fields used as expandos (`glass`, `revealed`, `dpr`, `fading`); `fading` is written and never read; `STORY.glass.destroy()` is never called. |
| 13 | low | intro/index.html:329-336 | `.log{display:none!important}` at the end kills the log intro.js still writes (`log()`, `dom.log.classList.add("fade")` at 1612). Pick one: delete `log()` or delete the rule. |
| 14 | low | intro/index.html:6 | Title still reads "Xenith intro / prototype"; no description, no OG tags, though this is the one page every visitor lands on first. |
| 15 | low | intro.js:96-99 | `voice()` gain 1.35 into master 0.9 then a -14 dB compressor: peaks clip before compression. |
| 16 | low | xenith.js:557-564 | `stop()` disconnects observers but not the story glass renderer or the injected style; `storySync`'s 1200 ms poll keeps running for the life of the page. |

## Fix order

1. Drive fades off `STORY.t0`, not `storyBegin` (findings 1).
2. Delete `storyLogoDraw` from `storyDraw`, or drop the GlassReveal mount — one mark (2).
3. Expose the story to AT (3).
4. Load one copy of the glass CSS; re-inject it on every `storyAttach` (4, 5).
5. Restore focus after the menu folds and move the gate-state guard in `choose()` (6).
6. Wire `visibilitychange` to `audio.ambientStop()` / `close()` (7).
7. Delete the dead handoff card, or make it the real fallback (8).
8. Remaining lows in order: 9, 10, 11, 12, 13, 14, 15, 16.

## Consolidated, all four reviews (audio.md, selection.md, mobile.md, this file)

1. High — gate bypass: one near-horizontal swipe stays within 28 px of both arms and clears the X. Add a direction test (|cos| > 0.8) per sample.
2. High — story/glass desync: `t0` comes from glass `onComplete` (2600 ms) but veil/canvas fades are absolute at 2750/3050 ms. Key the fades off `t0`.
3. High — two marks: `storyLogoDraw` paints the 560 px logo under GlassReveal's 120 px one. Drop one, delete dead `storyGlass`/`storyRound`.
4. High — `#xenith-story` is `aria-hidden`; the 11 heads never reach AT. Add a live mirror.
5. High — mobile glass plate (447 px) exceeds the 359 px stage. `--lg-logo-reveal-size:min(74px,15vw)`, `78svh`.
6. Med — no receipt after the pick; row dies at 760 ms. `#pick`/`#pickSr` + gate tag; move focus to `#gate` when `gateStart` hides `#skip` under it.
7. Med — audio: TTS 1.35 clips (peaks -9.8 dBFS); master 0.75 + compressor + limiter, TTS gain 3.2. No visibilitychange/pagehide stop.
8. Med — no safe-area insets despite `viewport-fit=cover`.
9. Med — glass CSS duplicated as a `GLASS_CSS` string; `html[data-lg-reduce-*]` cannot match in a shadow root; style lost on root re-attach.
10. Low — gate pointerId filter, `user-select`, resize wipes strokes, CSS % vs innerHeight; `.opt-sub` at <=420 px; dead handoff card; `new Function` eval; "prototype" title; `.log{display:none}`.
