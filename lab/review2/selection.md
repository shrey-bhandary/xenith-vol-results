# Selected, then gone

The choice is the only decision the visitor makes before the gate, and the page
unmakes it 0.76s after it lands. Fix the receipt, not the row.

## What is on screen now

Read from `site/intro/intro.js`, `site/intro/buttons.js`, `buttons.css`.

| t (ms) | event |
|---|---|
| 0 | `pick()` locks, `aria-current="true"`, `.is-picked`, `select` cue, `choose()` runs |
| 90 | press sink releases (`is-press` off) |
| 460 | `.xchoice.is-out`, block fades; focus moves to `#skip` |
| 760 | rows inert, `aria-hidden`, `.is-done` (`visibility:hidden`) |
| 820 | `#menu` hidden, `destroyChoices()` removes the rows |
| 860 | `say(SAY_RESULT, 600, gateStart)` starts typing (31 chars, 26ms) |
| ~2266 | `gateStart()` hides `#say`, opens the pad |

So the picked row is legible for 460ms, and dimmed but legible to 760ms. From
760 to 2266, roughly 1.5s, nothing on screen names the choice. The gate copy is
generic (`two lines. trace the dashes.`) and has no memory of it either. That is
the defect: a selected state that ends before the thing it selects for.

The row state itself is good. `.is-picked` already gives amber wire, full veil
and an X in the mark square, and `aria-current` rides it. Nothing in
`buttons.css` needs changing.

## The rule

The receipt is the row's own label and sub, restated one slot lower, and its
lifetime is bounded by `gateStart()`, never by a constant. It is emitted by
`choose()` in `intro.js`, which is also the only code both menu paths share.
That is what makes it survive `destroyChoices()` and work when `IntroChoices` is
missing and the local `.opt` menu runs instead.

## DOM and ARIA

Visual slot inside `.console`, announcement node always mounted in `#stage`.
They are separate on purpose: chrome may collapse, a live region may not.

```html
<!-- inside #console, positioned above #say, out of flow -->
<p class="pick" id="pick" aria-hidden="true">
  <span class="pick-top"><span class="pick-k">chosen</span><span class="pick-i" id="pickI">01</span><span class="pick-m" id="pickM">one file, one line</span></span>
  <span class="pick-v" id="pickV">check my vols application result</span>
</p>

<!-- in #stage, never inside [hidden], never display:none -->
<p class="sr" id="pickSr" role="status" aria-live="polite" aria-atomic="true"></p>
```

- The row keeps `aria-current="true"` for the 760ms it is visible. It is
  momentary and it dies with the node, so it cannot be the only signal.
- `#pickSr` gets exactly one sentence, written once at pick:
  `selected. check my vols application result. one file, one line.`
  `role="status"` is implicitly polite and atomic, so the label is spoken after
  the cue, before Rusty's line at 860ms.
- Write into `#pickSr` while it is already in the tree. Do not copy the order in
  `say()`, where `lineSr.textContent` is set before `dom.say.hidden = false`;
  that ordering routinely drops announcements.
- `#pick` is `aria-hidden` because it duplicates `#pickSr` and the row. The text
  stays real DOM, so it is still selectable.
- The receipt is not focusable and adds no tab stop. After the pick, focus is on
  `#skip`, which is the intended escape. `gateStart()` hides `#skip` under focus,
  which drops focus to body; move it to `#gate` with `tabindex="-1"` in the same
  tick. Adjacent bug, one line, worth doing here.

## CSS state

```css
.pick{
  --p: 140ms;
  position:absolute; left:0; right:0; bottom:calc(100% + 16px);
  margin:0; padding:0 0 12px 14px;
  border-left:1px solid rgba(255,177,92,.55);
  opacity:0; transform:translateY(6px);
  transition:opacity .26s ease var(--p), transform .26s cubic-bezier(.2,.9,.2,1) var(--p);
}
.pick[data-on="1"]{ opacity:1; transform:none; }
.pick-top{
  display:flex; align-items:center; gap:10px;
  font-size:9px; letter-spacing:.22em; text-transform:lowercase;
  color:rgba(255,177,92,.8);
}
.pick-i{ color:var(--amber); letter-spacing:.14em; font-variant-numeric:tabular-nums; }
.pick-m{ margin-left:auto; color:rgba(255,233,176,.46); letter-spacing:.12em; }
.pick-v{
  display:block; margin-top:8px;
  font-family:var(--ps); font-size:9px; line-height:1.9; color:var(--cream);
}
.pick::after{
  content:""; position:absolute; left:14px; right:0; bottom:0; height:1px;
  background:var(--amber); transform:scaleX(0); transform-origin:left;
  transition:transform .22s ease var(--p);
}
.pick[data-on="1"]::after{ transform:scaleX(1); }

@media (max-width:760px){ .pick{ bottom:calc(100% + 12px); } }
@media (max-width:420px){ .pick-m{ display:none; } }
@media (prefers-reduced-motion:reduce){ .pick{ --p:0ms; } }
```

Absolute placement matters twice. It keeps `.console`'s height fixed, so the
dialogue does not jump at pick. And it puts the receipt in the band the rows
occupied, above the line that is about to type, without competing with the `--ps`
menu block fading in the same 300ms.

Colour is amber throughout, the same amber as `.is-picked`, because this is the
chosen state continuing. Mint stays reserved for the gate. Glass is not an option
here: `storyGlassMount()` in `site/xenith.js` is a post-gate, page-level object
(`.lg-logo-reveal`, `--lg-logo-reveal-size`), and a glass stub before the gate
would promise a material the intro has not introduced yet. A 1px amber wire is
the same material as the row.

## The transition

| t (ms) | see |
|---|---|
| 0 | row goes amber and its `01` goes amber. Same tick: `#pick` text written, `data-on="1"` |
| 140-400 | receipt fades and rises 6px. Underline draws left to right over 220ms |
| 460-760 | row fades with the block; receipt is already at full opacity from 400 |
| 820 | rows removed. Receipt is the only amber object left |
| 860-1666 | Rusty types. Receipt holds, no pulse, nothing moves |
| 2266 | `gateStart()`: `.console` fades to 0, tag becomes `verification / vols result`. Receipt's job ends there |

The numeral is the handoff. `01` is 9px tabular amber in both places, so the eye
reads it as one object moving down and left, not as two confirmations. No second
animation is needed to sell it; anything louder fights Rusty's typing.

## The second option

In shipped code, `explore` takes the identical tail: same lock, same teardown at
820, same `gateStart`. The only difference is `SAY_EXPLORE`, 86 characters, which
puts its gate at ~3.7s instead of ~2.2s. `docs/vision.md` says it should run a
12s tour and return to the same gate; that tour does not exist yet.

So:

- The receipt is built from the picked item. It never hardcodes file language.
  Option 02 reads `02 explore xenith / six departments, one page`, and the tag
  reads `verification / explore`. A receipt that says "one file" for both would
  be a lie on 02, which is the failure mode of a hardcoded string.
- Only one row can be chosen. `pick()` locks, the loser gets `aria-disabled`,
  and all rows are gone at 820. There is no state where both look selected.
- Its lifetime is bound to `gateStart()`, so the tour can be inserted before the
  gate without moving or retiming the indicator. If the tour ships, the receipt
  is the only thing holding identity while it plays, which is another reason not
  to time it with a `setTimeout`.

## Motion, mobile, edges

- Reduce: the global block already collapses transitions to `.01ms`, but a
  `transition-delay` survives it, hence `--p:0ms`. Typing drops to 5ms/char, so
  the gate arrives at ~1.6s; the receipt is simply present from the pick frame.
- Mobile: `.console` is `display:none` while `body.menu-open`, and `choose()`
  removes that class on its first line, so the slot exists before the receipt's
  first frame. The label fits 375px on one line and wraps at 320, `.pick-v`
  line-height 1.9 handles it.
- `?fast` scales `D()` only; it does not change 860 or the 26ms typing. The
  receipt does not depend on any of those numbers anyway.
- Skip, escape and the API handoff all end in `unmount()`, which removes
  `#stage` and `#pick` with it. No new cleanup, no new listener.

## Touches

- `site/intro/index.html`: two nodes, `id="gateTag"` on the gate tag, the CSS above.
- `site/intro/intro.js`: `dom` refs, `markPick(id)` first in `choose()`, one line
  in `gateStart()`.

```js
  const PICK_TAG = { result: "vols result", explore: "explore" };
  let picked = null;

  function markPick(id) {
    const i = OPTIONS.findIndex((o) => o.id === id);
    const opt = OPTIONS[i] || { id: "", label: "", sub: "" };
    picked = opt;
    if (dom.pick) dom.pick.dataset.on = "1";
    if (dom.pickV) dom.pickV.textContent = opt.label;
    if (dom.pickM) dom.pickM.textContent = opt.sub;
    if (dom.pickI) dom.pickI.textContent = String(i + 1).padStart(2, "0");
    if (dom.pickSr && !dom.pickSr.textContent) {
      dom.pickSr.textContent = "selected. " + opt.label + ". " + opt.sub + ".";
    }
  }
```

Called as `markPick(id)` right after `pickLock = true` in `choose()`, and in
`gateStart()`:

```js
    if (dom.gateTag) {
      dom.gateTag.textContent = "verification / " + (picked ? PICK_TAG[picked.id] || picked.id : "gate");
    }
```

No change to `buttons.js`, `buttons.css` or `site/vendor/`. The row already does
its half; the missing half is the one that outlives it.
