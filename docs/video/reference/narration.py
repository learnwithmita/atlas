#!/usr/bin/env python3
"""
Voice-over for the reel: calm, warm female teacher voice (Kokoro TTS, voice af_heart).

Writes one WAV per narration line into vo/ and a timing plan vo/plan.json that
render.py uses to stretch each scene to fit its narration and to sync the
key-point cards to the spoken lines.

    python3 narration.py                 # generate all lines (cached)
    python3 narration.py --voice af_bella --speed 0.95 --force

Model files (kokoro-v1.0.onnx, voices-v1.0.bin) from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
are looked for in $KOKORO_DIR (default ../tts).
"""
import argparse, json, os, hashlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VO_DIR = os.path.join(HERE, "vo")
KOKORO_DIR = os.environ.get("KOKORO_DIR", os.path.join(HERE, "..", "tts"))

# Spoken wording (numbers/units written out so they are read naturally).
# Line i of an apparatus scene is spoken while key-point card i is on screen.
SCRIPT = {
    "title": ["Choosing the right apparatus, for time, temperature, mass and volume."],
    "overview": ["Always ask: what am I measuring, and how precisely?"],
    "stopwatch": ["For time, use a stopwatch. Start and stop it at the exact moments.",
                  "It reads to zero point zero one seconds, but your reaction time limits precision."],
    "thermo": ["For temperature, use a thermometer. Wait for a steady reading.",
               "Read it at eye level, to the nearest zero point five. Here, twenty-eight point five degrees Celsius."],
    "balance": ["For mass, use an electronic balance. Put the empty container on, then press tare.",
                "Add the solid. Now it shows the solid's mass only: two point five zero grams."],
    "cylinder": ["A measuring cylinder is quick, but it only gives approximate volumes.",
                 "Read the bottom of the meniscus at eye level: forty-five point five."],
    "burette": ["A burette delivers variable volumes. Its scale reads zero at the top.",
                "Volume added is final minus initial: twenty-three point four five cubic centimetres."],
    "pipette": ["A volumetric pipette delivers one fixed volume. Use a filler, and fill until the meniscus sits on the mark.",
                "Let it drain, tip touching the flask. Don't blow out the last drop."],
    "table": ["Match the quantity first. For volume: fixed or variable, and how precise?"],
    "precision": ["A measuring cylinder is about ten times less precise than a burette or pipette."],
    "quiz": ["Try this. You need exactly twenty-five point zero cubic centimetres of sodium hydroxide for a titration. Which apparatus? Pause, and choose.",
             "It's D, the volumetric pipette. It delivers a fixed volume accurately."],
    "outro": ["Quantity. Apparatus. Precision. Choose wisely!"],
}

SR = 24000


def trim(x, thr=0.008, pad=0.06):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * SR)); b = min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=0.97)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    import soundfile as sf
    from kokoro_onnx import Kokoro
    os.makedirs(VO_DIR, exist_ok=True)
    k = Kokoro(os.path.join(KOKORO_DIR, "kokoro-v1.0.onnx"), os.path.join(KOKORO_DIR, "voices-v1.0.bin"))
    plan = {"voice": a.voice, "speed": a.speed, "sr": SR, "scenes": {}}
    for scene, lines in SCRIPT.items():
        plan["scenes"][scene] = []
        for i, text in enumerate(lines):
            key = hashlib.md5(f"{a.voice}|{a.speed}|{text}".encode()).hexdigest()[:8]
            path = os.path.join(VO_DIR, f"{scene}_{i}_{key}.wav")
            if a.force or not os.path.exists(path):
                audio, sr = k.create(text, voice=a.voice, speed=a.speed, lang="en-us")
                assert sr == SR
                audio = trim(np.asarray(audio, dtype=np.float32))
                sf.write(path, audio, SR)
            dur = sf.info(path).duration
            plan["scenes"][scene].append({"file": os.path.basename(path), "dur": round(dur, 3), "text": text})
            print(f"{scene:10s} line {i}: {dur:5.2f}s")
    with open(os.path.join(VO_DIR, "plan.json"), "w") as f:
        json.dump(plan, f, indent=1)
    print("total speech:", round(sum(l["dur"] for s in plan["scenes"].values() for l in s), 1), "s")


if __name__ == "__main__":
    main()
