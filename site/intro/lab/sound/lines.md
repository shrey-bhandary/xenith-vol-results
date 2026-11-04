# lines: assembly labels and gate copy

lowercase, three words max. the label replaces the whole log string, not the
`[000.0]` prefix, which `log()` adds.

## assembly labels

| at | current | label | words |
|---|---|---|---|
| stage probe | `stage: local` | `stage up` | 2 |
| rig probe | `rig: wired` | `rig up` | 2 |
| menu probe | `menu: buttons` | `menu up` | 2 |
| torso landing | `torso: landed` | `body landed` | 2 |
| arms done | `arms: 2 of 2` | `arms on` | 2 |
| stall opens | `head: missing` | `head missing` | 2 |
| pending host | `waiting: rig` | `waiting on rig` | 3 |
| drop starts | `head: incoming` | `head incoming` | 2 |
| drop lands | `head: landed` | `head landed` | 2 |
| first face | `face: x` | `face on` | 2 |
| handoff to greet | `rig: ready` | `rig ready` | 2 |

notes:

- `stage up / rig up / menu up` read as one system check because they land in
  three consecutive frames. do not give them different verbs.
- `waiting on rig` is the only 3 word label, and it only prints when the host
  rig is still loading. on the local path it never appears.
- `body landed`, not `torso`, because the torso is the only part the visitor can
  name by looking at it.
- keep `face on` and `rig ready` two frames apart. they are the last two lines
  before the log fades, so they have to scan as a pair, not a sentence.

## gate

instruction, replacing `two lines. trace the dashes. i will watch.`:

    draw an x over the dashes

6 words, one verb, one object. it says what to do, where to do it, and nothing
about the watcher. the old line stacked three sentences over an empty canvas and
the last one asked the visitor to perform for an audience before they had drawn
anything.

unchanged around it:

- meta line: `0 / 2 lines   0%` (numbers keep the double space)
- tag: `verification`
- skip: `skip the x`
- mid-gate faces: `...` at 30%, `almost` at 60%
