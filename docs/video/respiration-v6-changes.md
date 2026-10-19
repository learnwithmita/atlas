# Respiration video — v6 change spec (tutor feedback)

Target file: `tools/video/alveolus_pilot.py`. Render, then **verify every item on
stills** (render `--stills` at the timestamps noted) and iterate until the
checklist at the bottom passes. The lung image `docs/diagrams/respiration/lungs.jpg`
has already been updated on this branch to the larynx-inclusive version (1400×1045).

Aesthetic rules (hard): **emphasis highlights are YELLOW (#FFD84D) ONLY — never
blue anywhere**; indigo (`accent`) is allowed only for thin chrome (card edge bars,
leader lines). **No em-dashes (—) and no hyphen-joined filler** in any on-screen or
spoken text. Spell gases out in full — **"oxygen" / "carbon dioxide", never O₂ /
CO₂** (this is Biology). Teaching body text is **black (`ink`)**, not grey (`ink2`).

---

## 1. Lung image is correct now — recalibrate all image coordinates to it
The new image (1400×1045) layout: larynx (voice box) top-centre; striped trachea
below it; the Y-junction (carina) into two bronchi ~halfway down; bronchioles
branch into both lungs; a drawn **zoom bubble on the RIGHT** (~centre x1095 y680,
r≈175) already shows the alveoli grape-clusters wrapped in red/blue capillaries.

Update `JOURNEY` (image_x, image_y in 1400×1045 space). Starting values — verify on
a still at t≈ onset of each word and nudge so each leader lands ON its structure:
```
(1, "larynx",      478, 175, "larynx", "voice box", ...),
(1, "trachea",     480, 330, "trachea", "the windpipe that carries air", ...),
(2, "cartilage",   480, 300, "cartilage + cilia", "hold the airway open; sweep out dust", ...),
(3, "bronchi",     560, 545, "bronchi", "carry air into each lung", ...),
(3, "bronchioles", 650, 680, "bronchioles", "carry air to the alveoli", ...),
(4, "alveoli",    1080, 675, "alveoli", "air sacs where gases are exchanged", ...),
```
Update `S_BUBBLE = (860, 505, 470, 350)` (frames the right-side zoom circle; aspect
matches IMGD 1096:818). Update the opening breath-path to the new airway:
`[(478,175),(480,320),(480,480),(505,535),(565,585),(650,685),(705,745)]`.

The label text anchors (txx,tyy on the 1920×1080 canvas) may need nudging so pills
sit in clear space beside each structure with a clean leader — verify on stills.

## 2. Opening hook (seg0, ~first 16–20 s): a simple breathing FIGURE, not a static image
Add `draw_hook_figure(c, gt)` and call it in `render_frame` **before**
`draw_opening`. It renders during seg0 only and cross-fades out as the lungs
journey begins: `a = clamp(1 - lin(gt, starts[1]-0.6, starts[1]+0.2))`.
Correspondingly, make `draw_opening` fade the lungs image IN from ~`starts[1]`
(so the image is not shown stagnant under the hook).

Design — minimalist, on-style (soft indigo silhouette, rose lungs), a person
**breathing**: a simple front-or-side upper-body silhouette (head + shoulders +
chest) with two lungs inside that **inflate on inhale / deflate on exhale** (~4 s
cycle), a trachea tube, the diaphragm line flattening on inhale and doming on
exhale, and a few **bright oxygen dots drawn IN through the airway on inhale** and
grey **carbon dioxide dots drifting OUT on exhale**. Keep it calm and clean (match
`docs/video/reference/STYLE.md`). No text needed (subtitles carry the narration).
**Render a still at t≈3 s, look at it, and refine proportions/overlaps until it
reads clearly as a person breathing and looks premium — not cluttered.**

## 3. Subtitles — bigger and higher
In `draw_subtitles`: font size 33 → **40**, band height 62 → **70**. Move
`SUB_Y = 986` → **≈ 912** (raise off the bottom). Because of this, raise the two
low diagram labels so they clear the subtitle band: `capillaries` label y 930 →
**≈856**, `red blood cells` label y 936 → **≈864**. Trim `draw_recap` and
`draw_exam` card heights so their bottoms clear ~900 (recap rh 648→~600, exam rh
660→~600). **Verify on stills at the recap, exam and an alveolus-animation frame
that subtitles never overlap a card, a label or the diagram.**

## 4. Highlight discipline — yellow only, in sync, not every word
- Confirm **zero** blue/indigo fills sit behind any text (emphasis = yellow `hl`
  only). The recap and exam slides must show **no blue highlight** — only the thin
  indigo card edge-bar is allowed.
- Captions (`CAP_TEXT`): reduce `*bold*` to the **single key term per line** (not
  every term) so we are not highlighting everything at once.
- Keep on-diagram labels/exam highlights appearing **as/just after the word is
  spoken** (they already key off `WORD_CUES` / cue onsets — keep that).
- Nothing should be pre-highlighted before it is said.

## 5. Spell gases out; black text
Replace every on-screen/caption "O₂"→"oxygen", "CO₂"→"carbon dioxide":
- `o2_dot` label "O₂" → "oxygen"; draw it on a small white rounded chip so it is
  always legible, and keep the dot a **bright, high-contrast red-orange with a
  white ring + glow** so it reads against the pink lungs (fix "O2 not visible,
  too close to purple").
- `o2_co2`: labels "O₂"/"CO₂" → "oxygen"/"carbon dioxide".
- `tagpill` / `draw_diagram`: AIR pill sub "high in O₂" → **"high in oxygen"** and
  **move the AIR pill to the CENTRE of the alveolus circle** (CX, CY). BLOOD pill
  "low O₂ · high CO₂" → **"low in oxygen"**, keep it on the blood/capillary side so
  it is clear WHERE the oxygen is low (shows the diffusion direction).
- `CAP_TEXT[5]`: "Blood: *low O₂*, *high CO₂*." → "Blood is **low in oxygen**."
  `CAP_TEXT[7]`: "*O₂* diffuses in; *CO₂* diffuses out." → "**Oxygen** diffuses in;
  carbon dioxide diffuses out." `CAP_TEXT[12]`: "O₂ higher in the air" → "oxygen
  higher in the air".
- Darken teaching text: in `jlabel` the function line, in `label` the `sub` line,
  and the recap/exam reason lines: `ink2` → **`ink`** (the "voice box" / "one cell
  thick" sub-text must be solid black, not faint). Keep `ink2` only for true chrome
  like "[4 marks]".

## 6. Remove em-dashes and "two thin layers"
- `CAP_TEXT[3]` drop "— an upside-down tree" → "Into two *bronchi*, then finer
  bronchioles."
- `CAP_TEXT[9]` "— about half a tennis court" → ", about half a tennis court".
- `CAP_TEXT[10]` "walls *one cell thick* — two thin layers." → "Walls *one cell
  thick*."
- `wall_zoom` text "two cells thin" → "each one cell thick".
- `SEG_TEXT[10]` narration "so oxygen crosses only two thin layers." → "so oxygen
  has only a very short distance to cross."
- `RECAP` list em-dashes → colons: "Walls one cell thick: short diffusion
  distance", "Moist lining: gases dissolve", "Rich blood supply: steep gradient".
- Any other "—" in `SEG_TEXT`/`CAP_TEXT`/on-canvas strings → reword.

## 7. Fix label anchoring during the alveolus animation
The `capillaries` and `red blood cells` leaders currently point at fixed band
points, so as cells flow they sometimes land on empty space. Fix so each leader
always lands on its structure:
- `capillaries` → point at the capillary **band/wall** (a stationary structure).
- `red blood cells` → **pin one static reference red blood cell** at the leader
  target (draw an `rbc(...)` there, slightly highlighted) so the leader always
  lands on an actual cell, independent of the flow animation.
Verify on a mid-animation still that both leaders sit on their structure.

## 8. Exam section — specify, feature+reason, then a FULL cohesive-answer slide
Keep the two-feature exam-style walkthrough (this matches a 4-mark question).
- Make "Large surface area" **specific**: everywhere it appears as a bare phrase
  (exam pair 1/2, recap, factor chip where space allows) → **"Large surface area
  of the alveoli"**, reason "so more gas can diffuse at the same time".
- Model-answer pair 1: feature "The alveolus wall is one cell thick", reason "a
  short diffusion distance, so gases cross quickly".
- Remove the "→" arrow glyph in the reason lines; show the reason indented under
  the feature in plain black text (no arrow, no dash).
- **Add a new final segment (append as `SEG_TEXT[15]` / `CAP_TEXT[15]`)** and a new
  `draw_final_answer(c, gt)` slide that comes AFTER the feature+reason build:
  it shows the **question** at the top, then the **two points assembled into one
  cohesive paragraph model answer**, highlighting the feature phrases in yellow as
  they are spoken, so students see how to structure the whole answer. Make
  `draw_exam` fade out at `onsets[15]` and `draw_final_answer` run from
  `onsets[15]`. Suggested seg15 narration:
  > "Now put the points together into one answer. The alveolus is efficient at
  > gaseous exchange for two reasons. First, its wall is only one cell thick, giving
  > a short diffusion distance, so gases cross quickly. Second, the alveoli have a
  > very large surface area, so more gas diffuses at the same time. That is how two
  > features, each with its reason, earn all four marks."
  Suggested caption[15]: "Put it together: *feature + reason*, into one answer."
  On-slide model-answer paragraph (highlight the bold bits in yellow as said):
  > The alveolus is efficient at gaseous exchange for two reasons. First, its
  > **wall is one cell thick**, giving a **short diffusion distance**, so gases
  > cross quickly. Second, the alveoli have a **large surface area**, so more gas
  > diffuses at the same time.

---

## Verification checklist (all must pass on rendered stills before pushing)
1. Lungs look natural (rose/pink), NOT bluish — and all six 6a labels (larynx,
   trachea, bronchi, bronchioles, alveoli, capillaries) land on the right
   structure as each is named.
2. Opening (t≈3 s) shows a clean breathing figure, not a static image; it reads as
   a person breathing and looks premium.
3. Subtitles are large and sit higher than before; they never overlap a card,
   label, or the diagram, at the recap, exam, and an alveolus-animation frame.
4. No blue highlight anywhere; every emphasis is yellow; nothing pre-highlighted.
5. No "O₂"/"CO₂" and no em-dashes / "two thin layers" anywhere on screen or in
   subtitles. Gases are spelled out. AIR "high in oxygen" is centred in the
   alveolus; BLOOD "low in oxygen" is on the blood side.
6. Teaching text is solid black, not faint grey.
7. The travelling oxygen marker is bright and clearly legible against the lungs.
8. capillaries + red blood cell leaders always land on their structure mid-flow.
9. Exam: "large surface area of the alveoli" is specific; the final slide shows the
   question + one cohesive paragraph answer with feature+reason highlighted as
   spoken.
10. Learning outcomes 6a (structures + functions) and 6c (alveolus adaptations +
    exam skill) are fully covered; nothing from them removed.

Output: `out/alveolus_pilot.mp4` (1920×1080, H.264/AAC). Commit the updated
renderer + the mp4 + 3 representative stills, and push to this branch.
