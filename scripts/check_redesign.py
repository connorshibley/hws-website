"""Compare the built site with a reference commit.

Exit 0 when the sitemap URL set matches the reference and every generated page
except site/index.html has identical visible text inside <main>. Always prints a
unified diff of the home page's <main> text. Exit 1 otherwise.

Run with: python3 scripts/check_redesign.py [--ref REF]
"""
import argparse
import difflib
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
DEFAULT_REF = "41491b4"
HOME = "site/index.html"


class MainText(HTMLParser):
    """Collect text nodes inside <main>, skipping <script> and <style>."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.main_depth = 0
        self.skip_depth = 0
        self.parts = []
        self.join_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag == "a" and ("data-cta", "skool-join") in attrs and not self.join_depth:
            # Join buttons are normalised so a relabel is not a difference.
            self.join_depth = 1
            if self.main_depth and not self.skip_depth:
                self.parts.append("Join the club")
        elif tag == "a" and self.join_depth:
            self.join_depth += 1
        if tag == "main":
            self.main_depth += 1
        elif tag in ("script", "style") and self.main_depth:
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag == "a" and self.join_depth:
            self.join_depth -= 1
        if tag == "main" and self.main_depth:
            self.main_depth -= 1
        elif tag in ("script", "style") and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if self.main_depth and not self.skip_depth and not self.join_depth:
            self.parts.append(data)


def main_text(html):
    parser = MainText()
    parser.feed(html)
    parser.close()
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def git(*args):
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout


def old_text(ref, path):
    """File text at ref, or None when the file does not exist there."""
    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"], cwd=ROOT, capture_output=True
    )
    return result.stdout.decode("utf-8") if result.returncode == 0 else None


def sitemap_urls(xml):
    return set(re.findall(r"<loc>\s*(.*?)\s*</loc>", xml))


def page_paths(ref):
    new = {p.relative_to(ROOT).as_posix() for p in SITE.rglob("index.html")}
    old = {
        line for line in git("ls-tree", "-r", "--name-only", ref, "site").splitlines()
        if line.endswith("/index.html")
    }
    return sorted(new | old)


def sentences(text):
    return re.sub(r"(?<=[.!?]) ", "\n", text).splitlines()


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--ref", default=DEFAULT_REF)
    ref = ap.parse_args().ref

    failures = []
    paths = page_paths(ref)
    old_map = sitemap_urls(old_text(ref, "site/sitemap.xml") or "")
    new_map = sitemap_urls((SITE / "sitemap.xml").read_text(encoding="utf-8"))
    for url in sorted(old_map - new_map):
        failures.append(f"sitemap: missing {url}")
    for url in sorted(new_map - old_map):
        failures.append(f"sitemap: extra {url}")

    home_old = home_new = ""
    for path in paths:
        old = old_text(ref, path)
        new_file = ROOT / path
        new = new_file.read_text(encoding="utf-8") if new_file.exists() else None
        if old is None or new is None:
            failures.append(f"{path}: present on one side only")
            continue
        old_main, new_main = main_text(old), main_text(new)
        if path == HOME:
            home_old, home_new = old_main, new_main
        elif old_main != new_main:
            failures.append(f"{path}: visible text in <main> differs")

    print("Home page <main> text diff:")
    diff = list(difflib.unified_diff(
        sentences(home_old), sentences(home_new),
        fromfile=f"{ref}:{HOME}", tofile=HOME, lineterm="",
    ))
    print("\n".join(diff) if diff else "(no difference)")
    print()
    print(f"{len(paths)} pages, {len(new_map)} sitemap URLs, {len(failures)} differences")
    for failure in failures:
        print(f"  {failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
