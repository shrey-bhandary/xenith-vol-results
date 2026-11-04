# Rusty's dialogue: the void script

Rusty speaks for about ten seconds across a thirty second intro. This file is all
of it: the greeting, two rows, both branches, the barks he uses while you decide,
how he answers the cursor, and what he says while you draw.

The clock is `script.md`. Nothing here changes a scene length. A line that does
not fit its window is cut, never typed faster.

## Notation

| field | means |
|---|---|
| spoken | typed into the console at 26ms a character, lowercase |
| screen | what shows on his face screen. `own` is the state's built in label, `none` is dark, anything else is stamped with `rigFace()` for 1.2s |
| expr | the state passed to `RustyRig.setState()`. this sets eyes and mouth too, so the two columns never disagree |
| gesture | what the body does, built from the primitives below |
| fires | the only window the line is allowed to play in |

## Wiring

- `SAY_HELLO` in `intro.js` becomes h1 below.
- `SAY_RESULT` becomes branch a, `SAY_EXPLORE` becomes branch b. The branches
  replace the single line, they do not follow it.
- The rows keep the labels already in `OPTIONS`. Those are final copy. He never
  reads a row out loud.
- The gate note in `index.html` is x0. If it ships as the note, it does not also
  type. Then the note drops to `draw x to enter` and x0 plays on his face only.
- The greeting assumes the wake settles by 8.40, as `script.md` has it. If
  `wake.md` retimes the build, h0 lands on the first settled frame and h1 waits.
- The 0.3 and 0.6 coverage hooks already call `rigFace("...")` and
  `rigFace("almost")`. Those two stamps stay. The stall and the find get
  words, x4 and x5.

## Expressions

| expr | eyes | mouth | screen |
|---|---|---|---|
| `idle` | open | flat | `none` |
| `presenting` | open | smile | `hello` |
| `curious` | wide | dot | `?` |
| `thinking` | open | wavy | `...` |
| `scanning` | open | flat | `...` |
| `confused` | wide | wavy | `?` |
| `proud` | happy | smile | `none` |
| `excited` | wide | open | `none` |
| `celebrating` | happy | open | `FOUND` |

Blink is an override on top of whichever state is running: `once` at 0.14s,
`double` when thinking, `long` for a slow one he holds. `long` is 0.22s and
needs one number changed in `rusty.js`; today the rig only has the 0.14s blink.
It already blinks every 3.4s and looks around after four still seconds, so do
not add either by hand.

## Gestures

| gesture | what moves |
|---|---|
| `tilt n` | head, degrees. the rig clamps at 15 and the antenna follows late |
| `lean n` | torso, degrees, on the spring |
| `antenna perk` / `droop` / `flick` / `sway n` | the antenna kick, in degrees, before the springs settle |
| `arms out n` / `arms up n` / `fold n` | both arms, degrees outward. hands follow 60ms late |
| `hand up` | his thinking arm, the one at 100 degrees with the elbow at 117 |
| `gaze cursor` / `face` / `frame` / `row` / `edge` / `down` | `setGaze()`, normalized. the face is straight ahead, the frame is the pad area, the edge is leaving. `row` is a target the caller computes, `down` is the floor between his treads |
| `nod` | the squash kick, one small dip |
| `dust` | a puff at the treads |
| `spark` | the antenna spark |
| `chest 0..1` | the chest screen brightness |
| `spin` | 360 in 420ms, success only |
| `step right` / `step back` | stage offset on the canvas, handoff and hatch only. the rig has no translate |

## The shape

```
void -> wake -> hi -> hello -> two rows -> branch -> frame -> gate -> page
```

## Greeting

He finds you before he talks. No line lands while the wake is still settling.

| # | spoken | screen | expr | gesture | fires |
|---|---|---|---|---|---|
| h0 | none | `hi` | presenting | blink once, `gaze cursor` | 8.60, holds 1.2s |
| h1 | `oh. hello. can i help you with something?` | `own` | curious | lean 2, `antenna perk`, `blink double` | 10.00 to 11.10 |
| h2 | `no wrong door. one is just a longer walk.` | `none` | proud | `arms out 16`, one `nod`, `gaze cursor` | 13.40, only if the pointer has not moved at all |

h2 and the barks split the same window by visitor. A pointer that has not moved
gets h2. A pointer that moves and will not pick gets a bark. Never both.

## The two rows

| # | label | sub | what Rusty does |
|---|---|---|---|
| 01 | `check my vols application result` | `one file, one line` | turns to the lit row, not the cursor, and holds still |
| 02 | `explore xenith` | `six departments, one page` | leans 6 degrees toward the row, antenna up |

The rows are the question. He does not narrate them.

## Branch a: the result

Five lines, 172 characters, 5.97s inside the 6.0s frame window at 26ms with a
300ms hold. This is the tight branch, so nothing here is optional.

| # | spoken | screen | expr | gesture | fires |
|---|---|---|---|---|---|
| a1 | `you picked the serious one. respect.` | `none` | presenting | `nod`, `gaze row` then `gaze face` | 16.00 |
| a2 | `one drawer. let me look.` | `own` | scanning | tilt 9, `gaze down`, `chest .7` | 17.24 |
| a3 | `empty. someone is still typing it.` | `none` | confused | `antenna droop`, tilt 9, head shake 2 degrees | 18.16, over the seam |
| a4 | `i will not invent one. a fake is worse.` | `none` | proud | `hand up`, lean back 1 | 19.35 |
| a5 | `the door is still here. i will hold it.` | `none` | proud | `arms out 42`, `gaze frame`, `step right` | 20.66 |

a3 is the honest one. There is no result dataset yet, and he says so in six
words. Do not replace it with a guess.

## Branch b: the tour

Six lines, 250 characters, 8.3s inside its own 12.0s card block. This is the one
branch with room to breathe, so he uses it.

| # | spoken | screen | expr | gesture | fires |
|---|---|---|---|---|---|
| b1 | `six departments. events fills the room.` | `none` | presenting | `arms out 42`, `blink once` | 16.00 |
| b2 | `tech keeps it standing. the rest make noise.` | `none` | proud | `chest 1`, one `nod` | 17.60 |
| b3 | `card one. what we throw. mostly events.` | `none` | excited | `spark`, `arms out 30` | 19.40 |
| b4 | `card two. who catches it. they do, every time.` | `none` | proud | `fold 26`, tilt -3, `gaze face` | 21.40 |
| b5 | `card three. why you. read it at the door.` | `none` | curious | lean 4, `hand up`, `gaze cursor` | 23.60 |
| b6 | `that's the tour. the glass is still warm.` | `none` | proud | `step right`, `gaze frame`, `blink once` | 25.80 |

If the branch is cut to one line, keep b1 and b6 and drop the cards. The glass
still arrives warm.

## Idle barks

Twelve lines, shuffled into a bag, never repeated until the bag empties, four per
visit at most. He is quiet for the first three seconds after any authored line,
so a bark always arrives into silence.

| # | spoken | screen | expr | gesture | when |
|---|---|---|---|---|---|
| 1 | `take your time. i am mostly a lamp.` | `none` | idle | `antenna perk`, blink once | any wait |
| 2 | `i dusted. for this. slightly.` | `none` | proud | `nod`, `dust` | choice |
| 3 | `both rows are good. i checked both.` | `none` | presenting | `arms out 12`, tilt -2 | choice |
| 4 | `my left arm is still a little new.` | `own` | confused | tilt 9, `antenna droop` | choice |
| 5 | `pick one. i will act surprised either way.` | `none` | proud | `blink double`, `chest .9` | choice |
| 6 | `still here. still small.` | `none` | idle | `chest .5`, one tread tap | any wait |
| 7 | `if you leave, i will say i was asleep.` | `none` | thinking | `gaze edge`, `blink long` | any wait |
| 8 | `the void is quiet. i decided it is polite.` | `none` | thinking | tilt 7, `antenna sway 10` | branch wait |
| 9 | `i am 26 parts. the eyes are the good ones.` | `none` | proud | tilt -3, `blink once`, `chest .8` | any wait |
| 10 | `no clock on the door. i checked twice.` | `none` | scanning | `gaze frame`, then `gaze cursor` | branch wait |
| 11 | `you can blink. i will pretend i did not see.` | `none` | idle | `blink long`, tilt 2 | any wait |
| 12 | `someone taught me hello. i practiced on a wall.` | `none` | presenting | `hand up`, small wave, tilt -2 | any wait |

Bark clock: first eligible 3.0s after the last authored line ends, then every 8
to 12s, dropped if a line or a reaction is still playing. Hard cap four per
visit, never a repeat until the twelve run out. Barks stop at the frame.

The fork is the only quiet window, so a normal visit hears one bark and a long
one hears two. The rest wait for the next visit. That is the point of a bag.

## The cursor

Six reactions, all one line, all on a cooldown so a nervous hand cannot turn him
into a toy. A reaction beats a bark and loses to any authored line.

| # | trigger | spoken | screen | expr | gesture | cooldown |
|---|---|---|---|---|---|---|
| r1 | hover on him | `you found me. i was not hiding.` | `none` | curious | tilt 12, `antenna flick`, `gaze cursor` | 3.5s, once per visit |
| r2 | hover a row | `that one. good one.` | `none` | proud | `gaze row`, lean 6 | 2.5s, once per row |
| r3 | click on him | `ow. okay. hello.` | `own` | excited | `nod`, `dust`, `blink double` | 8.0s, three per visit |
| r4 | pointer still 6s | `did the cursor fall asleep.` | `none` | curious | tilt 5, `blink long` | 20s |
| r5 | fast move | `slow down. i have one head.` | `none` | confused | head lags 90ms, `antenna flick`, wide eyes | 12s |
| r6 | leave the window | `okay. the light stays on. it is on my head.` | `none` | scanning | `gaze edge`, `antenna droop`, one hand down | once per visit |

Leave has a return line. If the pointer comes back inside 20s he says
`you came back. i did not move.` with `proud`, `blink once`, `gaze cursor`. After
20s a return is r1 again.

Fast move needs 300ms above 1400px/s. Below that he just watches, which is the
point of the gaze spring.

## The gate

The frame comes out of his chest, so these lines play over the glass while it
settles. The last stamp holds to the handoff.

| # | spoken | screen | expr | gesture | fires |
|---|---|---|---|---|---|
| f0 | none | `prove it` | proud | both hands to the hatch, `chest 1` | 18.40 |
| f1 | none | `i'll know` | scanning | `step right`, lean in, `gaze cursor` | 20.40, over the guides |
| x0 | `two lines. trace the dashes. i will watch.` | `none` | scanning | lean in 4px, `gaze cursor`, eyes track before the hand lands | 22.00 |
| x1 | none | `none` | scanning | `spark`, wide eyes, head mirrors the stroke | 22.60, first contact |
| x2 | none | `...` | thinking | lean 4px closer, `blink long`, head follows | 30 percent coverage |
| x3 | none | `almost` | thinking | `hand up`, `chest .8`, `blink once` | 60 percent coverage |
| x4 | `wrong way is still a way.` | `?` | confused | two 2 degree head shakes, antenna flick | 1.2s stall or a backwards stroke |
| x5 | `found.` | `FOUND` | celebrating | `spin`, `arms up 118`, confetti from the frame, `spark` | both guides pass |
| x6 | none | `FOUND` | proud | lets go, `step right`, drifts 24px to his corner | 29.60 to handoff |
| x7 | `they are already inside. save me a seat.` | `none` | proud | `blink once`, parks in the corner | after the page, off by default |

x4 clears on the next stroke. No reset, no penalty, no second warning. x5 is the
only line in the gate that is not a nudge.

x7 is written for the page side and stays off until the handoff lands. Turning it
on before that breaks the silent hold, which is the best frame in the piece.

## Rules that keep him alive

- One voice at a time. A bark is dropped, not queued, when a line is typing.
- Listening is silence with the rig's own life in it: the blink, the gaze drift,
  the antenna settling. Do not give him a listening loop of words.
- His face changes before his line starts. The state is set on the first
  character, and the eyes lead the head by about two frames.
- Every line is true. He has no result data, so a3 says so. He never promises a
  feature that is not on the page.
- Lowercase everywhere, including the console. `FOUND` is the one stamp the rig
  writes in caps, so leave it.
- No spoken line over 48 characters, which is two rows on the 36ch console.
  Three rows push the box into the prompt.
- No exclamation marks, no em dashes, no shouting in caps to cover a weak line.
- Stamps last 1.2s except `FOUND`, which holds to 30.00.
- If a line and a gesture disagree, the gesture wins and the line is rewritten.

## Budget

| block | lines | characters | typed |
|---|---|---|---|
| greeting | 1 spoken (h2 adds 41 on a still pointer) | 41 | 1.07s |
| rows | 2 labels | 46 | none, they are his question |
| branch a | 5 | 172 | 4.47s |
| branch b | 6 | 250 | 6.50s |
| barks | 12 in the bag, four max per visit | 450 | 11.70s if all play |
| cursor | 6 reactions and 1 return | 193 | 5.02s if all play |
| gate | 3 spoken live, f0, f1, x1 to x3 and x6 are stamps, x7 optional | 73 | 1.90s |

A typical visit hears 380 to 460 characters, about ten to twelve seconds of
speech in thirty. The rest is servo, glass and you deciding. That ratio is the
restraint. Keep it.
