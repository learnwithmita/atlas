# Choosing the Right Apparatus — Sec 4 G3 Pure Chemistry (O-Level)

This is a 113.6-second minimal explainer reel with a calm female teacher voice-over. It teaches how to measure **time, temperature, mass and volume**, and how to choose between a stopwatch, thermometer, electronic balance, measuring cylinder, burette and volumetric pipette. The visual system is documented in **STYLE.md**, which you can reuse for other videos.

| Output | Value |
|---|---|
| File | `out/apparatus_selection_reel.mp4` (+ `out/reel_cover.png`) |
| Resolution | 1080 × 1920, display aspect ratio 9:16, laid out natively in the Reels / TikTok / Shorts safe zone |
| Frame rate | 30 fps (3,407 frames) |
| Video | H.264 High profile, yuv420p, CRF 17 |
| Audio | Voice-over only (Kokoro TTS, voice `af_heart`), AAC 48 kHz, −16 LUFS |
| Duration | 113.6 s (each scene stretches to fit its narration) |

The key point for each scene sits **at the top**, under the title. All text is dark ink, and key terms get a yellow highlighter stripe. `render_v1_papercut.py` keeps the earlier textured paper-cut version.
## Running order

| Time (s) | Scene | What is shown |
|---|---|---|
| 0.0–5.5 | Title | Paper-cut title card with flask, thermometer and running stopwatch |
| 5.5–9.5 | Four quantities | Time (s), temperature (°C), mass (g), volume (cm³) |
| 9.5–17.5 | Stopwatch | Times a "disappearing cross" reaction from start to stop (00:34.62). Reads to 0.01 s, but reaction time limits real precision |
| 17.5–25.5 | Thermometer | Liquid column rises and settles at 28.5 °C. A magnifier shows reading at eye level to the nearest 0.5 °C |
| 25.5–33.5 | Electronic balance | Container placed (1.84 g), TARE pressed (0.00 g), then solid added (2.50 g) |
| 33.5–42.0 | Measuring cylinder | Liquid is poured in. The magnifier shows the bottom of the meniscus at eye level: 45.5 cm³ (±0.5 cm³) |
| 42.0–51.5 | Burette | Scale reads 0.00 at the top. The live magnifier tracks the level dropping; initial 1.20, final 24.65, volume added 23.45 cm³. The indicator reaches its end-point |
| 51.5–60.0 | Volumetric pipette | Pipette filler is used to fill above the mark, then adjust the meniscus onto the mark. The pipette drains 25.0 cm³ into the flask; the tip touches the wall and the last drop is not blown out |
| 60.0–68.0 | Side by side | Six-row table: apparatus, what it measures, reading precision |
| 68.0–73.5 | Precision | Uncertainty bands around 25 cm³: cylinder ±0.5, burette ±0.05 per reading, pipette ±0.06 (typical) |
| 73.5–87.5 | Exam-style question | 25.0 cm³ of NaOH(aq) for a titration: A beaker, B measuring cylinder, C burette, D volumetric pipette. A 5 s "think" timer runs, then answer **D** is revealed with a reason for every option |
| 87.5–89.5 | Outro | Quantity → Apparatus → Precision |

All teaching content is on screen as captions, chips and labels, so the video works with the sound off.

## Science notes (checked in rendered frames)

- **Burette:** the scale increases downward (0.00 at the top). Readings are given to 2 d.p. ending in 0 or 5. Volume = final − initial. The stopcock handle is drawn parallel to the tube when open and perpendicular when closed.
- **Volumetric pipette:** delivers one calibrated volume. It is filled with a pipette filler (never by mouth), and the bottom of the meniscus is set on the single mark. A small drop stays in the tip; it is not blown out.
- **Meniscus:** every liquid level is drawn so that the *bottom* of the meniscus sits exactly at the stated reading. The magnifier shows the eye level with a dashed line.
- **Precision:** the tolerances are typical values, and a note on screen says so. A measuring cylinder is about 10× less precise than a burette or volumetric pipette.

## Narration

`narration.py` holds the spoken script. It generates each line with Kokoro TTS (calm, warm female voice `af_heart`, speed 0.97) into `vo/`, together with `vo/plan.json`. `render.py` reads that plan:
- Each scene is stretched to fit its lines.
- The animation is time-warped so its second key moment lands when the second line starts.
- Each key-point card appears exactly when its line is spoken.

To change the voice, edit `SCRIPT` or run, for example, `python3 narration.py --voice af_bella --force`, then re-render. The Kokoro model files (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) come from the kokoro-onnx GitHub release `model-files-v1.0`. Set `KOKORO_DIR` to their folder.

The times in the running-order table are the original base timings; the narrated version runs longer.

```bash
ffmpeg -i out/apparatus_selection.mp4 -i narration.wav -filter_complex "[0:a]volume=0.35[m];[m][1:a]amix=inputs=2:duration=first[a]" \
       -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k out/with_narration.mp4
```

## Rebuilding

Requirements: Python 3.10+, `skia-python`, `numpy`, `scipy`, `soundfile`, `kokoro-onnx`, `ffmpeg` with libx264, the Inter font family and DejaVu Sans Mono.

```bash
pip install skia-python numpy scipy soundfile kokoro-onnx
python3 narration.py                    # generate voice-over lines -> vo/
python3 render.py                       # full render (≈2–4 min on 2 cores)
python3 render.py --workers 8           # more parallel segments
python3 render.py --stills 12 45.5 80   # PNG stills for checking -> out/stills/
python3 render.py --remux-audio         # re-mix only the voice-over
python3 render.py --cover 4.5           # cover image -> out/reel_cover.png
```


## How it is built

- `render.py` is the whole project: a deterministic frame renderer (Skia), the scene timeline (`SCENES`), and the synthesised soundtrack (`make_audio`).
- **Look:** the background is flat. Apparatus is made of flat shapes with a soft lift shadow plus a contact shadow and a light edge; glass is translucent. The layout constants (`SAFE_L`, `CAP_TOP`, `BODY_TOP`, `CHIP_Y`…) implement the grid in STYLE.md. `body()` maps the apparatus drawings into the illustration area.
- **Motion:** elements pop in with a slide, slight rotation and overshoot (`pop`). Scenes lift and fade out. The key-point card at the top crossfades its text while its height eases.
- **Editing content:** captions are the `draw_caption(...)` lists inside each `sc_*` function. Wrap words in `*asterisks*` to highlight them. A number and its unit are kept on one line automatically. Readings such as `45.5`, `24.65` and `25.0` are set in the same functions. Palette colours are in `PAL`; text uses only `ink_ui`, `ink_ui2` and `white`.
- Frames are rendered in parallel segments, each piped straight into ffmpeg, then concatenated losslessly and muxed with the soundtrack.
