# HWS AI Club site redesign: design

Date: 2026-11-19. Status: awaiting Connor's approval.

Anything marked **(authored)** is Claude's call, not something Connor said. Unmarked
decisions are Connor's.

## Intent

Connor asked for the HWS AI Club site to be redesigned "the same way I designed AR0UND"
(`/Users/connorshibley/code/around-site`, brief in its `docs/BRIEF.md`). AR0UND is a
cinematic scroll journey built around one signature moment, with one accent colour, one
button label, and deliberately quiet inner pages.

The HWS site today is a light Inter design with a violet-to-blue gradient and orange
buttons. It reads like a template. What it has that no other club site has is 840 real
AI use cases, 20 for each of 42 majors. The redesign puts that on screen as the first
thing a student sees and touches.

**What a student should believe by the end:** AI is useful in my major specifically, and
this club is where I learn to use it.

**The one action:** join the club (the Skool link).

**Tell-someone sentence (authored):** "You tell it your major and it shows you what AI is
actually for in it."

## Goals

1. The home page is a scroll journey built around the dot grid: 840 dots, 42 majors across
   and 20 use cases down. Picking a major lights its column and its 20 use cases appear.
2. All 65 generated pages (the home page plus 64 others) share one new look: dark ground,
   serif headlines, one orange accent.
3. Inner pages stay plain reading pages in that look.
4. Everything search engines rely on is unchanged (see Constraints).

## Non-goals

- No change to URLs, page titles, meta descriptions, structured data, `robots.txt`,
  `llms.txt` content, or the use-case, video and prompt logic.
- No rewrite of existing copy. New wording is limited to the table under "New wording".
- No framework, no npm, no client-side build step.
- No new analytics events, no motion on/off toggle, no remembering the picked major
  between visits. (All three are reasonable later additions.)
- No redesign of `site/showcase.html`. It is a hand-written, noindex page that links
  `css/styles.css`, carries a hand-copied old header and uses the old colour tokens in
  its inline styles. It takes the new look through minimal patches to those inline
  styles and that header; no copy of the old stylesheet is kept for it. **(authored)**
- Sitemap dates are not preserved. `build_sitemap()` hashes each page's rendered bytes,
  so every `lastmod` moves to the build date. The URLs themselves do not change.

## Anti-goals

The redesign has failed, even if it looks good, if any of these is true:

- Text that is on a page today is missing, hidden, or unreachable with scripts turned off.
- The home page headline waits on the grid or the scroll engine before it shows.
- The page is unusable on a phone, by keyboard, or with reduced motion turned on.
- It looks like AR0UND with the colours swapped. It must read as HWS AI Club.

## Constraints

- **Generated vs hand-written.** `scripts/build_site.py` generates every HTML page. Markup
  changes go in the builder, never in generated files. Hand-written inputs are
  `site/css/styles.css`, `site/js/site.js`, and the new files named below.
- **Idempotent build.** Running `python3 scripts/build_site.py` twice must produce no diff
  the second time.
- **Tests.** `python -m unittest tests.test_seo_migration` must pass.
  `test_primary_join_entrypoints_lead_directly_to_skool` matches the literal markup
  `<section class="lp-section lp-join" id="join">`; either keep that opening tag or update
  the test to match the new markup while keeping what it checks (the Skool link and
  `data-cta="skool-join"` inside the join section).
- **Analytics.** Keep the GA snippet and every existing `data-cta` value on the element
  that plays the same role. `site/js/site.js` fires events from those attributes.
- **No scripts required.** The site is fully usable with JavaScript off today. That must
  stay true. Verified risk: `scrollcraft.css` sets `[data-sc-cue] { opacity: 0 }` (line
  267) and hides `[data-sc-in]` content until the script adds a class (line 286). With
  the script absent or failed, all text must still be visible.
- **Existing behaviour in `site.js` keeps working:** the old `#/major/<slug>` redirect,
  the majors search filter, the difficulty filter, the starter-prompt copy button, and
  the `#uc-<number>` deep-link highlight.
- **Publishing.** Work is committed to `main` locally, at Connor's choice. Nothing is
  pushed to GitHub until Connor has looked at the built site and says so, because a push
  to `main` may publish to the live site.

## Approaches

Three ways to build the home page's motion were considered.

1. **Reuse AR0UND's scroll engine (chosen).** Copy Scrollcraft's two plain files from
   `around-site/public/engine` (62 KB script, 20 KB stylesheet, MIT, no dependencies) and
   load them on the home page only. Gives the same motion vocabulary as AR0UND: pinned
   acts, cues timed to scroll, ground colour drifting between acts. Costs about 80 KB on
   the home page and vendored third-party code. Risk: the no-script behaviour above.
2. **Hand-write only what the page needs.** One grid script and CSS `position: sticky`.
   Smallest and easiest to maintain, but plainer, and each extra effect is new code.
3. **Rebuild in Astro like AR0UND.** Ruled out: it would redo a 2,000-line Python
   generator with tests and search work behind it, and the repo forbids npm.

Connor picked 1, because the request was to make the site the way AR0UND was made and
the engine is what gives AR0UND its feel.

## The look (authored, shown to Connor in the mockup)

Follows AR0UND's rule: about 60% ground, 30% ink, 10% accent, and the accent goes on
buttons, links and the lit column only.

| Role | Value | Note |
| --- | --- | --- |
| Ground | `#0e0a1a` | Dark violet, a nod to the current site's violet |
| Surface | `#1a1330` | Cards, inputs, raised things |
| Ink | `#efeaf7` | Primary text and resting dots |
| Ink, soft | `#a79fc0` | Secondary text |
| Accent | `#ff8a3d` | The site's existing orange, lifted for a dark ground |
| Text on accent | `#1a0d04` | |
| Close ground | `#1c1238` | The ground the home page drifts to in its last act |

- **Type:** Fraunces for headlines (weight about 460, tight tracking), Inter for
  everything else. Both from Google Fonts, extending the link the site already uses.
- **One button, one look, one label.** Every link to Skool reads "Join the club". Today
  it reads "Join Us", "Join the Club", "Get Started Today" and "Join the Skool community".
- **Brand mark (authored).** The gradient brain tile loses its gradient: the brain glyph
  in ink on the surface colour. The wordmark text "AI @ HWS" stays. The favicon, touch
  icon, OG image and manifest theme colour move to the new ground and ink so the brand
  matches everywhere. The mockup's 3x3 dot mark was a placeholder and is not adopted.
- **Difficulty badges** (Easy, Medium, Hard) are recoloured for the dark ground and must
  meet WCAG AA contrast.

Mockup for reference: `.superpowers/brainstorm/40228-1795103142/content/home-moment.html`
(throwaway; do not build on its code beyond the grid logic).

## The home page

One fixed canvas sits behind the page and draws the grid. Every word is real HTML. Acts
in order:

| # | Act | Engine device | What is on screen |
| --- | --- | --- | --- |
| 1 | Arrive | pin, short | The existing `h1` and hero paragraph, the meeting line, the button, and a "Pick your major" link that goes to act 3. The grid sits below at rest, twinkling, with a highlight sweeping across the columns. Caption: "42 majors across · 20 use cases down". |
| 2 | The quiet act | pin | The grid dims behind three lines of type that arrive one at a time. Nothing else moves. |
| 3 | The pick (the peak) | flow | Heading, a major dropdown, and the grid. Choosing a major lights its column in the accent, dims the rest, and lists that major's 20 use cases. Holds today's "Use-Case Library" content. |
| 4 | Substance | flow, reveal on entry | Today's "What We Do", "No Experience Needed" and task-route sections. |
| 5 | People | flow, reveal on entry | Today's team, "Ready to Join?", community and founders sections. |
| 6 | Questions | flow | Today's FAQ. |
| 7 | Close | pin, short | The ground drifts to the close colour. The same dots spell "HWS AI". One line, one button, then the footer. |

Acts 4 to 6 are quiet on purpose (authored): no sideways rails, no pinning. They exist to
be read and crawled.

### The grid

- **Layout.** 42 columns in the order majors appear in `site/data.json`; 20 rows in
  use-case number order, 1 at the top.
- **Slots.** Acts 1, 2, 3 and 7 each reserve a box for the grid. The canvas draws the grid
  in whichever box is nearest the middle of the screen and travels between boxes as the
  page scrolls.
- **States.** At rest (soft twinkle plus a column sweep), dimmed, pick (hovered column
  bright, chosen column in accent and slightly larger, the rest dim), and word (the dots
  that spell "HWS AI" bright, the rest dim).
- **Picking.** The dropdown is the real control and works by keyboard and screen reader.
  Pointing at a column shows that major's name; clicking or tapping it picks it. On
  phones the columns are a few pixels wide, so the dropdown is the main way in.
- **Result.** The major's name, its 20 use-case titles with difficulty, each linking to
  `/majors/<slug>/#uc-<number>`, and one link to `/majors/<slug>/`. The result region is
  announced politely to screen readers.
- **Dots become the list.** On wide screens the chosen column's 20 dots travel to become
  the bullets of the 20 list items. Under reduced motion, or where that is impractical
  (phones), the list fades in instead.
- **Data.** The home page must not load the 210 KB `site/js/data.js`. The builder
  generates a slim file with just names, slugs, titles and difficulties (about 45 KB),
  loaded after first paint. **(authored)**
- **Decorative.** The canvas is `aria-hidden`. Nothing is conveyed only by the grid.
- **Library content is always there.** With or without scripts, act 3 shows today's
  library content: the sub-line, the 42 / 840 / 3 stats, the "Jump straight in" major
  links and the "Find your major" button to `/majors/`. The picker sits alongside it.
  **(authored)**
- **Without scripts or canvas.** No grid and no dropdown; the library content above is
  what act 3 shows.
- **Reduced motion.** No twinkle, no sweep, no travel between boxes (the grid snaps).
  States still change.

### New wording (authored; this is the only new copy, and Connor approves it here)

| Where | Text |
| --- | --- |
| Act 1 caption | 42 majors across · 20 use cases down |
| Act 1 link (was "Browse Use Cases") | Pick your major |
| Act 2, line 1 | Nobody hands you a manual for AI. |
| Act 2, line 2 | And it works differently in every major. |
| Act 2, line 3 | So we wrote down 840 ways to use it. |
| Act 3 heading | Twenty of them are yours. |
| Act 3 dropdown | Choose your major |
| Act 3 hint | Point at a column, or choose from the list. |
| Act 3 result link | Open all twenty with starter prompts |
| Act 7 line | Sundays at five. Bring your major. |
| Every Skool button | Join the club |

"The Use-Case Library" stops being the act 3 heading and stays on the page as the label
above the grid. Every other sentence on today's home page stays as written.

### One removal (authored)

"No Experience Needed" has three empty placeholder tiles labelled "Workshop Session",
"AI Tools Demo" and "Team Projects". They hold no photos. They are removed. The section's
text and list stay.

## Inner pages

All 64 other generated pages: majors index, 42 major pages, tasks index, 15 task hubs,
FAQ, AI policy, AI resources, 2 founder pages.

- Same tokens, same header and footer, serif `h1`. No scroll engine, no canvas.
- Cards sit on the surface colour with a hairline edge. Search input, difficulty filter,
  starter-prompt blocks, copy button, breadcrumbs, pager and FAQ items are restyled to
  match. Their behaviour is unchanged.
- **Your column follows you.** Each major page opens with a small strip of the grid with
  that major's column lit. It is static, needs no script, and must not add 840 elements
  to the page (a CSS dot pattern with one positioned accent column is enough).

## Header and footer

- **Header.** A fixed bar. On the home page it floats over the journey with a soft fade
  of the ground behind it; on inner pages it has a solid blurred ground. Same link
  destinations as today, plus the button. On phones the links fold into a `<details>`
  menu that works without scripts, as AR0UND's does.
- **Footer.** Same links and the same legal and course-policy text, restyled.

## The engine

- Copy `scrollcraft.js`, `scrollcraft.css` and `LICENSE-scrollcraft.txt` into
  `site/engine/`. Treat them as vendored: prefer not to edit them.
- Only the home page loads them. `styles.css` stays the one stylesheet every page loads
  and owns the brand tokens, so the home page and inner pages agree.
- The grid is a new hand-written `site/js/` file, home page only.

## Left to the builder

- How the no-script guarantee is met (for example an `html.js` class set in the head and
  an override for the engine's hidden states).
- Spans and cue timings for the pinned acts, the phone layout of each act, and the
  recoloured badge values.
- How the grid strip on major pages is drawn within the limits above.
- How the OG image and favicon builders are adjusted to the new palette.
- Class naming, and how much of the 1,306-line `styles.css` is rewritten versus replaced.
- Keeping `README.md`, `CLAUDE.md`, `AGENTS.md` and `docs/ARCHITECTURE.md` accurate about
  the new hand-written files, the new generated file and the design system.

## How we will know it is right

1. Existing tests pass, and a second build produces no diff.
2. A text check: the visible text of every page before and after is compared, and the
   only differences are the ones listed in this document.
3. Every URL in `sitemap.xml` before the change still exists after it.
4. In a browser, the home page is checked at desktop and phone width, with scripts off,
   and with reduced motion on. A sample of inner pages (majors index, one major, one task
   hub, FAQ, one founder page) is checked at desktop and phone width.
5. Search, difficulty filter, copy button and `#uc-` deep links still work.
6. Connor looks at the built site locally before anything is pushed.
