#!/usr/bin/env python3
"""Topic 2 — Movement of Substances. All diagrams drawn in SVG (no photo)."""
import os, math
ROOT="/Users/ramita/Desktop/atlas"
LEAD="#48525f"
def ah(x1,y1,x2,y2,color,size=8.0):
    ang=math.atan2(y2-y1,x2-x1); a1,a2=ang+math.radians(150),ang-math.radians(150)
    p1=(x2+size*math.cos(a1),y2+size*math.sin(a1)); p2=(x2+size*math.cos(a2),y2+size*math.sin(a2))
    return f'<path d="M{x2:.1f},{y2:.1f} L{p1[0]:.1f},{p1[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z" fill="{color}"/>'
def arrow(x1,y1,x2,y2,color,w=4,size=8):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>'+ah(x1,y1,x2,y2,color,size)
def dot(cx,cy,r,fill,stroke=None):
    s=f' stroke="{stroke}" stroke-width="1.2"' if stroke else ""
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{s}/>'
def dots(pts,r,fill,stroke=None):
    return "".join(dot(x,y,r,fill,stroke) for x,y in pts)

IND="#5b5bd6"; WATER="#5aa0e6"; SOL="#e07a86"; ION="#2fae77"; GREEN="#2e7d5b"; RED="#d0514a"; YEL="#ffd84d"
PANEL='fill="#f6f8fc" stroke="#e4e8f1" stroke-width="1.4"'
MEM=f'stroke="#9aa3b2" stroke-width="2.4" stroke-dasharray="3,7" stroke-linecap="round"'

def panel_box(w,h):
    return f'<rect x="0" y="0" width="{w}" height="{h}" rx="14" {PANEL}/>'

def p_diffusion(w=270,h=150):
    s=panel_box(w,h)
    s+=f'<line x1="{w/2}" y1="14" x2="{w/2}" y2="{h-14}" {MEM}/>'
    left=[(34,38),(58,74),(42,110),(80,50),(96,100),(64,124),(104,30),(120,118)]
    right=[(176,58),(214,100),(236,44)]
    s+=dots(left,6,IND,"#4a4ab8")+dots(right,6,IND,"#4a4ab8")
    s+=arrow(96,h/2,186,h/2,GREEN,5,10)
    return s
def p_osmosis(w=270,h=150):
    s=panel_box(w,h)
    # partially permeable membrane with pores
    s+=f'<line x1="{w/2}" y1="14" x2="{w/2}" y2="{h-14}" {MEM}/>'
    # left dilute: many water, 1 solute ; right concentrated: few water, many solute
    lw=[(32,34),(52,64),(36,96),(70,44),(58,118),(92,80),(104,40),(116,108),(44,132)]
    rw=[(168,60),(206,110)]
    s+=dots(lw,5,WATER)+dots(rw,5,WATER)
    s+=dots([(150,40),(224,52),(238,96),(196,70),(214,128),(170,112)],9,SOL,"#c05c68")
    s+=arrow(104,h/2,176,h/2,WATER,5,10)
    return s
def p_active(w=270,h=150):
    s=panel_box(w,h)
    s+=f'<line x1="{w/2}" y1="14" x2="{w/2}" y2="{h-14}" {MEM}/>'
    # carrier protein straddling membrane
    s+=f'<rect x="{w/2-16}" y="54" width="32" height="42" rx="12" fill="#dcdcf7" stroke="{IND}" stroke-width="2"/>'
    s+=dots([(34,40),(50,104)],7,ION,"#1f8f60")        # few outside (low)
    s+=dots([(176,36),(208,70),(232,44),(196,104),(230,110),(168,78)],7,ION,"#1f8f60")  # many inside (high)
    s+=arrow(60,h/2,172,h/2,RED,5,10)
    # energy burst on the carrier
    cx,cy=w/2,40
    star="".join(f'<line x1="{cx}" y1="{cy}" x2="{cx+14*math.cos(math.radians(a))}" y2="{cy+14*math.sin(math.radians(a))}" stroke="{YEL}" stroke-width="3.4" stroke-linecap="round"/>' for a in range(0,360,45))
    s+=f'<circle cx="{cx}" cy="{cy}" r="6" fill="{YEL}"/>'+star
    # labels so the energy burst and the carrier protein are clear
    s+=f'<text x="{w/2}" y="22" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1d2430">Energy</text>'
    s+=f'<text x="{w/2}" y="130" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1d2430">Carrier protein</text>'
    return s

def defn(x,y,name,lines,tag):
    t=f'<text x="{x}" y="{y}" font-size="17" font-weight="800" fill="#1d2430">{name}</text>'
    yy=y+26
    for ln in lines:
        t+=f'<text x="{x}" y="{yy}" font-size="14" fill="#1d2430">{ln}</text>'; yy+=20
    tw=len(tag)*6.6+24
    t+=f'<rect x="{x}" y="{yy-2}" width="{tw:.0f}" height="26" rx="8" fill="#eeeefb"/>'
    t+=f'<text x="{x+12}" y="{yy+16}" font-size="12.5" font-weight="700" fill="#3b3b86">{tag}</text>'
    return t

# ---- plant cell osmosis states (local box ~150x150) ----
def plant_cell(state):
    # wall rect, membrane, blue vacuole
    s='<rect x="8" y="8" width="134" height="134" rx="10" fill="#dfe7cf" stroke="#aebb8f" stroke-width="3"/>'  # wall
    if state=="turgid":
        s+='<rect x="16" y="16" width="118" height="118" rx="8" fill="#f6dfe3"/>'           # cytoplasm full
        s+='<rect x="22" y="22" width="106" height="106" rx="8" fill="#bfe0ec" stroke="#8fb3c6" stroke-width="2"/>'  # big vacuole pressed to wall
    elif state=="flaccid":
        s+='<rect x="20" y="20" width="110" height="110" rx="8" fill="#f6dfe3"/>'
        s+='<rect x="30" y="30" width="90" height="90" rx="10" fill="#cfe4ee" stroke="#9cbccb" stroke-width="2"/>'
    else:  # plasmolysed
        s+='<rect x="16" y="16" width="118" height="118" rx="8" fill="#f2eef2"/>'            # gap (solution) between wall and membrane
        s+='<ellipse cx="75" cy="75" rx="44" ry="46" fill="#f6dfe3" stroke="#d98f9c" stroke-width="2.5"/>'  # shrunken protoplast
        s+='<ellipse cx="75" cy="78" rx="30" ry="32" fill="#cfe0e8" stroke="#9cbccb" stroke-width="1.8"/>'
    return s
def rbc_cell(state):
    if state=="burst":
        s='<circle cx="75" cy="75" r="56" fill="#f4b7bd" stroke="#e08b94" stroke-width="2" stroke-dasharray="5,5"/>'
        s+='<circle cx="75" cy="75" r="30" fill="#e8737f"/>'
        # leaking dots
        s+=dots([(135,40),(28,120),(120,120),(30,40),(75,14)],5,"#e8737f")
    elif state=="normal":
        s='<ellipse cx="75" cy="75" rx="52" ry="52" fill="#e8737f" stroke="#c85b67" stroke-width="2"/>'
        s+='<ellipse cx="75" cy="75" rx="22" ry="18" fill="#c85b67"/>'
    else:  # shrunken / crenated
        pts=[]
        for a in range(0,360,30):
            r=34 if (a//30)%2==0 else 44
            pts.append((75+r*math.cos(math.radians(a)),75+r*math.sin(math.radians(a))))
        d="M"+" L".join(f"{x:.0f},{y:.0f}" for x,y in pts)+" Z"
        s=f'<path d="{d}" fill="#e8737f" stroke="#c85b67" stroke-width="2"/>'
    return s

def cellcap(x,y,title,sub):
    return (f'<text x="{x}" y="{y}" text-anchor="middle" font-size="14" font-weight="800" fill="#1d2430">{title}</text>'
            f'<text x="{x}" y="{y+19}" text-anchor="middle" font-size="12.5" fill="#5e6673">{sub}</text>')

svg=f'''<svg viewBox="0 0 1000 1392" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<defs>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1d2430" flood-opacity="0.08"/></filter>
 <style>
  .card{{fill:#ffffff;stroke:#e7e7ee;stroke-width:1.2;filter:url(#soft)}}
  .sect{{font-size:22px;font-weight:800;fill:#1d2430}}
  .sub{{font-size:13.5px;font-weight:700;fill:#5e6673;letter-spacing:1.0px}}
  .ink{{fill:#1d2430}}.ink2{{fill:#5e6673}}.body{{font-size:15px;font-weight:500;fill:#1d2430}}
 </style>
</defs>
<rect width="1000" height="1392" fill="#f7f7fb"/>
<text x="40" y="66" font-size="40" font-weight="800" fill="#1d2430">Movement of Substances</text>
<rect x="40" y="84" width="228" height="30" rx="15" fill="#eeeefb"/>
<text x="56" y="105" font-size="14" font-weight="700" fill="#5b5bd6" letter-spacing="1.4">BIOLOGY · AT A GLANCE</text>
<text x="960" y="70" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary</text>

<!-- Card A: three processes -->
<rect x="40" y="140" width="920" height="476" rx="20" class="card"/><rect x="40" y="140" width="6" height="476" rx="3" fill="#5b5bd6"/>
<text x="70" y="180" class="sect">The three processes</text>
<text x="70" y="204" class="sub">HOW SUBSTANCES MOVE IN AND OUT OF CELLS</text>
<g transform="translate(70,224)">{p_diffusion()}</g>
<g transform="translate(366,224)">{p_osmosis()}</g>
<g transform="translate(662,224)">{p_active()}</g>
{defn(70,408,"Diffusion",["Net movement of particles from","higher to lower concentration,","down a concentration gradient."],"Down the gradient · No energy")}
{defn(366,408,"Osmosis",["Net movement of water molecules,","from higher to lower water potential,","through a partially permeable membrane."],"Water only · No energy")}
{defn(662,408,"Active transport",["Movement of particles against the","gradient, from lower to higher","concentration, using energy."],"Against the gradient · Uses energy")}

<!-- Card B: osmosis in living cells -->
<rect x="40" y="636" width="920" height="470" rx="20" class="card"/><rect x="40" y="636" width="6" height="470" rx="3" fill="#5b5bd6"/>
<text x="70" y="676" class="sect">Osmosis in living cells</text>
<text x="70" y="700" class="sub">PLANT CELL (HAS A WALL) · NO BURSTING</text>
<g transform="translate(96,718)">{plant_cell("turgid")}</g>{cellcap(171,900,"Turgid","In water: vacuole swells,")}<text x="171" y="937" text-anchor="middle" font-size="12.5" fill="#5e6673">pushes on the wall, firm</text>
<g transform="translate(316,718)">{plant_cell("flaccid")}</g>{cellcap(391,900,"Flaccid","Loses some water:")}<text x="391" y="937" text-anchor="middle" font-size="12.5" fill="#5e6673">soft and limp</text>
<g transform="translate(536,718)">{plant_cell("plasmolysed")}</g>{cellcap(611,900,"Plasmolysed","In concentrated solution:")}<text x="611" y="937" text-anchor="middle" font-size="12.5" fill="#5e6673">membrane pulls from wall</text>
<line x1="740" y1="712" x2="740" y2="1080" stroke="#ececf3" stroke-width="1.4"/>
<text x="748" y="700" class="sub">RED BLOOD CELL (NO WALL)</text>
<g transform="translate(772,724)" transform-origin="0 0"><g transform="scale(0.62)">{rbc_cell("burst")}</g></g><text x="820" y="852" text-anchor="middle" font-size="13" font-weight="800" fill="#1d2430">In water</text><text x="820" y="871" text-anchor="middle" font-size="12" fill="#5e6673">swells &amp; bursts</text>
<g transform="translate(772,878)"><g transform="scale(0.62)">{rbc_cell("normal")}</g></g><text x="820" y="1006" text-anchor="middle" font-size="13" font-weight="800" fill="#1d2430">Normal</text>
<g transform="translate(878,724)"><g transform="scale(0.62)">{rbc_cell("shrunken")}</g></g><text x="926" y="852" text-anchor="middle" font-size="13" font-weight="800" fill="#1d2430">Concentrated</text><text x="926" y="871" text-anchor="middle" font-size="12" fill="#5e6673">shrinks, crinkled</text>

<!-- Card C: where it matters -->
<rect x="40" y="1126" width="920" height="232" rx="20" class="card"/><rect x="40" y="1126" width="6" height="232" rx="3" fill="#5b5bd6"/>
<text x="70" y="1166" class="sect">Where it matters</text>
<g transform="translate(70,1186)" font-size="14">
 <rect x="0" y="0" width="274" height="140" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="18" y="30" font-size="15" font-weight="800" fill="#5b5bd6">Diffusion</text>
 <text x="18" y="56" class="ink">Oxygen and carbon dioxide are</text>
 <text x="18" y="74" class="ink">exchanged at the alveoli.</text>
 <text x="18" y="100" class="ink">Digested food is absorbed in</text>
 <text x="18" y="118" class="ink">the small intestine.</text>
 <rect x="292" y="0" width="274" height="140" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="310" y="30" font-size="15" font-weight="800" fill="#5b5bd6">Osmosis</text>
 <text x="310" y="56" class="ink">Water is absorbed from the soil</text>
 <text x="310" y="74" class="ink">into root hair cells.</text>
 <text x="310" y="100" class="ink">Keeps plant cells turgid to</text>
 <text x="310" y="118" class="ink">support the plant.</text>
 <rect x="584" y="0" width="274" height="140" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="602" y="30" font-size="15" font-weight="800" fill="#5b5bd6">Active transport</text>
 <text x="602" y="56" class="ink">Mineral ions are absorbed into</text>
 <text x="602" y="74" class="ink">root hair cells.</text>
 <text x="602" y="100" class="ink">Glucose is absorbed in the villi</text>
 <text x="602" y="118" class="ink">of the small intestine.</text>
</g>
</svg>'''
open(os.path.join(ROOT,"docs/guides/movement-of-substances-summary.svg"),"w").write(svg)
print("wrote SVG", len(svg), "bytes")
