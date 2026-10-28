#!/usr/bin/env python3
"""Label the generated realistic villus image in the Atlas textbook style.

Embeds the flat-vector villus illustration and draws leader lines + labels
(microvilli, epithelium, blood capillaries, lacteal, arteriole, venule),
matching the gut-anatomy diagram's look.
"""
import base64, os

ROOT = "/Users/ramita/Desktop/atlas"
RAW = os.path.join(ROOT, "assets/diagrams/villus-raw.jpg")
OUT = os.path.join(ROOT, "docs/guides/nutrition-villus.svg")

W, H = 2000, 2000
PAD = 430  # side margins so labels never clip
INK = "#1d2430"
GREY = "#5e6673"
ACCENT = "#5b5bd6"

b64 = base64.b64encode(open(RAW, "rb").read()).decode()

# side, text-x, text-y, anchor-x, anchor-y, title, sublabel
labels = [
    ("R", 1600, 430, 1288, 478, "Microvilli", "large surface area"),
    ("L", 360, 770, 760, 790, "Epithelium", "wall one cell thick"),
    ("R", 1600, 800, 1055, 810, "Blood capillaries", "glucose + amino acids"),
    ("L", 360, 1150, 992, 1150, "Lacteal", "fatty acids + glycerol"),
    ("L", 360, 1720, 560, 1735, "Arteriole", ""),
    ("L", 360, 1835, 560, 1800, "Venule", ""),
]

FS = 38
SUB = 24


def label(side, tx, ty, ax, ay, title, sub):
    anchor = "end" if side == "L" else "start"
    lx = tx + 16 if side == "L" else tx - 16
    s = f'<line x1="{lx}" y1="{ty - 11}" x2="{ax}" y2="{ay}" stroke="{GREY}" stroke-width="2.6"/>'
    s += f'<circle cx="{ax}" cy="{ay}" r="8" fill="{ACCENT}"/>'
    s += (f'<text x="{tx}" y="{ty}" text-anchor="{anchor}" font-size="{FS}" font-weight="800" '
          f'fill="{INK}" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">{title}</text>')
    if sub:
        s += (f'<text x="{tx}" y="{ty + 30}" text-anchor="{anchor}" font-size="{SUB}" '
              f'fill="{GREY}" stroke="#ffffff" stroke-width="5" paint-order="stroke" stroke-linejoin="round">{sub}</text>')
    return s


parts = "".join(label(*l) for l in labels)

svg = f'''<svg viewBox="{-PAD} 0 {W + 2 * PAD} {H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<rect x="{-PAD}" y="0" width="{W + 2 * PAD}" height="{H}" fill="#ffffff"/>
<image x="0" y="0" width="{W}" height="{H}" xlink:href="data:image/jpeg;base64,{b64}"/>
{parts}
</svg>'''

open(OUT, "w").write(svg)
print("wrote", OUT, len(svg), "bytes")
