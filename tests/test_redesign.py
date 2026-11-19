"""Checks for the site redesign.

Run with: python3 -m unittest tests.test_redesign
"""
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


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


if __name__ == "__main__":
    unittest.main()
