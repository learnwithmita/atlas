#!/usr/bin/env python3
"""Topic 4 — Nutrition in Humans summary sheet, A4-print-safe.

Laid out as two A4 pages (1000 x 1414 each, the A4 ratio) so no card ever
straddles a page break when printed. Page 1: the digestive system (labelled
anatomy image) + what each part does. Page 2: enzymes + the villus (labelled
image) + the liver + alcohol.

Outputs two page SVGs; a companion step renders them to a 2-page A4 PDF and a
stacked PNG for the app.
"""
import base64, os
ROOT = "/Users/ramita/Desktop/atlas"
GUT = os.path.join(ROOT, "assets/diagrams/gut-anatomy-raw.jpg")
VIL = os.path.join(ROOT, "assets/diagrams/villus-raw.jpg")
IND = "#5b5bd6"
INK = "#1d2430"
GREY = "#5e6673"
PAGE_W, PAGE_H = 1000, 1414          # A4 ratio

gut_b64 = base64.b64encode(open(GUT, "rb").read()).decode()
vil_b64 = base64.b64encode(open(VIL, "rb").read()).decode()


def organ(x, y, name, lines):
    s = f'<text x="{x}" y="{y}" font-size="14.5" font-weight="800" fill="#1d2430">{name}</text>'
    yy = y + 20
    for ln in lines:
        s += f'<text x="{x}" y="{yy}" font-size="13.5" fill="#1d2430">{ln}</text>'; yy += 19
    return s


def trow(x, y, cells, widths, bold=False, head=False):
    s = ''; cx = x
    fs = 13.5; fw = "800" if (bold or head) else "500"
    col = "#5e6673" if head else "#1d2430"
    for c, w in zip(cells, widths):
        s += f'<text x="{cx}" y="{y}" font-size="{fs}" font-weight="{fw}" fill="{col}">{c}</text>'
        cx += w
    return s


FS, SUB = 17, 12.5


def imglabel(side, tx, ty, ax, ay, title, sub=""):
    anchor = "end" if side == "L" else "start"
    lx = tx + 14 if side == "L" else tx - 14
    s = f'<line x1="{lx}" y1="{ty - 7}" x2="{ax}" y2="{ay}" stroke="{GREY}" stroke-width="2"/>'
    s += f'<circle cx="{ax}" cy="{ay}" r="6" fill="{IND}"/>'
    s += (f'<text x="{tx}" y="{ty}" text-anchor="{anchor}" font-size="{FS}" font-weight="800" '
          f'fill="{INK}" stroke="#ffffff" stroke-width="4.5" paint-order="stroke" stroke-linejoin="round">{title}</text>')
    if sub:
        s += (f'<text x="{tx}" y="{ty + 19}" text-anchor="{anchor}" font-size="{SUB}" '
              f'fill="{GREY}" stroke="#ffffff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">{sub}</text>')
    return s


def card(x, y, w, h, title, sub):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="20" class="card"/>'
    s += f'<rect x="{x}" y="{y}" width="6" height="{h}" rx="3" fill="#5b5bd6"/>'
    s += f'<text x="{x + 30}" y="{y + 40}" class="sect">{title}</text>'
    if sub:
        s += f'<text x="{x + 30}" y="{y + 64}" class="sub">{sub}</text>'
    return s


def svg_page(body):
    return f'''<svg viewBox="0 0 {PAGE_W} {PAGE_H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<defs>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1d2430" flood-opacity="0.08"/></filter>
 <style>
  .card{{fill:#ffffff;stroke:#e7e7ee;stroke-width:1.2;filter:url(#soft)}}
  .sect{{font-size:22px;font-weight:800;fill:#1d2430}}
  .sub{{font-size:13.5px;font-weight:700;fill:#5e6673;letter-spacing:1.0px}}
 </style>
</defs>
<rect width="{PAGE_W}" height="{PAGE_H}" fill="#f7f7fb"/>
{body}
</svg>'''


# ============================ PAGE 1 ============================
GX0, GY0, GS = 284, 220, 0.29
def gx(x): return GX0 + x * GS
def gy(y): return GY0 + y * GS

gut_labels = [
    ("L", 250, 295, gx(640), gy(250), "Mouth"),
    ("L", 250, 475, gx(520), gy(880), "Liver"),
    ("L", 250, 522, gx(535), gy(1042), "Gall bladder"),
    ("L", 250, 560, gx(605), gy(1141), "Duodenum"),
    ("L", 250, 614, gx(470), gy(1360), "Large intestine", "colon"),
    ("L", 250, 712, gx(574), gy(1690), "Appendix"),
    ("R", 750, 296, gx(818), gy(262), "Salivary glands"),
    ("R", 750, 394, gx(782), gy(600), "Oesophagus"),
    ("R", 750, 475, gx(930), gy(880), "Stomach"),
    ("R", 750, 533, gx(882), gy(1080), "Pancreas"),
    ("R", 750, 655, gx(805), gy(1500), "Small intestine", "ileum"),
    ("R", 750, 742, gx(758), gy(1812), "Rectum"),
    ("R", 750, 778, gx(757), gy(1902), "Anus"),
]
gut_parts = "".join(imglabel(*l) for l in gut_labels)

page1 = f'''
<text x="40" y="66" font-size="40" font-weight="800" fill="#1d2430">Nutrition in Humans</text>
<rect x="40" y="84" width="228" height="30" rx="15" fill="#eeeefb"/>
<text x="56" y="105" font-size="14" font-weight="700" fill="#5b5bd6" letter-spacing="1.4">BIOLOGY · AT A GLANCE</text>
<text x="960" y="70" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary · 1 of 2</text>

{card(40,140,920,700,"The digestive system","WHERE EACH ORGAN IS")}
<image x="284" y="220" width="433" height="580" xlink:href="data:image/jpeg;base64,{gut_b64}"/>
{gut_parts}
<rect x="70" y="810" width="880" height="24" rx="8" fill="#eeeefb"/>
<text x="84" y="827" font-size="13" font-weight="700" fill="#3b3b86">Peristalsis: rhythmic wave-like muscle contractions that mix and push food along the gut.</text>

{card(40,860,920,320,"What each part does","THE PATH OF FOOD")}
{organ(70,956,"Mouth",["The teeth chew the food into small pieces,","and salivary amylase begins to digest starch."])}
{organ(70,1016,"Oesophagus",["It carries the food from the mouth to the","stomach by peristalsis."])}
{organ(70,1076,"Stomach",["Its acid and protease (pepsin) digest protein,","and its muscular wall churns the food."])}
{organ(70,1136,"Pancreas",["It makes amylase, protease and lipase, which","are released into the duodenum."])}
{organ(520,956,"Duodenum",["Bile and pancreatic enzymes are added here","to continue digestion."])}
{organ(520,1016,"Ileum",["Digested food is absorbed into the blood","through the villi."])}
{organ(520,1076,"Liver and gall bladder",["The liver makes bile, which emulsifies fats;","the gall bladder stores the bile."])}
{organ(520,1136,"Colon, rectum and anus",["The colon absorbs water; faeces are stored in","the rectum and egested at the anus."])}
'''

# ============================ PAGE 2 ============================
VX0, VY0, VS = 290, 396, 0.21
def vx(x): return VX0 + x * VS
def vy(y): return VY0 + y * VS

vil_labels = [
    ("R", 750, 495, vx(1288), vy(478), "Microvilli", "large surface area"),
    ("L", 250, 558, vx(760), vy(790), "Epithelium", "wall one cell thick"),
    ("R", 750, 570, vx(1055), vy(810), "Blood capillaries", "glucose + amino acids"),
    ("L", 250, 640, vx(992), vy(1150), "Lacteal", "fatty acids + glycerol"),
]
vil_parts = "".join(imglabel(*l) for l in vil_labels)

page2 = f'''
<text x="40" y="52" font-size="20" font-weight="800" fill="#1d2430">Nutrition in Humans</text>
<text x="960" y="52" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary · 2 of 2</text>

{card(40,70,920,240,"Digestive enzymes","SUBSTRATE → END-PRODUCT")}
{trow(70,166,["Enzyme","Where it is made","Substrate","End-product"],[220,230,200,230],head=True)}
<line x1="70" y1="176" x2="930" y2="176" stroke="#e4e8f1" stroke-width="1.4"/>
{trow(70,202,["Amylase","salivary glands, pancreas","starch","maltose"],[220,230,200,230],bold=True)}
{trow(70,232,["Maltase","small intestine","maltose","glucose"],[220,230,200,230],bold=True)}
{trow(70,262,["Protease (pepsin, trypsin)","stomach, pancreas","protein","amino acids"],[220,230,200,230],bold=True)}
{trow(70,292,["Lipase","pancreas","fats (lipids)","fatty acids + glycerol"],[220,230,200,230],bold=True)}

{card(40,330,920,540,"The villus","ADAPTED FOR ABSORPTION (IN THE ILEUM)")}
<image x="290" y="396" width="420" height="420" xlink:href="data:image/jpeg;base64,{vil_b64}"/>
{vil_parts}
<rect x="70" y="834" width="880" height="26" rx="8" fill="#eeeefb"/>
<text x="84" y="852" font-size="12.5" font-weight="700" fill="#3b3b86">Huge surface area (villi and microvilli) · wall one cell thick (short diffusion distance) · dense capillaries · a lacteal for fats.</text>

{card(40,890,920,268,"The liver","AND THE HEPATIC PORTAL VEIN")}
<rect x="70" y="974" width="880" height="30" rx="8" fill="#eeeefb"/>
<text x="84" y="994" font-size="13" font-weight="700" fill="#3b3b86">Hepatic portal vein: carries blood rich in absorbed nutrients from the small intestine to the liver.</text>
{organ(70,1038,"Stores sugar",["It converts excess glucose into glycogen,","and back to glucose when needed."])}
{organ(360,1038,"Makes urea",["It breaks down excess amino acids","(deamination) to form urea."])}
{organ(650,1038,"Makes bile",["It makes bile to emulsify fats","(stored in the gall bladder)."])}
{organ(70,1106,"Breaks down alcohol",["It breaks down alcohol, which is toxic."])}
{organ(520,1106,"Breaks down hormones",["It breaks down hormones after they have acted."])}

{card(40,1178,920,150,"Alcohol","")}
{organ(70,1252,"Short term",["It slows reaction time and reduces","self-control (alcohol is a depressant)."])}
{organ(400,1252,"Long term",["It can cause liver disease (cirrhosis)","and brain damage."])}
{organ(700,1252,"Social",["Accidents, addiction, and problems","with family, work or money."])}
'''

open(os.path.join(ROOT, "docs/guides/nutrition-in-humans-summary-p1.svg"), "w").write(svg_page(page1))
open(os.path.join(ROOT, "docs/guides/nutrition-in-humans-summary-p2.svg"), "w").write(svg_page(page2))
print("wrote 2 page SVGs")
