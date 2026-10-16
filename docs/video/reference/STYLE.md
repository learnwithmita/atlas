%:
# STYLE.md — Minimal Science Reel Style

Paste this file into any video request. A video that follows it will look, read and move the same way as "Choosing the Right Apparatus".

---

## 1. The look in one paragraph

The look is clean, minimal and calm, with one pop of colour. The background is flat warm off-white with no textures, gradients or decorative blobs. Lab apparatus is drawn as **flat illustrated shapes with a soft lift shadow and a crisp light edge**, and it animates in with gentle overshoot. All text is dark ink. Key words get a **yellow highlighter stripe**, not a different text colour. One deep-teal accent marks structure: tags, progress, chips, the correct answer. The important text sits **at the top**, directly under the title.

---

## 2. Canvas and export

| Setting | Value |
|---|---|
| Format | Vertical reel, **1080 × 1920**, **9:16** (tag the display aspect ratio as 9:16) |
| Frame rate | **30 fps** |
| Video | H.264 High, yuv420p, CRF ≈ 17, `+faststart` |
| Audio | **Voice-over only** (no music or effects), AAC 48 kHz, **−16 LUFS**, true peak ≤ −1.5 dBTP |
| Length | 60–120 s; timing comes from the narration (one idea per scene) |
| Cover | Export one still of the fully assembled title card |

### Reel safe zone (platform UI covers the rest)

```
y 0–220      ░ top bar (platform UI): background only
y 220–1560   ■ SAFE: all text and key visuals
y 1560–1920  ░ caption/username overlay: background only
x 960–1080   ░ like/comment/share buttons (y 800–1560): keep clear
```

Usable content box: **x 60 → 960, y 230 → 1550**. Centre line x = 510.

---

## 3. Layout grid (every content scene)

| Zone | Position | Contents |
|---|---|---|
| Tag pill | top y 232, h 52, x 60 | UPPERCASE topic, e.g. `VOLUME · FIXED` |
| Progress dots | y 258, right-aligned to x 952 | Done = accent filled; current = yellow dot with ink ring; todo = grey outline |
| Title | baseline y 362, max width 900 | One short noun phrase |
| **Key-point card** | top y 392, x 60–960, grows downward | **What students must take note of.** Maximum 3 lines |
| Illustration | y 640 → 1420 | Apparatus and its animation, magnifier insets, reading pills |
| Fact chips | y 1440, h 112, 3 equal chips with 18 px gaps | `MEASURES` / `UNIT` / `READS TO` (or `DELIVERS`) |

Summary, quiz and other text-heavy scenes keep the same tag, title and key-card stack. Their own content (rows, cards, axis) fills y 640–1550.

---

## 4. Colour tokens

### UI and text (the only colours text may use)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#F5F3EE` | Flat background, every frame |
| `card` | `#FFFFFF` | Cards, chips, reading pills |
| `ink` | `#1D2430` | **All** primary text, values, units, numbers |
| `ink-2` | `#5E6673` | Secondary text only: chip labels, sublabels, axis labels |
| `white` | `#FFFFFF` | Text on accent fills only |
| `accent` | `#0E7B76` | Tag pills, progress, chip dots, card edge bar, correct answer, result card |
| `accent-dark` | `#0A5C58` | Title-card panel |
| `highlight` | `#FFD84D` | Highlighter behind key words, quiz letters, current-step dot, one hero word on the title card |

**Text colour rules**
1. Text is `ink`, `ink-2` or `white`. Nothing else, ever: no orange, green or red text.
2. Emphasis = **bold + yellow highlighter stripe** behind ink text. Never a coloured word.
3. Values and units are always bold `ink`. Keep a number and its unit together with a non-breaking space (`25.0 cm³`).
4. Use only one accent colour per video.

### Illustration palette (objects only, never text)

| Role | Hex |
|---|---|
| Teal / dark / light / pale | `#3E7D7A` / `#2A5957` / `#9BC4BD` / `#D6E8E3` |
| Terracotta / dark / light | `#C0624A` / `#97452F` / `#E8AE97` |
| Amber / dark / light | `#D8973A` / `#A86F1F` / `#F1CE8A` |
| Off-white parts | `#FBF7EE`, `#EEE2CD`, `#E4D4BA` |
| Glass | white at 40–50 % opacity, 3 px `#2A5957` outline at 75 % opacity |
| Liquids | teal-light `#9BC4BD` at 80–90 %; indicator end-point terracotta-light |

---

## 5. Typography

| Font family | Used for |
|---|---|
| Inter Display Bold | Titles and big numbers |
| Inter (Medium / SemiBold / Bold) | Everything else |
| DejaVu Sans Mono Bold | Digital displays only (stopwatch, balance LCD) |

| Role | Size (px at 1080 wide) | Weight | Colour |
|---|---|---|---|
| Title-card hero | 88 / 130 | Display Bold | white + highlight |
| Scene title | 72–76 (fit to 900) | Display Bold | ink |
| Key-point text | **42**, line height 56 | Medium; emphasis Bold + highlight | ink |
| Quiz question | 40, line height 54 | Medium | ink |
| Chip value | 42 | Bold | ink |
| Chip label / tag | 21–26, letter-spacing 2 | Bold UPPERCASE | ink-2 / white |
| Reading pill | 42–52 | Bold | ink |
| Table row name / sub | 38 / 30 | Bold / Medium | ink / ink-2 |
| Small notes (minimum) | **25** | Medium | ink-2 |

**Text that matters is never below 30 px.** Nothing at all is below 25 px. Do not scale the whole layout down to fit the safe zone; lay it out natively inside it.

---

## 6. Components

- **Key-point card:** white, radius 26, soft shadow, 12 px accent bar on the left, padding 27 px top and 42 px left. Height = lines × 56 + 54. It crossfades when the text changes (0.45 s) while the card height eases.
- **Tag pill:** accent fill, white bold UPPERCASE text, radius 26.
- **Fact chip:** white card, radius 22, 6 px accent dot, label in ink-2 UPPERCASE, value in bold ink.
- **Reading pill:** white capsule with bold ink text. On a yellow capsule, it is the single "rule of thumb" callout.
- **Magnifier inset:** off-white disc with an amber ring, a magnified scale, the meniscus or mark, an eye icon with a dashed sight-line at the reading, and a dashed connector to the apparatus. The reading pill sits under it.
- **Result card:** accent fill with white text, used for calculations (e.g. `24.65 − 1.20 = 23.45 cm³`).
- **Summary row:** white card; icon in a bg-coloured circle; bold ink name with a medium ink-2 sublabel; accent value pill on the right.
- **Quiz cards:** 2×2 white cards with a yellow letter circle, an icon top-right and a bold ink name.
  - Reveal the answer by filling the correct card with accent and white text, adding a yellow check badge and a short reason.
  - Dim the wrong cards to 60 % with a grey ×.
  - Show the answer line in a white card underneath.
- **Shadows:** a soft blur (σ ≈ 7, 19 % opacity, offset 1.5, 5) plus a tight contact shadow (σ ≈ 1, 16 %). Use them on apparatus and cards only, never on text.

---

## 7. Illustration rules

- Build objects from simple geometric shapes: rounded rectangles, circles and smooth curves. Use no outlines except on glass.
- Glassware is translucent. Liquids are clipped inside the inner wall.
- **The bottom of the meniscus sits exactly at the stated reading.** Draw the meniscus concave for aqueous liquids.
- Every reading quoted in text is also visible on the drawn scale or display, and it matches.
- Show correct technique visually: eye level, filler on the pipette (never mouth), tap orientation (handle parallel to the tube = open), tare before adding.

---

## 8. Motion

| Element | Motion |
|---|---|
| Entrances ("pop") | 0.6 s; slide up 40–80 px, scale 0.9 → 1 with a slight overshoot (back-out, s = 1.4), 0–6° rotation settling to 0, fade in during the first 60 % |
| Stagger | 0.12–0.2 s between siblings; order: tag → title → key card → apparatus → chips |
| Scene exit | Last 0.32 s: fade to 0 while drifting up 30 px; the next scene pops in immediately |
| Easing | Ease-out cubic for arrivals, ease-in-out cubic for state changes (levels, needles, fills) |
| Process animation | Real-time or labelled speed-up (e.g. "sped up ×7"); readings settle and are then labelled "steady" |
| Key-card change | Swap mid-scene, roughly when the visual reaches the point it describes |
| Answer reveal | After a 5 s accent countdown bar; the correct card does a 4 % scale pulse |

---

## 9. Scene recipe (60–90 s)

1. **Title card** (5–6 s): accent-dark panel, white + yellow hero title, 2–3 apparatus icons.
2. **Overview** (4 s): 2×2 cards of what will be covered.
3. **One scene per concept** (8–10 s): tag, title, key card (2 messages), animated apparatus, inset reading, 3 fact chips.
4. **Summary table** (8 s).
5. **Comparison visual** (5–6 s), e.g. precision bands on a shared axis.
6. **Exam-style question** (14 s): question card, A–D cards, 5 s countdown, reveal with reasons.
7. **Outro** (2 s): one short line and a 3-step takeaway.

---

## 10. Voice-over

| Setting | Value |
|---|---|
| Voice | Calm, warm female teacher in her 20s. Kokoro TTS voice **`af_heart`**, speed **0.97** |
| Pacing | 0.45 s after the scene starts → line 1; 0.4 s gap → line 2; 0.8 s of quiet before the scene ends. Quiz: about 1.5 s silent "think" pause before the reveal |
| Polish | High-pass 75 Hz → light compression (2.5:1 at −21 dB) → loudness −16 LUFS |
| Lines per scene | 1–2 short spoken lines. **Line *i* is spoken while key-point card *i* is on screen**, and the card appears the moment its line starts |
| Sync | Scenes stretch to fit the narration. The animation is time-warped so the visual moment for line 2 (an inset appearing, a reading settling) lands when line 2 begins |

**How to write the script**
- Say what the key card says, in natural speech. Do not read the card word for word.
- Write numbers and units the way a teacher says them: "zero point zero five", "twenty-five point zero cubic centimetres", "twenty-eight point five degrees Celsius".
- Keep it to 8–16 words per sentence and about 2.4 words per second, with a friendly direct address ("Try this.", "Pause, and choose.").
- The whole script should be about 90–100 s of speech for 12 scenes. Trim words rather than speed the voice up.

---

## 11. Writing rules

- A key point is **one idea, ≤ 90 characters, at most 3 lines at 42 px**. Use one or two highlighted terms per point; never highlight a whole sentence.
- Write the number first and the unit after it: `45.5 cm³`, `28.5 °C`, `0.01 g`. Use the correct symbols (−, ×, °C, cm³).
- Use the syllabus wording students will see in exams: "bottom of the meniscus", "eye level", "final − initial".
- Every essential fact must be on screen so the video works with sound off.

---

## 12. QA checklist before delivering

- [ ] Overlay the safe-zone boxes on stills from every scene; nothing important sits inside them.
- [ ] No text colour other than ink, ink-2 or white; emphasis uses the yellow highlighter only.
- [ ] No important text below 30 px; no number is split from its unit.
- [ ] Every drawn reading matches the number in the text; scale directions are right (the burette reads 0 at the top).
- [ ] Key cards are 3 lines or fewer and never overlap the illustration.
- [ ] Narration onsets (`silencedetect`) match the scheduled line starts; loudness reads −16 LUFS (`ebur128`).
- [ ] ffprobe shows 1080×1920, DAR 9:16, 30 fps, H.264 + AAC; the full file decodes without errors.
