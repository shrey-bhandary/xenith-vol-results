# Xenith Selected — design system

Macrostructure: **Marquee Hero**. The reveal is the page. No features grid, no
pricing, no testimonial strip. One screen that behaves like a transmission, then
one action.

Genre: atmospheric. Theme: Terminal.

## Tokens

```
--ink        #070614   page
--ink-2      #0d0a24   panels
--amber      #ffb15c   primary signal
--cream      #ffe9b0   headline
--violet     #7b5cff   chromatic split, shadows
--red        #ff5c3b   live dot, Rusty eyes
--mint       #9ef0c0   success, covered strokes
--dim        #6b6485   metadata
--line       rgba(255,233,176,.18)
```

Type:
- Display: Press Start 2P, only for the name, the stamp and the gate title.
- Body and UI: system monospace. No second display face.
- Sizes: name clamp(30px, 6.4vw, 72px), gate title clamp(16px, 3.6vw, 24px),
  body 15.5px, metadata 10-11px with 0.18em tracking.
- No italic headings. No all-caps body copy.

Spacing: 4px base. Page gutter clamp(18px, 3.4vw, 46px). Section rhythm 22/34/48.

Motion:
- One entrance per element, 0.9 to 1.2s, cubic-bezier(.2,.8,.2,1).
- No looping decoration except Rusty's idle bob, the live dot and the grain.
- Reduced motion: all transitions cut to 0.01ms, no grain, no flicker.

## Voice

Terminal cadence. Lowercase boot log, uppercase dossier labels, sentence case
for personal notes. One joke per screen. No "thrilled", no "journey", no
exclamation marks outside Rusty.

Buttons: `[ enter xenith ]`, `skip and enter`. Bracketed, lowercase, one per
screen. Never two competing CTAs.

## Rules

- No fake browser chrome, no fake OS windows, no invented stats.
- No gradient blobs behind the hero. The only gradients are the scrim, the
  vignette and the CRT shading, all functional.
- No stock-photo people. The campus is ASCII, Rusty is drawn.
- The name is the biggest thing on the page. Nothing competes with it.
- Every effect must reveal information or move the story. Cut the rest.
- Mobile at 320, 375, 414: no horizontal scroll, gate canvas fits, name wraps
  without clipping the descenders.

## Gate

`draw x` under a glowing ASCII X. No panel, no border, no kicker. The X is the
instruction.

Recognition is forgiving: two diagonal guides, 22 samples each, 26px tolerance,
80% coverage per guide. One stroke or two. The guides light up in mint as they
are covered. `skip` sits at the bottom, visible but quiet. Escape also skips.

After unlock the X becomes the object: it rotates in 3D, shifts right, and the
name takes the left half.

## What to steal from the references

From Zero: one gestural gate, a loader that counts to 99, a hold-to-continue
button with an SVG progress ring, a 3D scene that reacts to the pointer.
From vshslv: hairline rules, tiny metadata, one orange accent on near-black,
CSS variables for every surface, ABC Diatype restraint (we use mono instead).
From ascii-magic: the before/after slider, the effect chips, the black/orange
tool UI, and the idea that ASCII is a filter you can tune, not a fixed style.
