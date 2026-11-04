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

- `/?p=ricco` personalises the page and the visitor cursor. With no `p` the demo defaults to **Ricco Marcelino**.
- `/?gate=1` shows the old standalone gate
- `/?entered=1&engine=1` skips the intro and runs the swarm build directly
- A link without `entered` or `gate` goes to the intro first, so `/?p=katherine` starts with Rusty. There is no `intro=1` flag.

## Deploy to Vercel

1. Import this private repo in Vercel.
2. Framework preset: **Other**. Build command: none. Output directory: `.`.
3. Deploy. `vercel.json` only sets caching for the engine and voice clips.
4. Before sharing per-person links, enable **Deployment Protection** in Vercel.
   A private GitHub repo does not make the deployment URL private.

`.vercelignore` keeps `lab/`, `docs/`, `research/`, this README and the licence
off the deployment, so the roster files are not live URLs. `robots.txt`
disallows crawlers as a second guard.

The root `index.html` redirects to `/site/` and preserves the query string, so
`https://your-deployment.vercel.app/?p=katherine` works.

## Structure

```
index.html          root redirect to /site/
robots.txt          disallow crawlers
vercel.json         cache headers only
.vercelignore       keeps lab/, docs/ and research/ off the deployment
LICENSE             project notice, all rights reserved
site/               the page, intro and engine
site/index.html     reveal page, gate and swarm handoff
site/xenith.js      page behaviour, gate and build handoff
site/card.js        save-card renderer (copy-link lives in xenith.js)
site/data.js        live records
site/style.css      page styles
site/swarm.js       ambient cursor crew, separate from the vendor engine
site/manifest.webmanifest  install metadata
site/intro/         Rusty intro (void, choices, X gate, voice clips)
site/vendor/        glass reveal and patched swarm-cursors engine
assets/brand/       logo, pixel X, app icons
assets/fonts/       Press Start 2P
assets/img/         campus photos
docs/               pitch, storyboard, animation bible, cast, engine notes (not deployed)
lab/                prototypes and motion plans (not deployed)
```

## Cast

Ricco (events sub-head, built the site), Aaditya (events), Shreyas Bhandari
(head of talks and panel discussions), Shivam Chakroborty (sub-head of talks
and panel discussions), Glynnis and Nigel (assistance and hospitality), Ashley
and Harsh (tech and venue), Omkar (finance and sponsorship), Mogithh
(publicity), Tejas (admin), Naren (FnD, filming and documentary), Sarvika
(creatives). Pratham's role is still unassigned.

## Licence warning

`site/vendor/swarm.js` is a patched copy of the engine from
[DhvanilPatel/swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors), with
local changes for this site. That repo has **no licence** and adapts Joel
Califa's Swarm. `site/vendor/NOTICE.md` lists the modifications. Keep this
repository private. Do not publish or redistribute it without permission.

Everything else in this repo was written for this project and is covered by the
root `LICENSE`: all rights reserved, not for redistribution. The vendored glass
reveal, the Press Start 2P font and the swarm engine keep their own terms.

## Credits

Engine: Dhvanil Patel, after Joel Califa's Swarm.
Intro, page, art direction: built for Xenith, St. Xavier's College, Mumbai.
