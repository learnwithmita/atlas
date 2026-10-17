#!/usr/bin/env python3
import base64, os
ROOT="/Users/ramita/Desktop/atlas"
def b64(p):
    with open(os.path.join(ROOT,p),"rb") as f: return base64.b64encode(f.read()).decode()
lungs=b64("docs/diagrams/respiration/lungs.jpg")
cap=b64("docs/diagrams/respiration/capillary.jpg")

def chip(text,x,y,fx,fy,size=13):
    w=len(text)*7.0+18; h=size+12
    return (f'<line x1="{x+w/2:.0f}" y1="{y+h/2:.0f}" x2="{fx}" y2="{fy}" stroke="#9aa0ac" stroke-width="1.3"/>'
            f'<rect x="{x}" y="{y}" width="{w:.0f}" height="{h}" rx="{h/2}" fill="#ffffff" stroke="#e7e7ee" stroke-width="1"/>'
            f'<text x="{x+w/2:.0f}" y="{y+h/2+size*0.34:.0f}" text-anchor="middle" font-size="{size}" font-weight="700" fill="#1d2430">{text}</text>')

# image 2 (lungs) frame
L=dict(x=70,y=212,w=470,h=351)
def Lf(fx,fy): return (L['x']+L['w']*fx, L['y']+L['h']*fy)
# image 1 (capillary) frame
C=dict(x=584,y=236,w=290,h=290)
def Cf(fx,fy): return (C['x']+C['w']*fx, C['y']+C['h']*fy)

labels=[]
# lungs labels
for t,cx,cy,ff in [
    ("trachea",96,250,(0.265,0.33)),
    ("bronchi",80,360,(0.27,0.52)),
    ("bronchioles",78,470,(0.34,0.64)),
    ("alveoli",300,244,(0.69,0.40)),
    ("capillaries",352,505,(0.83,0.66)),
]:
    fx,fy=Lf(*ff); labels.append(chip(t,cx,cy,round(fx),round(fy)))
# capillary labels
wall=Cf(0.44,0.5); rbc=Cf(0.64,0.62); blue=Cf(0.52,0.20)
labels.append(chip("wall: one cell thick",560,300,round(wall[0]),round(wall[1]),12))
labels.append(chip("O₂-poor blood",592,236,round(blue[0]),round(blue[1]),12))
labels.append(chip("O₂-rich blood",742,500,round(rbc[0]),round(rbc[1]),12))
# O2 in / CO2 out arrows across the wall
o2a=Cf(0.34,0.42); o2b=Cf(0.52,0.47); co2a=Cf(0.52,0.60); co2b=Cf(0.34,0.65)
arrows=(f'<path d="M{o2a[0]:.0f},{o2a[1]:.0f} L{o2b[0]:.0f},{o2b[1]:.0f}" stroke="#5b5bd6" stroke-width="3.5" fill="none" marker-end="url(#o2)"/>'
        f'<text x="{o2a[0]-6:.0f}" y="{o2a[1]-6:.0f}" text-anchor="end" font-size="14" font-weight="800" fill="#5b5bd6">O₂</text>'
        f'<path d="M{co2a[0]:.0f},{co2a[1]:.0f} L{co2b[0]:.0f},{co2b[1]:.0f}" stroke="#8a93a3" stroke-width="3.5" fill="none" marker-end="url(#co2)"/>'
        f'<text x="{co2b[0]-6:.0f}" y="{co2b[1]+16:.0f}" text-anchor="end" font-size="14" font-weight="800" fill="#6b7280">CO₂</text>')

svg=f'''<svg viewBox="0 0 1000 1620" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<defs>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1d2430" flood-opacity="0.08"/></filter>
 <marker id="o2" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#5b5bd6"/></marker>
 <marker id="co2" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#8a93a3"/></marker>
 <clipPath id="cA"><rect x="40" y="140" width="920" height="560" rx="20"/></clipPath>
 <style>
  .ink{{fill:#1d2430}}.ink2{{fill:#5e6673}}.b{{font-weight:700}}
  .card{{fill:#ffffff;stroke:#e7e7ee;stroke-width:1.2;filter:url(#soft)}}
  .sect{{font-size:22px;font-weight:800;fill:#1d2430}}
  .sub{{font-size:13.5px;font-weight:700;fill:#5e6673;letter-spacing:1.3px}}
  .body{{font-size:15.5px;font-weight:500;fill:#1d2430}}
  .lab{{font-size:13px;font-weight:600;fill:#5e6673}}
 </style>
</defs>
<rect width="1000" height="1620" fill="#f7f7fb"/>

<text x="40" y="66" font-size="44" font-weight="800" fill="#1d2430">Respiration in Humans</text>
<rect x="40" y="84" width="228" height="30" rx="15" fill="#eeeefb"/>
<text x="56" y="105" font-size="14" font-weight="700" fill="#5b5bd6" letter-spacing="1.4">BIOLOGY · AT A GLANCE</text>
<text x="960" y="70" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary</text>

<!-- Card A -->
<rect x="40" y="140" width="920" height="560" rx="20" class="card"/>
<rect x="40" y="140" width="6" height="560" rx="3" fill="#5b5bd6"/>
<text x="70" y="180" class="sect">Gaseous exchange</text>
<text x="70" y="202" class="sub">WHOLE LUNG → ALVEOLI → THE THIN WALL WHERE GASES SWAP</text>
<g clip-path="url(#cA)">
 <image href="data:image/jpeg;base64,{lungs}" x="{L['x']}" y="{L['y']}" width="{L['w']}" height="{L['h']}"/>
 <image href="data:image/jpeg;base64,{cap}" x="{C['x']}" y="{C['y']}" width="{C['w']}" height="{C['h']}"/>
 {arrows}
 {''.join(labels)}
</g>
<!-- 4 adaptations -->
<g transform="translate(70,586)" font-size="15.5">
 <rect x="0" y="0" width="186" height="26" rx="7" fill="#ffd84d"/><text x="10" y="19" class="b ink">Large surface area</text><text x="0" y="46" class="ink2">→ more diffusion at once</text>
 <rect x="430" y="0" width="186" height="26" rx="7" fill="#ffd84d"/><text x="440" y="19" class="b ink">Wall one cell thick</text><text x="430" y="46" class="ink2">→ short diffusion distance</text>
 <rect x="0" y="66" width="118" height="26" rx="7" fill="#ffd84d"/><text x="10" y="85" class="b ink">Moist lining</text><text x="0" y="112" class="ink2">→ gases dissolve first</text>
 <rect x="430" y="66" width="168" height="26" rx="7" fill="#ffd84d"/><text x="440" y="85" class="b ink">Dense capillaries</text><text x="430" y="112" class="ink2">→ steep concentration gradient</text>
</g>

<!-- Card B Breathing -->
<rect x="40" y="718" width="920" height="208" rx="20" class="card"/><rect x="40" y="718" width="6" height="208" rx="3" fill="#5b5bd6"/>
<text x="70" y="758" class="sect">Breathing (ventilation)</text>
<g transform="translate(70,778)"><rect x="0" y="0" width="415" height="124" rx="14" fill="#f3f8f4" stroke="#d6e8dc" stroke-width="1.2"/>
 <text x="18" y="30" font-size="15" font-weight="800" fill="#2e7d5b">INSPIRATION · breathe in</text>
 <text x="18" y="58" class="body">external intercostals <tspan class="b">contract</tspan>, ribs <tspan class="b">up &amp; out</tspan></text>
 <text x="18" y="82" class="body">diaphragm <tspan class="b">contracts &amp; flattens</tspan></text>
 <text x="18" y="106" class="body">volume <tspan class="b">↑</tspan>, pressure <tspan class="b">↓</tspan> → air in</text></g>
<g transform="translate(505,778)"><rect x="0" y="0" width="415" height="124" rx="14" fill="#fbf4f2" stroke="#efd8d0" stroke-width="1.2"/>
 <text x="18" y="30" font-size="15" font-weight="800" fill="#b5503a">EXPIRATION · breathe out</text>
 <text x="18" y="58" class="body">internal intercostals <tspan class="b">contract</tspan>, ribs <tspan class="b">down &amp; in</tspan></text>
 <text x="18" y="82" class="body">diaphragm <tspan class="b">relaxes &amp; domes up</tspan></text>
 <text x="18" y="106" class="body">volume <tspan class="b">↓</tspan>, pressure <tspan class="b">↑</tspan> → air out</text></g>

<!-- Card C Respiration -->
<rect x="40" y="944" width="448" height="236" rx="20" class="card"/><rect x="40" y="944" width="6" height="236" rx="3" fill="#5b5bd6"/>
<text x="70" y="984" class="sect">Respiration</text>
<text x="70" y="1014" class="sub">AEROBIC · needs oxygen</text>
<text x="70" y="1040" class="body">glucose + oxygen → carbon dioxide</text><text x="70" y="1062" class="body">+ water (+ energy)</text>
<rect x="70" y="1076" width="388" height="30" rx="8" fill="#eeeefb"/><text x="84" y="1097" font-size="15.5" font-weight="700" fill="#3b3b86">C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O</text>
<text x="70" y="1138" class="sub">ANAEROBIC · no oxygen (muscle)</text>
<text x="70" y="1164" class="body">glucose → <tspan class="b">lactic acid</tspan> (+ little energy)</text>

<!-- Card D Oxygen debt -->
<rect x="512" y="944" width="448" height="236" rx="20" class="card"/><rect x="512" y="944" width="6" height="236" rx="3" fill="#5b5bd6"/>
<text x="542" y="984" class="sect">Oxygen debt (hard exercise)</text>
<g transform="translate(542,1010)" font-size="15">
 <text x="0" y="16" class="ink"><tspan class="b" fill="#5b5bd6">1</tspan>  not enough O₂ → respire <tspan class="b">anaerobically</tspan></text>
 <text x="0" y="46" class="ink"><tspan class="b" fill="#5b5bd6">2</tspan>  <tspan class="b">lactic acid</tspan> builds up → fatigue</text>
 <text x="0" y="76" class="ink"><tspan class="b" fill="#5b5bd6">3</tspan>  <tspan class="b">oxygen debt</tspan> = extra O₂ needed after</text>
 <text x="0" y="106" class="ink"><tspan class="b" fill="#5b5bd6">4</tspan>  breathe deep &amp; fast to</text>
 <text x="18" y="130" class="ink"><tspan class="b">oxidise the lactic acid</tspan></text></g>

<!-- Card E Air pathway -->
<rect x="40" y="1198" width="920" height="126" rx="20" class="card"/><rect x="40" y="1198" width="6" height="126" rx="3" fill="#5b5bd6"/>
<text x="70" y="1236" class="sect">Air pathway</text>
<g transform="translate(70,1252)" font-size="15" font-weight="700">
 <g><rect x="0" y="0" width="84" height="34" rx="10" fill="#eeeefb"/><text x="42" y="23" text-anchor="middle" fill="#3b3b86">larynx</text></g><text x="92" y="23" fill="#b9bdc9">›</text>
 <g><rect x="108" y="0" width="92" height="34" rx="10" fill="#eeeefb"/><text x="154" y="23" text-anchor="middle" fill="#3b3b86">trachea</text></g><text x="208" y="23" fill="#b9bdc9">›</text>
 <g><rect x="224" y="0" width="92" height="34" rx="10" fill="#eeeefb"/><text x="270" y="23" text-anchor="middle" fill="#3b3b86">bronchi</text></g><text x="324" y="23" fill="#b9bdc9">›</text>
 <g><rect x="340" y="0" width="124" height="34" rx="10" fill="#eeeefb"/><text x="402" y="23" text-anchor="middle" fill="#3b3b86">bronchioles</text></g><text x="472" y="23" fill="#b9bdc9">›</text>
 <g><rect x="488" y="0" width="90" height="34" rx="10" fill="#eeeefb"/><text x="533" y="23" text-anchor="middle" fill="#3b3b86">alveoli</text></g></g>
<text x="70" y="1308" class="lab">trachea has cartilage rings + ciliated lining — cilia sweep mucus (with trapped dust) up to the throat</text>

<!-- Card F Tobacco -->
<rect x="40" y="1342" width="920" height="246" rx="20" class="card"/><rect x="40" y="1342" width="6" height="246" rx="3" fill="#5b5bd6"/>
<text x="70" y="1382" class="sect">Tobacco smoke — 3 toxins</text>
<g transform="translate(70,1404)">
 <rect x="0" y="0" width="274" height="158" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="18" y="32" font-size="16" font-weight="800" fill="#5b5bd6">Nicotine</text>
 <text x="18" y="64" class="body">addictive</text><text x="18" y="90" class="body">↑ heart rate &amp;</text><text x="18" y="112" class="body">blood pressure</text><text x="18" y="140" class="lab">→ heart disease risk</text>
 <rect x="292" y="0" width="274" height="158" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="310" y="32" font-size="16" font-weight="800" fill="#5b5bd6">Tar</text>
 <text x="310" y="62" class="body"><tspan class="b">carcinogen</tspan> → cancer</text><text x="310" y="88" class="body">destroys cilia, ↑ mucus</text><text x="310" y="110" class="body">→ <tspan class="b">chronic bronchitis</tspan></text><text x="310" y="140" class="body">alveoli damage → <tspan class="b">emphysema</tspan></text>
 <rect x="584" y="0" width="274" height="158" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="602" y="32" font-size="16" font-weight="800" fill="#5b5bd6">Carbon monoxide</text>
 <text x="602" y="64" class="body">binds haemoglobin</text><text x="602" y="90" class="body"><tspan class="b">irreversibly</tspan> →</text><text x="602" y="112" class="body"><tspan class="b">carboxyhaemoglobin</tspan></text><text x="602" y="140" class="lab">→ less O₂ carried</text></g>
</svg>'''
open(os.path.join(ROOT,"docs/guides/respiration-in-humans-summary.svg"),"w").write(svg)
print("wrote SVG", len(svg), "bytes")
