# HWS AI Club Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 65 generated pages a dark, serif-headline, one-accent look, and rebuild the home page as a scroll journey around a 42 x 20 dot grid where picking a major lights its column and lists its 20 use cases.

**Architecture:** `scripts/build_site.py` keeps generating every page; its markup functions change and `site/css/styles.css` is rewritten against the existing class names. The home page alone loads the vendored Scrollcraft engine, a generated slim data file and one hand-written script that draws the grid on a fixed canvas. Inner pages load only `styles.css` and `site.js`.

**Tech Stack:** Python 3.9 standard library (builder, `unittest`), plain HTML/CSS/JS, Scrollcraft (vendored, MIT), Google Fonts (Fraunces, Inter), Pillow for raster brand assets only.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md`. Read it before any task. Reference implementation of the method: `/Users/connorshibley/code/around-site` (`src/styles/tokens.css`, `src/pages/index.astro`, `src/scripts/home.js`, `public/engine/`).

## Global Constraints

- No npm, no framework, no client-side build step. Do not add `package.json`.
- Never hand-edit generated files (`site/index.html`, `site/majors/**`, `site/tasks/**`, `site/founders/**`, `site/faq/`, `site/ai-policy/`, `site/resources/`, `site/js/videos.js`, `site/js/grid-data.js`). Change `scripts/build_site.py` and rebuild.
- Build with `python3 scripts/build_site.py`. A second run must produce no diff. Tests run with `python3 -m unittest discover tests` (`python` is not on this machine's PATH).
- No change to URLs, `<title>`, meta descriptions, JSON-LD, `robots.txt`, `llms.txt`, or the use-case, video and prompt logic.
- Keep every existing class name, `id` and `data-*` attribute on any element that survives. Add new ones; do not rename. `site/js/site.js` and the tests select on them.
- Keep every existing `data-cta` value on the element playing the same role, and the GA snippet.
- Every link to `SKOOL_URL` that carries `data-cta="skool-join"` reads exactly `Join the club`.
- All text visible today stays visible with JavaScript off, and when the engine or the grid fails to load.
- New copy is limited to the "New wording" table in the spec. Copy it verbatim.
- Colours: ground `#0e0a1a`, surface `#1a1330`, ink `#efeaf7`, ink-soft `#a79fc0`, accent `#ff8a3d`, text-on-accent `#1a0d04`, close ground `#1c1238`. Accent only on buttons, links and the lit column.
- Type: Fraunces for headlines (weight about 460), Inter for everything else.
- Commit locally on `main` after each task. **Never `git push`.** Connor reviews the built site first.
- Preview: serve `site/` at the root (`python3 -m http.server 8765 --directory site`, via `.claude/launch.json` and the preview tool, not a bare shell). Root-relative paths break under `file://`.

## Review Focus

1. **Arriving on a home anchor from another page** (`/#founders`, `/#about`, `/#join`, `/#team`, `/#community`, `/#library`): the engine sets pinned-act heights after load, which moves everything below. The visitor must land on the named section. Test in Task 6.
2. **The grid's data or canvas is unavailable** (`grid-data.js` fails, 2D context is null): no dropdown, no empty boxes, no console error; act 3 shows the library content. Test in Task 7.
3. **Long major names on a narrow phone** ("Business Management and Entrepreneurship", at 320 px wide): no horizontal scroll, in the column tip, the dropdown or the result heading. Test in Task 7.
4. **Choosing by keyboard:** arrowing through the dropdown re-renders the result each time. A screen reader should hear one short line per choice ("Computer Science, 20 use cases"), not 20 titles. Test in Task 7.
5. **Tapping the grid on a touch screen** where a column is about 8 px wide: a tap must not silently pick the wrong major. Test in Task 7.

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `scripts/check_redesign.py` | create | Compares `<main>` visible text and sitemap URLs against a git ref |
| `tests/test_redesign.py` | create | Regression tests for the redesign's promises |
| `tests/test_seo_migration.py` | modify | Only if the join-section opening tag changes |
| `scripts/build_site.py` | modify | `head`, `site_header`, `site_footer`, `scripts`, `build_home`, `build_major`, new `build_grid_data`, brand assets, `main` |
| `site/css/styles.css` | rewrite | The whole look: tokens, shared furniture, inner-page components, home acts |
| `site/engine/scrollcraft.js`, `scrollcraft.css`, `LICENSE-scrollcraft.txt` | create (copied) | Vendored scroll engine, unedited |
| `site/js/home.js` | create | Home page only: mounts the engine, draws the grid, runs the picker |
| `site/js/grid-data.js` | generated | `window.HWS_GRID`, slim major and use-case titles |
| `site/assets/favicon.svg` | modify | Brand mark without the gradient |
| `site/showcase.html` | modify | Minimal patches so it takes the new look |
| `.claude/launch.json`, `.gitignore` | create / modify | Local preview config, untracked |
| `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/ARCHITECTURE.md` | modify | Keep the file lists and design-system notes accurate |

---

### Task 1: Safety net

**Files:**
- Create: `scripts/check_redesign.py`, `tests/test_redesign.py`, `.claude/launch.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `python3 scripts/check_redesign.py [--ref REF]` (default ref `41491b4`, the commit the redesign starts from). Exit 0 when the sitemap URL set equals the ref's and every generated page except `site/index.html` has identical visible text inside `<main>`. Always prints a unified diff of the home page's `<main>` text for a person to read. Exit 1 otherwise, naming each page that differs.
- Produces: `tests/test_redesign.py` with class `RedesignTests(unittest.TestCase)`; later tasks add methods to it. Helpers on the class: `page(rel)` returns the text of `site/<rel>`; `all_pages()` yields `(path, text)` for every `site/**/index.html`, with `path` a `str` using forward slashes.

- [ ] **Step 1: Commit the approved spec, this plan and the `.gitignore` line**

```bash
git add .gitignore docs/superpowers && git commit -m "Add the redesign spec and plan"
```

- [ ] **Step 2: Write `scripts/check_redesign.py`**

Visible text means text nodes inside `<main>`, excluding `<script>` and `<style>`, whitespace collapsed. Use `html.parser.HTMLParser`. Read the old version of each page with `git show REF:path`. Pages are every `site/**/index.html` that exists at either side; a page present on one side only is a failure.

- [ ] **Step 3: Run it on the untouched tree**

Run: `python3 scripts/check_redesign.py`
Expected: exit 0, "65 pages, 65 sitemap URLs, 0 differences", empty home diff.

- [ ] **Step 4: Write `tests/test_redesign.py` with the helpers and two tests that pass today**

```python
def test_home_title_and_description_are_unchanged(self):
    home = self.page("index.html")
    self.assertIn("<title>HWS AI Club | AI Workshops and Resources for HWS Students</title>", home)
    self.assertIn("Free, student-run AI workshops and 840 practical use cases", home)

def test_home_has_one_h1_with_the_existing_text(self):
    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", self.page("index.html"), re.S)
    self.assertEqual(["AI for Everyone at Hobart and William Smith"], h1s)
```

- [ ] **Step 5: Run the tests**

Run: `python3 -m unittest discover tests`
Expected: all pass (8 existing, 2 new).

- [ ] **Step 6: Add the preview config**

`.claude/launch.json` with one configuration: name `hws-site`, `runtimeExecutable` `python3`, `runtimeArgs` `["-m", "http.server", "8765", "--directory", "site"]`, port `8765`. Add `.claude/launch.json` to `.gitignore`.

- [ ] **Step 7: Commit**

```bash
git add scripts/check_redesign.py tests/test_redesign.py .gitignore && git commit -m "Add redesign safety checks"
```

---

### Task 2: Shared page furniture in the builder

**Files:**
- Modify: `scripts/build_site.py` (`head` at 596, `site_header` at 636, `site_footer` at 657, `scripts` at 690, every `btn-primary` Skool link in `build_home`, every caller of the four functions)
- Test: `tests/test_redesign.py`

**Interfaces:**
- Produces: `head(title, description, canonical_path, jsonld, home=False)`, `site_header(home=False)`, `scripts(home=False)`. `home=True` is passed only by `build_home`.
- Produces in every page's `<head>`: the Google Fonts link requesting `Fraunces:opsz,wght@9..144,400..600` and `Inter:wght@400;500;600;700`; `<meta name="theme-color" content="#0e0a1a">`; and, before any stylesheet, `<script>document.documentElement.classList.add("js")</script>`.
- This task adds the `home` parameters and uses them only for the header class. Task 6 uses them to load the engine's stylesheet and the home scripts.
- Produces the header contract used by Task 3's CSS:

```html
<header class="site-header bar [bar--solid]">            <!-- bar--solid unless home -->
  <div class="site-header-inner">
    <a class="wordmark" href="/">…logo-tile…<span class="wordmark-name">AI @ HWS</span></a>
    <nav class="site-nav" aria-label="Primary">
      <div class="bar__links">…the six existing links, same hrefs and labels…</div>
      <a class="nav-cta" href="{SKOOL_URL}" target="_blank" rel="noopener" data-cta="skool-join">Join the club</a>
      <details class="bar__menu"><summary>Menu</summary>
        <div class="bar__sheet">…the same six links…</div></details>
    </nav>
  </div>
</header>
```

- [ ] **Step 1: Write the failing tests**

```python
def test_every_skool_button_reads_join_the_club(self):
    bad = []
    for path, text in self.all_pages():
        for label in re.findall(r'<a[^>]*data-cta="skool-join"[^>]*>(.*?)</a>', text, re.S):
            plain = re.sub(r"<[^>]+>|&#8599;|↗", "", label).strip()
            if plain != "Join the club":
                bad.append((path, plain))
    self.assertEqual([], bad)

def test_every_page_declares_fonts_theme_and_js_flag(self):
    for path, text in self.all_pages():
        self.assertIn("family=Fraunces", text, path)
        self.assertIn('<meta name="theme-color" content="#0e0a1a">', text, path)
        self.assertIn('document.documentElement.classList.add("js")', text, path)

def test_header_keeps_its_six_destinations_and_folds_on_phones(self):
    for path, text in self.all_pages():
        header = re.search(r"<header.*?</header>", text, re.S).group(0)
        for href in ("/#about", "/majors/", "/tasks/", "/resources/ai-at-hws/", "/faq/", "/#founders"):
            self.assertEqual(2, header.count(f'href="{href}"'), (path, href))
        self.assertIn('<details class="bar__menu">', header, path)
        self.assertEqual("bar--solid" in header, not path.endswith("site/index.html"), path)
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `python3 -m unittest tests.test_redesign`
Expected: 3 failures.

- [ ] **Step 3: Change the four functions and the Skool labels**

The footer keeps its links and all three legal paragraphs word for word. Labels to replace on `data-cta="skool-join"` links: "Join Us", "Join the Club", "Get Started Today", "Join the Skool community". Keep the trailing arrow spans.

- [ ] **Step 4: Rebuild and run every check**

Run: `python3 scripts/build_site.py && python3 -m unittest discover tests && python3 scripts/check_redesign.py`
Expected: build summary prints, all tests pass, check exits 0. The home diff shows only Skool button labels changing to "Join the club". (Inner pages carry that button in the header only, outside `<main>`.)

- [ ] **Step 5: Commit**

```bash
git add scripts/build_site.py tests/test_redesign.py site && git commit -m "Share one header, footer and button label across every page"
```

---

### Task 3: The look, on every inner page

**Files:**
- Rewrite: `site/css/styles.css`
- Modify: `site/showcase.html`, `site/assets/favicon.svg`, `scripts/build_site.py` (`BRAIN_SVG` tile markup only if needed)

**Interfaces:**
- Consumes: the header contract from Task 2.
- Produces: tokens on `:root`, declared under the engine's names so the engine's ground drift and the site agree: `--sc-canvas: #0e0a1a; --sc-surface: #1a1330; --sc-ink: #efeaf7; --sc-ink-soft: #a79fc0; --sc-accent: #ff8a3d; --sc-accent-ink: #1a0d04; --sc-font-display: "Fraunces", "Iowan Old Style", Georgia, serif; --sc-font-text: "Inter", system-ui, sans-serif;` plus `--hairline: color-mix(in oklab, var(--sc-ink) 14%, transparent)`. `html` and `body` use `background: var(--sc-canvas)`.
- Produces: `.cta` look applied to the existing `.btn-primary` and `.nav-cta` (accent ground, `--sc-accent-ink` text, 0.6rem radius, min-height 3rem; 2.5rem in the bar); `.btn-secondary` as an underlined accent text link.
- Produces: phone behaviour at `max-width: 860px`: `.bar__links` hidden, `.bar__menu` shown, `.nav-cta` hidden in the bar (the join button is on every page body and in the footer).

- [ ] **Step 1: Rewrite the stylesheet section by section, keeping the selectors**

Keep the existing section order (header, layout shell, buttons, landing scaffolding, hero, …, footer, responsive, reduced motion) and every selector that still matches markup. Delete the dead `.io-hidden` / `.io-in` rules and the hero blob rules. Rules that matter beyond "match the spec":
- Header: fixed, `height: 4.25rem`. `.bar--solid` gets `background: color-mix(in oklab, var(--sc-canvas) 86%, transparent)`, `backdrop-filter: blur(10px)` and a hairline bottom edge. Without `.bar--solid` it has a `::before` fade from `var(--sc-canvas)` to transparent. `main.page` gets top padding of the bar height plus `3rem`.
- `h1`, `h2`, `.section-title`, `.division-title`: display font, weight 460, `letter-spacing: -0.015em`.
- Cards (`.card`, `.usecase-card`, `.major-card`, `.team-card`, FAQ items): surface ground, hairline edge, no drop shadow glow.
- Difficulty badges, starting values (verify AA against `#1a1330`): easy text `#86efac` on `rgba(74,222,128,.14)`; medium `#ffb27a` on `rgba(255,138,61,.16)`; hard `#c4b5fd` on `rgba(167,139,250,.18)`.
- `.logo-tile`: surface ground, hairline edge, ink glyph, no gradient.
- Focus ring: `2px solid var(--sc-accent)`, offset 3px.
- The home page sections are restyled here as ordinary flow sections. Task 6 adds the act layout.

- [ ] **Step 2: Update `site/assets/favicon.svg`**

Replace the gradient with `fill="#1a1330"` on the rounded rect and `stroke="#efeaf7"` on the glyph. Remove the `<defs>` block.

- [ ] **Step 3: Patch `site/showcase.html`**

Replace its hand-copied header with the Task 2 header markup (inner-page form), and replace the old tokens in its inline `<style>` (`--white`, `--slate-*`, `--grad-brand`, `--grad-wash`, `--violet`) with the new tokens. Change nothing else.

- [ ] **Step 4: Rebuild and run every check**

Run: `python3 scripts/build_site.py && python3 -m unittest discover tests && python3 scripts/check_redesign.py`
Expected: all pass, exit 0.

- [ ] **Step 5: Verify in the browser, desktop and 375 px wide**

Start the `hws-site` preview. Check `/majors/`, `/majors/computer-science/`, `/tasks/`, one task hub, `/faq/`, `/ai-policy/`, `/resources/ai-at-hws/`, `/founders/zackary-hanna/`, `/showcase.html`, and `/` (plain flow for now).
Expected on each: dark ground, serif headings, no white or violet-gradient leftovers, no horizontal scroll at 375 px, the phone menu opens and its links work, no console errors.
Behaviour that must still work: typing in the majors search filters cards and hides empty divisions; the difficulty filter on a major page filters cards and updates `aria-pressed`; a Copy button copies its prompt and confirms; `/majors/computer-science/#uc-7` scrolls to and highlights card 7; `/#/major/biology` redirects to `/majors/biology/`.

- [ ] **Step 6: Commit**

```bash
git add site scripts/build_site.py && git commit -m "Restyle every page: dark ground, serif headlines, one accent"
```

---

### Task 4: The lit column on major pages

**Files:**
- Modify: `scripts/build_site.py` (`build_major` at 1132), `site/css/styles.css`
- Test: `tests/test_redesign.py`

**Interfaces:**
- Produces: on each major page, directly after the `major-title-row` div, exactly `<div class="grid-strip" style="--col:{i}" aria-hidden="true"></div>`, where `i` is the major's 0-based index in `DATA["majors"]`.

- [ ] **Step 1: Write the failing test**

```python
def test_each_major_page_lights_its_own_column(self):
    majors = json.loads((ROOT / "site" / "data.json").read_text(encoding="utf-8"))["majors"]
    self.assertEqual(42, len(majors))
    for i, m in enumerate(majors):
        text = self.page(f"majors/{m['slug']}/index.html")
        self.assertEqual(1, text.count(f'<div class="grid-strip" style="--col:{i}" aria-hidden="true"></div>'), m["slug"])
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `python3 -m unittest tests.test_redesign.RedesignTests.test_each_major_page_lights_its_own_column`
Expected: FAIL, count 0.

- [ ] **Step 3: Emit the strip and style it**

One element, no children. `.grid-strip`: `width: min(100%, 26rem)`, `aspect-ratio: 42 / 20`, a repeating `radial-gradient` of ink dots at 45% opacity sized `calc(100% / 42) calc(100% / 20)`. Its `::before` is the lit column: `left: calc(var(--col) * 100% / 42)`, `width: calc(100% / 42)`, full height, the same dot pattern in `var(--sc-accent)` at full opacity, over a ground-coloured backing so the ink dots beneath do not show through.

- [ ] **Step 4: Rebuild and run every check**

Run: `python3 scripts/build_site.py && python3 -m unittest discover tests && python3 scripts/check_redesign.py`
Expected: all pass, exit 0 (the strip has no text).

- [ ] **Step 5: Verify in the browser**

`/majors/africana-studies/` lights the first column, `/majors/computer-science/` the fifteenth, the last major the forty-second. Each lit column shows 20 dots aligned with its neighbours at desktop and 375 px.

- [ ] **Step 6: Commit**

```bash
git add scripts/build_site.py site tests/test_redesign.py && git commit -m "Light each major's column at the top of its page"
```

---

### Task 5: Slim grid data

**Files:**
- Modify: `scripts/build_site.py` (new `build_grid_data`, call it in `main` after `build_videos_js`, mention it in the printed summary)
- Test: `tests/test_redesign.py`

**Interfaces:**
- Produces: `build_grid_data() -> None`, writing `site/js/grid-data.js` as exactly `window.HWS_GRID = <json>;\n`, where `<json>` is a list in `DATA["majors"]` order of `{"n": name, "s": slug, "u": [[title, difficulty], … 20 pairs in use-case number order]}`. Serialise with `ensure_ascii=False, separators=(",", ":")` and replace `</` with `<\/`.

- [ ] **Step 1: Write the failing test**

```python
def test_grid_data_is_slim_and_matches_the_library(self):
    raw = (ROOT / "site" / "js" / "grid-data.js").read_text(encoding="utf-8")
    self.assertTrue(raw.startswith("window.HWS_GRID = ") and raw.endswith(";\n"))
    grid = json.loads(raw[len("window.HWS_GRID = "):-2].replace("<\\/", "</"))
    majors = json.loads((ROOT / "site" / "data.json").read_text(encoding="utf-8"))["majors"]
    self.assertEqual([m["slug"] for m in majors], [g["s"] for g in grid])
    for m, g in zip(majors, grid):
        self.assertEqual(m["name"], g["n"])
        self.assertEqual([[u["title"], u["difficulty"]] for u in m["useCases"]], g["u"])
    self.assertLess(len(raw.encode("utf-8")), 70_000)
```

- [ ] **Step 2: Run it and confirm it fails** (`FileNotFoundError`)

- [ ] **Step 3: Implement `build_grid_data` and wire it into `main`**

- [ ] **Step 4: Rebuild twice and run every check**

Run: `python3 scripts/build_site.py && python3 scripts/build_site.py && git status --short site/js/grid-data.js && python3 -m unittest discover tests`
Expected: tests pass; the second build leaves `grid-data.js` unchanged.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_site.py site/js/grid-data.js tests/test_redesign.py && git commit -m "Generate a slim data file for the home page grid"
```

---

### Task 6: The home page as acts

**Files:**
- Create (copy, unedited): `site/engine/scrollcraft.js`, `site/engine/scrollcraft.css`, `site/engine/LICENSE-scrollcraft.txt` from `/Users/connorshibley/code/around-site/public/engine/`
- Create: `site/js/home.js` (engine mount and anchor fix only; Task 7 adds the grid)
- Modify: `scripts/build_site.py` (`build_home` at 834, `head`/`scripts` home branches), `site/css/styles.css`, `tests/test_seo_migration.py` if needed
- Test: `tests/test_redesign.py`

**Interfaces:**
- Consumes: `head(..., home=True)`, `site_header(home=True)`, `scripts(home=True)` from Task 2; `window.HWS_GRID` file from Task 5.
- Produces: `head(..., home=True)` emits `<link rel="stylesheet" href="/engine/scrollcraft.css">` immediately **before** `/css/styles.css`, so the site's tokens win.
- Produces: `scripts(home=True)` returns, in this order, all `defer`: `/engine/scrollcraft.js`, `/js/grid-data.js`, `/js/home.js`, `/js/site.js`. `scripts()` is unchanged for inner pages.
- Produces the markup contract Task 7 draws into:

```html
<body class="view-home">
<canvas class="grid-canvas" data-grid-canvas aria-hidden="true"></canvas>
…header…
<main id="main">
  <section class="lp-hero act-arrive" id="arrive" data-sc-act="pin" data-sc-span="1.4" data-sc-drift="#0e0a1a">
    <div data-sc-stage>
      <div class="section-inner" data-sc-cue="0 0.85 0">…h1, hero-sub, hero-actions, hero-meeting…</div>
      <div class="grid-slot" data-grid-slot="field"></div>
      <p class="grid-caption">42 majors across &middot; 20 use cases down</p>
    </div>
  </section>
  <section class="act-quiet" id="quiet" data-sc-act="pin" data-sc-span="2.3" data-sc-drift="#0b0815" aria-label="Why the library exists">
    <div data-sc-stage>
      <div class="grid-slot" data-grid-slot="dim"></div>
      <div class="quiet__lines">
        <p data-sc-cue="0 0.4 0" data-sc-kinetic="lines">Nobody hands you a manual for AI.</p>
        <p data-sc-cue="0.34 0.72" data-sc-kinetic="lines">And it works differently in every major.</p>
        <p data-sc-cue="0.66 1 0.3 0" data-sc-kinetic="lines">So we wrote down 840 ways to use it.</p>
      </div>
    </div>
  </section>
  <section class="lp-section lp-library act-pick" id="library" data-sc-act="flow" data-sc-drift="#120c22">
    <div class="section-inner">
      <p class="pick__label">The Use-Case Library</p>
      <h2 class="section-title">Twenty of them are yours.</h2>
      <p class="section-sub">…existing sub-line…</p>
      <div class="pick__control" data-pick-control hidden>
        <select id="major-pick" aria-label="Choose your major"><option value="">Choose your major</option></select>
      </div>
      <div class="grid-slot" data-grid-slot="pick"><span class="grid-tip" data-grid-tip></span></div>
      <p class="pick__hint" data-pick-hint hidden>Point at a column, or choose from the list.</p>
      <p class="visually-hidden" aria-live="polite" data-pick-live></p>
      <div class="pick__result" data-pick-result hidden></div>
      …existing library-stats, home-major-links, library-cta, unchanged…
    </div>
  </section>
  …#about, No Experience Needed, lp-tasks, #team, #join, #community, #founders, #faq as flow sections;
   each direct content block gets data-sc-in…
  <section class="act-close" id="close" data-sc-act="pin" data-sc-span="1.2" data-sc-drift="#1c1238">
    <div data-sc-stage>
      <div class="grid-slot" data-grid-slot="word"></div>
      <p class="close__line">Sundays at five. Bring your major.</p>
      <a class="btn-primary" href="{SKOOL_URL}" target="_blank" rel="noopener" data-cta="skool-join">Join the club</a>
    </div>
  </section>
</main>
…footer (outside main)…
```

- Section order inside `<main>`: arrive, quiet, library, about, No Experience Needed, tasks, team, join, community, founders, faq, close. This moves the library above "What We Do"; everything else keeps today's order.
- The act 1 link is the existing `btn-secondary` with `data-cta="hero-browse"`, now `href="#library"` and reading `Pick your major`.
- Spans and cue numbers above are starting values; tune them in the browser.

- [ ] **Step 1: Write the failing tests**

```python
NEW_WORDING = [
    "42 majors across &middot; 20 use cases down", "Pick your major",
    "Nobody hands you a manual for AI.", "And it works differently in every major.",
    "So we wrote down 840 ways to use it.", "Twenty of them are yours.",
    "Choose your major", "Point at a column, or choose from the list.",
    "Sundays at five. Bring your major.", "The Use-Case Library",
]

def test_home_carries_the_new_wording(self):
    home = self.page("index.html")
    for line in NEW_WORDING:
        self.assertIn(line, home, line)

def test_empty_photo_placeholders_are_gone(self):
    home = self.page("index.html")
    for label in ("Workshop Session", "AI Tools Demo", "Team Projects"):
        self.assertNotIn(label, home)

def test_only_the_home_page_loads_the_engine_and_never_the_full_dataset(self):
    for path, text in self.all_pages():
        is_home = path.endswith("site/index.html")
        self.assertEqual(is_home, "/engine/scrollcraft.js" in text, path)
        self.assertEqual(is_home, "/engine/scrollcraft.css" in text, path)
        self.assertEqual(is_home, "/js/grid-data.js" in text, path)
    self.assertNotIn("js/data.js", self.page("index.html"))

def test_home_keeps_its_anchors_and_tracking_hooks(self):
    home = self.page("index.html")
    for anchor in ("about", "library", "team", "join", "community", "founders", "faq"):
        self.assertEqual(1, home.count(f'id="{anchor}"'), anchor)
    for cta in ("skool-join", "hero-browse", "library-browse", "join-section-majors"):
        self.assertIn(f'data-cta="{cta}"', home, cta)

def test_text_stays_visible_until_the_engine_is_ready(self):
    css = (ROOT / "site" / "css" / "styles.css").read_text(encoding="utf-8")
    rule = re.search(r"html:not\(\.sc-ready\)[^{]*\{[^}]*\}", css, re.S).group(0)
    for needle in ("[data-sc-cue]", "[data-sc-in]", "opacity: 1 !important", "transform: none !important"):
        self.assertIn(needle, rule)

def test_engine_is_vendored_with_its_licence(self):
    engine = ROOT / "site" / "engine"
    self.assertIn("global.ScrollCraft = { mount: mount", (engine / "scrollcraft.js").read_text(encoding="utf-8"))
    self.assertIn("MIT License", (engine / "LICENSE-scrollcraft.txt").read_text(encoding="utf-8"))
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `python3 -m unittest tests.test_redesign`
Expected: 6 failures.

- [ ] **Step 3: Copy the three engine files**

```bash
mkdir -p site/engine && cp /Users/connorshibley/code/around-site/public/engine/{scrollcraft.js,scrollcraft.css,LICENSE-scrollcraft.txt} site/engine/
```

- [ ] **Step 4: Rewrite `build_home`'s body to the contract above**

Every sentence in today's sections stays word for word. Remove the three `hero-blob` divs, the `hero-tile` div and the `tile-stack` block. If the join section's opening tag changes, update the regex in `tests/test_seo_migration.py::test_primary_join_entrypoints_lead_directly_to_skool` and keep its two assertions.

- [ ] **Step 5: Add the home styles and the no-script guard to `styles.css`**

```css
/* Until the engine has mounted (or if it never does), nothing it would hide is hidden. */
html:not(.sc-ready) [data-sc-cue],
html:not(.sc-ready) [data-sc-in],
html:not(.sc-ready) [data-sc-stagger] > * { opacity: 1 !important; transform: none !important; }
```

Also: `.grid-canvas` is `position: fixed; inset: 0; z-index: 0; pointer-events: none; display: none`, shown only under `html.grid-on`. `.grid-slot` has `aspect-ratio: 42 / 20` and, like `.grid-caption`, is `display: none` unless `html.grid-on`. Slot widths: arrive `min(100%, 80vh)`, quiet `min(92vw, 150vh)` centred behind the lines, pick `min(100%, 76vh)`, close `min(100%, 96vh)`. `main` is `position: relative; z-index: 1`. `.quiet__lines > p` share one grid cell, centred, display font, `clamp(2rem, 5vw, 4.2rem)`. `.act-close` centres its content. The mockup at `.superpowers/brainstorm/40228-1795103142/content/home-moment.html` shows the intended proportions.

- [ ] **Step 6: Write `site/js/home.js` (engine half)**

An IIFE. Mount with `var engine = window.ScrollCraft ? window.ScrollCraft.mount(document) : null;`. Then the anchor fix: after mount, and again on `load`, if `location.hash` names an element, call `scrollIntoView({ block: "start", behavior: "instant" })` on it. Port the `reveal` focus handler from `around-site/src/scripts/home.js` (lines 45 to 75, cue branch only; there is no rail here).

- [ ] **Step 7: Rebuild and run every check**

Run: `python3 scripts/build_site.py && python3 -m unittest discover tests && python3 scripts/check_redesign.py`
Expected: all pass, exit 0. Read the printed home diff: additions are exactly the spec's new-wording table; removals are exactly "Browse Use Cases" and the three placeholder labels; the library block has moved up. Anything else is a defect.

- [ ] **Step 8: Verify in the browser**

- Desktop, scripts on: the headline is visible at once; the three quiet lines arrive one at a time while pinned; the ground reaches `#1c1238` at the close; reveal-on-entry content appears once and stays.
- **Review Focus 1:** from `/majors/`, click each of About and Meet The Founders in the header, and Events, Team and Community in the footer. Each lands with its section heading at the top of the viewport, below the bar. Load `/#library` directly: same.
- Scripts off (disable JavaScript in the browser, reload): every section's text is visible, the three quiet lines are stacked and readable, no blank gaps the height of a viewport.
- Block `/engine/scrollcraft.js` (rename it temporarily, reload, then restore): same result as scripts off, no console error from `home.js`.
- Reduced motion on: lines fade without sliding; nothing is unreachable.
- 375 px wide: no horizontal scroll, every act readable.
- Keyboard: Tab from the top reaches every link in order; a link inside a pinned act is visible when focused.

- [ ] **Step 9: Commit**

```bash
git add scripts/build_site.py site tests && git commit -m "Rebuild the home page as a scroll journey"
```

---

### Task 7: The grid

**Files:**
- Modify: `site/js/home.js`, `site/css/styles.css`

**Interfaces:**
- Consumes: `window.HWS_GRID` (Task 5); the markup contract and `html.grid-on` hook (Task 6); `engine` from the same file.
- Produces: no public API. `home.js` adds `grid-on` to `<html>` once it has a 2D context **and** `window.HWS_GRID` has 42 entries; otherwise it does nothing further.

Behaviour to implement (the mockup's `<script>` is the reference for drawing and state logic; rewrite it, do not paste it):

- **Geometry.** 42 columns by 20 rows. Cell size is slot width / 42. Dot radius is 0.21 of a cell.
- **Active slot.** The `[data-grid-slot]` whose centre is nearest the viewport centre. On change, ease the grid's rectangle from the old slot's live rect to the new one over 650 ms (cubic ease-out); snap instead if both rects are off screen or reduced motion is on.
- **States by `data-grid-slot` value.** `field`: each dot's alpha oscillates around 0.5, and a sweep column (5 columns per second) is full alpha, tinted to the accent. `dim`: alpha 0.13. `pick`: with nothing chosen, alpha 0.5 and the hovered column full alpha in accent; with a major chosen, its column is accent at 1.4x radius, the hovered column is full-alpha ink, the rest 0.13. `word`: the dots spelling "HWS AI" are ink at 1.3x radius, the rest 0.1. Per-dot alpha, tint and size ease toward their targets each frame.
- **"HWS AI".** 5 x 7 dot glyphs, top row at grid row 6, left columns H 5, W 11, S 17, A 26, I 32 (0-based). Glyph rows are in the mockup's `FONT` table.
- **Frame loop.** One `requestAnimationFrame` loop; skip drawing while `document.hidden`. Canvas backing store sized to `min(devicePixelRatio, 2)`; resize on `resize`.
- **Reduced motion** (`window.ScrollCraft.reduce`, or the media query if the engine is absent): no oscillation, no sweep, no easing between slots.
- **Picker.** On start, fill `#major-pick` with 42 options (value = index) and unhide `[data-pick-control]` and `[data-pick-hint]`. `choose(i)`: set the select, hide the hint, render and unhide `[data-pick-result]`, and set `[data-pick-live]` text to `"<name>, 20 use cases"`. The result is an `<h3>` with the name, a link `Open all twenty with starter prompts` to `/majors/<slug>/`, and an `<ol>` of 20 `<li>`, each `<a href="/majors/<slug>/#uc-<n>">title</a>` plus a `<small>` difficulty. Build nodes with `textContent`, never string-concatenated HTML.
- **Pointer.** On a fine pointer, `mousemove` over the pick slot sets the hovered column and shows `[data-grid-tip]` with that major's name above the column, kept inside the slot at both edges; `click` chooses it. **On a coarse pointer** (`matchMedia("(pointer: coarse)")`), a tap on the slot does not choose: it shows the tapped column's name in the tip and moves focus to `#major-pick`.
- **Dots become the list.** At widths of 861 px and up without reduced motion: after `choose`, draw 20 extra accent dots that travel from the chosen column's cells to each list item's bullet position over 600 ms, staggered 20 ms, then let the CSS bullets show. Otherwise the list items fade in, staggered 28 ms.

- [ ] **Step 1: Implement the grid in `home.js` and its styles**

Styles: `.grid-tip` (accent, 0.82rem, absolutely positioned above the slot, no wrap, `max-width: 100%` with ellipsis), `.pick__control select` (surface ground, hairline edge, `max-width: 100%`), `.pick__result ol` (two columns from 761 px, one below), list items with an accent bullet and a hairline rule, `overflow-wrap: anywhere` on the result heading.

- [ ] **Step 2: Rebuild and run every check**

Run: `python3 scripts/build_site.py && python3 -m unittest discover tests && python3 scripts/check_redesign.py`
Expected: all pass, exit 0 (this task changes no generated text).

- [ ] **Step 3: Verify the main path in the browser, desktop**

The grid twinkles and sweeps under the headline, travels and dims behind the quiet lines, sits in act 3, and spells "HWS AI" at the close. Hovering column 15 shows "Computer Science"; clicking it lights the column, lists 20 titles starting "Explain an algorithm", and the dots fly to the bullets. Clicking "Debug complex code" opens `/majors/computer-science/#uc-…` with that card highlighted. Choosing "Biology" in the dropdown moves the lit column. No console errors.

- [ ] **Step 4: Verify the Review Focus cases**

- **2, data missing:** rename `site/js/grid-data.js` temporarily and reload. Expected: no dropdown, no hint, no empty slot boxes, no canvas, no console error; library stats and links present. Restore the file. Repeat with `HTMLCanvasElement.prototype.getContext` stubbed to return `null` before `home.js` runs: same result.
- **3, long names at 320 px:** choose "Business Management and Entrepreneurship". Expected: `document.documentElement.scrollWidth === 320`; the heading wraps; the dropdown stays inside the page.
- **4, keyboard:** focus the dropdown and press the down arrow five times. Expected: `[data-pick-live]` holds one short line naming the current major and "20 use cases"; `[data-pick-result]` has no `aria-live` attribute.
- **5, touch:** at 375 px with touch emulation, tap the grid. Expected: no major is chosen, the tip names the tapped column, and `document.activeElement.id === "major-pick"`.
- Reduced motion on: the grid is still, states still change on pick, the list fades in.

- [ ] **Step 5: Commit**

```bash
git add site/js/home.js site/css/styles.css && git commit -m "Draw the 840-dot grid and the major picker"
```

---

### Task 8: Brand images

**Files:**
- Modify: `scripts/build_site.py` (`build_og_image` at 1860, `_og_png_pillow` at 1898, `_icon_pillow` at 1976, `build_manifest` at 2015)
- Test: `tests/test_redesign.py`

**Interfaces:**
- Consumes: `site/assets/favicon.svg` from Task 3.
- Produces: OG card (SVG and Pillow PNG kept in step): ground `#0e0a1a`; brand tile `#1a1330` with ink "AI" or glyph as today; "HWS AI Club", "AI for Everyone at" and "Hobart & William Smith" in `#efeaf7`; the sub-line in `#a79fc0`; along the bottom, five rows of 42 ink dots at 45% opacity with the fifteenth column in `#ff8a3d`. Same text and layout positions as today.
- Produces: `_icon_pillow` draws a `#1a1330` rounded tile with an ink mark. Manifest `theme_color` and `background_color` are both `#0e0a1a`.

- [ ] **Step 1: Write the failing test**

```python
def test_brand_files_use_the_new_palette(self):
    manifest = json.loads((ROOT / "site" / "site.webmanifest").read_text(encoding="utf-8"))
    self.assertEqual("#0e0a1a", manifest["theme_color"])
    self.assertEqual("#0e0a1a", manifest["background_color"])
    for name in ("og-image.svg", "assets/favicon.svg"):
        svg = (ROOT / "site" / name).read_text(encoding="utf-8")
        self.assertNotIn("#7c3aed", svg, name)
        self.assertNotIn("#3b82f6", svg, name)
    self.assertIn("#0e0a1a", (ROOT / "site" / "og-image.svg").read_text(encoding="utf-8"))
```

- [ ] **Step 2: Run it and confirm it fails**

- [ ] **Step 3: Change the four functions**

- [ ] **Step 4: Rebuild with Pillow available**

Pillow is not installed for the system `python3`, and the PNGs are only regenerated when it is. Use a private environment outside the repo:

```bash
python3 -m venv "$HOME/.venvs/hws-site" && "$HOME/.venvs/hws-site/bin/pip" install pillow
"$HOME/.venvs/hws-site/bin/python" scripts/build_site.py
```

Expected: the summary line reads `og-image:` and `favicons:` with a Pillow result, not "skipped".

- [ ] **Step 5: Look at the images**

Open `site/og-image.png`, `site/assets/favicon-32x32.png`, `site/assets/apple-touch-icon.png` and `site/assets/logo-512.png`. Expected: dark ground, legible text, no gradient, the dot band along the bottom of the OG card.

- [ ] **Step 6: Run every check and commit**

Run: `python3 -m unittest discover tests && python3 scripts/check_redesign.py`

```bash
git add scripts/build_site.py site tests/test_redesign.py && git commit -m "Move the share image, icons and manifest to the new palette"
```

---

### Task 9: Docs and the final sweep

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/ANALYTICS.md` (only where it lists button labels), the header comment of `site/css/styles.css`

- [ ] **Step 1: Update the docs**

Facts to record: hand-written inputs now include `site/js/home.js` and the vendored `site/engine/*` (do not edit; MIT; from Scrollcraft); `site/js/grid-data.js` is generated by `build_grid_data()`; the home page alone loads the engine; the design system is the dark ground, Fraunces and Inter, one accent; `scripts/check_redesign.py` exists and what it checks; tests run with `python3 -m unittest discover tests`. Remove the "matched to hws-ai-club.figma.site" description.

- [ ] **Step 2: Prove the build is idempotent**

Run: `"$HOME/.venvs/hws-site/bin/python" scripts/build_site.py && git add -A && "$HOME/.venvs/hws-site/bin/python" scripts/build_site.py && git status --short`
Expected: the second build leaves nothing unstaged.

- [ ] **Step 3: Run every check one last time**

Run: `python3 -m unittest discover tests && python3 scripts/check_redesign.py`
Expected: all pass; exit 0; the home diff matches the spec's lists.

- [ ] **Step 4: Full browser pass**

Repeat Task 3 Step 5, Task 6 Step 8 and Task 7 Steps 3 and 4 on the final build, at desktop and 375 px. Take a screenshot of the home page top, the pick with a major chosen, the close, `/majors/computer-science/` and `/faq/` for Connor.

- [ ] **Step 5: Commit, and stop**

```bash
git add -A && git commit -m "Document the redesign"
```

Do not push. Report to Connor with the screenshots and the preview address, and wait for his go-ahead.
