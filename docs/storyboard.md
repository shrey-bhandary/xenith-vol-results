# Xenith Selected — storyboard v1

Working title: **X**.

One page. One gesture. One name.

## The feeling

Zero's gate, not a website. Full-screen dark, a single glowing X in ASCII, one
line of instruction. The visitor draws the X and the page opens. Nothing else
happens until then.

After the gate: the name, the department, one line written for that person, and
Rusty. No boot log, no transmission labels, no badges, no footer.

## Depth

Four layers move at different rates with the pointer:

| Layer | Pointer travel | Extra |
|---|---|---|
| Photo plate (duotone) | 30% | the real campus, dimmed, sets recognition |
| Sky / far campus | 40% | slow drift, 1.06 scale |
| Facade / near campus | 100% | 1.4deg tilt, 1.03 scale |
| X monument | 180% | only after unlock, so the gate guides stay aligned |
| Name / copy | 30% | transform only, no layout shift |

Each also breathes on a different sine so the scene never sits still. The actual campus photo sits underneath as a dim duotone plate, so the building is unmistakable. The ASCII is a texture on top of it, not the only representation. Over that, a layer of falling 0/1 glyphs in amber, masked to stay faint behind the name and the X. It moves at 115 percent of the pointer, faster than the facade.

## Beats

| # | Beat | What happens |
|---|------|--------------|
| 0 | Gate | Full-screen ASCII campus, very dim. A glowing 3D X floats at centre, breathing, with drifting sparks. `draw x` sits below it. The visitor scribbles a rough X, 55 percent of each arm is enough. Mint fills as they go. |
| 1 | Unlock | Glyph burst, screen shake, confetti. A giant `SELECTED` slams across the screen and holds for a second. Then it fades and the name lands. |
| 2 | Name | The name lands in pixel type, left. Department in small amber caps. |
| 3 | Line | One personal line from their form answer. Nothing else. |
| 4 | Rusty | He drops in bottom right, blinks, looks around. |
| 5 | Share | Later: hold to save a card. |

## Why this is minimal

- Two text blocks after entry: name and one line. The department is a label.
- One accent colour (amber), one success colour (mint), one background.
- One gesture, one skip.
- The campus is atmosphere, not content. It never competes with the name.
- The X is the only object. Everything else is negative space.

## Personal lines

One per person, pulled from a real answer. No "we are thrilled". No exclamation
marks. Example: "You said evening classes are your nemesis. We put the chaos at
12 PM."

If the answer is thin, use a department line, never a generic compliment.

## Sound

Off by default. A single low tone on unlock if the user turns it on.

## What was cut

Boot log, transmission numbers, clock, footer, tag line, hint text, grade card,
badge row, "keep this link" copy. All of it was noise.
