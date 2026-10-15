#!/usr/bin/env python3
"""Contrast gate for the FixFlow design tokens.

    python3 replica/design/contrast.py replica/design/tokens.json

Thresholds follow WCAG 2.1: 4.5:1 for text, 3:1 for non-text UI boundaries
(1.4.11). Pairs tagged "hairline" are decorative dividers and are reported for
information only. The dark palette is read out of app/styles.css so both themes
are checked from one command.
"""
import json
import re
import sys
from pathlib import Path


def _channel(value: float) -> float:
    value /= 255
    return value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    h = hex_color.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def ratio(fg: str, bg: str) -> float:
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def dark_palette(css_path: Path) -> dict:
    css = css_path.read_text()
    block = re.search(r'html\[data-theme="dark"\]\s*\{(.*?)\}', css, re.S)
    if not block:
        return {}
    return {m.group(1): m.group(2).strip()
            for m in re.finditer(r"--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;", block.group(1))}


def check(label: str, pairs, palette: dict) -> list:
    failures = []
    print(f"\n{label}")
    print(f"{'pair':<40} {'ratio':>6} {'need':>6}  result")
    for pair in pairs:
        fg, bg = pair[0], pair[1]
        kind = pair[2] if len(pair) > 2 else "text"
        if kind == "hairline":
            need, fatal = None, False
        elif kind == "ui":
            need, fatal = 3.0, True
        else:
            need, fatal = 4.5, True
        if fg not in palette or bg not in palette:
            print(f"{fg + ' on ' + bg:<40} {'-':>6} {'-':>6}  skipped (not in palette)")
            continue
        value = ratio(palette[fg], palette[bg])
        if need is None:
            print(f"{fg + ' on ' + bg:<40} {value:6.2f} {'n/a':>6}  hairline")
            continue
        passed = value >= need
        print(f"{fg + ' on ' + bg:<40} {value:6.2f} {need:6.1f}  {'pass' if passed else 'FAIL'}")
        if not passed and fatal:
            failures.append(f"{label}: {fg} on {bg} = {value:.2f} (need {need})")
    return failures


def main() -> int:
    tokens_path = Path(sys.argv[1] if len(sys.argv) > 1 else "replica/design/tokens.json")
    tokens = json.loads(tokens_path.read_text())
    pairs = tokens["pairs"]

    failures = check("light", pairs, tokens["color"])

    css_path = tokens_path.parent.parent / "app" / "styles.css"
    if css_path.exists():
        dark = dark_palette(css_path)
        if dark:
            failures += check("dark", pairs, dark)

    print()
    if failures:
        print(f"{len(failures)} contrast failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("All contrast pairs pass.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
