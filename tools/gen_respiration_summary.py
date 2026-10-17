#!/usr/bin/env python3
import base64, os
ROOT="/Users/ramita/Desktop/atlas"
def b64(p):
    with open(os.path.join(ROOT,p),"rb") as f: return base64.b64encode(f.read()).decode()
lungs=b64("docs/diagrams/respiration/lungs.jpg")
cap=b64("docs/diagrams/respiration/capillary.jpg")

LEAD="#48525f"
def chip(text,x,y,fx,fy,size=13):
    w=len(text)*7.0+18; h=size+12
    return (f'<line x1="{x+w/2:.0f}" y1="{y+h/2:.0f}" x2="{fx}" y2="{fy}" stroke="{LEAD}" stroke-width="1.8" marker-end="url(#lead)"/>'
            f'<rect x="{x}" y="{y}" width="{w:.0f}" height="{h}" rx="{h/2}" fill="#ffffff" stroke="#cfd3dc" stroke-width="1.2"/>'
            f'<text x="{x+w/2:.0f}" y="{y+h/2+size*0.34:.0f}" text-anchor="middle" font-size="{size}" font-weight="700" fill="#1d2430">{text}</text>')

L=dict(x=70,y=216,w=470,h=351)
def Lf(fx,fy): return (round(L['x']+L['w']*fx), round(L['y']+L['h']*fy))
C=dict(x=584,y=240,w=290,h=290)
def Cf(fx,fy): return (round(C['x']+C['w']*fx), round(C['y']+C['h']*fy))

labels=[]
# lungs (larynx removed; it lives in the Air-pathway card)
for t,cx,cy,ff in [
    ("Trachea",84,266,(0.262,0.33)),
    ("Bronchi",82,366,(0.30,0.50)),
    ("Bronchioles",80,452,(0.37,0.65)),
    ("Alveoli",300,236,(0.70,0.40)),
    ("Capillaries",372,508,(0.855,0.66)),
]:
    fx,fy=Lf(*ff); labels.append(chip(t,cx,cy,fx,fy))
# capillary close-up: non-crossing layout
labels.append(chip("Alveolus wall (one cell thick)",590,210,*Cf(0.41,0.40),12))
labels.append(chip("Deoxygenated blood",718,250,*Cf(0.54,0.24),12))
labels.append(chip("Oxygenated blood",690,552,*Cf(0.63,0.62),12))
# diffusion arrows across the wall (O2 red into blood, CO2 grey out)
o2a=Cf(0.24,0.50); o2b=Cf(0.45,0.52); co2a=Cf(0.45,0.60); co2b=Cf(0.24,0.62)
arrows=(f'<path d="M{o2a[0]},{o2a[1]} L{o2b[0]},{o2b[1]}" stroke="#d0514a" stroke-width="3" fill="none" marker-end="url(#o2)"/>'
        f'<text x="{o2a[0]-6}" y="{o2a[1]-5}" text-anchor="end" font-size="14" font-weight="800" fill="#d0514a">O₂</text>'
        f'<path d="M{co2a[0]},{co2a[1]} L{co2b[0]},{co2b[1]}" stroke="#8a93a3" stroke-width="3" fill="none" marker-end="url(#co2)"/>'
        f'<text x="{co2b[0]-6}" y="{co2b[1]+16}" text-anchor="end" font-size="14" font-weight="800" fill="#6b7280">CO₂</text>')

svg=f'''<svg viewBox="0 0 1000 1736" xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<defs>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1d2430" flood-opacity="0.08"/></filter>
 <marker id="o2" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#d0514a"/></marker>
 <marker id="co2" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#8a93a3"/></marker>
 <marker id="lead" markerWidth="8" markerHeight="8" refX="5.5" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="{LEAD}"/></marker>
 <clipPath id="cA"><rect x="40" y="140" width="920" height="600" rx="20"/></clipPath>
 <style>
  .ink{{fill:#1d2430}}.ink2{{fill:#5e6673}}.b{{font-weight:700}}
  .card{{fill:#ffffff;stroke:#e7e7ee;stroke-width:1.2;filter:url(#soft)}}
  .sect{{font-size:22px;font-weight:800;fill:#1d2430}}
  .sub{{font-size:13.5px;font-weight:700;fill:#5e6673;letter-spacing:1.0px}}
  .body{{font-size:15px;font-weight:500;fill:#1d2430}}
  .lab{{font-size:13.5px;font-weight:600;fill:#5e6673}}
 </style>
</defs>
<rect width="1000" height="1736" fill="#f7f7fb"/>

<text x="40" y="66" font-size="44" font-weight="800" fill="#1d2430">Respiration in Humans</text>
<rect x="40" y="84" width="228" height="30" rx="15" fill="#eeeefb"/>
<text x="56" y="105" font-size="14" font-weight="700" fill="#5b5bd6" letter-spacing="1.4">BIOLOGY · AT A GLANCE</text>
<text x="960" y="70" text-anchor="end" font-size="15" font-weight="600" fill="#5e6673">G3 Biology · summary</text>

<!-- Card A -->
<rect x="40" y="140" width="920" height="600" rx="20" class="card"/>
<rect x="40" y="140" width="6" height="600" rx="3" fill="#5b5bd6"/>
<text x="70" y="180" class="sect">Gaseous exchange</text>
<text x="70" y="204" class="sub">OXYGEN DIFFUSES INTO THE BLOOD, CARBON DIOXIDE DIFFUSES OUT — AT THE ALVEOLI</text>
<g clip-path="url(#cA)">
 <image href="data:image/jpeg;base64,{lungs}" x="{L['x']}" y="{L['y']}" width="{L['w']}" height="{L['h']}"/>
 <image href="data:image/jpeg;base64,{cap}" x="{C['x']}" y="{C['y']}" width="{C['w']}" height="{C['h']}"/>
 {arrows}
 {''.join(labels)}
</g>
<!-- 4 adaptations -->
<g transform="translate(70,600)" font-size="15">
 <rect x="0" y="0" width="186" height="26" rx="7" fill="#ffd84d"/><text x="10" y="19" class="b ink">Large surface area</text><text x="0" y="48" class="ink2">Many alveoli, so more gas diffuses</text>
 <rect x="430" y="0" width="194" height="26" rx="7" fill="#ffd84d"/><text x="440" y="19" class="b ink">Walls one cell thick</text><text x="430" y="48" class="ink2">A short diffusion distance</text>
 <rect x="0" y="70" width="118" height="26" rx="7" fill="#ffd84d"/><text x="10" y="89" class="b ink">Moist lining</text><text x="0" y="118" class="ink2">Gases dissolve before diffusing</text>
 <rect x="430" y="70" width="168" height="26" rx="7" fill="#ffd84d"/><text x="440" y="89" class="b ink">Dense capillaries</text><text x="430" y="118" class="ink2">Keep a steep concentration gradient</text>
</g>

<!-- Card B Breathing -->
<rect x="40" y="760" width="920" height="236" rx="20" class="card"/><rect x="40" y="760" width="6" height="236" rx="3" fill="#5b5bd6"/>
<text x="70" y="800" class="sect">Breathing</text>
<g transform="translate(70,818)"><rect x="0" y="0" width="415" height="158" rx="14" fill="#f3f8f4" stroke="#d6e8dc" stroke-width="1.2"/>
 <text x="18" y="30" font-size="15" font-weight="800" fill="#2e7d5b">Breathing in</text>
 <text x="18" y="58" class="body">External intercostal muscles contract</text>
 <text x="18" y="82" class="body">Ribs move up and out</text>
 <text x="18" y="106" class="body">Diaphragm contracts and flattens</text>
 <text x="18" y="134" class="body">Volume increases, pressure decreases,</text>
 <text x="18" y="152" class="body">so air moves in</text></g>
<g transform="translate(505,818)"><rect x="0" y="0" width="415" height="158" rx="14" fill="#fbf4f2" stroke="#efd8d0" stroke-width="1.2"/>
 <text x="18" y="30" font-size="15" font-weight="800" fill="#b5503a">Breathing out</text>
 <text x="18" y="58" class="body">Internal intercostal muscles contract</text>
 <text x="18" y="82" class="body">Ribs move down and in</text>
 <text x="18" y="106" class="body">Diaphragm relaxes and domes up</text>
 <text x="18" y="134" class="body">Volume decreases, pressure increases,</text>
 <text x="18" y="152" class="body">so air is pushed out</text></g>

<!-- Card C Respiration -->
<rect x="40" y="1016" width="448" height="238" rx="20" class="card"/><rect x="40" y="1016" width="6" height="238" rx="3" fill="#5b5bd6"/>
<text x="70" y="1056" class="sect">Respiration</text>
<text x="70" y="1086" class="sub">AEROBIC · needs oxygen</text>
<text x="70" y="1112" class="body">Glucose + oxygen → carbon dioxide</text><text x="70" y="1134" class="body">+ water (releases energy)</text>
<rect x="70" y="1148" width="388" height="30" rx="8" fill="#eeeefb"/><text x="84" y="1169" font-size="15.5" font-weight="700" fill="#3b3b86">C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O</text>
<text x="70" y="1210" class="sub">ANAEROBIC · no oxygen (in muscle)</text>
<text x="70" y="1236" class="body">Glucose → lactic acid (releases less energy)</text>

<!-- Card D Oxygen debt -->
<rect x="512" y="1016" width="448" height="238" rx="20" class="card"/><rect x="512" y="1016" width="6" height="238" rx="3" fill="#5b5bd6"/>
<text x="542" y="1056" class="sect">Oxygen debt (hard exercise)</text>
<g transform="translate(542,1070)" font-size="14.5">
 <text x="0" y="16" class="ink"><tspan class="b" fill="#5b5bd6">1.</tspan>  Not enough oxygen, so muscles</text>
 <text x="22" y="38" class="ink">respire anaerobically</text>
 <text x="0" y="66" class="ink"><tspan class="b" fill="#5b5bd6">2.</tspan>  Lactic acid builds up, causing fatigue</text>
 <text x="0" y="94" class="ink"><tspan class="b" fill="#5b5bd6">3.</tspan>  Oxygen debt is the extra oxygen</text>
 <text x="22" y="116" class="ink">needed afterwards</text>
 <text x="0" y="144" class="ink"><tspan class="b" fill="#5b5bd6">4.</tspan>  Breathe deeply and quickly to</text>
 <text x="22" y="166" class="ink">oxidise the lactic acid</text></g>

<!-- Card E Air pathway -->
<rect x="40" y="1274" width="920" height="128" rx="20" class="card"/><rect x="40" y="1274" width="6" height="128" rx="3" fill="#5b5bd6"/>
<text x="70" y="1312" class="sect">Air pathway</text>
<g transform="translate(70,1328)" font-size="15" font-weight="700">
 <g><rect x="0" y="0" width="84" height="34" rx="10" fill="#eeeefb"/><text x="42" y="23" text-anchor="middle" fill="#3b3b86">Larynx</text></g><text x="94" y="23" fill="#9aa0ac">→</text>
 <g><rect x="110" y="0" width="92" height="34" rx="10" fill="#eeeefb"/><text x="156" y="23" text-anchor="middle" fill="#3b3b86">Trachea</text></g><text x="212" y="23" fill="#9aa0ac">→</text>
 <g><rect x="228" y="0" width="92" height="34" rx="10" fill="#eeeefb"/><text x="274" y="23" text-anchor="middle" fill="#3b3b86">Bronchi</text></g><text x="330" y="23" fill="#9aa0ac">→</text>
 <g><rect x="346" y="0" width="124" height="34" rx="10" fill="#eeeefb"/><text x="408" y="23" text-anchor="middle" fill="#3b3b86">Bronchioles</text></g><text x="480" y="23" fill="#9aa0ac">→</text>
 <g><rect x="496" y="0" width="90" height="34" rx="10" fill="#eeeefb"/><text x="541" y="23" text-anchor="middle" fill="#3b3b86">Alveoli</text></g></g>
<text x="70" y="1384" class="lab">The trachea has cartilage rings and a ciliated lining; the cilia sweep mucus and trapped dust up to the throat.</text>

<!-- Card F Tobacco -->
<rect x="40" y="1422" width="920" height="278" rx="20" class="card"/><rect x="40" y="1422" width="6" height="278" rx="3" fill="#5b5bd6"/>
<text x="70" y="1462" class="sect">Tobacco smoke — three toxins</text>
<g transform="translate(70,1484)" font-size="14">
 <rect x="0" y="0" width="274" height="186" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="18" y="32" font-size="16" font-weight="800" fill="#5b5bd6">Nicotine</text>
 <text x="18" y="62" class="ink">Addictive.</text>
 <text x="18" y="88" class="ink">Increases heart rate and</text>
 <text x="18" y="108" class="ink">blood pressure.</text>
 <text x="18" y="138" class="ink">Increases the risk of</text>
 <text x="18" y="158" class="ink">heart disease.</text>
 <rect x="292" y="0" width="274" height="186" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="310" y="32" font-size="16" font-weight="800" fill="#5b5bd6">Tar</text>
 <text x="310" y="62" class="ink">A carcinogen that causes</text>
 <text x="310" y="82" class="ink">lung cancer.</text>
 <text x="310" y="108" class="ink">Destroys cilia and makes</text>
 <text x="310" y="128" class="ink">more mucus, causing</text>
 <text x="310" y="148" class="ink">chronic bronchitis. Damages</text>
 <text x="310" y="168" class="ink">alveoli, causing emphysema.</text>
 <rect x="584" y="0" width="274" height="186" rx="14" fill="#faf9ff" stroke="#e7e7f3" stroke-width="1.2"/>
 <text x="602" y="32" font-size="16" font-weight="800" fill="#5b5bd6">Carbon monoxide</text>
 <text x="602" y="62" class="ink">Binds irreversibly to</text>
 <text x="602" y="82" class="ink">haemoglobin, forming</text>
 <text x="602" y="102" class="ink">carboxyhaemoglobin,</text>
 <text x="602" y="130" class="ink">so less oxygen is</text>
 <text x="602" y="150" class="ink">carried in the blood.</text>
</g>
</svg>'''
open(os.path.join(ROOT,"docs/guides/respiration-in-humans-summary.svg"),"w").write(svg)
print("wrote SVG", len(svg), "bytes")
