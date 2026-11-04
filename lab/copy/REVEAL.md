# Xenith selected: revealing the personal line

The line is the only sentence on the page written for one person. It should
arrive like it was written after the name landed, not loaded with the page.

## Timeline from unlock

| Time | What happens |
|---|---|
| 0 ms | Gate starts fading. The X starts its shift and rotation. |
| 200 ms | Name and department enter (existing, 1.4s). |
| 900 ms | Rusty drops in (existing, 1.2s). |
| 1600 ms | First word lands. Caret appears. |
| every 52 ms | Next word. |
| +420 ms at the turn | The pause. |
| last word +240 ms | Caret starts its 420 ms fade, then is removed. |

A 17 word line finishes typing at 2.8s. The longest (18 words) at 2.9s, and its
caret is gone by 3.6s. All of this starts when `unlock()` runs, including the
`?entered=1` path.

Rusty stays at 900 ms. He is an object landing; the line is the last text to
arrive, which is the part that matters. If you would rather he landed last, move
his CSS delay to 2900 ms, but do not do both.

## Why the pause

The best lines have a turn: what they said, then what we did. Typing the first
half, holding for 420 ms, then finishing is the page doing the same thing a
person does before writing the second half. Under 300 ms reads as lag. Over 600
reads as a bug. The pause sits on the first sentence period, which is the turn
in every two-sentence line in the deck. A one-sentence line gets no pause.

`beat` in `lines.js` overrides the pause per person: 1-based word number, `0`
for auto, `-1` for none. Only use it when the turn sits inside a sentence.

## Mechanism

- The line splits on spaces into `span.ln-w`, one per word. All of them are in
  the DOM from the first frame of the reveal at `opacity: 0`, so the block already has its
  final height. The content column is vertically centred, so this is also why
  the name never slides when the line wraps to a second or third row.
- Words switch to `opacity: 1` with a 120 ms linear transition. No translate, no
  blur, no stagger on the letters. The sentence prints. It does not animate.
- The caret is an absolutely positioned 0.55ch amber block. It is placed from
  the current word's bounding rect, so it jumps to the right spot on the right
  line and can never push a word onto the next line.
- Every key or pointer press once typing starts completes the sentence and
  removes the caret.
- A resize repositions the caret on the last revealed word. It never restarts.

`reveal.js` is the implementation. `reveal.css` is the styling. `line-reveal.html`
is a harness for a human to check the feel without the rest of the page.

## Why not

- Character by character: 90 characters at 20 ms is nearly two seconds of stutter,
  breaks text selection, and floods screen readers. Word level keeps the
  sentence readable while it arrives.
- A block fade: that is how a paragraph appears in a CMS. It has to come after
  the name, not with it.
- A blinking caret: terminal chrome, and design.md bans looping decoration. The
  caret leaves when the sentence is done.
- Sound: sound is off by default and one tone is allowed on unlock. A tick per
  word would be a metronome.
- Random jitter per person: the rhythm should be identical for everyone. The
  authored part is the pause, not the speed.

## Placement and type

- Same left edge as the name, 18px under the department label, 38ch max at
  14px/1.85. Mobile keeps the existing 13px and full width.
- No quote marks, no rule, no label, no signature. The line is the only typed
  thing on the page. The name is an object that lands; the line is something
  that was written. Two typewriters would read as a boot log, which the
  storyboard already cut.
- Never centre it, never run it full width, never let it cross the X.

## Accessibility and fallbacks

- All words are in the DOM, so a screen reader reads the full sentence once.
  The caret is `aria-hidden`. There is no `aria-live`, so nothing is announced
  word by word.
- `prefers-reduced-motion`: every word visible immediately, no caret, no delay.
- Any pointer or key press during typing completes it.
- If the script fails before splitting, the line stays as plain text. If the
  CSS fails, words still appear (opacity is set inline), just without the fade.
- An empty line starts nothing and leaves no gap.
- Contrast of the current cream at 62% on `#06050f` is about 6.6:1. The caret is
  decorative.

## Integration

1. Copy `reveal.js`, `reveal.css` and `lines.js` into `site/`.
2. `index.html`: link `reveal.css` after `style.css`, and load `reveal.js` after
   `data.js`.
3. `data.js`: take the line from the copy deck so there is one source of truth.
   ```js
   const copy = window.XENITH_COPY && window.XENITH_COPY[key];
   $("#line").textContent = copy ? copy.line : person.line;
   ```
   Keep the existing `?line=` override last, and use `beat: 0` when it is set.
4. In `unlock()`, after `startRusty()`, using the `copy` lookup from step 3:
   ```js
   if (window.XenithLine) {
     XenithLine.start($("#line"), {
       beat: params.get("line") ? 0 : (copy ? copy.beat : 0)
     });
   }
   ```

If `XenithLine` is missing the page still works and the line is simply there,
which is the safe failure.

## Check before shipping

- Unlock, watch once at desktop width. Name, then Rusty, then the line.
- 320px: no horizontal scroll, no word jumps as the caret moves.
- Click during typing, and press Escape, and use `?entered=1`. All three finish
  the line the same way.
- Reduced motion: full line at once, no caret.
- Resize mid-sentence: caret stays on the last word.
- Screen reader: one clean pass over the sentence.
- `node triage.js` passes.

Timings here are derived from the current stylesheet and were not checked in a
browser, per the project constraint.
