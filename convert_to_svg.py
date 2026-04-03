#!/usr/bin/env python3
import os
import re

html_path = "marketing.html"
out_path = "marketing.svg"

try:
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # The HTML file is already a 100% vector SVG! No Playwright needed.
    svg_match = re.search(r'(<svg[^>]*>.*?</svg>)', html_content, re.DOTALL)
    if svg_match:
        svg_content = svg_match.group(1)
            
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
            
        size_kb = os.path.getsize(out_path) / 1024
        print(f"Done! SVGs written directly from source.")
        print(f"Saved: {out_path} ({size_kb:.1f} KB)")
        print(f"Unlike the Playwright script, this is pure infinite-resolution vector, not base64 PNGs!")
    else:
        print("Could not find <svg> tag in HTML.")
except Exception as e:
    print(f"Error: {e}")
