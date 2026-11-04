# Xenith Vols easter egg

Private, static site for the Xenith selected-volunteer reveal. A black void, a
pixel robot called Rusty, two choices, a hand-drawn X, then the real page is
rebuilt by a swarm of named cursors.

No build step, no backend, no environment variables.

## Run locally

From the repo root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/` and it redirects to `/site/`.

- `/?p=katherine` personalises the page and the visitor cursor
- `/?gate=1` shows the old standalone gate
- `/?entered=1&engine=1` skips the intro and runs the swarm build directly
- `/?p=katherine&intro=1` forces the intro path

## Deploy to Vercel

1. Import this private repo in Vercel.
2. Framework preset: **Other**. Build command: none. Output directory: `.`.
3. Deploy. `vercel.json` only sets caching for the engine and voice clips.

The root `index.html` redirects to `/site/` and preserves the query string, so
`https://your-deployment.vercel.app/?p=katherine` works.

## Structure

```
index.html          root redirect to /site/
vercel.json         cache headers only
site/               the page, intro and engine
site/intro/         Rusty intro (void, choices, X gate, voice clips)
site/vendor/        vendored swarm-cursors engine
assets/brand/       logo, pixel X, app icons, manifest
assets/fonts/       Press Start 2P
docs/               pitch, storyboard, animation bible, cast, engine notes
lab/                prototypes and motion plans (not linked from production)
```

## Cast

Ricco (events sub-head, built the site), Aaditya (events), Shreyash (talks),
Glynnis and Nigel (assistance and hospitality), Ashley and Harsh (tech and
venue), Omkar (finance and sponsorship), Mogithh (publicity), Tejas (admin),
Naren (FnD, filming and documentary), Sarvika (creatives). Pratham and Shivam
roles are still unassigned.

## Licence warning

`site/vendor/swarm.js` is the unmodified engine from
[DhvanilPatel/swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors). That
repo has **no licence** and adapts Joel Califa's Swarm. Keep this repository
private. Do not publish or redistribute it without permission.

Everything else in this repo was written for this project. See
`site/vendor/NOTICE.md`.

## Credits

Engine: Dhvanil Patel, after Joel Califa's Swarm.
Intro, page, art direction: built for Xenith, St. Xavier's College, Mumbai.
