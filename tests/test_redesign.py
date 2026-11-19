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


if __name__ == "__main__":
    unittest.main()
