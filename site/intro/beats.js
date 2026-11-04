/* Xenith intro beat sheet. Times are seconds from first paint.
   Six scenes. 22.00s to the gate, 8.00s of gate, page at 30.00,
   vendored engine at 30.95. script.md is the readable version of this
   file; verify.js checks the two agree.

   If a row is picked before 15.50, subtract (15.50 - pick) from every
   time in scenes 5 and 6. The gate itself never shortens.

   Data only. No DOM, no imports. node --check clean. */
"use strict";

const INTRO = {
  toGate: 22.0,
  gate: 8.0,
  handoff: 30.0,
  engine: 30.95,
  autoPulse: 15.2,
  autoPick: 15.5,
  pickLead: 0.5
};

const SCENES = [
  {
    id: "void",
    in: 0.0,
    out: 3.0,
    beats: [
      { in: 0.0, out: 1.0, copy: null, kind: "none", note: "pixel blinks twice" },
      { in: 1.0, out: 2.2, copy: "waking him up", kind: "site", note: "dust, HUD in" },
      { in: 2.2, out: 3.0, copy: null, kind: "none", note: "antenna rod grows" }
    ]
  },
  {
    id: "boot",
    in: 3.0,
    out: 8.4,
    beats: [
      { in: 3.0, out: 4.2, copy: "ow.", kind: "screen", note: "head overshoots" },
      { in: 4.2, out: 5.6, copy: "one sec.", kind: "screen", note: "ears, neck, body" },
      { in: 5.6, out: 6.9, copy: null, kind: "none", note: "arms, treads, shake" },
      { in: 6.9, out: 8.4, copy: null, kind: "none", note: "settles, looks up" }
    ]
  },
  {
    id: "hi",
    in: 8.4,
    out: 10.0,
    beats: [
      { in: 8.4, out: 10.0, copy: "hi.", kind: "screen", note: "eye contact" }
    ]
  },
  {
    id: "choose",
    in: 10.0,
    out: 16.0,
    beats: [
      { in: 10.0, out: 11.1, copy: "oh. hello. can i help you with something?", kind: "voice", note: "line types" },
      { in: 11.1, out: 11.8, copy: "check my vols application result", kind: "choice", note: "rows arm, 01 lit" },
      { in: 11.8, out: 15.2, copy: "explore xenith", kind: "choice", note: "02 lights on hover" },
      { in: 15.2, out: 16.0, copy: null, kind: "none", note: "auto pulse and pick" }
    ]
  },
  {
    id: "frame",
    in: 16.0,
    out: 22.0,
    beats: [
      { in: 16.0, out: 18.0, copy: null, kind: "none", note: "hatch opens" },
      { in: 18.0, out: 20.0, copy: "prove it", kind: "screen", note: "glass pulled out" },
      { in: 20.0, out: 22.0, copy: "i'll know", kind: "screen", note: "guides and prompt" }
    ]
  },
  {
    id: "gate",
    in: 22.0,
    out: 30.0,
    beats: [
      { in: 22.0, out: 22.6, copy: "draw x to enter", kind: "prompt", note: "pad live" },
      { in: 22.6, out: 25.0, copy: null, kind: "none", note: "first stroke" },
      { in: 25.0, out: 26.4, copy: "...", kind: "screen", note: "30 percent" },
      { in: 26.4, out: 27.6, copy: "almost", kind: "screen", note: "60 percent" },
      { in: 27.6, out: 28.6, copy: "?", kind: "screen", note: "stall or backwards" },
      { in: 28.6, out: 29.6, copy: "found.", kind: "screen", note: "success" },
      { in: 29.6, out: 30.0, copy: null, kind: "none", note: "hold, release" }
    ]
  }
];

/* The scene and beat under a given time, or null during the handoff. */
function at(t) {
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    if (t >= s.in && t < s.out) {
      let beat = null;
      for (let j = 0; j < s.beats.length; j++) {
        if (t >= s.beats[j].in && t < s.beats[j].out) beat = s.beats[j];
      }
      return { scene: s.id, beat: beat };
    }
  }
  return null;
}

const SHEET = { intro: INTRO, scenes: SCENES, at: at };

if (typeof module === "object" && module.exports) module.exports = SHEET;
if (typeof window === "object") window.XENITH_BEATS = SHEET;
