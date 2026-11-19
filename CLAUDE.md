# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The public website for the **HWS AI Club** (Hobart and William Smith Colleges). A plain
static HTML/CSS/JS site — no framework, no npm, no client-side build step. All content
generation happens in Python at build time; the browser only ever receives flat files.

Live at https://www.hwsaiclub.com/. Vercel is the production host; the old
`hws-ai-club.netlify.app` host exists only to permanently redirect legacy URLs.

Related docs, all cross-linked — read whichever matches the task:
- [README.md](README.md) — project pitch, live content-editing table
- [AGENTS.md](AGENTS.md) — tool-agnostic agent entry point (same substance, no Claude branding)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how `build_site.py` actually works, function by function
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) — data file schemas, how to change content safely
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — generated artifacts, Vercel, legacy redirects, how to verify a build
- [docs/ANALYTICS.md](docs/ANALYTICS.md) — GA4 setup, event taxonomy, what's tracked and why

## Commands

Rebuild the entire site from source data. This is idempotent — re-running it on an
unchanged repo must produce **no diff**; that's the correctness check to run after any change:
```bash
python3 scripts/build_site.py
```

Run the regression checks (SEO migration/schema in `tests/test_seo_migration.py`, redesign
in `tests/test_redesign.py`):
```bash
python3 -m unittest discover tests
```

Compare the built site with the pre-redesign commit. Exit 0 when the sitemap URL set matches
and every page except the home page has identical visible `<main>` text (join-button text is
normalised); it always prints the home page diff:
```bash
python3 scripts/check_redesign.py [--ref REF]   # default ref 41491b4
```

Re-import from the source spreadsheet — only needed when `AI_Use_Cases_by_Major_HWS.xlsx`
itself changes (requires `openpyxl`):
```bash
python3 scripts/extract_data.py
```

Deploy through the configured Vercel project after reviewing the generated `site/` diff.
Deploy the legacy Netlify configuration only when maintaining the old-host redirect.

There is no linter or npm/node toolchain in this repo. The two files in `tests/` are
standard-library regression suites: `test_seo_migration.py` for the custom-domain migration
and minimal-schema policy, `test_redesign.py` for the redesign's invariants.
The generator also enforces correctness with `assert` statements inside `extract_data.py` (spreadsheet
shape: 42 majors × 20 use cases = 840, difficulty/level agreement, no stray rows) and
`build_site.py` (every expected output file exists after the build). A failed assertion is
the signal something is wrong; there's nothing else to run in its place.

`build_og_image()` / `build_favicons()` try an external SVG rasterizer first (`cairosvg` /
`rsvg-convert` / ImageMagick `magick` or `convert` on `PATH`), then fall back to `Pillow`.
If none are installed the build still completes — it just skips those raster outputs and says
so in its printed summary. The Pillow path draws the brain glyph by reading its path data from
`site/assets/favicon.svg` at build time. The PNGs regenerate only when one of these tools is
available (and `favicon.ico` only with Pillow), so run the build with a Python that has Pillow
installed (a private venv is fine) when brand images change. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full fallback chain.

## Architecture

**A one-way data pipeline, not a running app.** Nothing here serves requests.
`scripts/build_site.py` runs once and writes finished HTML/JSON/text files into `site/`,
which Vercel serves as the production site.

```
AI_Use_Cases_by_Major_HWS.xlsx   (840 use cases, 42 majors — source of truth for content)
        │  scripts/extract_data.py
        ▼
site/data.json + site/js/data.js         canonical use-case data (generated)
        │
        │  scripts/build_site.py  ← also reads site/data/videos-config.json (hand-maintained)
        ▼
site/index.html · site/majors/** · site/founders/** · site/js/videos.js · site/js/grid-data.js ·
sitemap.xml · robots.txt · llms.txt · _headers · og-image.* · favicons · site.webmanifest
```

**Generated vs. hand-written is the fault line to respect.** Editing a generated file is
invisible work — the next `build_site.py` run silently overwrites it. Hand-written inputs:
`scripts/build_site.py`, `scripts/extract_data.py`, `scripts/check_redesign.py`,
`site/css/styles.css`, `site/js/site.js`, `site/js/home.js` (home page only: mounts the scroll
engine, fixes anchor landing, keyboard reveal in pinned acts, the 840-dot grid and major
picker, re-measures the engine when the use-case list opens or closes),
`site/data/videos-config.json`, and the constants block at the top of
`build_site.py` (`TEAM`, `FOUNDERS`, `SKOOL_MEMBERS`, meeting time, `BASE_URL`). The vendored
engine `site/engine/scrollcraft.js`, `scrollcraft.css` and `LICENSE-scrollcraft.txt` is
Scrollcraft (MIT), copied unedited from the AR0UND project: do not edit it. Everything
under `site/majors/`, `site/founders/`, `site/index.html`, `site/js/videos.js`, and
`site/js/grid-data.js` (written by `build_grid_data()`) is generated — change the source and
rebuild instead of touching the output.

**Design system.** One dark ground, Fraunces headlines, Inter text, one accent used only on
buttons, links and the lit column; tokens at the top of `styles.css`. Only the home page loads
the engine, `grid-data.js` and `home.js` (script order: engine, grid-data, home, site; all
`defer`). Each major page carries a `.grid-strip` with `--col:<index>`. The no-JS guarantee
lives in `styles.css` (the `html:not(.sc-ready)` override) and in `home.js` gating
(`html.grid-on` only when the data and a canvas are both available).

**Video/prompt resolution is the one piece that spans multiple files and won't make sense
from any single one of them.** For a given use case, `build_site.py` decides which YouTube
tutorial to link and what starter prompt to show through this chain:
1. `classify(title, description)` picks a task *archetype* (e.g. `summarize`, `code`,
   `research`) — first by matching the title's lead verb against `videos-config.json`'s
   `leadVerb` map, then by regex against `rules`.
2. `video_id()` resolves the archetype to a video via `videos-config.json`'s `skill` map,
   unless the specific `major-slug/use-case-number` key exists in `overrides` (hand-routed
   to a different video).
3. `starter_prompt()` looks up that *same* archetype in `promptPatterns` and composes a
   ready-to-paste prompt from the use case's own title/description/major — never a
   hand-written string per use case.
4. `card_text()` pulls from `videoTeaches` to describe what the linked tutorial actually
   covers, so a card's copy stays honest if the video behind it is swapped later.

Changing what a use case links to or says means editing `videos-config.json`, not the
generated card. Full schema in [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md).

**Vercel serves the generated `site/` output configured in its production project.**
`netlify.toml` retains `publish = "site"` only for the legacy-host redirect deployment.

**`research/founders/`** holds the sourcing behind the two founder bio pages
(`site/founders/*/`) — see its own [README](research/founders/README.md) for provenance
tagging (`[verified]` / `[supplied]` / `[unconfirmed]`). It's reference material consulted
when writing the `FOUNDERS` constant in `build_site.py`; it is not read by the build itself.
