# Rusty animation bible

Every number here is a target for the build. Times in milliseconds unless noted.

## Principles

1. Weight before speed. Every part has a settle.
2. Overlap. Eyes lead the head, the head leads the body, the antenna trails.
3. Anticipation. Nothing moves without a 60 to 120ms wind-up.
4. Follow-through. Every arrival overshoots by 6 to 12 percent and comes back.
5. He is never idle. Even at rest he breathes, blinks and drifts.
6. One part is always late. That is what makes it feel alive.

## Rig and motion layers

Parts: antenna base, rod, bulb, head, bezel, screen, eyeL, eyeR, mouth, earL, earR,
neck, body, chest screen, chest pixels, upper arms, forearms, hands, treads,
rollers, backpack.

Layers, each with its own spring:

| Layer | Stiffness | Damping | Lag behind parent |
|---|---|---|---|
| head | 180 | 18 | 0ms |
| eyes | follow head + gaze | n/a | lead 2 frames |
| antenna | 90 | 8 | 90ms |
| arms | 140 | 14 | 60ms |
| hands | 200 | 20 | 30ms |
| treads | 260 | 22 | 0ms |
| chest pixels | 120 | 12 | 120ms |

## Wake, 14 beats

| # | t (ms) | Beat | Motion | Face | Sound |
|---|---|---|---|---|---|
| 1 | 0 | dark | nothing | none | room tone |
| 2 | 300 | antenna bulb blinks | 2px amber square, 120ms on, 400 off, twice | none | soft click x2 |
| 3 | 1200 | rod telescopes | scaleY 0 to 1 from base, 420ms, overshoot 8% | none | servo rise |
| 4 | 1500 | torso drops | from y -40 to 0, 380ms, cubic-bezier(.2,1.3,.4,1) | none | low thud |
| 5 | 1750 | arms snap | from x ±30, 300ms, stagger 60ms | none | magnetic click x2 |
| 6 | 2000 | treads unfold | rotate -20 to 0, 260ms, squash 6% | none | clunk |
| 7 | 2300 | stall | everything still. empty neck socket. | none | silence |
| 8 | 3300 | false start | head rises 12px, falls back 3px, 180ms | none | servo strain |
| 9 | 3500 | head drops in | from y -90, 420ms, overshoot 10% | eyes off | thunk |
| 10 | 3800 | screen boots | scanline sweeps 160ms, then eyeL pixel | eyeL on | CRT zap |
| 11 | 3950 | eyeR boots | 90ms later | both | blip |
| 12 | 4100 | double blink | 90ms close, 60 open, 90 close, 120 open | blink | tick x2 |
| 13 | 4400 | stretch | body scaleY 1.06 then 0.98 then 1, 500ms | happy | servo sigh |
| 14 | 5000 | first look | head turns to cursor, clamped 12deg, 260ms | curious | one note |

The honest stall at 2300 to 3300 is the whole trick. Nothing moves.

## Face system

Eyes are 2 to 4 pixel rectangles inside a dark screen. Six shapes:

| Shape | Draw | Use |
|---|---|---|
| open | 4x4 red block, 1px cream catchlight | default |
| blink | 4x1 red bar | every 3.4s |
| happy | two upward arcs from 1px blocks | smile, greeting |
| wide | 5x5 with a 3px inner glow | surprise, X success |
| squint | 4x2 lowered bar | thinking, doubt |
| x | two crossed 1px strokes | error, dead |

Pupils shift 0.6px toward the gaze target. Eyes blink 40ms faster when he is
thinking.

Mouth shapes: flat, dot, smile, open, wavy, side. Talking cycles open, flat,
open, dot at 22Hz with an amplitude envelope per syllable.

Screen text: short only. `?`, `...`, `!`, `FOUND`, `hello`, `ok`. Text overrides
the eyes for 600ms, then returns.

Expression blend is 180ms cross-fade. No cuts.

## Expressions

| Expression | Eyes | Mouth | Head | Body | Antenna | Trigger |
|---|---|---|---|---|---|---|
| neutral | open | flat | 0 | breathe | slow sway | idle |
| listening | open, pupils on cursor | dot | tilt 4deg | lean 2deg | still | visitor speaking |
| curious | wide | dot | tilt 8deg | lean 6deg | perk | question |
| thinking | squint | wavy | tilt 6deg, slow | still | twitch | long answer |
| happy | happy | smile | bob | bounce 2px | bounce | greeting |
| laugh | happy | open | shake 2deg | bounce 4px | fast bounce | joke |
| proud | happy | smile | up 3deg | chest out | still | success |
| confused | squint one, open one | wavy | tilt -8deg | tilt | droop | error |
| concerned | squint | flat | down 4deg | sink 2px | droop | visitor stuck |
| scanning | wide, pupils sweep | flat | sweep | lean in | pulse | reading |
| excited | wide | open | shake | hop 6px | fast | X success |
| sleepy | blink 60% | flat | droop | sink | slow | 20s idle |

## Talk cycle

For each character typed:
- mouth alternates open/flat every 45 to 60ms
- head nods 1.5deg at 2.2Hz
- antenna bounces 1px behind the nod
- eyes dart 0.4px every 3 characters
- every sentence end: 200ms hold, blink, return to neutral

Voice blips every third character, pitch rising with the sentence.

## Cursor reactivity

| Event | Reaction |
|---|---|
| cursor enters | head turns, eyes lead by 2 frames, antenna perks |
| cursor near button | lean 6deg toward it, pupils widen |
| cursor over button | button lifts 3px, Rusty nods once |
| cursor idle 4s | he looks around, then at the visitor, blinks |
| cursor fast | eyes lag, head follows 80ms later |
| cursor leaves window | he looks at the last position, then front |

## Buttons

Two rows, 68px tall, 1px amber border, corner brackets 10px, no fill.
- idle: border 0.35 alpha, label cream 0.8
- proximity: bottom-up veil 300ms, border 0.6
- hover: 3px magnetic pull toward cursor, brackets extend 2px
- press: 2px down, border 1.0
- selected: veil fills, label swaps to `[ opening ]`
- focus: 2px mint outline, same as hover

Sound: hover tick 1200Hz, press 600Hz thunk, select 880Hz note.

## Void

Five layers:
1. base black with 3% grain
2. distant 64px grid at 3% alpha, parallax 0.2
3. 28 dust motes, parallax 1.0, part around the cursor within 90px
4. light cone from the antenna, 8% amber, follows Rusty
5. scanline and vignette

Camera drift: 3% scale over 21s, 4px x drift, never looping visibly.

## Dialogue tree

Greeting: 2 lines.
Choice A: 4 lines, then the gate.
Choice B: 3 lines about Xenith, then the same gate.
Idle barks: 12, fired after 8s of no input.
Cursor barks: 6.
Gate: 3 lines (ask, almost, found).

Every line carries an expression and a gesture. No line longer than 60
characters.

## Integration

- `face.js` replaces the inline eye and mouth paint in `rusty.js`.
- `buttons.css` and `buttons.js` replace the local menu if present.
- `void-extras.js` layers under the existing void canvas.
- `dialogue.js` owns line sequencing; `intro.js` keeps the state machine.
- The intro ends by calling the existing handoff to the swarm engine.

The prototype lives at `lab/intro/` and is not wired into `site/` until approval.
