"""Checks for the site redesign.

Run with: python3 -m unittest tests.test_redesign
"""
from pathlib import Path
import json
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


NEW_WORDING = [
    "42 majors across &middot; 20 use cases down", "Pick your major",
    "Nobody hands you a manual for AI.", "And it works differently in every major.",
    "So we wrote down 840 ways to use it.", "Twenty of them are yours.",
    "Choose your major", "Point at a column, or choose from the list.",
    "Sundays at five. Bring your major.", "The Use-Case Library",
]


class RedesignTests(unittest.TestCase):
    def page(self, rel):
        return (SITE / rel).read_text(encoding="utf-8")

    def all_pages(self):
        for path in sorted(SITE.rglob("index.html")):
            yield path.relative_to(SITE).as_posix(), path.read_text(encoding="utf-8")

    def test_home_title_and_description_are_unchanged(self):
        home = self.page("index.html")
        self.assertIn("<title>HWS AI Club | AI Workshops and Resources for HWS Students</title>", home)
        self.assertIn("Free, student-run AI workshops and 840 practical use cases", home)

    def test_home_has_one_h1_with_the_existing_text(self):
        h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", self.page("index.html"), re.S)
        self.assertEqual(["AI for Everyone at Hobart and William Smith"], h1s)

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
            self.assertEqual("bar--solid" in header, path != "index.html", path)

    def test_phone_menu_offers_the_join_button(self):
        # The bar hides its join button on phones, so the menu sheet carries it.
        for path, text in self.all_pages():
            sheet = re.search(r'<div class="bar__sheet">.*?</div>', text, re.S).group(0)
            joins = re.findall(r'<a[^>]*data-cta="skool-join"[^>]*>', sheet)
            self.assertEqual(1, len(joins), path)
            self.assertIn('href="https://www.skool.com/hws-ai-club-7506"', joins[0], path)

    def test_each_major_page_lights_its_own_column(self):
        majors = json.loads((ROOT / "site" / "data.json").read_text(encoding="utf-8"))["majors"]
        self.assertEqual(42, len(majors))
        for i, m in enumerate(majors):
            text = self.page(f"majors/{m['slug']}/index.html")
            self.assertEqual(1, text.count(f'<div class="grid-strip" style="--col:{i}" aria-hidden="true"></div>'), m["slug"])

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
            is_home = path == "index.html"
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

    def test_brand_files_use_the_new_palette(self):
        manifest = json.loads((ROOT / "site" / "site.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual("#0e0a1a", manifest["theme_color"])
        self.assertEqual("#0e0a1a", manifest["background_color"])
        for name in ("og-image.svg", "assets/favicon.svg"):
            svg = (ROOT / "site" / name).read_text(encoding="utf-8")
            self.assertNotIn("#7c3aed", svg, name)
            self.assertNotIn("#3b82f6", svg, name)
        self.assertIn("#0e0a1a", (ROOT / "site" / "og-image.svg").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
