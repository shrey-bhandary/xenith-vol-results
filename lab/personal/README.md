# Personal records: Xenith selected

A CSV of selected crew, plus a standard-library builder that turns it into the
JavaScript object `site/index.html` already loads. One row, one private page.

## Files

| File | What it is |
|---|---|
| `people.sample.csv` | 12 applicants, one row each: slug, name, dept, role, line, tag |
| `build_people.py` | Python 3 stdlib reader, validator and writer |
| `people.js` | generated sample output, rebuilt from the CSV, never edited by hand |
| `COPY_GUIDE.md` | field mapping, five tone rules, fallbacks, the twelve lines |
| `README.md` | this file |

## Command

Run these from the repository root, so the path works in any checkout:

```
cd lab/personal
python3 build_people.py people.sample.csv --out people.js
node --check people.js
```

Expected result:

```
people.js: 12 people + default, 3302 bytes, 0 warning(s)
```

The byte count moves when copy changes. Any warning goes to stderr and still
exits 0. Any error exits 1 and writes nothing.

## Flags

| Flag | Default | Use |
|---|---|---|
| `people.csv` | `people.sample.csv` | input path, positional |
| `--out` | `people.js` | output path, must sit in an existing folder |
| `--fill-fallback` | off | replace an empty line with the department fallback |

## What the build validates

Errors, which block the write:

- missing or unknown CSV columns
- empty name, dept or line
- duplicate slug, reserved slug `default`, malformed slug
- em dash or line break anywhere in the record, exclamation mark in the line
- empty line with no department fallback
- output over the 60 KB file limit

Warnings, which do not block:

- line outside 55 to 120 characters, or no final period
- banned words: thrilled, excited, proud, journey, passion and the rest
- unknown department, so no fallback exists
- empty tag, or empty role which is filled from dept
- extra columns, blank rows

## Output shape

The generated file has the same shape and field order as `site/data.js`, and
always ends with a `default` record for unknown links:

```js
window.XENITH_PEOPLE = {
  "sanskrati": {
    name: "Sanskrati",
    dept: "Design",
    role: "Design",
    line: "You said you overthink colour. Xenith has one accent and no regrets. Come argue.",
    tag: "one accent colour, no regrets"
  },
  ...
  "default": {
    name: "Your Name",
    dept: "Xenith Crew",
    role: "Selected",
    line: "You are in. Rusty has been told to behave.",
    tag: "new crew member"
  }
};
```

## Integration

- Link per person: `site/index.html?p=sanskrati`. An unknown slug falls back to
  `default` in `xenith.js`.
- `xenith.js` also accepts `?name=`, `?dept=`, `?role=` and `?line=` for
  testing without a rebuild. Never put them in a shared link: anyone can
  override the page and the cursor with them.
- `site/data.js` **is** built from this CSV. It is the generated output plus one
  hand-kept `default` record that points at Ricco Marcelino; the generator's own
  `default` is the placeholder above, so do not overwrite `site/data.js` with the
  raw generator output without restoring that record.
- The CSV carries the confirmed talks and panel roster: full names, the
  department, the position, the line and the tag. `PROVENANCE.md` records which
  form answer each line leans on.
- The lines and departments are real, not placeholders. Anything still
  unconfirmed belongs in a branch, not in this file.
- Privacy: a shared data file ships every line to anyone with one link. The gate
  is cosmetic. If a weakness line should stay private, split to one record per
  page before release.
- The real form export must never be committed. `.gitignore` and
  `.vercelignore` exclude `people.csv`, but keep the export out of git and out of
  the deployment by hand. Only `slug, name, dept, role, line, tag` is ever
  written to `site/data.js`; phone numbers, emails, UIDs and free-text answers
  never leave the export.

## Constraints

Python 3 standard library only. No npm, no installs, no downloads, no server.
The generated file loads before `xenith.js`, exactly like the existing data file.

## Checks run

- `node --check people.js` passes.
- Generated object loads in Node: 13 keys, 12 people plus `default`, every record
  has the five fields in order.
- 12 validator cases pass: duplicate slug, empty name, empty dept, empty line with
  and without `--fill-fallback`, reserved slug, malformed slug, em dash,
  exclamation mark, unknown dept, missing column, missing output folder.
- All five files stay under 60 KB.
