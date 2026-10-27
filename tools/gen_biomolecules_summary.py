#!/usr/bin/env python3
"""Topic 3 — Biological Molecules. All diagrams drawn in SVG."""
import os, math
ROOT="/Users/ramita/Desktop/atlas"
IND="#5b5bd6"
def ah(x1,y1,x2,y2,color,size=8.0):
    ang=math.atan2(y2-y1,x2-x1); a1,a2=ang+math.radians(150),ang-math.radians(150)
    p1=(x2+size*math.cos(a1),y2+size*math.sin(a1)); p2=(x2+size*math.cos(a2),y2+size*math.sin(a2))
    return f'<path d="M{x2:.1f},{y2:.1f} L{p1[0]:.1f},{p1[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z" fill="{color}"/>'
def arrow(x1,y1,x2,y2,color="#48525f",w=3,size=8):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>'+ah(x1,y1,x2,y2,color,size)

# ---- test tube with a coloured liquid + label of the positive colour ----
def tube(x,y,liquid):
    # x,y = top-left of tube; tube 44 wide, 120 tall, rounded bottom
    w,h=44,120
    body=(f'<path d="M{x},{y} v{h-22} a22,22 0 0 0 44,0 v-{h-22} z" fill="#ffffff" stroke="#c9ced8" stroke-width="2"/>')
    # liquid fills lower ~64
    lh=70
    clip=f'<clipPath id="t{x}{y}"><path d="M{x},{y} v{h-22} a22,22 0 0 0 44,0 v-{h-22} z"/></clipPath>'
    liq=f'<g clip-path="url(#t{x}{y})"><rect x="{x-2}" y="{y+h-lh}" width="48" height="{lh+4}" fill="{liquid}"/><ellipse cx="{x+22}" cy="{y+h-lh}" rx="22" ry="5" fill="#ffffff" fill-opacity="0.25"/></g>'
    rim=f'<rect x="{x-3}" y="{y-3}" width="50" height="7" rx="3" fill="#dfe3ea"/>'
    return clip+body+liq+rim

# ---- lock-and-key enzyme: a block with a semicircular notch (active site) on
#      top, and a substrate whose matching bump fits into that notch ----
ENZF="#cfe3d6"; ENZS="#4f9d73"; SUBF="#f0c24a"; SUBS="#d09a1e"
def enzyme(cx, ytop, w=112, h=54, notch=20):
    L=cx-w/2; R=cx+w/2; nl=cx-notch; nr=cx+notch; B=ytop+h
    # sweep-flag 0 makes the arc dip DOWN into the block (a concave active-site
    # notch) rather than bulging out, so the substrate's bump fits into it.
    d=f'M{L},{ytop} H{nl} A{notch},{notch} 0 0 0 {nr},{ytop} H{R} V{B} H{L} Z'
    return f'<path d="{d}" fill="{ENZF}" stroke="{ENZS}" stroke-width="2.5"/>'
def substrate(cx, ytop, w=90, h=22, bump=20):
    L=cx-w/2; R=cx+w/2; B=ytop+h; bl=cx-bump; br=cx+bump
    d=f'M{L},{ytop} H{R} V{B} H{br} A{bump},{bump} 0 0 1 {bl},{B} H{L} Z'
    return f'<path d="{d}" fill="{SUBF}" stroke="{SUBS}" stroke-width="2.5"/>'
def product(cx, ytop, h=22):
    s=''
    for cxp in (cx-23, cx+23):
        s+=f'<rect x="{cxp-19}" y="{ytop}" width="38" height="{h}" rx="7" fill="{SUBF}" stroke="{SUBS}" stroke-width="2.5"/>'
    return s

# ---- line graph (axes + curve) ----
def graph(ox,oy,w,h,curve,xlab,ylab,marks):
    s=f'<rect x="{ox-6}" y="{oy-h-6}" width="{w+40}" height="{h+44}" rx="12" fill="#f7f8fc" stroke="#e4e8f1" stroke-width="1.2"/>'
    s+=f'<line x1="{ox}" y1="{oy}" x2="{ox+w}" y2="{oy}" stroke="#9aa3b2" stroke-width="2"/>'  # x
    s+=f'<line x1="{ox}" y1="{oy}" x2="{ox}" y2="{oy-h}" stroke="#9aa3b2" stroke-width="2"/>'  # y
    s+=f'<path d="{curve}" fill="none" stroke="{IND}" stroke-width="3.2" stroke-linecap="round"/>'
    s+=f'<text x="{ox+w/2}" y="{oy+30}" text-anchor="middle" font-size="13" font-weight="700" fill="#5e6673">{xlab}</text>'
    s+=f'<text x="{ox-10}" y="{oy-h-12}" font-size="13" font-weight="700" fill="#5e6673">{ylab}</text>'
    for mx,my,txt,anchor in marks:
        s+=f'<line x1="{mx}" y1="{my}" x2="{mx}" y2="{oy}" stroke="#c7ccd6" stroke-width="1.4" stroke-dasharray="3,4"/>'
        s+=f'<circle cx="{mx}" cy="{my}" r="4" fill="{IND}"/>'
        s+=f'<text x="{mx}" y="{my-10}" text-anchor="{anchor}" font-size="12" font-weight="700" fill="#1d2430">{txt}</text>'
    return s

# temperature curve: rise to optimum then steep fall (denature)
def temp_curve(ox,oy,w,h):
    pts=[(0,0.02),(0.18,0.18),(0.36,0.52),(0.5,0.92),(0.56,1.0),(0.63,0.9),(0.72,0.5),(0.82,0.12),(0.9,0.0)]
    d="M"+" L".join(f"{ox+p[0]*w:.0f},{oy-p[1]*h:.0f}" for p in pts)
    opt=(ox+0.56*w,oy-1.0*h)
    return d,[(opt[0],opt[1],"optimum","middle")]
def ph_curve(ox,oy,w,h):
    pts=[(0.05,0.0),(0.2,0.3),(0.35,0.72),(0.5,1.0),(0.65,0.72),(0.8,0.3),(0.95,0.0)]
    d="M"+" L".join(f"{ox+p[0]*w:.0f},{oy-p[1]*h:.0f}" for p in pts)
    opt=(ox+0.5*w,oy-1.0*h)
    return d,[(opt[0],opt[1],"optimum pH","middle")]

def col3(x,name,elements,role,built):
    s=f'<text x="{x}" y="0" font-size="17" font-weight="800" fill="#5b5bd6">{name}</text>'
    s+=f'<text x="{x}" y="28" font-size="13.5" font-weight="800" fill="#1d2430">Elements</text><text x="{x}" y="48" font-size="14" fill="#1d2430">{elements}</text>'
    s+=f'<text x="{x}" y="80" font-size="13.5" font-weight="800" fill="#1d2430">Main role</text>'
    yy=100
    for ln in role: s+=f'<text x="{x}" y="{yy}" font-size="14" fill="#1d2430">{ln}</text>'; yy+=20
    yy+=12
    s+=f'<text x="{x}" y="{yy}" font-size="13.5" font-weight="800" fill="#1d2430">Built from</text>'; yy+=20
    for ln in built: s+=f'<text x="{x}" y="{yy}" font-size="14" fill="#1d2430">{ln}</text>'; yy+=20
    return s

def foodtest(x,name,reagent,result,color,note):
    s=f'<g transform="translate({x},0)">'+tube(78,0,color)
    s+=f'<text x="100" y="150" text-anchor="middle" font-size="15" font-weight="800" fill="#1d2430">{name}</text>'
    s+=f'<text x="100" y="174" text-anchor="middle" font-size="13" fill="#1d2430">{reagent}</text>'
    s+=f'<text x="100" y="198" text-anchor="middle" font-size="13" font-weight="700" fill="#5b5bd6">{result}</text>'
    if note: s+=f'<text x="100" y="220" text-anchor="middle" font-size="12" fill="#5e6673">{note}</text>'
    return s+'</g>'

tubes=(foodtest(0,"Starch","+ iodine solution","blue-black","#272a63","")
     + foodtest(230,"Reducing sugar","+ Benedict's, heat","brick-red","#c0402a","(blue if none)")
     + foodtest(460,"Protein","+ biuret solution","violet","#7b3fa0","")
     + foodtest(690,"Fats","+ ethanol, then water","cloudy emulsion","#e7eaef","(milky white)"))

td,tm=temp_curve(150,1440,135,95)
pd,pm=ph_curve(440,1440,135,95)

svg=f'''<svg viewBox="0 0 1000 1512" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<defs>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1d2430" flood-opacity="0.08"/></filter>
 <style>
  .card{{fill:#ffffff;stroke:#e7e7ee;stroke-width:1.2;filter:url(#soft)}}
  .sect{{font-size:22px;font-weight:800;fill:#1d2430}}
  .sub{{font-size:13.5px;font-weight:700;fill:#5e6673;letter-spacing:1.0px}}
  .ink{{fill:#1d2430}}.ink2{{fill:#5e6673}}.body{{font-size:15px;font-weight:500;fill:#1d2430}}
 </style>
</defs>
<rect width="1000" height="1512" fill="#f7f7fb"/>
<text x="40" y="66" font-size="40" font-weight="800" fill="#1d2430">Biological Molecules</text>
<rect x="40" y="84" width="228" height="30" rx="15" fill="#eeeefb"/>
<text x="56" y="105" font-size="14" font-weight="700" fill="#5b5bd6" letter-spacing="1.4">BIOLOGY · AT A GLANCE</text>
<text x="960" y="70" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary</text>

<!-- Card A: three food groups -->
<rect x="40" y="140" width="920" height="300" rx="20" class="card"/><rect x="40" y="140" width="6" height="300" rx="3" fill="#5b5bd6"/>
<text x="70" y="180" class="sect">The three food groups</text>
<text x="70" y="204" class="sub">ELEMENTS · MAIN ROLE · BUILDING BLOCKS</text>
<g transform="translate(70,236)">
 {col3(0,"Carbohydrates","C, H, O",["Immediate source","of energy"],["Glucose →","starch, glycogen,","cellulose"])}
 {col3(312,"Fats (lipids)","C, H, O",["Long-term energy","store and insulation"],["Glycerol +","fatty acids"])}
 {col3(624,"Proteins","C, H, O, N",["Growth and repair","of cells"],["Amino acids →","polypeptides,","proteins"])}
</g>

<!-- Card B: food tests -->
<rect x="40" y="460" width="920" height="320" rx="20" class="card"/><rect x="40" y="460" width="6" height="320" rx="3" fill="#5b5bd6"/>
<text x="70" y="500" class="sect">Food tests</text>
<text x="70" y="524" class="sub">REAGENT · POSITIVE RESULT</text>
<g transform="translate(70,548)">{tubes}</g>

<!-- Card C: enzymes lock and key -->
<rect x="40" y="800" width="920" height="360" rx="20" class="card"/><rect x="40" y="800" width="6" height="360" rx="3" fill="#5b5bd6"/>
<text x="70" y="840" class="sect">Enzymes: the lock and key model</text>
<g>
 <text x="170" y="878" text-anchor="middle" font-size="14" font-weight="700" fill="#1d2430">1. Substrate fits the active site</text>
 {enzyme(170,920)}{substrate(170,882)}
 <text x="170" y="998" text-anchor="middle" font-size="12.5" fill="#5e6673">only a matching substrate fits</text>
 {arrow(285,947,375,947)}
 <text x="445" y="878" text-anchor="middle" font-size="14" font-weight="700" fill="#1d2430">2. Enzyme-substrate complex</text>
 {enzyme(445,920)}{substrate(445,898)}
 <text x="445" y="998" text-anchor="middle" font-size="12.5" fill="#5e6673">lowers the activation energy</text>
 {arrow(560,947,650,947)}
 <text x="720" y="878" text-anchor="middle" font-size="14" font-weight="700" fill="#1d2430">3. Products released</text>
 {enzyme(720,920)}{product(720,896)}
 <text x="720" y="998" text-anchor="middle" font-size="12.5" fill="#5e6673">enzyme is unchanged, reused</text>
</g>
<g transform="translate(70,1040)" font-size="14">
 <rect x="0" y="0" width="415" height="96" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="18" y="28" font-size="14.5" font-weight="800" fill="#5b5bd6">Key idea</text>
 <text x="18" y="52" class="ink">Enzymes are biological catalysts: they speed</text>
 <text x="18" y="72" class="ink">up reactions and are not used up.</text>
 <rect x="435" y="0" width="415" height="96" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="453" y="28" font-size="14.5" font-weight="800" fill="#5b5bd6">Specific</text>
 <text x="453" y="52" class="ink">Each enzyme's active site fits only one</text>
 <text x="453" y="72" class="ink">substrate (its complementary shape).</text>
</g>

<!-- Card D: temperature and pH -->
<rect x="40" y="1180" width="920" height="300" rx="20" class="card"/><rect x="40" y="1180" width="6" height="300" rx="3" fill="#5b5bd6"/>
<text x="70" y="1220" class="sect">Temperature and pH</text>
<text x="70" y="1244" class="sub">RATE OF ENZYME-CATALYSED REACTIONS</text>
<text x="217" y="1298" text-anchor="middle" font-size="12.5" fill="#5e6673">rises to an optimum (~37°C), then denatures</text>
{graph(150,1440,135,95,td,"Temperature","Rate",tm)}
<text x="507" y="1298" text-anchor="middle" font-size="12.5" fill="#5e6673">fastest at the optimum pH</text>
{graph(440,1440,135,95,pd,"pH","Rate",pm)}
<g transform="translate(650,1262)" font-size="14">
 <rect x="0" y="0" width="282" height="200" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="18" y="28" font-size="14.5" font-weight="800" fill="#5b5bd6">Denatured</text>
 <text x="18" y="52" class="ink">High temperature or the wrong pH</text>
 <text x="18" y="72" class="ink">changes the active site's shape, so</text>
 <text x="18" y="92" class="ink">the substrate no longer fits.</text>
 <text x="18" y="120" class="ink">This is permanent, so the</text>
 <text x="18" y="140" class="ink">reaction stops.</text>
 <text x="18" y="172" font-size="12.5" fill="#5e6673">Low temperature only slows it.</text>
</g>
</svg>'''
open(os.path.join(ROOT,"docs/guides/biological-molecules-summary.svg"),"w").write(svg)
print("wrote SVG", len(svg), "bytes")
