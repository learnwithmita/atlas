#!/usr/bin/env python3
import base64, os, re, math
ROOT="/Users/ramita/Desktop/atlas"
def b64(p):
    with open(os.path.join(ROOT,p),"rb") as f: return base64.b64encode(f.read()).decode()
animal=b64("docs/diagrams/cell-structure/animal.jpg")
plant=b64("docs/diagrams/cell-structure/plant.jpg")

LEAD="#48525f"
def slug(t): return re.sub(r"[^a-z0-9]+","-",t.lower()).strip("-")
def ah(x1,y1,x2,y2,color,size=7):
    ang=math.atan2(y2-y1,x2-x1); a1,a2=ang+math.radians(148),ang-math.radians(148)
    p1=(x2+size*math.cos(a1),y2+size*math.sin(a1)); p2=(x2+size*math.cos(a2),y2+size*math.sin(a2))
    return f'<path d="M{x2:.1f},{y2:.1f} L{p1[0]:.1f},{p1[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z" fill="{color}"/>'
def ld(x1,y1,x2,y2):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{LEAD}" stroke-width="1.8"/>'+ah(x1,y1,x2,y2,LEAD,7)
def pill(cx,y,text,size):
    w=len(text)*7.0+18; h=size+12; x=cx-w/2
    return (x,x+w,y+h/2,
        f'<rect x="{x:.0f}" y="{y}" width="{w:.0f}" height="{h}" rx="{h/2}" fill="#ffffff" stroke="#cfd3dc" stroke-width="1.2"/>'
        f'<text x="{cx:.0f}" y="{y+h/2+size*0.34:.0f}" text-anchor="middle" font-size="{size}" font-weight="700" fill="#1d2430">{text}</text>')
def chip1(text,cx,y,tx,ty,side,size=13):
    x0,x1,cy,body=pill(cx,y,text,size); edge=x1 if side=="r" else x0
    return f'<g id="label-{slug(text)}">{ld(edge,cy,tx,ty)}{body}</g>'
def chip2(text,cx,y,ax,ay,px,py,size=13):
    x0,x1,cy,body=pill(cx,y,text,size)
    return f'<g id="label-{slug(text)}">{ld(x0,cy,ax,ay)}{ld(x1,cy,px,py)}{body}</g>'

# image boxes (animal crop 900x940, plant crop 840x1000)
AX,AY,AW,AH=158,236,250,261
PX,PY,PW,PH=602,232,235,280
def A(fx,fy): return (AX+AW*fx, AY+AH*fy)
def Pl(fx,fy): return (PX+PW*fx, PY+PH*fy)

labels=[]
# animal-only (left column, point right into animal)
labels.append(chip1("Small vacuole",106,404,*A(0.19,0.63),"r",12))
# shared (centre column, two leaders: left->animal, right->plant) ordered to avoid crossing
CXC=500
shared=[
    ("Mitochondria",     250, A(0.60,0.19), Pl(0.37,0.17)),
    ("Cell membrane",    294, A(0.80,0.28), Pl(0.12,0.22)),
    ("Endoplasmic reticulum",338, A(0.56,0.40), Pl(0.46,0.24)),
    ("Nucleus",          382, A(0.50,0.52), Pl(0.52,0.30)),
    ("Ribosomes",        426, A(0.82,0.50), Pl(0.60,0.48)),
    ("Cytoplasm",        470, A(0.66,0.60), Pl(0.14,0.33)),
    ("Golgi body",       514, A(0.64,0.70), Pl(0.62,0.55)),
]
for t,y,(ax,ay),(px,py) in shared:
    sz=12 if t=="Endoplasmic reticulum" else 13
    labels.append(chip2(t,CXC,y,ax,ay,px,py,sz))
# plant-only (right column, point left into plant)
labels.append(chip1("Sap vacuole",902,320,*Pl(0.50,0.34),"l",13))
labels.append(chip1("Cell wall",902,372,*Pl(0.86,0.42),"l",13))
labels.append(chip1("Chloroplast",902,470,*Pl(0.66,0.82),"l",13))

def fn(name,desc,x,y):
    return (f'<text x="{x}" y="{y}" font-size="15" font-weight="800" fill="#1d2430">{name}</text>'
            f'<text x="{x}" y="{y+21}" font-size="14" fill="#1d2430">{desc}</text>')

svg=f'''<svg viewBox="0 0 1000 1480" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<defs>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1d2430" flood-opacity="0.08"/></filter>
 <clipPath id="cA"><rect x="40" y="140" width="920" height="470" rx="20"/></clipPath>
 <style>
  .ink{{fill:#1d2430}}.ink2{{fill:#5e6673}}.b{{font-weight:700}}
  .card{{fill:#ffffff;stroke:#e7e7ee;stroke-width:1.2;filter:url(#soft)}}
  .sect{{font-size:22px;font-weight:800;fill:#1d2430}}
  .sub{{font-size:13.5px;font-weight:700;fill:#5e6673;letter-spacing:1.0px}}
  .body{{font-size:15px;font-weight:500;fill:#1d2430}}
  .lab{{font-size:13.5px;font-weight:600;fill:#5e6673}}
 </style>
</defs>
<rect width="1000" height="1480" fill="#f7f7fb"/>

<text x="40" y="66" font-size="40" font-weight="800" fill="#1d2430">Cell Structure and Organisation</text>
<rect x="40" y="84" width="228" height="30" rx="15" fill="#eeeefb"/>
<text x="56" y="105" font-size="14" font-weight="700" fill="#5b5bd6" letter-spacing="1.4">BIOLOGY · AT A GLANCE</text>
<text x="960" y="70" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary</text>

<!-- Card A: the two cells -->
<rect x="40" y="140" width="920" height="470" rx="20" class="card"/>
<rect x="40" y="140" width="6" height="470" rx="3" fill="#5b5bd6"/>
<text x="70" y="180" class="sect">Animal cell and plant cell</text>
<text x="70" y="204" class="sub">ANIMAL-ONLY (LEFT) · SHARED (CENTRE, POINTS TO BOTH) · PLANT-ONLY (RIGHT)</text>
<g clip-path="url(#cA)">
 <image href="data:image/jpeg;base64,{animal}" x="{AX}" y="{AY}" width="{AW}" height="{AH}"/>
 <image href="data:image/jpeg;base64,{plant}" x="{PX}" y="{PY}" width="{PW}" height="{PH}"/>
 {''.join(labels)}
</g>

<!-- Card B: what each part does (1a + 1b) -->
<rect x="40" y="630" width="920" height="372" rx="20" class="card"/><rect x="40" y="630" width="6" height="372" rx="3" fill="#5b5bd6"/>
<text x="70" y="670" class="sect">What each part does</text>
<g>
 {fn("Cell membrane","Partially permeable; controls what enters and leaves",70,710)}
 {fn("Cytoplasm","Jelly-like; where many chemical reactions happen",70,768)}
 {fn("Nucleus","Holds genetic material; controls the cell's activities",70,826)}
 {fn("Mitochondria","Site of aerobic respiration; releases energy",70,884)}
 {fn("Ribosomes","Site of protein synthesis",70,942)}
 {fn("Endoplasmic reticulum","Transports materials through the cell",520,710)}
 {fn("Golgi body","Modifies, packages and transports proteins",520,768)}
 {fn("Cell wall (plant)","Cellulose; gives the cell shape and support",520,826)}
 {fn("Chloroplast (plant)","Has chlorophyll; absorbs light for photosynthesis",520,884)}
 {fn("Sap vacuole (plant)","Large, fluid-filled; keeps the cell firm (turgid)",520,942)}
</g>

<!-- Card C: animal vs plant (1c) -->
<rect x="40" y="1022" width="920" height="214" rx="20" class="card"/><rect x="40" y="1022" width="6" height="214" rx="3" fill="#5b5bd6"/>
<text x="70" y="1062" class="sect">Animal vs plant cells</text>
<g transform="translate(70,1078)">
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
<rect x="40" y="1256" width="920" height="200" rx="20" class="card"/><rect x="40" y="1256" width="6" height="200" rx="3" fill="#5b5bd6"/>
<text x="70" y="1296" class="sect">Specialised cells</text>
<text x="70" y="1320" class="sub">EACH SHAPE IS ADAPTED TO ITS JOB</text>
<g transform="translate(70,1334)" font-size="14">
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
