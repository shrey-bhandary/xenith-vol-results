# Xenith — "The Void" intro

Pitch v1. Storyboard and vision. Build starts only after approval.

## One line

A black void. One pixel wakes up. Rusty assembles out of the dark, asks how he can
help, and when you ask for your result he makes you draw the Xenith X. The X tears
the void open and the page rebuilds itself, built by the department heads and by
your own cursor.

## Why this works

The current page starts with a gate. This starts with a character. Rusty is the
reason to stay for the first ten seconds, the guide through the two choices, and
the witness to the build. The draw-X stops being a captcha and becomes a scene:
Rusty watches you do it.

Three rules:
1. Nothing appears without a cause. Every element is booted, assembled, drawn or
   built by someone.
2. Rusty is always alive. Even in the background he blinks, drifts and reacts.
3. The build tells a story about Xenith, not a feature tour.

## Visual language

Palette:
- void `#05040c`
- amber `#ffb15c`
- cream `#ffe9b0`
- violet `#7b5cff`
- mint `#9ef0c0`
- signal red `#ff5c3b`

Type:
- Press Start 2P for Rusty's face screen and the two choices.
- System mono for dialogue, labels and the build.
- No second display face. No serif.

Texture:
- 1px dither, scanlines at 12 percent, film grain at 3 percent.
- Chromatic split only on transitions and the X burst.
- Vignette heavy at the edges, so the void feels like a room.

Camera:
- Slow push-in during dialogue.
- A 2 percent drift on the whole stage so nothing is ever static.
- On the X, push in and shake once.

## The spine, 8 beats

### 0. Void (0.0s to 3.0s)

Pure black. A single amber pixel at centre blinks twice, then holds. Sub-bass at
40Hz rises. Dust motes drift, lit only when they cross the pixel.

Copy: none.

Sound: room tone, one soft servo click on each blink.

### 1. Rusty boots (3.0s to 7.5s)

The pixel is his antenna bulb. Ten beats:
1. Antenna rod telescopes out of the dark, bulb flickers.
2. Head shell flies in from the left, overshoots, springs back.
3. Face screen boots: scanline, a single pixel eye, then two.
4. Ears snap on with a magnetic click.
5. Neck extends, head lifts.
6. Body rises, chest screen flickers a heartbeat.
7. Arms unfold, hands flex twice.
8. Treads drop, compress, settle.
9. A puff of pixel dust.
10. He shakes once, like a dog, and looks up.

Sound: servo whirs, magnetic clicks, a small choir of UI blips.

### 2. "can i help you with something?" (7.5s to 11s)

He hovers, eyes find the cursor for the first time, and follows it. Typewriter
dialogue at the bottom left, one character at a time, with voice blips every
third character.

Copy: `oh. hello. can i help you with something?`

His antenna tilts toward the cursor. If the cursor is still, he blinks twice.

### 3. Two choices (11s to 15s)

Two holographic cards materialise in front of him, built from scanlines:

1. `check my vols application result`
2. `show me what xenith is`

They are not buttons. They are floating panes with a thin amber border, a tiny
index number, and a one-line subtitle. Hover lifts the pane 4px, brightens the
border, and Rusty leans toward it. Selecting one makes Rusty nod.

Second option runs a 12-second tour: four quick cards about Xenith, then it
returns to the same gate. Both paths end at the X.

Sound: hover tick, select thunk, Rusty's servo as he leans.

### 4. The X (15s to 24s)

Rusty pulls a frame of light out of his chest screen: a square with a faint X
ghost inside.

Copy: `i need to verify it's you. draw an x on the glass.`

The frame floats at centre. The visitor draws. Rusty:
- leans in, eyes tracking the stroke
- antenna sparks on first contact
- on 30 percent, his screen shows `...`
- on 60 percent, `almost`
- on a wrong direction, a tiny head shake
- on success, his screen flashes `FOUND`, he spins once, arms up, confetti
  bursts from the frame

The drawn X is kept. It becomes the X that tears the void.

Sound: glass scratch under the stroke, rising note with coverage, a crack and a
chord on success.

### 5. The tear (24s to 27s)

The X flashes cream, the void cracks along both strokes, and the real campus
photo bleeds through the cracks. The swarm engine takes over the screen here.
The intro hands off, it does not cut.

### 6. The build, told by the heads (27s to 42s)

The vendored swarm engine rebuilds the page. The cursors are the department
heads, each with a name tag and a colour:

| Cursor | Builds | Line it leaves behind |
|---|---|---|
| events | a stage and a crowd | "we make the room full" |
| tech | a server rack and a cable run | "we keep it standing" |
| creatives | an ASCII poster | "we make it look like something" |
| publicity | a megaphone and a feed | "we make them show up" |
| finance | a ledger and a stamp | "we make it add up" |
| admin | a clipboard and a checklist | "we make the chaos run on time" |

They work in sequence, not all at once: events first, then tech, then creatives,
then publicity, finance, admin. Each finished fragment snaps into the page and
leaves its line for two seconds, then fades. The build becomes a sentence about
what Xenith is.

### 7. Your cursor (42s to 48s)

A seventh cursor arrives from the bottom of the screen, a different shape, in
mint, labelled with the visitor's own name from the URL. The heads pause and turn
to it. It draws the last element: the visitor's name in the page.

Copy, in Rusty's screen: `there you are.`

Then the full page is live, the engine toolbar offers Go live and Replay, and
Rusty sits in the corner of the real page, still blinking.

## Rusty, in detail

This is the part that has to be exceptional. He is the whole intro.

### Rig

Canvas 2D, 26 parts:
- antenna base, rod, bulb, bulb glow
- head shell, face bezel, face screen, two eyes, mouth, two ears
- neck
- body shell, chest screen, chest pixel
- two upper arms, two forearms, two hands
- two tread housings, four rollers, two tread belts
- backpack port, two cables

Pivots are explicit. Every part draws with a 1px dark outline and a 1px inner
highlight so he reads as a sprite, not a vector blob.

### Motion layers

1. Base: a hover bob at 1.6s period, 3px.
2. Antenna: a spring with 0.12s lag, overshoot on every head move.
3. Head: looks at the cursor, clamped to plus or minus 12 degrees, with a
   0.18s ease.
4. Arms: 0.1s lag behind the body, hands flex on emphasis.
5. Treads: idle rollers, squash on landing, tilt on fast moves.
6. Face: blink every 3.4s, double blink when thinking, scanline drift, pixel
   mouth shapes.
7. Particles: dust on landing, sparks on the X, confetti on success, steam when
   he overheats after celebrating.

### Emotional states

`boot`, `idle`, `curious`, `listening`, `thinking`, `proud`, `excited`,
`confused`, `sad`, `scanning`, `presenting`, `celebrating`, `sleepy`.

Each state is a target pose plus a face plus a particle rule. Transitions are
springs, never cuts, except the boot.

### Reactions

| Trigger | Reaction |
|---|---|
| cursor still 4s | looks around, then at the visitor, blinks |
| cursor over a choice | leans 6 degrees toward it, antenna perks |
| choice selected | nod, eyes become happy arcs |
| first X stroke | antenna sparks, eyes widen |
| 30 percent | screen shows `...`, he leans in |
| 60 percent | screen shows `almost`, one hand up |
| wrong stroke | head shake, screen shows `?` |
| success | spin, arms up, confetti, screen `FOUND` |
| build starts | turns to watch, points at each cursor |
| user cursor arrives | turns, screen `there you are` |
| idle after reveal | sits, blinks, occasionally looks at the visitor |

### Detail rules

- He never teleports. Every movement is a spring.
- His eyes lead his head by two frames.
- The antenna is the last thing to settle.
- His screen has a 1px scanline and a subtle flicker at 12Hz.
- Every sound he makes has a visual: a servo click is a 1px shake.

## Sound

- Void: 40Hz sub, filtered noise, one soft click per blink.
- Boot: servo whirs, magnetic clicks, small blips.
- Dialogue: voice blips every third character, pitch rises with the sentence.
- Choices: hover tick, select thunk.
- X: glass scratch, rising tone with coverage, crack and chord.
- Build: engine's own sound; we duck the intro bed under it.
- Reveal: one chord, then silence except room tone.

All synthesized with Web Audio. No files.

## Technical plan

- New `site/intro.js` with a state machine: `void → boot → greet → menu → gate →
  handoff → build → reveal`.
- Rusty on his own canvas, 26 parts, 30fps cap, DPR 2.
- Dialogue and choices in DOM for accessibility and text selection.
- The draw-X reuses the existing gate canvas but with Rusty reacting.
- On success, the vendored engine is injected after the page settles, as now.
- The user's name and role come from the URL and `data.js`.
- Reduced motion: skip boot animation, show Rusty static, no shake, shorter
  dialogue.
- Mobile: Rusty at 55 percent scale, choices stacked, gate full width.

## What I need from you

1. Approval of this direction, or the changes you want.
2. The dept head names and colours, so the cursors are real people.
3. What the "check my vols application result" actually shows. We do not have a
   result dataset yet, only the selection page.
4. Access to `RiccoMarcelino/scraped-inspo-websites`. The GitHub URL returns 404,
   so it is private or renamed. Send a zip, make it public, or point me at the
   local folder.
