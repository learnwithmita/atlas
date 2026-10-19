#!/usr/bin/env python3
import base64, os, re, math
ROOT="/Users/ramita/Desktop/atlas"
def b64(p):
    with open(os.path.join(ROOT,p),"rb") as f: return base64.b64encode(f.read()).decode()
cells=b64("docs/diagrams/cell-structure/cells.jpg")

LEAD="#48525f"
def slug(text):
    return re.sub(r"[^a-z0-9]+","-",text.lower()).strip("-")
def arrowhead(x1,y1,x2,y2,color,size=7.0):
    ang=math.atan2(y2-y1,x2-x1)
    a1,a2=ang+math.radians(148),ang-math.radians(148)
    p1=(x2+size*math.cos(a1),y2+size*math.sin(a1))
    p2=(x2+size*math.cos(a2),y2+size*math.sin(a2))
    return f'<path d="M{x2:.1f},{y2:.1f} L{p1[0]:.1f},{p1[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z" fill="{color}"/>'
def chip(text,x,y,fx,fy,size=13):
    w=len(text)*7.0+18; h=size+12
    return (f'<g id="label-{slug(text)}">'
            f'<line x1="{x+w/2:.0f}" y1="{y+h/2:.0f}" x2="{fx}" y2="{fy}" stroke="{LEAD}" stroke-width="1.8"/>'
            f'{arrowhead(x+w/2,y+h/2,fx,fy,LEAD,7)}'
            f'<rect x="{x}" y="{y}" width="{w:.0f}" height="{h}" rx="{h/2}" fill="#ffffff" stroke="#cfd3dc" stroke-width="1.2"/>'
            f'<text x="{x+w/2:.0f}" y="{y+h/2+size*0.34:.0f}" text-anchor="middle" font-size="{size}" font-weight="700" fill="#1d2430">{text}</text>'
            f'</g>')

# image box + fractional target mapper (image is 2000x1493)
IM=dict(x=200,y=248,w=600,h=448)
def Pf(fx,fy): return (round(IM['x']+IM['w']*fx), round(IM['y']+IM['h']*fy))

labels=[]
# ---- animal cell (left): left column ordered by target height (no crossing) ----
for t,cx,cy,ff,sz in [
    ("Cell membrane",44,300,(0.15,0.285),13),
    ("Endoplasmic reticulum",44,378,(0.28,0.375),12),
    ("Nucleus",44,454,(0.26,0.475),13),
    ("Ribosomes",44,530,(0.205,0.55),13),
    ("Mitochondrion",44,606,(0.205,0.655),13),
    # lower-right structures fan up from the bottom band
    ("Cytoplasm",150,824,(0.36,0.549),13),
    ("Golgi body",362,824,(0.358,0.64),13),
    ("Vacuole (small)",556,824,(0.385,0.402),12),
]:
    fx,fy=Pf(*ff); labels.append(chip(t,cx,cy,fx,fy,sz))
# ---- plant cell (right) — plant-only structures ----
for t,cx,cy,ff,sz in [
    ("Cell wall",868,336,(0.925,0.44),13),
    ("Chloroplast",854,452,(0.66,0.30),13),
    ("Sap vacuole (large)",792,620,(0.75,0.523),12),
]:
    fx,fy=Pf(*ff); labels.append(chip(t,cx,cy,fx,fy,sz))

def fn(name,desc,x,y):
    return (f'<text x="{x}" y="{y}" font-size="15" font-weight="800" fill="#1d2430">{name}</text>'
            f'<text x="{x}" y="{y+21}" font-size="14" fill="#1d2430">{desc}</text>')

svg=f'''<svg viewBox="0 0 1000 1772" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<defs>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1d2430" flood-opacity="0.08"/></filter>
 <clipPath id="cA"><rect x="40" y="140" width="920" height="760" rx="20"/></clipPath>
 <style>
  .ink{{fill:#1d2430}}.ink2{{fill:#5e6673}}.b{{font-weight:700}}
  .card{{fill:#ffffff;stroke:#e7e7ee;stroke-width:1.2;filter:url(#soft)}}
  .sect{{font-size:22px;font-weight:800;fill:#1d2430}}
  .sub{{font-size:13.5px;font-weight:700;fill:#5e6673;letter-spacing:1.0px}}
  .body{{font-size:15px;font-weight:500;fill:#1d2430}}
  .lab{{font-size:13.5px;font-weight:600;fill:#5e6673}}
 </style>
</defs>
<rect width="1000" height="1772" fill="#f7f7fb"/>

<text x="40" y="66" font-size="40" font-weight="800" fill="#1d2430">Cell Structure and Organisation</text>
<rect x="40" y="84" width="228" height="30" rx="15" fill="#eeeefb"/>
<text x="56" y="105" font-size="14" font-weight="700" fill="#5b5bd6" letter-spacing="1.4">BIOLOGY · AT A GLANCE</text>
<text x="960" y="70" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary</text>

<!-- Card A: the two cells -->
<rect x="40" y="140" width="920" height="760" rx="20" class="card"/>
<rect x="40" y="140" width="6" height="760" rx="3" fill="#5b5bd6"/>
<text x="70" y="180" class="sect">Animal cell and plant cell</text>
<text x="70" y="204" class="sub">IDENTIFY EACH STRUCTURE · ANIMAL CELL (LEFT) · PLANT CELL (RIGHT)</text>
<g clip-path="url(#cA)">
 <image href="data:image/jpeg;base64,{cells}" x="{IM['x']}" y="{IM['y']}" width="{IM['w']}" height="{IM['h']}"/>
 {''.join(labels)}
</g>

<!-- Card B: what each part does (1a + 1b) -->
<rect x="40" y="920" width="920" height="372" rx="20" class="card"/><rect x="40" y="920" width="6" height="372" rx="3" fill="#5b5bd6"/>
<text x="70" y="960" class="sect">What each part does</text>
<g>
 {fn("Cell membrane","Partially permeable; controls what enters and leaves",70,1000)}
 {fn("Cytoplasm","Jelly-like; where many chemical reactions happen",70,1058)}
 {fn("Nucleus","Holds genetic material; controls the cell's activities",70,1116)}
 {fn("Mitochondria","Site of aerobic respiration; releases energy",70,1174)}
 {fn("Ribosomes","Site of protein synthesis",70,1232)}
 {fn("Endoplasmic reticulum","Transports materials through the cell",520,1000)}
 {fn("Golgi body","Modifies, packages and transports proteins",520,1058)}
 {fn("Cell wall (plant)","Cellulose; gives the cell shape and support",520,1116)}
 {fn("Chloroplast (plant)","Has chlorophyll; absorbs light for photosynthesis",520,1174)}
 {fn("Sap vacuole (plant)","Large, fluid-filled; keeps the cell firm (turgid)",520,1232)}
</g>

<!-- Card C: animal vs plant (1c) -->
<rect x="40" y="1312" width="920" height="214" rx="20" class="card"/><rect x="40" y="1312" width="6" height="214" rx="3" fill="#5b5bd6"/>
<text x="70" y="1352" class="sect">Animal vs plant cells</text>
<g transform="translate(70,1368)">
 <rect x="0" y="0" width="415" height="134" rx="14" fill="#f3f8f4" stroke="#d6e8dc" stroke-width="1.2"/>
 <text x="18" y="30" font-size="15" font-weight="800" fill="#2e7d5b">Both have</text>
 <text x="18" y="56" class="body">Cell membrane, cytoplasm, nucleus,</text>
 <text x="18" y="78" class="body">mitochondria, ribosomes,</text>
 <text x="18" y="100" class="body">endoplasmic reticulum, Golgi body</text>
 <rect x="435" y="0" width="415" height="134" rx="14" fill="#f1f1fb" stroke="#dcdcf1" stroke-width="1.2"/>
 <text x="453" y="30" font-size="15" font-weight="800" fill="#5b5bd6">Only plant cells have</text>
 <text x="453" y="56" class="body">Cell wall and a regular (fixed) shape</text>
 <text x="453" y="78" class="body">Chloroplasts for photosynthesis</text>
 <text x="453" y="100" class="body">One large, permanent sap vacuole</text>
 <text x="453" y="124" class="lab">Animal cells: no cell wall or chloroplasts; only small, temporary vacuoles.</text>
</g>

<!-- Card D: specialised cells (1d) -->
<rect x="40" y="1546" width="920" height="200" rx="20" class="card"/><rect x="40" y="1546" width="6" height="200" rx="3" fill="#5b5bd6"/>
<text x="70" y="1586" class="sect">Specialised cells</text>
<text x="70" y="1610" class="sub">EACH SHAPE IS ADAPTED TO ITS JOB</text>
<g transform="translate(70,1624)" font-size="14">
 <rect x="0" y="0" width="274" height="104" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="18" y="30" font-size="15" font-weight="800" fill="#5b5bd6">Red blood cell</text>
 <text x="18" y="56" class="ink">No nucleus, so more room for</text>
 <text x="18" y="74" class="ink">haemoglobin to carry oxygen.</text>
 <text x="18" y="96" class="ink">Biconcave: large surface area.</text>
 <rect x="292" y="0" width="274" height="104" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="310" y="30" font-size="15" font-weight="800" fill="#5b5bd6">Root hair cell</text>
 <text x="310" y="56" class="ink">Long, narrow projection gives a</text>
 <text x="310" y="74" class="ink">large surface area to absorb</text>
 <text x="310" y="96" class="ink">water and mineral salts.</text>
 <rect x="584" y="0" width="274" height="104" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="602" y="30" font-size="15" font-weight="800" fill="#5b5bd6">Muscle cell</text>
 <text x="602" y="56" class="ink">Many mitochondria to release</text>
 <text x="602" y="74" class="ink">more energy for contraction.</text>
</g>
</svg>'''
open(os.path.join(ROOT,"docs/guides/cell-structure-and-organisation-summary.svg"),"w").write(svg)
print("wrote SVG", len(svg), "bytes")
