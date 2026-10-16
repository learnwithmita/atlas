#!/usr/bin/env python3
"""
Atlas pilot — Biology 6c: "explain how the structure of an alveolus is suited
for its function of gaseous exchange."

A silent, ~50 s, 1920x1080 (16:9) 30 fps explainer. One continuous scene whose
key-point card cycles through the four alveolar adaptations while the matching
part of the diagram highlights. Rendered frame-by-frame with Skia and encoded to
H.264 / yuv420p MP4 (no audio track).

Visual style follows docs/video/reference/STYLE.md, restyled for Atlas:
indigo accent instead of teal, bg #F6F6F4. The drawing/motion helpers are copied
from docs/video/reference/render.py and re-laid-out natively for 16:9 landscape.

Usage:
    python3 alveolus_pilot.py                 # full render -> out/alveolus_pilot.mp4
    python3 alveolus_pilot.py --stills 5 25 50  # PNG stills -> out/stills/
    python3 alveolus_pilot.py --workers 8
"""
import argparse, math, os, subprocess, sys, re
import numpy as np
import skia

W, H, FPS = 1920, 1080, 30
HERE = os.path.dirname(os.path.abspath(__file__))
# repo root is two levels up from tools/video/
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "out")

# --------------------------------------------------------------------------
# Palette — Atlas restyle (indigo accent, warm off-white bg)
# --------------------------------------------------------------------------
PAL = dict(
    bg="#F6F6F4", card="#FFFFFF", ink="#1D2430", ink2="#5E6673", white="#FFFFFF",
    accent="#5B5BD6", accent_d="#4B4BC4", accent_soft="#EEEEFB",
    hl="#FFD84D", hl_soft="#FFF1B8", shadow="#2A2A33",
    # anatomical illustration palette (objects only, never text)
    rose="#E59AA6", rose_d="#C76E7C", rose_pale="#FBEDF0", air="#FDF5F7",
    cap="#F7E2E5", cap_d="#E3B9BE",
    rbc="#D6434F", rbc_d="#B23340", rbc_hi="#EA7079",
    deox="#6E86B5", deox_d="#4F6690",
    moist="#CFE3EC", moist_d="#8FB3C6",
)


def col(h, a=1.0):
    h = PAL.get(h, h).lstrip("#")
    return skia.ColorSetARGB(int(round(255 * max(0, min(1, a)))),
                             int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


# --------------------------------------------------------------------------
# Fonts
# --------------------------------------------------------------------------
FONT_DIR = os.environ.get("FONT_DIR", os.path.join(ROOT, "assets", "fonts"))


def _tf(name):
    p = os.path.join(FONT_DIR, name)
    t = skia.Typeface.MakeFromFile(p) if os.path.exists(p) else None
    return t or skia.Typeface("Helvetica")


TF = {
    "reg": _tf("Inter-Regular.otf"), "med": _tf("Inter-Medium.otf"),
    "semi": _tf("Inter-SemiBold.otf"), "bold": _tf("Inter-Bold.otf"),
    "disp": _tf("InterDisplay-Bold.otf"), "dispx": _tf("InterDisplay-ExtraBold.otf"),
}
_fonts = {}


def F(kind, size):
    k = (kind, round(size, 2))
    if k not in _fonts:
        f = skia.Font(TF[kind], size)
        f.setEdging(skia.Font.Edging.kAntiAlias)
        f.setSubpixel(True)
        f.setHinting(skia.FontHinting.kNone)
        _fonts[k] = f
    return _fonts[k]


def tw(s, kind, size, spacing=0):
    return F(kind, size).measureText(s) + spacing * max(0, len(s) - 1)


def txt(c, s, x, y, kind="semi", size=36, color="ink", a=1.0, align="l", spacing=0):
    w = tw(s, kind, size, spacing)
    if align == "c":
        x -= w / 2
    elif align == "r":
        x -= w
    p = skia.Paint(AntiAlias=True, Color=col(color, a))
    f = F(kind, size)
    if spacing:
        for ch in s:
            c.drawString(ch, x, y, f, p)
            x += f.measureText(ch) + spacing
    else:
        c.drawString(s, x, y, f, p)
    return w


def fit_size(s, kind, size, maxw):
    while size > 12 and tw(s, kind, size) > maxw:
        size -= 1
    return size


# ---- rich text: *word* = emphasised (bold + yellow highlighter stripe) ----
UNIT_GLUE = re.compile(r"(\d) (cm³|°C|g|s)(?![\w])")


def parse_rich(s):
    s = UNIT_GLUE.sub(lambda m: m.group(1) + " " + m.group(2), s)
    words, cur, buf, bold = [], [], "", False
    for ch in s:
        if ch == "*":
            if buf:
                cur.append((buf, bold)); buf = ""
            bold = not bold
        elif ch == " ":
            if buf:
                cur.append((buf, bold)); buf = ""
            if cur:
                words.append(cur); cur = []
        else:
            buf += ch
    if buf:
        cur.append((buf, bold))
    if cur:
        words.append(cur)
    return words


def rich_layout(s, size, maxw, base="med", em="bold"):
    words = parse_rich(s)
    sp = tw(" ", base, size)
    lines, line, lw = [], [], 0
    for wd in words:
        ww = sum(tw(t, em if b else base, size) for t, b in wd)
        if line and lw + sp + ww > maxw:
            lines.append((line, lw)); line, lw = [], 0
        lw = lw + (sp if line else 0) + ww
        line.append(wd)
    if line:
        lines.append((line, lw))
    return lines


def rich_draw(c, lines, x, y, size, lh, color="ink", a=1.0,
              base="med", em="bold", align="l", hl="hl"):
    sp = tw(" ", base, size)
    for i, (line, lw) in enumerate(lines):
        xx = x - lw / 2 if align == "c" else x
        yy = y + i * lh
        prev_bold = False
        for j, wd in enumerate(line):
            if j:
                if prev_bold and wd[0][1] and hl:
                    fill(c, rr(xx - 2, yy - size * 0.80, sp + 4, size * 1.02, 0), hl, a)
                xx += sp
            for t, b in wd:
                w = tw(t, em if b else base, size)
                if b and hl:
                    fill(c, rr(xx - 6, yy - size * 0.80, w + 12, size * 1.02, size * 0.18), hl, a)
                txt(c, t, xx, yy, em if b else base, size, color, a)
                xx += w
            prev_bold = wd[-1][1]


# --------------------------------------------------------------------------
# Easing / timing
# --------------------------------------------------------------------------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lin(t, a, b):
    return clamp((t - a) / (b - a)) if b > a else float(t >= a)


def eo(x):
    return 1 - (1 - x) ** 3


def eio(x):
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def back(x, s=1.4):
    x -= 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def lerp(a, b, k):
    return a + (b - a) * k


# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
def rr(x, y, w, h, r):
    p = skia.Path()
    p.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x, y, w, h), r, r))
    return p


def circ(cx, cy, r):
    p = skia.Path(); p.addCircle(cx, cy, r); return p


def oval(cx, cy, rx, ry):
    p = skia.Path(); p.addOval(skia.Rect.MakeLTRB(cx - rx, cy - ry, cx + rx, cy + ry)); return p


def poly(pts, close=True):
    p = skia.Path(); p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if close:
        p.close()
    return p


def arc_pts(cx, cy, r, a0, a1, n=72):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n),
             cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def arc_path(cx, cy, r, a0, a1, n=72):
    return poly(arc_pts(cx, cy, r, a0, a1, n), close=False)


# --------------------------------------------------------------------------
# Drawing primitives (flat fills, soft lift shadows, crisp light edge)
# --------------------------------------------------------------------------
_blur = {}


def blur(s):
    s = round(s, 1)
    if s not in _blur:
        _blur[s] = skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, s)
    return _blur[s]


def drop_shadow(c, path, d=1.0, a=1.0):
    if d <= 0:
        return
    c.save(); c.translate(1.5 * d, 5 * d)
    c.drawPath(path, skia.Paint(AntiAlias=True, Color=col("shadow", 0.19 * a), MaskFilter=blur(3 + 4.5 * d)))
    c.restore()
    c.save(); c.translate(0.4 * d, 1.4 * d)
    c.drawPath(path, skia.Paint(AntiAlias=True, Color=col("shadow", 0.16 * a), MaskFilter=blur(1.1)))
    c.restore()


def fill(c, path, color, a=1.0):
    c.drawPath(path, skia.Paint(AntiAlias=True, Color=col(color, a)))


def stroke(c, path, color, w=3, a=1.0, cap=True, dash=None):
    p = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=w, Color=col(color, a))
    if cap:
        p.setStrokeCap(skia.Paint.kRound_Cap); p.setStrokeJoin(skia.Paint.kRound_Join)
    if dash:
        p.setPathEffect(skia.DashPathEffect.Make(dash, 0))
    c.drawPath(path, p)


def line(c, x0, y0, x1, y1, color="ink", w=3, a=1.0, dash=None):
    p = skia.Path(); p.moveTo(x0, y0); p.lineTo(x1, y1)
    stroke(c, p, color, w, a, dash=dash)


def cut(c, path, color, d=1.0, a=1.0, edge=True):
    """Flat shape with a soft lift shadow and a crisp light edge."""
    drop_shadow(c, path, d, a)
    fill(c, path, color, a)
    if edge:
        c.drawPath(path, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style,
                                    StrokeWidth=1.4, Color=col("white", 0.30 * a)))


class pop:
    """'Pop-in' entrance: slide up, settle with slight overshoot, fade."""

    def __init__(self, c, t, t0, cx, cy, dur=0.6, dy=50, sc=0.9, rot=0.0, fade=True):
        self.c, self.k = c, clamp((t - t0) / dur)
        self.cx, self.cy, self.dy, self.sc, self.rot, self.fade = cx, cy, dy, sc, rot, fade
        self.layer = False

    def __enter__(self):
        c, k = self.c, self.k
        c.save()
        if k < 1:
            e = back(k)
            c.translate(0, self.dy * (1 - eo(k)))
            c.translate(self.cx, self.cy)
            c.rotate(self.rot * (1 - eo(k)))
            s = self.sc + (1 - self.sc) * e
            c.scale(s, s)
            c.translate(-self.cx, -self.cy)
            if self.fade:
                c.saveLayerAlpha(None, int(255 * eo(min(1, k * 1.7))))
                self.layer = True
        return k > 0

    def __exit__(self, *a):
        if self.layer:
            self.c.restore()
        self.c.restore()


class alpha_layer:
    def __init__(self, c, a):
        self.c, self.a = c, clamp(a)

    def __enter__(self):
        self.c.save()
        if self.a < 0.999:
            self.c.saveLayerAlpha(None, int(255 * self.a))
            self.l = True
        else:
            self.l = False
        return self.a > 0.001

    def __exit__(self, *a):
        if self.l:
            self.c.restore()
        self.c.restore()


def check_mark(c, cx, cy, s, color="white", w=None):
    p = skia.Path(); p.moveTo(cx - 0.5 * s, cy); p.lineTo(cx - 0.12 * s, cy + 0.36 * s); p.lineTo(cx + 0.55 * s, cy - 0.38 * s)
    stroke(c, p, color, w or s * 0.18)


def arrow(c, x0, y0, x1, y1, color="accent", w=5, a=1.0, head=16):
    line(c, x0, y0, x1, y1, color, w, a)
    ang = math.atan2(y1 - y0, x1 - x0)
    for d in (+1, -1):
        ax = x1 - head * math.cos(ang + d * 0.5)
        ay = y1 - head * math.sin(ang + d * 0.5)
        line(c, x1, y1, ax, ay, color, w, a)


# --------------------------------------------------------------------------
# Layout — native 1920x1080 landscape. Nothing important in outer ~60 px.
# --------------------------------------------------------------------------
MARGIN = 60
LX = 80                       # left column x
LCOL_R = 760                  # left column right edge
TAG_Y = 84                    # tag pill top
TITLE_Y = 214                 # title baseline (clear air below the tag)
CAP_TOP = 320                 # key-point card top (clear gap below title)
CHIP_Y, CHIP_H = 936, 112     # fact chips (bottom of left column)

# illustration region (right ~2/3); shifted down + right so the header never
# crowds the diagram or its labels.
ILL_L, ILL_R = 820, 1840
CX, CY, R = 1400, 600, 250    # main alveolus centre + outer radius
WALLT = 24                    # alveolus wall thickness
RB = R + 70                   # capillary band centre radius


def draw_background(c):
    c.clear(col("bg"))


def heading(c, t):
    tag = "GASEOUS EXCHANGE"
    with pop(c, t, 0.05, LX + 160, TAG_Y + 26, dy=30) as v:
        if v:
            w = tw(tag, "bold", 24, 2.5)
            cut(c, rr(LX, TAG_Y, w + 44, 52, 26), "accent", 0.6)
            txt(c, tag, LX + 22, TAG_Y + 35, "bold", 24, "white", spacing=2.5)
    with pop(c, t, 0.18, LX, TITLE_Y - 34, dy=40) as v:
        if v:
            txt(c, "The Alveolus", LX - 2, TITLE_Y, "disp",
                fit_size("The Alveolus", "disp", 92, LCOL_R - LX), "ink")


def card(c, x, y, w, h, r=26, color="card", d=0.9):
    drop_shadow(c, rr(x, y, w, h, r), d, 0.7)
    fill(c, rr(x, y, w, h, r), color)


# --- key-point card (left column) ----------------------------------------
CAP_SIZE, CAP_LH = 40, 54
CAP_X = LX + 12 + 30
CAP_W = LCOL_R - CAP_X - 30


def caption_height(lines):
    return len(lines) * CAP_LH + 52


def draw_caption(c, t, caps):
    if not caps or t < caps[0][0]:
        return
    i = max(j for j, (t0, _) in enumerate(caps) if t0 <= t)
    cur = rich_layout(caps[i][1], CAP_SIZE, CAP_W)
    if len(cur) > 3:
        print("WARNING: key point wraps to", len(cur), "lines:", caps[i][1], file=sys.stderr)
    k, prev = 1.0, None
    if i > 0:
        k = lin(t, caps[i][0], caps[i][0] + 0.45)
        prev = rich_layout(caps[i - 1][1], CAP_SIZE, CAP_W)
    h = caption_height(cur) if prev is None else lerp(caption_height(prev), caption_height(cur), eio(k))
    enter = eo(lin(t, caps[0][0], caps[0][0] + 0.5))
    with alpha_layer(c, enter):
        c.save(); c.translate(0, -24 * (1 - enter))
        card(c, LX, CAP_TOP, LCOL_R - LX, h, 26, d=1.1)
        c.save(); c.clipPath(rr(LX, CAP_TOP, LCOL_R - LX, h, 26), doAntiAlias=True)
        fill(c, rr(LX, CAP_TOP, 12, h, 0), "accent")
        ty = CAP_TOP + 26 + CAP_SIZE * 0.93
        if prev is not None and k < 1:
            rich_draw(c, prev, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(1 - k * 2))
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(k * 2 - 1))
        else:
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH)
        c.restore()
        c.restore()


# --- fact chips (left column bottom) --------------------------------------
CHIPS = [("SURFACE AREA", "Large"), ("WALL", "1 cell"), ("GRADIENT", "Steep")]


def chips(c, t, t0, active=-1):
    gap = 16
    w = (LCOL_R - LX - 2 * gap) / 3
    x = LX
    for i, (lab, val) in enumerate(CHIPS):
        with pop(c, t, t0 + 0.1 * i, x + w / 2, CHIP_Y + CHIP_H / 2, dy=40) as v:
            if v:
                on = (i == active)
                card(c, x, CHIP_Y, w, CHIP_H, 22, color=("accent_soft" if on else "card"))
                fill(c, circ(x + 24, CHIP_Y + 32, 6), "accent")
                if on:
                    stroke(c, rr(x, CHIP_Y, w, CHIP_H, 22), "accent", 2.4)
                txt(c, lab, x + 38, CHIP_Y + 40, "bold", 19, "ink2", spacing=1.6)
                txt(c, val, x + 20, CHIP_Y + 92, "bold", fit_size(val, "bold", 42, w - 36), "ink")
        x += w + gap


# ==========================================================================
# Illustration — one alveolus wrapped by a capillary
# ==========================================================================
def P(ang, r):
    return (CX + r * math.cos(ang), CY + r * math.sin(ang))


# capillary wraps the right + bottom of the alveolus
CAP_A0, CAP_A1 = math.radians(-78), math.radians(165)


def rbc(c, x, y, ang, s=1.0, color="rbc", a=1.0):
    """biconcave red blood cell, tangent to its angle."""
    c.save(); c.translate(x, y); c.rotate(math.degrees(ang) + 90)
    drop_shadow(c, oval(0, 0, 30 * s, 20 * s), 0.4, 0.5 * a)
    fill(c, oval(0, 0, 30 * s, 20 * s), color, a)
    fill(c, oval(0, 0, 14 * s, 11 * s), ("deox_d" if color == "deox" else "rbc_d"), 0.55 * a)
    fill(c, oval(-9 * s, -7 * s, 7 * s, 4 * s), ("white"), 0.22 * a)
    c.restore()


def draw_capillary(c, gt, build, dense):
    """capillary band hugging the alveolus, with flowing blood cells."""
    with alpha_layer(c, build):
        # vessel band: wide stroked arc, pale capillary wall
        band = arc_path(CX, CY, RB, CAP_A0, CAP_A1)
        # shadow + wall
        c.save(); c.translate(1.2, 4)
        stroke(c, band, "shadow", 78, 0.16, )
        c.restore()
        stroke(c, band, "cap_d", 78)
        stroke(c, band, "cap", 68)
        # plasma lumen
        stroke(c, band, "moist", 46, 0.5)
        stroke(c, band, "cap", 40)
        # flowing red blood cells, clipped to the band so they stay in the vessel
        c.save()
        clip = skia.Path()
        for pp in (arc_pts(CX, CY, RB + 33, CAP_A0, CAP_A1)
                   + arc_pts(CX, CY, RB - 33, CAP_A1, CAP_A0)):
            if clip.isEmpty():
                clip.moveTo(*pp)
            else:
                clip.lineTo(*pp)
        clip.close()
        c.clipPath(clip, doAntiAlias=True)
        n = 11
        flow = (gt * (0.16 if not dense else 0.26))
        for i in range(n):
            u = ((i / n) + flow) % 1.0
            ang = CAP_A0 + (CAP_A1 - CAP_A0) * u
            x, y = P(ang, RB)
            # bottom half = deoxygenated (blue) entering; top-right = oxygenated (red) leaving
            frac = u  # 0 near top-right (exit), 1 near lower-left (entry)
            color = "deox" if frac > 0.5 else "rbc"
            rbc(c, x, y, ang, 1.0, color)
        c.restore()


def o2_co2(c, gt, intensity=1.0):
    """O2 diffusing in (alveolus -> blood), CO2 diffusing out (blood -> alveolus)."""
    # two exchange sites on the right rim (clear of labels)
    sites = [math.radians(8), math.radians(40)]
    for si, ang in enumerate(sites):
        wx, wy = P(ang, R - WALLT * 0.5)       # mid-wall point
        inx, iny = P(ang, R - WALLT - 70)      # inside the air sac
        outx, outy = P(ang, RB)                # in the capillary lumen
        # O2 arrow: sac -> blood
        arrow(c, inx, iny, outx, outy, "accent", 5, 0.9 * intensity, head=15)
        # animated O2 dots travelling outward
        for d in range(3):
            u = ((gt * 0.5) + d / 3 + si * 0.2) % 1.0
            px, py = lerp(inx, outx, u), lerp(iny, outy, u)
            fill(c, circ(px, py, 7), "accent_soft")
            stroke(c, circ(px, py, 7), "accent", 2, intensity)
        txt(c, "O₂", inx - 4, iny - 16, "bold", 30, "ink", intensity, align="c")

    # CO2 return site (slightly lower)
    ang = math.radians(74)
    inx, iny = P(ang, R - WALLT - 46)
    outx, outy = P(ang, RB)
    arrow(c, outx, outy, inx, iny, "ink", 5, 0.85 * intensity, head=15)
    for d in range(3):
        u = ((gt * 0.5) + d / 3) % 1.0
        px, py = lerp(outx, inx, u), lerp(outy, iny, u)
        fill(c, circ(px, py, 7), "card")
        stroke(c, circ(px, py, 7), "ink2", 2, intensity)
    txt(c, "CO₂", outx + 40, outy + 10, "bold", 30, "ink", intensity, align="c")


def leader(c, tx, ty, px, py, a=1.0):
    line(c, tx, ty, px, py, "accent", 2.4, a, dash=[7.0, 6.0])
    fill(c, circ(px, py, 5), "accent", a)


def label(c, s, lx, ly, px, py, align="l", a=1.0, size=27):
    leader(c, lx, ly, px, py, a)
    txt(c, s, lx, ly + 2, "semi", size, "ink", a, align=align)


def draw_alveolus(c, gt, phase, loc):
    """phase: 0 title-build, 1..4 adaptations, 5 recap. loc = progress within phase."""
    build = eo(lin(gt, 0.25, 2.4))
    cx, cy = CX, CY
    # --- satellite alveoli (convey "millions of alveoli") -------------------
    # present during title build + phase 1, fade for the focused phases
    p2s = TIMING["p_starts"][1]
    sat_a = build * (1.0 if phase <= 1 else clamp(1 - lin(gt, p2s, p2s + 1.2)))
    if sat_a > 0.01:
        with alpha_layer(c, sat_a * 0.9):
            sats = [(-150, -205, 86), (120, -210, 74), (205, -120, 70),
                    (-225, -70, 72), (-205, 120, 66), (150, 205, 64), (-120, 205, 60)]
            for i, (dx, dy, rr_) in enumerate(sats):
                sx, sy = cx + dx, cy + dy
                cut(c, circ(sx, sy, rr_), "rose", 0.7)
                fill(c, circ(sx, sy, rr_ - 9), "air")
                fill(c, circ(sx, sy, rr_ - 9), "rose_pale", 0.5)

    # --- capillary (behind the alveolus rim) --------------------------------
    draw_capillary(c, gt, build, dense=(phase == 4))

    # --- main alveolus: wall ring + moist lining + air space ----------------
    with alpha_layer(c, build):
        cut(c, circ(cx, cy, R), "rose_d", 1.2)            # outer wall edge
        fill(c, circ(cx, cy, R), "rose")                  # wall
        fill(c, circ(cx, cy, R - WALLT), "air")           # air space base
        fill(c, circ(cx, cy, R - WALLT), "rose_pale", 0.45)
        # moist lining: a thin inner film (always faint; glistens in phase 3)
        moist_a = 0.5 + 0.5 * (phase == 3) * (0.5 + 0.5 * math.sin(gt * 3))
        stroke(c, circ(cx, cy, R - WALLT - 7), "moist", 10, clamp(moist_a))
        stroke(c, circ(cx, cy, R - WALLT - 7), "moist_d", 2, 0.5 * clamp(moist_a))
        # soft highlight sheen on the air sac
        fill(c, oval(cx - 70, cy - 80, 120, 90), "white", 0.18)

    # --- gas exchange arrows (always on; brightest in phase 4) --------------
    with alpha_layer(c, build):
        o2_co2(c, gt, intensity=(1.0 if phase >= 1 else 0.0) * (0.6 if phase != 4 else 1.0))

    # --- labels -------------------------------------------------------------
    lab_a = build * eo(lin(gt, 2.2, 3.0))
    with alpha_layer(c, lab_a):
        # alveolus wall (one cell thick) -> exposed main wall at the top
        wtw = txt(c, "alveolus wall", 900, 168, "semi", 27, "ink", lab_a)
        txt(c, "(one cell thick)", 900, 200, "med", 23, "ink2", lab_a)
        leader(c, 900 + wtw + 16, 180, *P(math.radians(-95), R), lab_a)
        # moist lining -> inner ring (left)
        mx, my = P(math.radians(188), R - WALLT - 7)
        label(c, "moist lining", 1030, 490, mx, my, align="r")
        # capillary -> band (bottom)
        bx, by = P(math.radians(120), RB)
        label(c, "capillary", 1060, 1000, bx, by)
        # red blood cell -> a cell on the lower-right band
        rx, ry = P(math.radians(35), RB)
        label(c, "red blood cell", 1560, 1000, rx, ry)

    # --- phase-specific emphasis -------------------------------------------
    if phase == 1:     # large surface area
        emph_surface(c, gt, loc, build)
    elif phase == 2:   # wall one cell thick -> short diffusion distance
        emph_wall(c, gt, loc)
    elif phase == 3:   # moist lining
        emph_moist(c, gt, loc)
    elif phase == 4:   # dense capillary network -> steep gradient
        emph_dense(c, gt, loc)


def emph_surface(c, gt, loc, build):
    a = eo(lin(loc, 0.0, 0.6)) * clamp(1 - lin(loc, 0.86, 1.0))
    if a <= 0.01:
        return
    pr = 0.5 + 0.5 * math.sin(gt * 2.2)
    with alpha_layer(c, a):
        stroke(c, circ(CX, CY, R + 128 + 6 * pr), "accent", 4, 0.8, dash=[14.0, 12.0])
        # small ring badge "× millions"
        bx, by = CX + 250, CY - 250
        cut(c, rr(bx - 92, by - 30, 184, 60, 30), "accent", 0.7)
        txt(c, "× millions", bx, by + 11, "bold", 28, "white", align="c")


def emph_wall(c, gt, loc):
    a = eo(lin(loc, 0.0, 0.55)) * clamp(1 - lin(loc, 0.88, 1.0))
    if a <= 0.01:
        return
    # magnifier inset: cross-section of the two thin walls + short distance arrow
    zx, zy, zr = 1000, 800, 110
    wx, wy = P(math.radians(150), R)
    with alpha_layer(c, a):
        line(c, zx + zr * 0.7, zy - zr * 0.7, wx, wy, "accent", 2.2, 0.8, dash=[7.0, 6.0])
        cut(c, circ(zx, zy, zr + 10), "accent", 1.2)
        c.save(); c.clipPath(circ(zx, zy, zr), doAntiAlias=True)
        fill(c, circ(zx, zy, zr), "air")
        # layered cross-section (left = air sac, right = blood)
        fill(c, rr(zx - zr, zy - zr, zr * 2, zr * 2, 0), "rose_pale", 0.5)
        fill(c, rr(zx + 6, zy - zr, zr * 2, zr * 2, 0), "cap", 0.9)             # plasma
        fill(c, rr(zx - 10, zy - zr, 16, zr * 2, 0), "rose")                    # alveolus wall
        fill(c, rr(zx + 6, zy - zr, 12, zr * 2, 0), "cap_d")                    # capillary wall
        stroke(c, rr(zx - 10, zy - zr, 16, zr * 2, 0), "rose_d", 1.4)
        rbc(c, zx + 70, zy + 8, math.radians(90), 1.15, "rbc")
        # a couple of O2 dots crossing
        for d in range(2):
            u = ((gt * 0.6) + d / 2) % 1.0
            px = lerp(zx - 60, zx + 60, u)
            fill(c, circ(px, zy - 46, 7), "accent_soft")
            stroke(c, circ(px, zy - 46, 7), "accent", 2)
        # short-distance double arrow across the two walls
        arrow(c, zx - 30, zy + 60, zx + 30, zy + 60, "ink", 4, 1, head=11)
        arrow(c, zx + 30, zy + 60, zx - 30, zy + 60, "ink", 4, 1, head=11)
        c.restore()
        txt(c, "short diffusion distance", zx, zy + zr + 36, "semi", 24, "ink", align="c")


def emph_moist(c, gt, loc):
    a = eo(lin(loc, 0.0, 0.55)) * clamp(1 - lin(loc, 0.88, 1.0))
    if a <= 0.01:
        return
    with alpha_layer(c, a):
        # glistening droplets around the inner lining + "gases dissolve" note
        for i, ang in enumerate([-150, -95, 150, 120, 200, 95]):
            dx, dy = P(math.radians(ang), R - WALLT - 20)
            ph = 0.5 + 0.5 * math.sin(gt * 3 + i)
            fill(c, circ(dx, dy, 7 + 3 * ph), "moist", 0.9)
            fill(c, circ(dx - 2, dy - 2, 3), "white", 0.8)
        bx, by = CX, CY + 20
        cut(c, rr(bx - 150, by - 32, 300, 60, 30), "card", 0.8)
        txt(c, "gases dissolve first", bx, by + 10, "semi", 26, "ink", align="c")


def emph_dense(c, gt, loc):
    a = eo(lin(loc, 0.0, 0.55)) * clamp(1 - lin(loc, 0.9, 1.0))
    if a <= 0.01:
        return
    with alpha_layer(c, a):
        # extra capillary bands -> dense network
        for rr_ in (RB + 48, RB + 96):
            band = arc_path(CX, CY, rr_, math.radians(-40), math.radians(150))
            stroke(c, band, "cap_d", 30, 0.9)
            stroke(c, band, "cap", 22, 0.9)
            n = 7
            flow = gt * 0.26
            clip = skia.Path()
            for pp in (arc_pts(CX, CY, rr_ + 14, math.radians(-40), math.radians(150))
                       + arc_pts(CX, CY, rr_ - 14, math.radians(150), math.radians(-40))):
                (clip.moveTo if clip.isEmpty() else clip.lineTo)(*pp)
            clip.close()
            c.save(); c.clipPath(clip, doAntiAlias=True)
            for i in range(n):
                u = ((i / n) + flow) % 1.0
                ang = math.radians(-40) + (math.radians(150) - math.radians(-40)) * u
                x, y = P(ang, rr_)
                rbc(c, x, y, ang, 0.7, "rbc" if u < 0.5 else "deox")
            c.restore()
        # steep gradient badge
        bx, by = CX + 250, CY - 250
        cut(c, rr(bx - 120, by - 30, 240, 60, 30), "accent", 0.7)
        txt(c, "steep gradient", bx, by + 11, "bold", 28, "white", align="c")


# ==========================================================================
# Recap card (final 3 s): the four adaptations as ticks
# ==========================================================================
RECAP = [
    "Large surface area",
    "Thin wall — short diffusion distance",
    "Moist lining",
    "Dense capillary network — steep gradient",
]


def draw_recap(c, gt, t0):
    rx, ry, rw = ILL_L + 40, 250, ILL_R - (ILL_L + 40) - 20
    rh = 560
    enter = eo(lin(gt, t0, t0 + 0.5))
    with alpha_layer(c, enter):
        c.save(); c.translate(0, -24 * (1 - enter))
        card(c, rx, ry, rw, rh, 30, d=1.2)
        fill(c, rr(rx, ry, 12, rh, 0), "accent")
        txt(c, "Four adaptations for gaseous exchange", rx + 56, ry + 78, "disp",
            fit_size("Four adaptations for gaseous exchange", "disp", 44, rw - 100), "ink")
        for i, s in enumerate(RECAP):
            ia = eo(lin(gt, t0 + 0.4 + i * 0.28, t0 + 0.9 + i * 0.28))
            yy = ry + 168 + i * 92
            with alpha_layer(c, ia):
                c.save(); c.translate(0, 16 * (1 - ia))
                cut(c, circ(rx + 86, yy, 30), "accent", 0.7)
                check_mark(c, rx + 86, yy + 2, 40, "white")
                txt(c, s, rx + 140, yy + 15, "semi",
                    fit_size(s, "semi", 36, rw - 210), "ink")
                c.restore()
        c.restore()


# ==========================================================================
# Narration script (Kokoro TTS, voice af_heart) + data-driven timeline
# ==========================================================================
# One spoken line per segment. The matching key-point card / diagram highlight
# is on screen while its line is spoken; scene lengths stretch to the audio.
SEG_TEXT = [
    "Here's how one alveolus is built for gaseous exchange.",
    "Millions of alveoli give a huge surface area, so a lot of gas diffuses at once.",
    "Their walls are just one cell thick, a short distance for gases to cross.",
    "A moist lining lets oxygen and carbon dioxide dissolve before they diffuse.",
    "And a dense network of capillaries keeps a steep concentration gradient, "
    "as oxygen moves into the blood and carbon dioxide moves out.",
    "Large surface area, thin walls, a moist lining, and a rich blood supply. "
    "That's what makes it so efficient.",
]

# On-screen key-point cards for the four adaptations (emphasis = yellow only).
CAP_TEXT = [
    "*Large surface area* — millions of alveoli, so more gas diffuses at once.",
    "Wall is *one cell thick* (alveolus + capillary) — a *short diffusion distance*.",
    "*Moist lining* lets gases dissolve before diffusing across.",
    "*Dense capillary network* keeps a *steep concentration gradient*.",
]

GAP = 0.5     # lead: the card / diagram appears, then the voice line begins
TAIL = 0.7    # quiet beat after each spoken line
SR = 24000    # Kokoro native sample rate
CHIP_FOR_PHASE = {1: 0, 2: 1, 4: 2}

TIMING = {}   # populated by set_timing() (and copied into render workers)


def set_timing(durs):
    """durs: spoken-clip length (s) per segment -> all scene start/stop times."""
    seg = [GAP + d + TAIL for d in durs]
    seg[0] = max(seg[0], 3.2)                  # give the title build room
    starts = [0.0]
    for s in seg[:-1]:
        starts.append(starts[-1] + s)
    TIMING.clear()
    TIMING.update(
        seg=seg, starts=starts,
        p_starts=starts[1:5], recap_t=starts[5],
        duration=starts[5] + seg[5],
        onsets=[starts[i] + GAP for i in range(6)],
        caps=[(starts[1 + i], CAP_TEXT[i]) for i in range(4)],
    )
    TIMING["nframes"] = int(round(TIMING["duration"] * FPS))
    return TIMING


def phase_of(gt):
    ps, rt = TIMING["p_starts"], TIMING["recap_t"]
    if gt >= rt:
        return 5, 0.0
    if gt < ps[0]:
        return 0, lin(gt, 0, ps[0])
    for i in range(len(ps) - 1, -1, -1):
        if gt >= ps[i]:
            end = ps[i + 1] if i + 1 < len(ps) else rt
            return i + 1, lin(gt, ps[i], end)
    return 0, 0.0


def render_frame(c, gt):
    draw_background(c)
    heading(c, gt)
    phase, loc = phase_of(gt)
    rt = TIMING["recap_t"]

    if phase == 5:
        # recap: fade the live diagram, show recap card; keep chips
        fade = clamp(1 - lin(gt, rt, rt + 0.4))
        if fade > 0.01:
            with alpha_layer(c, fade):
                draw_alveolus(c, min(gt, rt - 0.01), 4, 0.99)
        draw_recap(c, gt, rt)
        chips(c, gt, 1.0, active=-1)
        return

    draw_alveolus(c, gt, phase, loc)
    draw_caption(c, gt, TIMING["caps"])
    chips(c, gt, 1.0, active=CHIP_FOR_PHASE.get(phase, -1))


# ==========================================================================
# Narration synthesis (Kokoro af_heart) and soundtrack assembly
# ==========================================================================
def _model_dir():
    return os.environ.get("KOKORO_DIR") or os.path.join(ROOT, "assets", "kokoro")


def _trim(s, thresh=0.01):
    idx = np.where(np.abs(s) > thresh)[0]
    if len(idx) == 0:
        return s
    a = max(0, idx[0] - int(0.03 * SR))
    b = min(len(s), idx[-1] + int(0.12 * SR))
    return s[a:b]


def synth_clips():
    """Synthesize one voice clip per segment with Kokoro voice af_heart."""
    from kokoro_onnx import Kokoro
    md = _model_dir()
    onnx, voices = os.path.join(md, "kokoro-v1.0.onnx"), os.path.join(md, "voices-v1.0.bin")
    if not (os.path.exists(onnx) and os.path.exists(voices)):
        raise SystemExit(
            f"Kokoro model files not found in {md}. Download kokoro-v1.0.onnx and "
            f"voices-v1.0.bin from the kokoro-onnx 'model-files-v1.0' release and set "
            f"KOKORO_DIR, or place them in assets/kokoro/.")
    k = Kokoro(onnx, voices)
    clips = []
    for line in SEG_TEXT:
        s, sr = k.create(line, voice="af_heart", speed=0.96, lang="en-us")
        s = np.asarray(s, dtype=np.float32)
        if sr != SR:
            n = int(round(len(s) * SR / sr))
            s = np.interp(np.linspace(0, len(s), n, endpoint=False),
                          np.arange(len(s)), s).astype(np.float32)
        clips.append(_trim(s))
    return clips


def build_soundtrack(clips, wav_path):
    """Place each clip at its scheduled onset into one voice-only track."""
    import soundfile as sf
    total = int(TIMING["duration"] * SR)
    track = np.zeros(total + SR, dtype=np.float32)
    for i, s in enumerate(clips):
        a = int(TIMING["onsets"][i] * SR)
        track[a:a + len(s)] += s
    sf.write(wav_path, track[:total], SR)


# ==========================================================================
# Rendering drivers
# ==========================================================================
def render_segment(args):
    i0, i1, path, timing = args
    TIMING.clear(); TIMING.update(timing)          # spawn-safe: workers get timing
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-g", "60", "-bf", "2", "-aspect", "16:9", path]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(i0, i1):
        render_frame(c, i / FPS)
        pr.stdin.write(surf.makeImageSnapshot().toarray().tobytes())
        if (i - i0) % 150 == 0:
            print(f"  [{os.path.basename(path)}] frame {i}/{i1}", flush=True)
    pr.stdin.close(); pr.wait()
    return path


def render_still(t, path):
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    render_frame(c, t)
    surf.makeImageSnapshot().save(path, skia.kPNG)


def default_still_times():
    ps, rt = TIMING["p_starts"], TIMING["recap_t"]
    return [(ps[0] + ps[1]) / 2, (ps[1] + ps[2]) / 2, rt + 1.8]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", nargs="*", type=float)
    ap.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 2))
    ap.add_argument("--out", default=os.path.join(OUT, "alveolus_pilot.mp4"))
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    # Narration drives the timeline: synthesize first, then lay out to it.
    clips = synth_clips()
    durs = [len(s) / SR for s in clips]
    set_timing(durs)
    st = TIMING["starts"]
    print("Timeline (s):  title 0.0 | p1 %.1f | p2 %.1f | p3 %.1f | p4 %.1f | recap %.1f | end %.1f"
          % (st[1], st[2], st[3], st[4], st[5], TIMING["duration"]))

    if a.stills is not None:
        d = os.path.join(OUT, "stills"); os.makedirs(d, exist_ok=True)
        times = a.stills if a.stills else default_still_times()
        for t in times:
            p = os.path.join(d, f"alveolus_t{t:05.1f}.png"); render_still(t, p); print(p)
        return

    import multiprocessing as mp
    nframes, nw = TIMING["nframes"], max(1, a.workers)
    bounds = [round(nframes * k / nw) for k in range(nw + 1)]
    segs = [(bounds[k], bounds[k + 1], os.path.join(OUT, f"seg{k}.mp4"), dict(TIMING))
            for k in range(nw)]
    print(f"Rendering {nframes} frames ({TIMING['duration']:.1f} s) with {nw} workers…")
    with mp.Pool(nw) as pool:
        pool.map(render_segment, segs)

    lst = os.path.join(OUT, "segments.txt")
    with open(lst, "w") as f:
        for sg in segs:
            f.write(f"file '{sg[2]}'\n")
    silent = os.path.join(OUT, "silent.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-an", "-c:v", "copy", "-aspect", "16:9", "-movflags", "+faststart", silent], check=True)

    # voice track + mux as AAC, normalized to ~ -16 LUFS
    wav = os.path.join(OUT, "narration.wav")
    build_soundtrack(clips, wav)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav,
                    "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-aspect", "16:9",
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000",
                    "-c:a", "aac", "-b:a", "160k", "-shortest",
                    "-movflags", "+faststart", a.out], check=True)
    for sg in segs:
        os.remove(sg[2])
    os.remove(lst); os.remove(silent); os.remove(wav)
    print("Wrote", a.out)


if __name__ == "__main__":
    main()
