#!/usr/bin/env python3
"""Standalone labelled villus diagram for the Nutrition notes (outcome 4d).

A single finger-like villus showing the adaptations for absorption:
microvilli (brush border), epithelium one cell thick, blood capillary
network and the central lacteal. Drawn in the Atlas textbook style.
"""
import math, os

ROOT = "/Users/ramita/Desktop/atlas"
OUT = os.path.join(ROOT, "docs/guides/nutrition-villus.svg")

INK = "#1d2430"
GREY = "#5e6673"
ACCENT = "#5b5bd6"
WALL = "#d98b78"
FILL = "#f6d9d0"
RED = "#d14b5a"
MINT = "#4fae82"
MINT_FILL = "#eaf4ee"

W, H = 1000, 720

# --- villus geometry ---
ox = 360          # centre x of the finger
top = 90          # dome top y
base = 560        # base y (sits on the gut lining)
half = 120        # half-width of the finger
domeR = half      # dome radius

# outer finger outline (open at base)
finger = (f'M{ox - half},{base} '
          f'L{ox - half},{top + domeR} '
          f'A{domeR},{domeR} 0 0 1 {ox + half},{top + domeR} '
          f'L{ox + half},{base}')

# microvilli: small bumps around the dome
mv = ''
for a in range(170, 11, -16):
    mx = ox + domeR * math.cos(math.radians(a))
    my = (top + domeR) - domeR * math.sin(math.radians(a))
    mv += f'<circle cx="{mx:.0f}" cy="{my:.0f}" r="7" fill="{FILL}" stroke="{WALL}" stroke-width="2"/>'

# epithelium cell divisions (ticks just inside the wall) to show "one cell thick"
cells = ''
for yy in range(top + domeR + 20, base, 46):
    cells += f'<line x1="{ox - half}" y1="{yy}" x2="{ox - half + 24}" y2="{yy}" stroke="{WALL}" stroke-width="1.6"/>'
    cells += f'<line x1="{ox + half - 24}" y1="{yy}" x2="{ox + half}" y2="{yy}" stroke="{WALL}" stroke-width="1.6"/>'

# lacteal: central pale vessel
lacteal = f'<rect x="{ox - 26}" y="{top + domeR - 10}" width="52" height="{base - (top + domeR) + 10}" rx="26" fill="{MINT_FILL}" stroke="{MINT}" stroke-width="3"/>'

# blood capillary network (red loop around the lacteal)
cap = (f'<path d="M{ox - 70},{base} '
       f'C{ox - 92},{top + 180} {ox - 60},{top + 90} {ox},{top + 95} '
       f'C{ox + 60},{top + 90} {ox + 92},{top + 180} {ox + 70},{base}" '
       f'fill="none" stroke="{RED}" stroke-width="7"/>')
# a couple of cross links to suggest a network
cap += f'<path d="M{ox - 78},{top + 300} C{ox - 20},{top + 280} {ox + 20},{top + 280} {ox + 78},{top + 300}" fill="none" stroke="{RED}" stroke-width="5"/>'
cap += f'<path d="M{ox - 82},{top + 410} C{ox - 20},{top + 390} {ox + 20},{top + 390} {ox + 82},{top + 410}" fill="none" stroke="{RED}" stroke-width="5"/>'

# gut lining strip the villus sits on
lining = (f'<rect x="60" y="{base}" width="620" height="54" fill="{FILL}" stroke="{WALL}" stroke-width="2.5"/>')

# absorption arrows at the base
arrows = (
    f'<text x="705" y="{base + 20}" font-size="19" font-weight="800" fill="{RED}">Glucose + amino acids</text>'
    f'<text x="705" y="{base + 44}" font-size="16" fill="{INK}">into the blood capillary</text>'
    f'<text x="705" y="{base + 92}" font-size="19" font-weight="800" fill="{MINT}">Fatty acids + glycerol</text>'
    f'<text x="705" y="{base + 116}" font-size="16" fill="{INK}">into the lacteal</text>'
)


def label(side, tx, ty, ax, ay, title, sub=""):
    anchor = "end" if side == "L" else "start"
    lx = tx + 12 if side == "L" else tx - 12
    s = f'<line x1="{lx}" y1="{ty - 8}" x2="{ax}" y2="{ay}" stroke="{GREY}" stroke-width="2"/>'
    s += f'<circle cx="{ax}" cy="{ay}" r="6" fill="{ACCENT}"/>'
    s += (f'<text x="{tx}" y="{ty}" text-anchor="{anchor}" font-size="21" font-weight="800" '
          f'fill="{INK}" stroke="#ffffff" stroke-width="4.5" paint-order="stroke" stroke-linejoin="round">{title}</text>')
    if sub:
        s += (f'<text x="{tx}" y="{ty + 24}" text-anchor="{anchor}" font-size="16" '
              f'fill="{GREY}" stroke="#ffffff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">{sub}</text>')
    return s


labels = (
    label("R", 690, 120, ox + 40, top + 24, "Microvilli", "huge surface area") +
    label("R", 690, 250, ox + half, top + domeR + 70, "Epithelium", "wall one cell thick") +
    label("L", 110, 300, ox - 72, top + 230, "Blood capillary", "glucose + amino acids") +
    label("L", 110, 470, ox - 20, base - 120, "Lacteal", "fatty acids + glycerol")
)

PAD = 190  # side margins so edge labels are never clipped
svg = f'''<svg viewBox="{-PAD} 0 {W + 2 * PAD} {H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<rect x="{-PAD}" y="0" width="{W + 2 * PAD}" height="{H}" fill="#ffffff"/>
{lining}
<path d="{finger}" fill="{FILL}" stroke="{WALL}" stroke-width="3"/>
{cells}
{mv}
{cap}
{lacteal}
{arrows}
{labels}
</svg>'''

open(OUT, "w").write(svg)
print("wrote", OUT, len(svg), "bytes")
