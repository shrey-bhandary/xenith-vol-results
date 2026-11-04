# Xenith intro — pitch

Working title: **Rusty, in the dark**
Heavy reference: why.zero.university. One action, one honest load, one character.

## The bet

Zero makes you draw a zero to enter. We make you meet Rusty first, then draw the
X he asks for. The X is not a captcha. It is the thing that cracks the void open
and hands the screen to the swarm.

The intro ends exactly where the site is now: the same page, the same vendored
engine, the same toolbar and Go live. We are only replacing the first 25 seconds.

## Six scenes

### 0 · Void — 0.0 to 3.5s

Pure black. One amber pixel at centre blinks twice. A 38Hz hum enters on a zero
crossing. Twenty-eight 1px dust motes drift, lit only when they cross the pixel.
No logo, no spinner, no text.

### 1 · The honest stall — 3.5 to 9.0s

This is the Zero DNA. Rusty does not fade in. He loads, and the load stalls.

- Torso and both arms fly in from off-screen and land.
- A three-column odometer sits in the exact slot where his speech will appear.
  It rolls to `050` and stops dead.
- The neck socket is empty. Nothing moves for 900ms.
- Then the head drops in, the odometer hits 100, the digits slide out right and
  the first letters slide in left from the same box.

The stall is honest: it waits on the actual Rusty parts, not a timer. One part
is visibly missing. That is the whole trick.

### 2 · "can i help you with something?" — 9.0 to 13.0s

Head boots: scanline, one eye, then two. Antenna pulses. He shakes once, like a
dog, and finds the cursor.

Copy, typed at 26ms a character:
`oh. hi. give me a second, my left arm is still loading.`
`okay. can i help you with something?`

### 3 · Two choices — 13.0 to 17.0s

Two flat pixel rows, no button chrome. Proximity lights exactly one at a time
with a 300ms bottom-up veil.

1. `check my vols application result`
2. `explore xenith`

Rusty leans 6 degrees toward the lit one. Serious pick: he nods, pupils shrink.
Explore pick: one spin-hop and a short branch before the same gate.

### 4 · The X — 17.0 to 25.0s

Rusty pulls a glass frame out of his chest screen. Inside, a faint X.

`two lines. trace the dashes. i'll watch.`

He watches the stroke with his eyes, leans in, antenna sparks on first contact.
At 82 percent coverage he says `almost. one more.` On success his screen flashes
`FOUND`, he spins once, confetti bursts, and the drawn X cracks the void.

### 5 · Handoff — 25.0s onward

The cracks widen into the campus photo. The vendored engine takes the screen and
rebuilds the page, exactly as it does today. No cut, no second loader.

During the build, captions name the department heads as they work, one at a
time. The visitor's cursor arrives last, labelled with their own name, and places
the final element.

## Rusty, the whole point

He is a 26-part canvas rig, not a sprite swap:

- antenna spring with overshoot, 90ms behind the head
- head looks at the cursor, clamped to 12 degrees
- arms lag the body by 60ms, hands flex on emphasis
- treads idle, squash on landing
- eyes: idle, squint, wide, X, each 2 frames
- blink every 3.4s, double blink when thinking
- dust on every landing, sparks on the X, confetti on success
- 12 states: boot, idle, curious, listening, thinking, proud, excited, confused,
  scanning, presenting, celebrating, sleepy

He never teleports. Every move is a spring. The antenna is always the last thing
to settle.

## The cast

Fourteen named cursors. The full table is in [cast.md](cast.md). Ricco is the
builder and events sub-head: gold cursor, gold trail, a small star at the tail,
tag `ricco · built this`. He arrives first after the X, draws the page frame and
the `xenith` wordmark alone, then the heads pour in. At the end he draws a tiny
signature under the name, `built by ricco`, and parks next to Rusty.

Confirmed heads: Aaditya (Events), Shreyas (Talks & Panels), Glynnis
(Assistance & Hospitality), Ashley and Harsh (Tech & Venue), Omkar (Finance &
Sponsorship), Mogithh (Publicity), Tejas (Admin), Nigel (Assistance & Hospitality
sub-head), Naren (FnD). Shivam, Pratham and Sarvika still need roles.

## The swarm story

The engine stays unmodified. We do not rename its cursors, because its names are
hardcoded and its labels are drawn in shadow DOM. Instead:

- A caption layer inside the engine's shadow root names each head as its section
  builds: Aaditya, Shreyas, Glynnis, Ashley, Harsh, Omkar, Mogithh, Pratham,
  Sarvika, Shivam, Tejas, Nigel, Naren. One line each, two seconds, then gone.
- The visitor's cursor is a single extra passenger in the shadow root, a mint tag
  with their name, following the real pointer. It places the last element.
- On Go live, the real page returns unchanged.

This keeps the 1:1 engine and adds the story without patching 146KB of vendored
code.

## Sound

Void hum at 38Hz, servo ticks on each landing, five voice blips for the greeting,
a hover tick, a select thunk, glass scratch under the X, a rising note with
coverage, a crack and a chord on success. All Web Audio, no files. Duck under the
engine's own sound once it starts.

## What the agents are building now

In `lab/intro/`, not in the site yet:

- `rusty.js`: the 26-part rig, states, springs, dust
- `void.js`: the 99 odometer and void stage
- `menu.js`: dialogue and the two proximity rows
- `assets/`: Rusty pose sheet, option frame, X frame, dust tile
- `script.md`: the final line-by-line script
- `index.html` + `intro.js`: a runnable prototype of all six scenes

Nothing goes into `site/` until you approve.

## What I need

1. Approval of this direction, or the cuts you want. My cut list if it feels
   long: drop the explore branch to one line, and make the stall 600ms.
2. Confirm the head-to-department mapping in [cast.md](cast.md). I guessed from
   the names.
3. What "check my vols application result" actually shows. We have no result
   dataset yet, only the selected page.
4. `RiccoMarcelino/scraped-inspo-websites` returns 404. Private or renamed. Send
   a zip or make it public and I will fold it in.
