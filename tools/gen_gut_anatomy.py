#!/usr/bin/env python3
"""Label the generated gut-anatomy image in the Atlas textbook style.

Embeds the raw flat-vector digestive-system illustration and draws leader
lines + organ labels on top (dark ink text, thin grey leaders, accent dots),
matching the look of the other Atlas diagrams.
"""
import base64, os

ROOT = "/Users/ramita/Desktop/atlas"
RAW = os.path.join(ROOT, "assets/diagrams/gut-anatomy-raw.jpg")
OUT = os.path.join(ROOT, "docs/guides/nutrition-gut-anatomy.svg")

W, H = 1493, 2000
PAD = 250  # side margins so the edge labels are never clipped
INK = "#1d2430"
GREY = "#5e6673"
ACCENT = "#5b5bd6"

b64 = base64.b64encode(open(RAW, "rb").read()).decode()

# label(side, text-x, text-y, anchor-x, anchor-y, text)
labels = [
    ("L", 300, 250, 640, 250, "Mouth (buccal cavity)"),
    ("R", 1010, 210, 818, 262, "Salivary glands"),
    ("R", 980, 610, 782, 600, "Oesophagus"),
    ("L", 300, 840, 520, 880, "Liver"),
    ("L", 300, 1060, 535, 1042, "Gall bladder"),
    ("R", 1170, 850, 930, 880, "Stomach"),
    ("R", 1170, 1080, 882, 1080, "Pancreas"),
    ("L", 300, 1150, 605, 1141, "Duodenum"),
    ("R", 1190, 1490, 805, 1500, "Small intestine (ileum)"),
    ("L", 300, 1360, 470, 1360, "Large intestine (colon)"),
    ("L", 300, 1672, 574, 1690, "Appendix"),
    ("R", 1080, 1805, 758, 1812, "Rectum"),
    ("R", 1080, 1905, 757, 1902, "Anus"),
]

FS = 30


def label_svg(side, tx, ty, ax, ay, text):
    anchor = "end" if side == "L" else "start"
    # leader line starts just past the text edge
    lx = tx + 14 if side == "L" else tx - 14
    line = (f'<line x1="{lx}" y1="{ty - 9}" x2="{ax}" y2="{ay}" '
            f'stroke="{GREY}" stroke-width="2.2"/>')
    dot = f'<circle cx="{ax}" cy="{ay}" r="6" fill="{ACCENT}"/>'
    # subtle white halo behind text so it stays legible over any organ
    txt = (f'<text x="{tx}" y="{ty}" text-anchor="{anchor}" font-size="{FS}" '
           f'font-weight="800" fill="{INK}" stroke="#ffffff" stroke-width="5" '
           f'paint-order="stroke" stroke-linejoin="round">{text}</text>')
    return line + dot + txt


parts = "".join(label_svg(*l) for l in labels)

svg = f'''<svg viewBox="{-PAD} 0 {W + 2 * PAD} {H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<rect x="{-PAD}" y="0" width="{W + 2 * PAD}" height="{H}" fill="#ffffff"/>
<image x="0" y="0" width="{W}" height="{H}" xlink:href="data:image/jpeg;base64,{b64}"/>
{parts}
</svg>'''

open(OUT, "w").write(svg)
print("wrote", OUT, len(svg), "bytes")
