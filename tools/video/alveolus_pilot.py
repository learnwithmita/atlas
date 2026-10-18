#!/usr/bin/env python3
"""
Atlas — Biology respiration: gaseous exchange (outcomes 6a + 6c) + exam technique.

A warm, continuous narrated tutor lesson. It opens with a Ken-Burns camera move
over the tutor's own lungs illustration (docs/diagrams/respiration/lungs.jpg),
progressively naming AND giving the function of each structure as it is spoken
(6a): larynx -> trachea (cartilage + cilia) -> bronchi -> bronchioles -> alveoli
-> capillaries. It then cross-fades into the drawn alveolus + capillary diagram
(oxygenated / deoxygenated blood flow) and teaches diffusion and the four
adaptations (6c), before a "how to answer" exam walkthrough. Narration subtitles
are burned along the bottom; emphasis highlights are YELLOW (#FFD84D) only;
indigo is used only for chrome/arrows.

1920x1080 (16:9) 30 fps, H.264 / yuv420p video + AAC narration (Kokoro af_heart,
~-16 LUFS). Rendered frame-by-frame with Skia.

Usage:
    python3 alveolus_pilot.py                 # full render -> out/alveolus_pilot.mp4
    python3 alveolus_pilot.py --stills        # 3 representative PNG stills
    python3 alveolus_pilot.py --stills 20 90  # stills at given seconds
    python3 alveolus_pilot.py --workers 8

Kokoro model files (kokoro-v1.0.onnx, voices-v1.0.bin) are read from $KOKORO_DIR
or assets/kokoro/ and are NOT committed. lungs.jpg IS committed on this branch.
"""
import argparse, math, os, subprocess, re
import numpy as np
import skia

W, H, FPS = 1920, 1080, 30
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "out")
LUNGS_IMG = os.path.join(ROOT, "docs", "diagrams", "respiration", "lungs.jpg")

# --------------------------------------------------------------------------
# Palette — Atlas restyle (indigo chrome, YELLOW emphasis, warm bg)
# --------------------------------------------------------------------------
PAL = dict(
    bg="#F6F6F4", card="#FFFFFF", ink="#1D2430", ink2="#5E6673", white="#FFFFFF",
    accent="#5B5BD6", accent_d="#4B4BC4", accent_soft="#EEEEFB",
    hl="#FFD84D", hl_soft="#FFF1B8", shadow="#2A2A33",
    rose="#E59AA6", rose_d="#C76E7C", rose_pale="#FBEDF0", air="#FDF5F7",
    cap="#F7E2E5", cap_d="#E3B9BE",
    rbc="#D6434F", rbc_d="#B23340", rbc_hi="#F25560",
    deox="#6E86B5", deox_d="#4F6690",
    moist="#CFE3EC", moist_d="#8FB3C6",
    o2="#E5392B", co2="#7A828C",      # red O2 / grey CO2 diffusion arrows
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
def parse_rich(s):
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


def lerp2(p, q, k):
    return (lerp(p[0], q[0], k), lerp(p[1], q[1], k))


def lerp4(p, q, k):
    return tuple(lerp(p[i], q[i], k) for i in range(4))


def bump(t, a, b):
    return math.sin(math.pi * lin(t, a, b))


# --------------------------------------------------------------------------
# Paths / primitives
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


def glow(c, cx, cy, r, color, a=1.0):
    c.drawPath(circ(cx, cy, r), skia.Paint(AntiAlias=True, Color=col(color, a), MaskFilter=blur(r * 0.7)))


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
    drop_shadow(c, path, d, a)
    fill(c, path, color, a)
    if edge:
        c.drawPath(path, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style,
                                    StrokeWidth=1.4, Color=col("white", 0.30 * a)))


class pop:
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


class scale_about:
    def __init__(self, c, s, cx, cy):
        self.c, self.s, self.cx, self.cy = c, s, cx, cy

    def __enter__(self):
        self.c.save()
        if abs(self.s - 1) > 1e-4:
            self.c.translate(self.cx, self.cy)
            self.c.scale(self.s, self.s)
            self.c.translate(-self.cx, -self.cy)

    def __exit__(self, *a):
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


# ==========================================================================
# Layout
# ==========================================================================
LX = 80
LCOL_R = 700
TAG_Y = 84
TITLE_Y = 214
CAP_TOP = 306

CX, CY, R = 1330, 556, 238         # drawn alveolus (shifted up to clear subtitles)
WALLT = 22
RB = R + 62
CAP_A0, CAP_A1 = math.radians(-78), math.radians(165)

# lungs image display box (matches image aspect 1400:1045 = 1.3397)
IMGD = (742, 118, 1096, 818)
SUB_Y = 986                         # subtitle band top


def P(ang, r):
    return (CX + r * math.cos(ang), CY + r * math.sin(ang))


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


def leader(c, tx, ty, px, py, a=1.0, color="accent"):
    line(c, tx, ty, px, py, color, 2.4, a, dash=[7.0, 6.0])
    fill(c, circ(px, py, 5), color, a)


def label(c, s, lx, ly, px, py, align="l", a=1.0, size=27, sub=None):
    w = tw(s, "semi", size)
    x0 = lx - w if align == "r" else lx
    anchor_x = x0 + w + 14 if px >= x0 + w else (x0 - 14 if px <= x0 else (x0 + w / 2))
    leader(c, anchor_x, ly - size * 0.33, px, py, a)
    txt(c, s, lx, ly, "semi", size, "ink", a, align=align)
    if sub:
        txt(c, sub, lx, ly + 30, "med", 22, "ink2", a, align=align)


def o2_dot(c, x, y, r=11, a=1.0, lab=True, pulse=0.0):
    glow(c, x, y, r + 7 + 3 * pulse, "o2", 0.33 * a)
    fill(c, circ(x, y, r), "o2", a)
    stroke(c, circ(x, y, r), "white", 2.2, 0.8 * a)
    fill(c, circ(x - r * 0.3, y - r * 0.3, r * 0.35), "white", 0.6 * a)
    if lab:
        txt(c, "O₂", x, y - r - 12, "bold", 26, "ink", a, align="c")


# ==========================================================================
# Red blood cell + capillary + gas-exchange arrows (drawn diagram)
# ==========================================================================
def rbc(c, x, y, ang, s=1.0, color="rbc", a=1.0):
    c.save(); c.translate(x, y); c.rotate(math.degrees(ang) + 90)
    drop_shadow(c, oval(0, 0, 30 * s, 20 * s), 0.4, 0.5 * a)
    fill(c, oval(0, 0, 30 * s, 20 * s), color, a)
    fill(c, oval(0, 0, 14 * s, 11 * s), ("deox_d" if color == "deox" else "rbc_d"), 0.55 * a)
    fill(c, oval(-9 * s, -7 * s, 7 * s, 4 * s), "white", 0.22 * a)
    c.restore()


def draw_capillary(c, gt, a, dense=False):
    with alpha_layer(c, a):
        band = arc_path(CX, CY, RB, CAP_A0, CAP_A1)
        c.save(); c.translate(1.2, 4); stroke(c, band, "shadow", 76, 0.16); c.restore()
        stroke(c, band, "cap_d", 76)
        stroke(c, band, "cap", 66)
        stroke(c, band, "moist", 44, 0.5)
        stroke(c, band, "cap", 38)
        c.save()
        clip = skia.Path()
        for pp in (arc_pts(CX, CY, RB + 32, CAP_A0, CAP_A1) + arc_pts(CX, CY, RB - 32, CAP_A1, CAP_A0)):
            (clip.moveTo if clip.isEmpty() else clip.lineTo)(*pp)
        clip.close()
        c.clipPath(clip, doAntiAlias=True)
        n = 11
        flow = gt * (0.26 if dense else 0.14)
        for i in range(n):
            u = ((i / n) + flow) % 1.0
            ang = CAP_A0 + (CAP_A1 - CAP_A0) * u
            x, y = P(ang, RB)
            rbc(c, x, y, ang, 1.0, "deox" if u > 0.5 else "rbc")
        c.restore()


def o2_co2(c, gt, a=1.0):
    """O2 diffuses in (RED, alveolus->blood); CO2 diffuses out (GREY, blood->alveolus),
    each clearly crossing the alveolus wall."""
    with alpha_layer(c, a):
        for si, ang in enumerate([math.radians(6), math.radians(38)]):
            inx, iny = P(ang, R - WALLT - 66)
            outx, outy = P(ang, RB)
            arrow(c, inx, iny, outx, outy, "o2", 6, 1, head=16)
            for d in range(3):
                u = ((gt * 0.5) + d / 3 + si * 0.2) % 1.0
                px, py = lerp(inx, outx, u), lerp(iny, outy, u)
                fill(c, circ(px, py, 6), "o2"); stroke(c, circ(px, py, 6), "white", 1.6, 0.8)
            txt(c, "O₂", inx - 4, iny - 16, "bold", 30, "ink", align="c")
        ang = math.radians(72)
        inx, iny = P(ang, R - WALLT - 44)
        outx, outy = P(ang, RB)
        arrow(c, outx, outy, inx, iny, "co2", 6, 1, head=16)
        for d in range(3):
            u = ((gt * 0.5) + d / 3) % 1.0
            px, py = lerp(outx, inx, u), lerp(outy, iny, u)
            fill(c, circ(px, py, 6), "co2"); stroke(c, circ(px, py, 6), "white", 1.4, 0.7)
        txt(c, "CO₂", outx + 44, outy + 12, "bold", 30, "ink", align="c")


def tagpill(c, cx, cy, title, sub, a=1.0, color="card"):
    w = max(tw(title, "bold", 22), tw(sub, "semi", 20)) + 44
    card(c, cx - w / 2, cy - 36, w, 72, 20, color, 0.7)
    txt(c, title, cx, cy - 6, "bold", 22, "ink", a, align="c")
    txt(c, sub, cx, cy + 22, "semi", 20, "ink2", a, align="c")


# ==========================================================================
# Opening — Ken-Burns over lungs.jpg with progressive 6a labels + functions
# ==========================================================================
_IMG = {}


def lungs_image():
    if "img" not in _IMG:
        _IMG["img"] = skia.Image.open(LUNGS_IMG) if os.path.exists(LUNGS_IMG) else None
    return _IMG["img"]


S_FULL = (0, 0, 1400, 1045)
S_BUBBLE = (683, 245, 764, 570)     # zoom circle (alveoli + capillaries)


def _mappt(ix, iy, src, D=IMGD):
    return (D[0] + (ix - src[0]) / src[2] * D[2],
            D[1] + (iy - src[1]) / src[3] * D[3])


def jlabel(c, name, func, tx, ty, px, py, align, a):
    """Structure label over the image: yellow-highlighted name + function, on a
    white pill for legibility, with a leader to the structure."""
    if a <= 0.01:
        return
    nw, fw = tw(name, "bold", 28), tw(func, "med", 22)
    bw = max(nw, fw) + 40
    bx = tx - bw if align == "r" else tx
    with alpha_layer(c, a):
        leader(c, (bx + bw + 10) if px >= bx + bw else (bx - 10 if px <= bx else bx + bw / 2),
               ty - 6, px, py)
        card(c, bx, ty - 40, bw, 74, 16, d=0.8)
        hx = bx + 20
        fill(c, rr(hx - 6, ty - 8 - 28 * 0.80, nw + 12, 28 * 1.02, 6), "hl")
        txt(c, name, hx, ty - 8, "bold", 28, "ink")
        txt(c, func, hx, ty + 22, "med", 22, "ink2")


JOURNEY = [
    # (seg_idx, keyword, img_x, img_y, name, function, text_x, text_y, align, is_right)
    (1, "larynx", 362, 214, "larynx", "voice box", 1000, 258, "r", False),
    (1, "trachea", 364, 352, "trachea", "windpipe — carries air", 1000, 388, "r", False),
    (2, "cartilage", 372, 300, "cartilage + cilia", "hold open; trap & sweep dust", 1000, 500, "r", False),
    (3, "bronchi", 430, 486, "bronchi", "air into each lung", 1000, 610, "r", False),
    (3, "bronchioles", 520, 598, "bronchioles", "air to the alveoli", 1030, 690, "r", False),
    (4, "alveoli", 1075, 430, "alveoli", "air sacs — gaseous exchange", 1470, 200, "l", True),
]


def draw_opening(c, gt):
    oe = TIMING["open_end"]
    if gt >= oe + 0.5:
        return
    img = lungs_image()
    # camera: slow push while labelling the left structures, then zoom to bubble
    t_zoom0 = TIMING["wt"].get("bronchioles", oe - 6) + 0.6
    t_zoom1 = oe - 0.5
    z = eo(lin(gt, t_zoom0, t_zoom1))
    wp = eo(lin(gt, 0, t_zoom0))
    S_wide = lerp4(S_FULL, (56, 42, 1288, 961), wp)     # gentle 8% push-in
    src = lerp4(S_wide, S_BUBBLE, z)
    breathe = 1 + 0.008 * math.sin(gt * 1.5)
    fade = clamp(1 - lin(gt, oe - 1.0, oe + 0.4))       # cross-fade to drawn diagram

    with alpha_layer(c, fade):
        if img is not None:
            with scale_about(c, breathe, IMGD[0] + IMGD[2] / 2, IMGD[1] + IMGD[3] / 2):
                c.save(); c.clipPath(rr(*IMGD, 24), doAntiAlias=True)
                c.drawImageRect(img, skia.Rect.MakeXYWH(*src), skia.Rect.MakeXYWH(*IMGD),
                                skia.SamplingOptions(skia.FilterMode.kLinear),
                                skia.Paint(), skia.Canvas.SrcRectConstraint.kStrict_SrcRectConstraint)
                c.restore()
        else:
            card(c, *IMGD, 24)

        # a breath: an O2 dot riding down the airway during the hook
        bd = lin(gt, 0.6, t_zoom0 - 0.5)
        if 0 < bd < 1 and img is not None:
            path = [(362, 150), (362, 360), (400, 470), (470, 560), (540, 650)]
            seg = bd * (len(path) - 1)
            i = min(int(seg), len(path) - 2)
            p = lerp2(path[i], path[i + 1], seg - i)
            mx, my = _mappt(p[0], p[1], src)
            o2_dot(c, mx, my, 10, pulse=0.5 + 0.5 * math.sin(gt * 4))

        # progressive 6a labels — never before the word is spoken
        for (si, kw, ix, iy, name, func, txx, tyy, al, is_right) in JOURNEY:
            rt = TIMING["wt"].get(kw, TIMING["onsets"][si])
            a = eo(lin(gt, rt, rt + 0.5))
            if not is_right:
                a *= clamp(1 - lin(gt, t_zoom0, t_zoom0 + 1.2))   # fade as we leave them behind
            if a <= 0.01:
                continue
            px, py = _mappt(ix, iy, src)
            jlabel(c, name, func, txx, tyy, px, py, al, a)


# ==========================================================================
# Drawn alveolus (6c) — progressively annotated, with the blood-flow animation
# ==========================================================================
def _wall_build(c, a):
    with alpha_layer(c, a):
        cut(c, circ(CX, CY, R), "rose_d", 1.2)
        fill(c, circ(CX, CY, R), "rose")
        fill(c, circ(CX, CY, R - WALLT), "air")
        fill(c, circ(CX, CY, R - WALLT), "rose_pale", 0.45)
        fill(c, oval(CX - 66, CY - 82, 116, 86), "white", 0.18)


def moist_lining(c, gt, strong):
    av = clamp(0.55 + 0.45 * strong * (0.5 + 0.5 * math.sin(gt * 3)))
    stroke(c, circ(CX, CY, R - WALLT - 7), "moist", 9, av)
    stroke(c, circ(CX, CY, R - WALLT - 7), "moist_d", 2, 0.5 * av)
    if strong > 0.02:
        with alpha_layer(c, strong):
            for i, ang in enumerate([-150, -95, 150, 120, 205, 95, 40]):
                dx, dy = P(math.radians(ang), R - WALLT - 18)
                ph = 0.5 + 0.5 * math.sin(gt * 3 + i)
                fill(c, circ(dx, dy, 6 + 3 * ph), "moist", 0.9)
                fill(c, circ(dx - 2, dy - 2, 2.6), "white", 0.85)


def wall_zoom(c, gt, a):
    if a <= 0.01:
        return
    zx, zy, zr = 1706, 430, 92
    wx, wy = P(math.radians(2), R)
    with alpha_layer(c, a):
        line(c, zx - zr * 0.7, zy + zr * 0.7, wx, wy, "accent", 2.2, 0.8, dash=[7.0, 6.0])
        cut(c, circ(zx, zy, zr + 10), "accent", 1.1)
        c.save(); c.clipPath(circ(zx, zy, zr), doAntiAlias=True)
        fill(c, circ(zx, zy, zr), "air")
        fill(c, rr(zx - zr, zy - zr, zr * 2, zr * 2, 0), "rose_pale", 0.5)
        fill(c, rr(zx + 4, zy - zr, zr * 2, zr * 2, 0), "cap", 0.95)
        fill(c, rr(zx - 9, zy - zr, 14, zr * 2, 0), "rose")
        fill(c, rr(zx + 4, zy - zr, 10, zr * 2, 0), "cap_d")
        stroke(c, rr(zx - 9, zy - zr, 14, zr * 2, 0), "rose_d", 1.2)
        rbc(c, zx + 56, zy + 6, math.radians(90), 1.0, "rbc")
        for d in range(2):
            u = ((gt * 0.6) + d / 2) % 1.0
            o2_dot(c, lerp(zx - 50, zx + 50, u), zy - 42, 6, lab=False)
        arrow(c, zx - 24, zy + 52, zx + 22, zy + 52, "ink", 4, 1, head=10)
        arrow(c, zx + 22, zy + 52, zx - 24, zy + 52, "ink", 4, 1, head=10)
        c.restore()
        txt(c, "two cells thin", zx, zy + zr + 32, "semi", 23, "ink", align="c")


def hero_oxygen(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    if gt < cue[7] - 0.2:
        return
    AX = math.radians(18)
    A0 = P(AX, R - WALLT - 92); A1 = P(AX, R - WALLT - 10); A2 = P(AX, RB)
    u = lin(gt, cue[7] + 1.0, starts[8] - 1.3)
    if u <= 0:
        o2_dot(c, A0[0] + 9 * math.sin(gt * 2), A0[1] + 7 * math.cos(gt * 1.6), 11,
               pulse=0.5 + 0.5 * math.sin(gt * 3))
        return
    if u < 0.45:
        pos = lerp2(A0, A1, eo(u / 0.45)); show, cell_ang, recv = True, AX, False
    elif u < 0.66:
        pos = lerp2(A1, A2, (u - 0.45) / 0.21); show, cell_ang, recv = True, AX, True
    else:
        cu = (u - 0.66) / 0.34
        cell_ang = lerp(AX, math.radians(-68), eo(cu)); pos = P(cell_ang, RB); show, recv = False, False
    cx_, cy_ = P(cell_ang, RB)
    bright = lin(u, 0.52, 0.7)
    if recv:
        glow(c, cx_, cy_, 42, "rbc_hi", 0.35 * bright)
    rbc(c, cx_, cy_, cell_ang, 1.08, "rbc_hi" if bright > 0.5 else "rbc")
    if show:
        line(c, A0[0], A0[1], pos[0], pos[1], "o2", 2.5, 0.35, dash=[5.0, 7.0])
        o2_dot(c, pos[0], pos[1], 11, pulse=0.5 + 0.5 * math.sin(gt * 4))
    elif u < 0.9:
        txt(c, "oxygen on board", cx_ + 70, cy_ - 8, "semi", 22, "ink", clamp(1 - lin(u, 0.82, 0.95)))


def draw_diagram(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    oe = TIMING["open_end"]
    settle = eo(lin(gt, oe - 1.6, oe + 0.4))
    if settle <= 0.001:
        return
    s_in = 0.6 + 0.4 * settle
    # dim behind recap, then fade out entirely for the exam panel
    dim = (1 - 0.55 * lin(gt, cue[13], cue[13] + 0.6)) * clamp(1 - lin(gt, cue[14] - 0.4, cue[14] + 0.3))
    if dim <= 0.001:
        return
    wb = bump(gt, cue[9] + 0.8, cue[9] + 6.2)              # "widen to many alveoli"
    cam = s_in * (1 - 0.30 * wb)

    with alpha_layer(c, settle * dim), scale_about(c, cam, CX, CY):
        if wb > 0.01:
            with alpha_layer(c, wb * 0.9):
                for (dx, dy, rr_) in [(-320, -110, 142), (-160, -236, 115), (150, -236, 115),
                                      (318, -64, 120), (288, 150, 115), (112, 262, 114),
                                      (-160, 246, 112), (-324, 100, 104)]:
                    sx, sy = CX + dx, CY + dy
                    cut(c, circ(sx, sy, rr_), "rose", 0.8)
                    fill(c, circ(sx, sy, rr_ - 10), "air")
                    fill(c, circ(sx, sy, rr_ - 10), "rose_pale", 0.5)

        draw_capillary(c, gt, eo(lin(gt, cue[5], cue[5] + 0.9)), dense=(gt >= cue[12]))
        _wall_build(c, 1.0)
        moist_lining(c, gt, strong=clamp(bump(gt, cue[11], cue[11] + (cue[12] - cue[11]))))

        at = eo(lin(gt, cue[5] + 0.2, cue[5] + 0.9))
        if at > 0.01:
            with alpha_layer(c, at):
                tagpill(c, CX, CY - 146, "AIR", "high in O₂", color="hl_soft")
                bx, by = P(math.radians(133), RB - 6)
                tagpill(c, bx, by, "BLOOD", "low O₂ · high CO₂")

        if gt >= cue[7]:
            o2_co2(c, gt, a=eo(lin(gt, cue[7], cue[7] + 0.6)))
        hero_oxygen(c, gt)
        wall_zoom(c, gt, clamp(bump(gt, cue[10], cue[10] + (cue[11] - cue[10]) + 1.0)))

        with alpha_layer(c, eo(lin(gt, cue[5] + 0.4, cue[5] + 1.2))):
            label(c, "capillaries", 880, 930, *P(math.radians(107), RB))
        with alpha_layer(c, eo(lin(gt, cue[5] + 0.7, cue[5] + 1.5))):
            label(c, "red blood cells", 1540, 936, *P(math.radians(46), RB))
        with alpha_layer(c, eo(lin(gt, cue[10] + 0.2, cue[10] + 1.0))):
            label(c, "alveolus wall", 760, 420, *P(math.radians(-128), R), sub="one cell thick")
        with alpha_layer(c, eo(lin(gt, cue[11] + 0.2, cue[11] + 1.0))):
            label(c, "moist lining", 762, 600, *P(math.radians(184), R - WALLT - 7))


# ==========================================================================
# On-canvas factor chips (YELLOW tick / highlight)
# ==========================================================================
FACTORS = ["Large surface area", "Short distance", "Steep gradient"]


def factor_chips(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    intro = cue[8]
    if gt < intro:
        return
    fade = 1 - lin(gt, cue[13], cue[13] + 0.5)
    if fade <= 0.01:
        return
    n, cw, gap = len(FACTORS), 300, 28
    total = n * cw + (n - 1) * gap
    x0 = (742 + 1838) / 2 - total / 2
    y, h = 126, 74
    tick = {0: starts[10], 1: starts[11], 2: lerp(starts[12], starts[13], 0.7)}
    with alpha_layer(c, fade):
        for i, lab in enumerate(FACTORS):
            x = x0 + i * (cw + gap)
            with pop(c, gt, intro + 0.12 * i, x + cw / 2, y + h / 2, dy=26) as v:
                if not v:
                    continue
                tk = eo(lin(gt, tick[i] - 0.4, tick[i] + 0.2))
                card(c, x, y, cw, h, 20)
                cx0, cy0 = x + 36, y + h / 2
                if tk > 0.01:                       # YELLOW tick + yellow highlight
                    cut(c, circ(cx0, cy0, 18), "hl", 0.5, a=tk)
                    check_mark(c, cx0, cy0 + 1, 24, "ink", w=4)
                    lw = tw(lab, "semi", fit_size(lab, "semi", 27, cw - 86))
                    fill(c, rr(x + 60, cy0 - 20, min(lw + 12, cw - 70), 40, 8), "hl", tk)
                else:
                    stroke(c, circ(cx0, cy0, 18), "ink2", 2.4, 0.5)
                txt(c, lab, x + 66, y + h / 2 + 9, "semi", fit_size(lab, "semi", 27, cw - 86), "ink")


# ==========================================================================
# Left-column caption (yellow emphasis) + diffusion (crowd) analogy cue
# ==========================================================================
CAP_SIZE, CAP_LH = 36, 48
CAP_X = LX + 12 + 26
CAP_W = LCOL_R - CAP_X - 24


def caption_height(lines):
    return len(lines) * CAP_LH + 48


def draw_caption(c, gt):
    caps = TIMING["caps"]
    # during the lungs-image journey the progressive labels + subtitles carry it
    if gt < TIMING["open_end"] - 0.3 or gt >= TIMING["onsets"][13]:
        return
    if not caps or gt < caps[0][0]:
        return
    i = max(j for j, (t0, _) in enumerate(caps) if t0 <= gt)
    cur = rich_layout(caps[i][1], CAP_SIZE, CAP_W)
    k, prev = 1.0, None
    if i > 0:
        k = lin(gt, caps[i][0], caps[i][0] + 0.45)
        prev = rich_layout(caps[i - 1][1], CAP_SIZE, CAP_W)
    h = caption_height(cur) if prev is None else lerp(caption_height(prev), caption_height(cur), eio(k))
    enter = eo(lin(gt, caps[0][0], caps[0][0] + 0.5))
    with alpha_layer(c, enter):
        c.save(); c.translate(0, -22 * (1 - enter))
        card(c, LX, CAP_TOP, LCOL_R - LX, h, 26, d=1.1)
        c.save(); c.clipPath(rr(LX, CAP_TOP, LCOL_R - LX, h, 26), doAntiAlias=True)
        fill(c, rr(LX, CAP_TOP, 12, h, 0), "accent")
        ty = CAP_TOP + 25 + CAP_SIZE * 0.9
        if prev is not None and k < 1:
            rich_draw(c, prev, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(1 - k * 2))
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(k * 2 - 1))
        else:
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH)
        c.restore(); c.restore()


def crowd_cue(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    a = min(eo(lin(gt, cue[6] + 0.2, cue[6] + 0.9)), clamp(1 - lin(gt, starts[7] - 0.8, starts[7] - 0.1)))
    if a <= 0.01:
        return
    x, y, w, h = LX + 6, 560, 556, 230
    with alpha_layer(c, a):
        card(c, x, y, w, h, 24, d=1.0)
        txt(c, "diffusion = spreading out", x + 28, y + 44, "bold", 25, "ink")
        bx, by, bw, bh = x + 34, y + 74, w - 68, 108
        stroke(c, rr(bx, by, bw, bh, 16), "ink2", 2, 0.35)
        line(c, bx + bw / 2, by + 8, bx + bw / 2, by + bh - 8, "ink2", 2, 0.3, dash=[5.0, 6.0])
        u = eo(lin(gt, cue[6] + 0.8, starts[7] - 0.8))
        rng = np.random.default_rng(7)
        for _ in range(9):
            sxr, syr = bx + 20 + rng.uniform(0, bw * 0.4), by + 16 + rng.uniform(0, bh - 32)
            txr, tyr = bx + 20 + rng.uniform(0, bw - 40), by + 16 + rng.uniform(0, bh - 32)
            o2_dot(c, lerp(sxr, txr, u), lerp(syr, tyr, u), 8, lab=False)
        txt(c, "crowded", bx + bw * 0.25, by + bh + 22, "semi", 19, "ink2", align="c")
        txt(c, "spread out", bx + bw * 0.75, by + bh + 22, "semi", 19, "ink2", align="c")


# ==========================================================================
# Recap panel (4 ticks + big idea)
# ==========================================================================
RECAP = [
    "Large surface area",
    "Walls one cell thick — short diffusion distance",
    "Moist lining — gases dissolve",
    "Rich blood supply — steep gradient",
]


def draw_recap(c, gt):
    t0, t_exam = TIMING["onsets"][13], TIMING["onsets"][14]
    if gt < t0 - 0.1 or gt >= t_exam:
        return
    rx, ry, rw, rh = LX, 280, 1000, 648
    enter = eo(lin(gt, t0, t0 + 0.5)) * clamp(1 - lin(gt, t_exam - 0.5, t_exam))
    with alpha_layer(c, enter):
        c.save(); c.translate(0, -24 * (1 - eo(lin(gt, t0, t0 + 0.5))))
        card(c, rx, ry, rw, rh, 30, d=1.2)
        fill(c, rr(rx, ry, 12, rh, 0), "accent")
        txt(c, "Why the alveolus is perfect for gaseous exchange", rx + 54, ry + 70, "disp",
            fit_size("Why the alveolus is perfect for gaseous exchange", "disp", 40, rw - 96), "ink")
        for i, s in enumerate(RECAP):
            ia = eo(lin(gt, t0 + 0.5 + i * 0.45, t0 + 1.1 + i * 0.45))
            yy = ry + 158 + i * 90
            with alpha_layer(c, ia):
                c.save(); c.translate(0, 16 * (1 - ia))
                cut(c, circ(rx + 80, yy, 28), "hl", 0.6)
                check_mark(c, rx + 80, yy + 2, 36, "ink", w=4)
                txt(c, s, rx + 130, yy + 12, "semi", fit_size(s, "semi", 33, rw - 190), "ink")
                c.restore()
        bi = eo(lin(gt, t0 + 2.9, t0 + 3.6))
        with alpha_layer(c, bi):
            by = ry + rh - 72
            msg = "Every feature does one job — making diffusion as fast as possible."
            fitv = fit_size(msg, "semi", 29, rw - 150)
            fill(c, rr(rx + 54, by - 33, tw(msg, "semi", fitv) + 26, 48, 12), "hl")
            txt(c, msg, rx + 67, by, "semi", fitv, "ink")
        c.restore()


# ==========================================================================
# Exam walkthrough — teach the thought process
# ==========================================================================
def draw_exam(c, gt):
    cue = TIMING["onsets"]
    t0 = cue[14]
    if gt < t0 - 0.1:
        return
    wt = TIMING["wt"]
    enter = eo(lin(gt, t0, t0 + 0.5))
    rx, ry, rw, rh = LX, 270, 1760, 660
    with alpha_layer(c, enter):
        c.save(); c.translate(0, -24 * (1 - enter))
        card(c, rx, ry, rw, rh, 30, d=1.2)
        fill(c, rr(rx, ry, 12, rh, 0), "accent")
        txt(c, "In the exam — how to answer", rx + 54, ry + 66, "disp", 38, "ink")

        # question card with yellow highlights on the command word + topic
        qx, qy, qw = rx + 54, ry + 104, 820
        card(c, qx, qy, qw, 196, 20, color="bg", d=0.5)
        q1 = "Explain how two features of an"
        q2 = "alveolus make it efficient at"
        q3 = "gaseous exchange."
        cmd_a = eo(lin(gt, wt.get("command", t0 + 4), wt.get("command", t0 + 4) + 0.4))
        top_a = eo(lin(gt, wt.get("topic", t0 + 9), wt.get("topic", t0 + 9) + 0.4))
        tx0, ty0 = qx + 28, qy + 60
        if cmd_a > 0.01:
            fill(c, rr(tx0 - 6, ty0 - 34, tw("Explain", "bold", 36) + 12, 46, 8), "hl", cmd_a)
        txt(c, "Explain", tx0, ty0, "bold", 36, "ink")
        txt(c, " how two features of an", tx0 + tw("Explain", "bold", 36), ty0, "med", 36, "ink")
        txt(c, "alveolus make it efficient at", tx0, ty0 + 48, "med", 36, "ink")
        if top_a > 0.01:
            fill(c, rr(tx0 - 6, ty0 + 96 - 34, tw("gaseous exchange", "bold", 36) + 12, 46, 8), "hl", top_a)
        txt(c, "gaseous exchange.", tx0, ty0 + 96, "bold" if top_a > 0.5 else "med", 36, "ink")
        txt(c, "[4 marks]", qx + qw - 150, qy + 40, "bold", 26, "ink2")

        # the thinking: command -> reason; topic -> diffusion
        think_a = eo(lin(gt, wt.get("topic", t0 + 9) + 0.6, wt.get("topic", t0 + 9) + 1.3))
        with alpha_layer(c, think_a):
            txt(c, "“Explain” = give a reason, not just name it.", qx, qy + 250, "semi", 26, "ink")
            fill(c, rr(qx, qy + 272, 330, 46, 10), "hl_soft")
            txt(c, "gaseous exchange = ", qx + 14, qy + 302, "semi", 24, "ink")
            fill(c, rr(qx + 14 + tw("gaseous exchange = ", "semi", 24) - 2, qy + 302 - 26,
                       tw("DIFFUSION", "bold", 26) + 10, 36, 7), "hl")
            txt(c, "DIFFUSION", qx + 14 + tw("gaseous exchange = ", "semi", 24) + 3, qy + 302, "bold", 26, "ink")

        # model answer: feature + reason, marks ticking (appears when we "build it")
        mx, my, mw = rx + 920, ry + 108, 790
        hdr_a = eo(lin(gt, wt.get("f1", t0 + 20) - 1.2, wt.get("f1", t0 + 20) - 0.4))
        with alpha_layer(c, hdr_a):
            txt(c, "Model answer — feature + reason", mx, my + 24, "bold", 27, "ink")
        marks = 0
        pairs = [
            ("1. Wall is one cell thick", "a short diffusion distance, so gases cross quickly", "f1"),
            ("2. Large surface area", "so more gas diffuses at once", "f2"),
        ]
        yy = my + 86
        for (feat, reason, key) in pairs:
            fa = eo(lin(gt, wt.get(key, t0 + 20), wt.get(key, t0 + 20) + 0.5))
            ra = eo(lin(gt, wt.get(key, t0 + 20) + 1.4, wt.get(key, t0 + 20) + 2.0))
            if fa > 0.01:
                with alpha_layer(c, fa):
                    card(c, mx, yy, mw, 150, 18, color="bg", d=0.4)
                    txt(c, feat, mx + 26, yy + 46, "bold", 30, "ink")
                    # feature mark
                    cut(c, circ(mx + mw - 54, yy + 40, 20), "hl", 0.5)
                    check_mark(c, mx + mw - 54, yy + 41, 26, "ink", w=4)
                    txt(c, "+1", mx + mw - 110, yy + 50, "bold", 24, "ink")
                if ra > 0.01:
                    with alpha_layer(c, ra):
                        txt(c, "→ " + reason, mx + 30, yy + 96,
                            "med", fit_size("→ " + reason, "med", 25, mw - 120), "ink2")
                        cut(c, circ(mx + mw - 54, yy + 100, 20), "hl", 0.5)
                        check_mark(c, mx + mw - 54, yy + 101, 26, "ink", w=4)
                        txt(c, "+1", mx + mw - 110, yy + 110, "bold", 24, "ink")
                        marks = 2 if key == "f1" else 4
            yy += 172
        # marks total + pattern
        done_a = eo(lin(gt, wt.get("done", t0 + 36), wt.get("done", t0 + 36) + 0.5))
        with alpha_layer(c, max(eo(lin(gt, wt.get("f1", t0 + 20), wt.get("f1", t0 + 20) + 0.5)), 0)):
            txt(c, f"{marks} / 4 marks", mx, yy + 10, "disp", 34, "ink")
        with alpha_layer(c, done_a):
            msg = "Every point = feature + reason."
            fill(c, rr(mx + 300, yy - 28, tw(msg, "semi", 27) + 24, 44, 11), "hl")
            txt(c, msg, mx + 312, yy + 2, "semi", 27, "ink")
        c.restore()


# ==========================================================================
# Burned-in subtitles (bottom)
# ==========================================================================
def _chunk(text, maxchars=46):
    words, chunks, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > maxchars:
            chunks.append(cur); cur = w
        else:
            cur = (cur + " " + w) if cur else w
    if cur:
        chunks.append(cur)
    return chunks


def build_subtitles():
    subs = []
    for i, line in enumerate(SEG_TEXT):
        on = TIMING["onsets"][i]
        dur = TIMING["durs"][i]
        chunks = _chunk(line)
        total = sum(len(ch) for ch in chunks) or 1
        t = on
        for ch in chunks:
            seg = dur * len(ch) / total
            subs.append((t, t + seg, ch))
            t += seg
    TIMING["subs"] = subs


def draw_subtitles(c, gt):
    cur = None
    for (t0, t1, s) in TIMING["subs"]:
        if t0 <= gt < t1:
            cur = s; break
    if cur is None:
        return
    size = 33
    w = tw(cur, "semi", size)
    bw = min(w + 64, 1640)
    cx = 960
    card(c, cx - bw / 2, SUB_Y, bw, 62, 16, d=0.8)
    txt(c, cur, cx, SUB_Y + 42, "semi", fit_size(cur, "semi", size, bw - 48), "ink", align="c")


# ==========================================================================
# Narration script (6a journey + 6c depth + exam) + timeline
# ==========================================================================
SEG_TEXT = [
    "Right now, without even thinking about it, you're breathing, and every cell "
    "in your body is counting on it. To release energy, your cells need oxygen, "
    "and they make carbon dioxide as waste. So let's follow one breath, from the "
    "air outside all the way to your blood.",
    "Air is drawn in and passes your larynx, your voice box, then down the "
    "trachea, the windpipe that carries air toward the lungs.",
    "The trachea is held open by rings of cartilage, and lined with tiny hairs "
    "called cilia that sweep mucus, dust and microbes back up to your throat.",
    "The trachea splits into two bronchi, one into each lung, and these branch "
    "again and again into ever-smaller bronchioles, like an upside-down tree.",
    "At the very ends sit millions of tiny air sacs, the alveoli. This is where "
    "gaseous exchange actually happens, so let's zoom right in.",
    "Each alveolus is wrapped in tiny blood vessels, the capillaries. The blood "
    "arriving is low in oxygen and loaded with carbon dioxide, so the alveolus "
    "swaps them: oxygen in, carbon dioxide out.",
    "The gases move by diffusion, spreading from where they're crowded to where "
    "there's room, needing no energy.",
    "So follow the oxygen. It's packed in the air and sparse in the blood, so it "
    "diffuses across the wall into a red blood cell and is carried off. Carbon "
    "dioxide does the reverse, diffusing out to be breathed away.",
    "Diffusion is fast only when three things are true: a large surface area, a "
    "short distance to cross, and a steep concentration gradient. The alveolus "
    "nails all three.",
    "First, surface area. You have around five hundred million alveoli. Laid flat "
    "they'd cover about half a tennis court, so oxygen pours into the blood at once.",
    "Second, distance. The alveolus wall and the capillary wall are each just one "
    "cell thick, so oxygen crosses only two thin layers. The shorter the trip, the "
    "faster the diffusion.",
    "The lining is also moist. Gases must dissolve before they cross, and this "
    "moist film lets oxygen dissolve first, then slip into the blood.",
    "Third, the gradient. Blood keeps flowing and every breath refreshes the air, "
    "so there's always more oxygen in the air than the blood, keeping the gradient "
    "steep and oxygen flooding in, non-stop.",
    "So the alveolus is perfect for gaseous exchange because of four things: a "
    "huge surface area; walls one cell thick for a short diffusion distance; a "
    "moist lining so gases dissolve; and a rich blood supply keeping a steep "
    "gradient. Every feature does the same job, making diffusion as fast as possible.",
    "Now let's use this in an exam. Here's a question: explain how two features of "
    "an alveolus make it efficient at gaseous exchange, for four marks. First, "
    "spot the command word. Explain means you must give a reason, not just name a "
    "feature. Next, the topic: gaseous exchange, which happens by diffusion. So "
    "for each feature you state it, then say how it speeds up diffusion. Let's "
    "build it. Feature one: the wall is one cell thick, a short diffusion distance, "
    "so gases cross quickly. Feature two: a large surface area, so more gas "
    "diffuses at once. See the pattern? Every point is a feature plus its reason. "
    "Do that, and the four marks are yours.",
]

CAP_TEXT = [
    "Follow one *breath* — from the air outside to your *blood*.",
    "Past the *larynx* (voice box), down the *trachea* (windpipe).",
    "The trachea has *cartilage* rings and *cilia* that sweep out dust.",
    "Into two *bronchi*, then finer *bronchioles* — an upside-down tree.",
    "At the tips: millions of *alveoli* — where gas exchange happens.",
    "Each alveolus is wrapped in *capillaries*. Blood: *low O₂*, *high CO₂*.",
    "Gases move by *diffusion*: from *crowded* to *empty*, no energy.",
    "*O₂* diffuses into the blood; *CO₂* diffuses out.",
    "Fast diffusion needs *surface area*, *short distance*, *steep gradient*.",
    "*Surface area*: ~500 million alveoli — about *half a tennis court*.",
    "*Short distance*: walls *one cell thick* — two thin layers.",
    "*Moist lining*: gases must *dissolve* before they cross.",
    "*Steep gradient*: flowing blood + fresh air, O₂ higher in the air.",
    "Four features, one job: make *diffusion* as fast as possible.",
    "In the exam: *state* a feature, then *explain* how it speeds diffusion.",
]

# words whose on-screen highlight/label must land as (or just after) they are spoken
WORD_CUES = {
    "larynx": (1, "larynx"), "trachea": (1, "trachea"),
    "cartilage": (2, "cartilage"), "bronchi": (3, "bronchi"),
    "bronchioles": (3, "bronchioles"), "alveoli": (4, "alveoli"),
    "command": (14, "command word"), "topic": (14, "the topic"),
    "f1": (14, "Feature one"), "f2": (14, "Feature two"), "done": (14, "four marks are yours"),
}

GAP = 0.5
TAIL = 0.6
SR = 24000
TIMING = {}


def set_timing(durs):
    seg = [GAP + d + TAIL for d in durs]
    seg[0] = max(seg[0], 5.0)
    starts = [0.0]
    for s in seg[:-1]:
        starts.append(starts[-1] + s)
    onsets = [starts[i] + GAP for i in range(len(seg))]
    TIMING.clear()
    TIMING.update(seg=seg, starts=starts, onsets=onsets, durs=durs,
                  open_end=starts[5],
                  duration=starts[-1] + seg[-1],
                  caps=[(onsets[i], CAP_TEXT[i]) for i in range(len(seg))])
    wt = {}
    for key, (li, phrase) in WORD_CUES.items():
        txt_l = SEG_TEXT[li].lower()
        pos = txt_l.find(phrase.lower())
        frac = (pos / max(1, len(txt_l))) if pos >= 0 else 0.0
        wt[key] = onsets[li] + frac * durs[li] + 0.12
    TIMING["wt"] = wt
    build_subtitles()
    TIMING["nframes"] = int(round(TIMING["duration"] * FPS))
    return TIMING


def render_frame(c, gt):
    draw_background(c)
    heading(c, gt)
    draw_opening(c, gt)
    draw_diagram(c, gt)
    factor_chips(c, gt)
    crowd_cue(c, gt)
    draw_caption(c, gt)
    draw_recap(c, gt)
    draw_exam(c, gt)
    draw_subtitles(c, gt)


# ==========================================================================
# Narration synthesis (Kokoro af_heart) + soundtrack
# ==========================================================================
def _model_dir():
    return os.environ.get("KOKORO_DIR") or os.path.join(ROOT, "assets", "kokoro")


def _trim(s, thresh=0.01):
    idx = np.where(np.abs(s) > thresh)[0]
    if len(idx) == 0:
        return s
    return s[max(0, idx[0] - int(0.03 * SR)): min(len(s), idx[-1] + int(0.14 * SR))]


def synth_clips():
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
        s, sr = k.create(line, voice="af_heart", speed=0.95, lang="en-us")
        s = np.asarray(s, dtype=np.float32)
        if sr != SR:
            n = int(round(len(s) * SR / sr))
            s = np.interp(np.linspace(0, len(s), n, endpoint=False), np.arange(len(s)), s).astype(np.float32)
        clips.append(_trim(s))
    return clips


def build_soundtrack(clips, wav_path):
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
    TIMING.clear(); TIMING.update(timing)
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
    st, cue = TIMING["starts"], TIMING["onsets"]
    return [TIMING["wt"]["bronchi"] + 0.8, cue[7] + 0.55 * (st[8] - cue[7]), cue[14] + 24.0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", nargs="*", type=float)
    ap.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 2))
    ap.add_argument("--out", default=os.path.join(OUT, "alveolus_pilot.mp4"))
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    clips = synth_clips()
    durs = [len(s) / SR for s in clips]
    set_timing(durs)
    st = TIMING["starts"]
    print("Timeline (s): " + "  ".join("L%d %.1f" % (i + 1, st[i]) for i in range(len(st)))
          + "  end %.1f" % TIMING["duration"])

    if a.stills is not None:
        d = os.path.join(OUT, "stills"); os.makedirs(d, exist_ok=True)
        for t in (a.stills if a.stills else default_still_times()):
            p = os.path.join(d, f"alveolus_t{t:05.1f}.png"); render_still(t, p); print(p)
        return

    import multiprocessing as mp
    nframes, nw = TIMING["nframes"], max(1, a.workers)
    bounds = [round(nframes * k / nw) for k in range(nw + 1)]
    segs = [(bounds[k], bounds[k + 1], os.path.join(OUT, f"seg{k}.mp4"), dict(TIMING)) for k in range(nw)]
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
    wav = os.path.join(OUT, "narration.wav")
    build_soundtrack(clips, wav)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-aspect", "16:9",
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000",
                    "-c:a", "aac", "-b:a", "160k", "-shortest",
                    "-movflags", "+faststart", a.out], check=True)
    for sg in segs:
        os.remove(sg[2])
    os.remove(lst); os.remove(silent); os.remove(wav)
    print("Wrote", a.out)


if __name__ == "__main__":
    main()
