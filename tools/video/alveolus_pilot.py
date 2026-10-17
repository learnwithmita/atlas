#!/usr/bin/env python3
"""
Atlas — Biology (gaseous exchange): "How the structure of an alveolus is suited
for gaseous exchange."

A warm, continuous narrated tutor lesson with a real narrative arc (hook ->
journey -> how diffusion works -> the three factors -> real-world tie-in ->
recap). ONE persistent diagram (an alveolus wrapped by a capillary) is built up
and annotated progressively — a tutor's whiteboard, continuous. It opens with a
camera journey (whole lungs -> trachea -> bronchi -> bronchioles -> one alveolus)
and follows a single highlighted OXYGEN dot from the air into a red blood cell.

1920x1080 (16:9) 30 fps, H.264 / yuv420p video + AAC narration (Kokoro af_heart,
~-16 LUFS). Rendered frame-by-frame with Skia; helpers adapted from
docs/video/reference/render.py and restyled to Atlas (indigo chrome, yellow
emphasis) per docs/video/reference/STYLE.md.

Usage:
    python3 alveolus_pilot.py                 # full render -> out/alveolus_pilot.mp4
    python3 alveolus_pilot.py --stills        # 3 representative PNG stills
    python3 alveolus_pilot.py --stills 30 70  # stills at given seconds
    python3 alveolus_pilot.py --workers 8

Kokoro model files (kokoro-v1.0.onnx, voices-v1.0.bin) are read from $KOKORO_DIR
or assets/kokoro/ and are NOT committed.
"""
import argparse, math, os, subprocess, re
import numpy as np
import skia

W, H, FPS = 1920, 1080, 30
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "out")

# --------------------------------------------------------------------------
# Palette — Atlas restyle (indigo accent chrome, yellow emphasis, warm bg)
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
    lung="#F3D7DC", lung_d="#D79AA6", airway="#B9BBEA", o2="#3BB273",
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


def lerp2(p, q, k):
    return (lerp(p[0], q[0], k), lerp(p[1], q[1], k))


def bump(t, a, b):
    return math.sin(math.pi * lin(t, a, b))


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
# Layout — native 1920x1080 landscape. Nothing important in outer ~60 px.
# ==========================================================================
LX = 80
LCOL_R = 720
TAG_Y = 84
TITLE_Y = 214
CAP_TOP = 306

ILL_L, ILL_R = 720, 1840
CX, CY, R = 1330, 612, 250
WALLT = 24
RB = R + 70
CAP_A0, CAP_A1 = math.radians(-78), math.radians(165)


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


def leader(c, tx, ty, px, py, a=1.0):
    line(c, tx, ty, px, py, "accent", 2.4, a, dash=[7.0, 6.0])
    fill(c, circ(px, py, 5), "accent", a)


def label(c, s, lx, ly, px, py, align="l", a=1.0, size=27, sub=None):
    """Text label + dashed leader that starts from the text edge nearest the
    target, so the dashes never cross the words."""
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
    fill(c, circ(x - r * 0.3, y - r * 0.3, r * 0.4), "white", 0.5 * a)
    if lab:
        txt(c, "O₂", x, y - r - 12, "bold", 26, "ink", a, align="c")


# ==========================================================================
# Red blood cell + capillary + gas-exchange arrows
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
        c.save(); c.translate(1.2, 4); stroke(c, band, "shadow", 78, 0.16); c.restore()
        stroke(c, band, "cap_d", 78)
        stroke(c, band, "cap", 68)
        stroke(c, band, "moist", 46, 0.5)
        stroke(c, band, "cap", 40)
        c.save()
        clip = skia.Path()
        for pp in (arc_pts(CX, CY, RB + 33, CAP_A0, CAP_A1)
                   + arc_pts(CX, CY, RB - 33, CAP_A1, CAP_A0)):
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
    with alpha_layer(c, a):
        for si, ang in enumerate([math.radians(6), math.radians(38)]):
            inx, iny = P(ang, R - WALLT - 70)
            outx, outy = P(ang, RB)
            arrow(c, inx, iny, outx, outy, "accent", 5, 0.95, head=15)
            for d in range(3):
                u = ((gt * 0.5) + d / 3 + si * 0.2) % 1.0
                px, py = lerp(inx, outx, u), lerp(iny, outy, u)
                fill(c, circ(px, py, 7), "accent_soft")
                stroke(c, circ(px, py, 7), "accent", 2)
            txt(c, "O₂", inx - 4, iny - 16, "bold", 30, "ink", align="c")
        ang = math.radians(72)
        inx, iny = P(ang, R - WALLT - 46)
        outx, outy = P(ang, RB)
        arrow(c, outx, outy, inx, iny, "ink", 5, 0.9, head=15)
        for d in range(3):
            u = ((gt * 0.5) + d / 3) % 1.0
            px, py = lerp(outx, inx, u), lerp(outy, iny, u)
            fill(c, circ(px, py, 7), "card")
            stroke(c, circ(px, py, 7), "ink2", 2)
        txt(c, "CO₂", outx + 42, outy + 12, "bold", 30, "ink", align="c")


def tagpill(c, cx, cy, title, sub, a=1.0, color="card"):
    w = max(tw(title, "bold", 22), tw(sub, "semi", 20)) + 44
    card(c, cx - w / 2, cy - 36, w, 72, 20, color, 0.7)
    txt(c, title, cx, cy - 6, "bold", 22, "ink", a, align="c")
    txt(c, sub, cx, cy + 22, "semi", 20, "ink2", a, align="c")


# ==========================================================================
# Opening camera journey: lungs -> trachea -> bronchi -> bronchioles -> one sac
# ==========================================================================
def _lobe(cx, cy, w, h, side):
    p = skia.Path()
    p.moveTo(cx + side * 0.06 * w, cy - h / 2)
    p.cubicTo(cx + side * 0.95 * w, cy - 0.46 * h,
              cx + side * 0.98 * w, cy + 0.26 * h,
              cx + side * 0.62 * w, cy + 0.50 * h)
    p.cubicTo(cx + side * 0.34 * w, cy + 0.63 * h,
              cx + side * 0.12 * w, cy + 0.52 * h,
              cx + side * 0.10 * w, cy + 0.12 * h)
    p.close()
    return p


def draw_lungs(c, gt, a, push):
    if a <= 0.01:
        return
    with alpha_layer(c, a), scale_about(c, push, CX, CY):
        br = 0.5 + 0.5 * math.sin(gt * 1.4)
        with scale_about(c, 1 + 0.015 * br, CX, CY):
            stroke(c, rr(CX - 16, CY - 300, 32, 150, 16), "airway", 26)
            line(c, CX, CY - 165, CX - 90, CY - 90, "airway", 22)
            line(c, CX, CY - 165, CX + 90, CY - 90, "airway", 22)
            for side in (-1, 1):
                lobe = _lobe(CX, CY - 10, 250, 470, side)
                cut(c, lobe, "lung", 1.0)
                stroke(c, lobe, "lung_d", 3, 0.8)
                bx = CX + side * 90
                for (ex, ey) in [(side * 150, 40), (side * 120, 150), (side * 80, 240), (side * 170, -60)]:
                    line(c, bx, CY - 90, CX + ex, CY - 10 + ey, "airway", 7, 0.8)
            tx, ty = CX + 150, CY + 150
            pr = 0.5 + 0.5 * math.sin(gt * 3)
            stroke(c, circ(tx, ty, 40 + 6 * pr), "accent", 3, 0.9)


def draw_bronchiole(c, gt, a, push):
    if a <= 0.01:
        return
    with alpha_layer(c, a), scale_about(c, push, CX, CY):
        stroke(c, poly([(CX - 360, CY - 230), (CX - 150, CY - 120), (CX + 40, CY - 40)], close=False), "airway", 40)
        stroke(c, poly([(CX + 40, CY - 40), (CX + 230, CY + 40)], close=False), "airway", 30)
        stroke(c, poly([(CX + 40, CY - 40), (CX + 150, CY + 190)], close=False), "airway", 30)
        stroke(c, poly([(CX - 150, CY - 120), (CX - 120, CY + 120)], close=False), "airway", 24)
        for (gx, gy, gr) in [(CX + 280, CY + 70, 90), (CX + 170, CY + 240, 86),
                             (CX - 150, CY + 190, 80), (CX - 300, CY - 40, 60)]:
            for (dx, dy) in [(-0.5, -0.5), (0.5, -0.4), (0, 0.5), (0.7, 0.3), (-0.6, 0.4)]:
                sx, sy = gx + dx * gr, gy + dy * gr
                cut(c, circ(sx, sy, gr * 0.5), "rose", 0.7)
                fill(c, circ(sx, sy, gr * 0.42), "rose_pale")
        txt(c, "bronchioles", CX - 300, CY - 250, "semi", 30, "ink", a, align="c")


def draw_cluster(c, gt, a, push):
    if a <= 0.01:
        return
    with alpha_layer(c, a), scale_about(c, push, CX, CY):
        for (dx, dy, rr_) in [(-250, -150, 120), (-70, -230, 110), (170, -190, 120), (300, -20, 108),
                              (250, 170, 112), (60, 250, 116), (-170, 210, 110), (-320, 40, 100),
                              (-40, 20, 150)]:
            sx, sy = CX + dx, CY + dy
            cut(c, circ(sx, sy, rr_), "rose", 0.9)
            fill(c, circ(sx, sy, rr_ - 11), "air")
            fill(c, circ(sx, sy, rr_ - 11), "rose_pale", 0.5)
        txt(c, "alveoli", CX, CY - 330, "semi", 30, "ink", a, align="c")


def draw_opening(c, gt):
    hook = TIMING["starts"][1]       # L2 start (dive begins)
    oe = TIMING["open_end"]          # L3 start (dive done)
    L2 = max(0.1, oe - hook)
    # lungs: whole of L1 + the first part of the dive, then fade
    a_l = eo(lin(gt, 0.3, 1.6)) * clamp(1 - lin(gt, hook + 0.42 * L2, hook + 0.54 * L2))
    push_l = lerp(1.0, 1.55, eo(lin(gt, hook + 0.34 * L2, hook + 0.54 * L2)))
    draw_lungs(c, gt, a_l, push_l)
    # airway labels (screen space, while push is still ~1)
    if a_l > 0.02:
        if gt < hook:
            txt(c, "lungs", CX, CY - 330, "semi", 30, "ink",
                eo(lin(gt, 0.6, 1.4)) * a_l, align="c")
        else:
            at = eo(lin(gt, hook + 0.05, hook + 0.3)) * clamp(1 - lin(gt, hook + 0.3 * L2, hook + 0.42 * L2))
            with alpha_layer(c, clamp(at)):
                label(c, "trachea", CX - 150, CY - 250, CX - 12, CY - 220, align="r")
                label(c, "bronchi", CX + 140, CY - 40, CX + 66, CY - 104)
    # bronchioles
    a_b = eo(lin(gt, hook + 0.42 * L2, hook + 0.54 * L2)) * clamp(1 - lin(gt, hook + 0.74 * L2, hook + 0.84 * L2))
    draw_bronchiole(c, gt, a_b, lerp(0.8, 1.5, eo(lin(gt, hook + 0.42 * L2, hook + 0.84 * L2))))
    # cluster of alveoli -> settle
    a_c = eo(lin(gt, hook + 0.74 * L2, hook + 0.84 * L2)) * clamp(1 - lin(gt, oe - 3.0, oe - 1.8))
    draw_cluster(c, gt, a_c, lerp(0.85, 1.4, eo(lin(gt, hook + 0.74 * L2, oe - 1.8))))


# ==========================================================================
# Persistent, progressively annotated diagram + "follow the oxygen" hero dot
# ==========================================================================
def _wall_build(c, a):
    with alpha_layer(c, a):
        cut(c, circ(CX, CY, R), "rose_d", 1.2)
        fill(c, circ(CX, CY, R), "rose")
        fill(c, circ(CX, CY, R - WALLT), "air")
        fill(c, circ(CX, CY, R - WALLT), "rose_pale", 0.45)
        fill(c, oval(CX - 70, CY - 86, 120, 90), "white", 0.18)


def moist_lining(c, gt, strong):
    av = clamp(0.55 + 0.45 * strong * (0.5 + 0.5 * math.sin(gt * 3)))
    stroke(c, circ(CX, CY, R - WALLT - 7), "moist", 10, av)
    stroke(c, circ(CX, CY, R - WALLT - 7), "moist_d", 2, 0.5 * av)
    if strong > 0.02:
        with alpha_layer(c, strong):
            for i, ang in enumerate([-150, -95, 150, 120, 205, 95, 40]):
                dx, dy = P(math.radians(ang), R - WALLT - 20)
                ph = 0.5 + 0.5 * math.sin(gt * 3 + i)
                fill(c, circ(dx, dy, 6 + 3 * ph), "moist", 0.9)
                fill(c, circ(dx - 2, dy - 2, 2.6), "white", 0.85)


def wall_zoom(c, gt, a):
    if a <= 0.01:
        return
    zx, zy, zr = 1706, 486, 96
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
        rbc(c, zx + 58, zy + 6, math.radians(90), 1.0, "rbc")
        for d in range(2):
            u = ((gt * 0.6) + d / 2) % 1.0
            px = lerp(zx - 52, zx + 52, u)
            o2_dot(c, px, zy - 44, 6, lab=False)
        arrow(c, zx - 24, zy + 54, zx + 22, zy + 54, "ink", 4, 1, head=10)
        arrow(c, zx + 22, zy + 54, zx - 24, zy + 54, "ink", 4, 1, head=10)
        c.restore()
        txt(c, "two cells thin", zx, zy + zr + 34, "semi", 23, "ink", align="c")


def hero_oxygen(c, gt):
    """Follow ONE oxygen dot: floats in the air (L3-L4), then crosses the wall
    into a red blood cell and is carried off (L5)."""
    cue, starts = TIMING["onsets"], TIMING["starts"]
    if gt < cue[2]:
        return
    AX = math.radians(18)
    A0 = P(AX, R - WALLT - 96)
    A1 = P(AX, R - WALLT - 10)
    A2 = P(AX, RB)
    if gt < cue[4]:                                 # floating in the air
        fx = A0[0] + 9 * math.sin(gt * 2.0)
        fy = A0[1] + 7 * math.cos(gt * 1.6)
        o2_dot(c, fx, fy, 11, pulse=0.5 + 0.5 * math.sin(gt * 3))
        return
    u = lin(gt, cue[4] + 1.0, starts[5] - 1.3)
    if u <= 0:
        o2_dot(c, A0[0], A0[1], 11)
        return
    if u < 0.45:
        pos = lerp2(A0, A1, eo(u / 0.45)); show_dot = True; cell_ang = AX; receiving = False
    elif u < 0.66:
        pos = lerp2(A1, A2, (u - 0.45) / 0.21); show_dot = True; cell_ang = AX; receiving = True
    else:
        cu = (u - 0.66) / 0.34
        cell_ang = lerp(AX, math.radians(-68), eo(cu))
        pos = P(cell_ang, RB); show_dot = False; receiving = False
    # the receiving red blood cell (brightens as it takes the oxygen, then flows off)
    cx_, cy_ = P(cell_ang, RB)
    bright = lin(u, 0.52, 0.7)
    if receiving:
        glow(c, cx_, cy_, 42, "rbc_hi", 0.35 * bright)
    rbc(c, cx_, cy_, cell_ang, 1.08, "rbc_hi" if bright > 0.5 else "rbc")
    if show_dot:
        line(c, A0[0], A0[1], pos[0], pos[1], "o2", 2.5, 0.35, dash=[5.0, 7.0])
        o2_dot(c, pos[0], pos[1], 11, pulse=0.5 + 0.5 * math.sin(gt * 4))
    elif u < 0.9:
        txt(c, "oxygen on board", cx_ + 70, cy_ - 8, "semi", 22, "ink", clamp(1 - lin(u, 0.82, 0.95)))


def draw_diagram(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    oe = TIMING["open_end"]
    settle = eo(lin(gt, oe - 3.2, oe - 0.1))
    if settle <= 0.001:
        return
    s_in = 0.55 + 0.45 * settle
    dim = 1 - 0.55 * lin(gt, cue[11], cue[11] + 0.6)       # dim behind the recap
    wb = bump(gt, cue[6] + 0.8, cue[6] + 6.2)              # "widen to many alveoli"
    cam = s_in * (1 - 0.30 * wb)

    with alpha_layer(c, settle * dim), scale_about(c, cam, CX, CY):
        if wb > 0.01:
            with alpha_layer(c, wb * 0.9):
                for (dx, dy, rr_) in [(-330, -120, 150), (-170, -250, 120), (150, -250, 120),
                                      (330, -70, 128), (300, 160, 120), (120, 280, 120),
                                      (-170, 260, 118), (-340, 110, 110)]:
                    sx, sy = CX + dx, CY + dy
                    cut(c, circ(sx, sy, rr_), "rose", 0.8)
                    fill(c, circ(sx, sy, rr_ - 10), "air")
                    fill(c, circ(sx, sy, rr_ - 10), "rose_pale", 0.5)

        cap_a = eo(lin(gt, cue[2], cue[2] + 0.9))           # capillary wraps in at L3
        draw_capillary(c, gt, cap_a, dense=(gt >= cue[9]))
        _wall_build(c, 1.0)
        moist_lining(c, gt, strong=clamp(bump(gt, cue[8], cue[8] + (cue[9] - cue[8]))))

        at = eo(lin(gt, cue[2] + 0.2, cue[2] + 0.9))        # AIR / BLOOD tags (L3)
        if at > 0.01:
            with alpha_layer(c, at):
                tagpill(c, CX, CY - 150, "AIR", "high in O₂", color="accent_soft")
                # arriving (deoxygenated) blood: lower-left, clear of the right-side
                # exchange arrows and the hero-oxygen crossing
                bx, by = P(math.radians(133), RB - 6)
                tagpill(c, bx, by, "BLOOD", "low O₂ · high CO₂")

        if gt >= cue[4]:                                    # gas-exchange arrows (L5+)
            o2_co2(c, gt, a=eo(lin(gt, cue[4], cue[4] + 0.6)))
        hero_oxygen(c, gt)

        wall_zoom(c, gt, clamp(bump(gt, cue[7], cue[7] + (cue[8] - cue[7]) + 1.0)))

        with alpha_layer(c, eo(lin(gt, cue[2] + 0.4, cue[2] + 1.2))):
            label(c, "capillary", 900, 1014, *P(math.radians(107), RB))
        with alpha_layer(c, eo(lin(gt, cue[2] + 0.7, cue[2] + 1.5))):
            label(c, "red blood cells", 1536, 1012, *P(math.radians(44), RB))
        with alpha_layer(c, eo(lin(gt, cue[7] + 0.2, cue[7] + 1.0))):
            label(c, "alveolus wall", 752, 432, *P(math.radians(-128), R), sub="one cell thick")
        with alpha_layer(c, eo(lin(gt, cue[8] + 0.2, cue[8] + 1.0))):
            label(c, "moist lining", 760, 628, *P(math.radians(184), R - WALLT - 7))


# ==========================================================================
# On-canvas factor chips (the 3 conditions for fast diffusion)
# ==========================================================================
FACTORS = ["Large surface area", "Short distance", "Steep gradient"]


def factor_chips(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    intro = cue[5]
    if gt < intro:
        return
    fade = 1 - lin(gt, cue[11], cue[11] + 0.5)
    if fade <= 0.01:
        return
    n, cw, gap = len(FACTORS), 300, 28
    total = n * cw + (n - 1) * gap
    x0 = (ILL_L + ILL_R) / 2 - total / 2
    y, h = 128, 76
    tick_line = {0: starts[7], 1: starts[8], 2: lerp(starts[9], starts[10], 0.7)}
    with alpha_layer(c, fade):
        for i, lab in enumerate(FACTORS):
            x = x0 + i * (cw + gap)
            with pop(c, gt, intro + 0.12 * i, x + cw / 2, y + h / 2, dy=26) as v:
                if not v:
                    continue
                tk = eo(lin(gt, tick_line[i] - 0.4, tick_line[i] + 0.2))
                card(c, x, y, cw, h, 20, color=("accent_soft" if tk > 0.5 else "card"))
                cx0, cy0 = x + 36, y + h / 2
                if tk > 0.01:
                    cut(c, circ(cx0, cy0, 18), "accent", 0.6, a=tk)
                    check_mark(c, cx0, cy0 + 1, 24, "white", w=4)
                else:
                    stroke(c, circ(cx0, cy0, 18), "ink2", 2.4, 0.5)
                txt(c, lab, x + 66, y + h / 2 + 9, "semi", fit_size(lab, "semi", 27, cw - 86), "ink")


# ==========================================================================
# Left-column asides: the diffusion (crowd) analogy, and the runner tie-in
# ==========================================================================
def crowd_cue(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    a = min(eo(lin(gt, cue[3] + 0.2, cue[3] + 0.9)), clamp(1 - lin(gt, starts[4] - 0.8, starts[4] - 0.1)))
    if a <= 0.01:
        return
    x, y, w, h = LX + 10, 560, 560, 236
    with alpha_layer(c, a):
        card(c, x, y, w, h, 24, d=1.0)
        txt(c, "diffusion = spreading out", x + 30, y + 46, "bold", 26, "ink")
        bx, by, bw, bh = x + 36, y + 78, w - 72, 110
        stroke(c, rr(bx, by, bw, bh, 16), "ink2", 2, 0.35)
        line(c, bx + bw / 2, by + 8, bx + bw / 2, by + bh - 8, "ink2", 2, 0.3, dash=[5.0, 6.0])
        u = eo(lin(gt, cue[3] + 0.8, starts[4] - 0.8))
        rng = np.random.default_rng(7)
        for k in range(9):
            sxr = bx + 20 + rng.uniform(0, bw * 0.4)
            syr = by + 18 + rng.uniform(0, bh - 36)
            txr = bx + 20 + rng.uniform(0, bw - 40)
            tyr = by + 18 + rng.uniform(0, bh - 36)
            dx, dy = lerp(sxr, txr, u), lerp(syr, tyr, u)
            o2_dot(c, dx, dy, 8, lab=False)
        txt(c, "crowded", bx + bw * 0.25, by + bh + 24, "semi", 20, "ink2", align="c")
        txt(c, "spread out", bx + bw * 0.75, by + bh + 24, "semi", 20, "ink2", align="c")


def _runner(c, cx, cy, s, gt):
    sw = 7 * s
    swing = math.sin(gt * 7)
    fill(c, circ(cx + 14 * s, cy - 34 * s, 11 * s), "ink")           # head
    line(c, cx + 10 * s, cy - 22 * s, cx - 6 * s, cy + 4 * s, "ink", sw)   # torso (leaning)
    line(c, cx - 6 * s, cy + 4 * s, cx - 10 * s + 16 * s * swing, cy + 34 * s, "ink", sw)   # back leg
    line(c, cx - 6 * s, cy + 4 * s, cx + 20 * s - 10 * s * swing, cy + 30 * s, "ink", sw)   # front leg
    line(c, cx + 2 * s, cy - 12 * s, cx + 22 * s + 8 * s * swing, cy - 6 * s, "ink", sw)    # front arm
    line(c, cx + 2 * s, cy - 12 * s, cx - 16 * s - 6 * s * swing, cy - 2 * s, "ink", sw)    # back arm
    for k in range(3):                                               # motion lines
        line(c, cx - 30 * s - k * 14 * s, cy - 18 * s + k * 14 * s,
             cx - 10 * s - k * 14 * s, cy - 18 * s + k * 14 * s, "accent", 3, 0.6)


def runner_cue(c, gt):
    cue, starts = TIMING["onsets"], TIMING["starts"]
    a = min(eo(lin(gt, cue[10] + 0.2, cue[10] + 0.9)), clamp(1 - lin(gt, starts[11] - 0.8, starts[11] - 0.1)))
    if a <= 0.01:
        return
    x, y, w, h = LX + 10, 560, 560, 236
    with alpha_layer(c, a):
        card(c, x, y, w, h, 24, d=1.0)
        txt(c, "sprint for the bus", x + 30, y + 46, "bold", 26, "ink")
        _runner(c, x + 110, y + 150, 1.5, gt)
        rx = x + 260
        for i, s in enumerate(["breathing rate", "blood flow"]):
            ry = y + 112 + i * 56
            txt(c, s, rx, ry, "semi", 24, "ink")
            arrow(c, rx + 232, ry + 4, rx + 232, ry - 26, "accent", 6, 1, head=13)
        txt(c, "keeps the gradient steep", x + 30, y + h - 26, "med", 22, "ink2")


# ==========================================================================
# Running caption (left column) — current teaching point, yellow emphasis
# ==========================================================================
CAP_SIZE, CAP_LH = 37, 49
CAP_X = LX + 12 + 28
CAP_W = LCOL_R - CAP_X - 26


def caption_height(lines):
    return len(lines) * CAP_LH + 50


def draw_caption(c, gt):
    caps = TIMING["caps"]
    if gt >= TIMING["onsets"][11]:
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
        ty = CAP_TOP + 26 + CAP_SIZE * 0.9
        if prev is not None and k < 1:
            rich_draw(c, prev, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(1 - k * 2))
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(k * 2 - 1))
        else:
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH)
        c.restore(); c.restore()


# ==========================================================================
# Recap panel (line 12): four ticks + the big idea
# ==========================================================================
RECAP = [
    "Large surface area",
    "Walls one cell thick — short diffusion distance",
    "Moist lining — gases dissolve",
    "Rich blood supply — steep gradient",
]


def draw_recap(c, gt):
    t0 = TIMING["onsets"][11]
    if gt < t0 - 0.1:
        return
    rx, ry, rw, rh = LX, 288, 1000, 666
    enter = eo(lin(gt, t0, t0 + 0.5))
    with alpha_layer(c, enter):
        c.save(); c.translate(0, -24 * (1 - enter))
        card(c, rx, ry, rw, rh, 30, d=1.2)
        fill(c, rr(rx, ry, 12, rh, 0), "accent")
        txt(c, "Why the alveolus is perfect for gaseous exchange", rx + 54, ry + 72, "disp",
            fit_size("Why the alveolus is perfect for gaseous exchange", "disp", 40, rw - 96), "ink")
        for i, s in enumerate(RECAP):
            ia = eo(lin(gt, t0 + 0.5 + i * 0.45, t0 + 1.1 + i * 0.45))
            yy = ry + 162 + i * 92
            with alpha_layer(c, ia):
                c.save(); c.translate(0, 16 * (1 - ia))
                cut(c, circ(rx + 80, yy, 28), "accent", 0.7)
                check_mark(c, rx + 80, yy + 2, 38, "white")
                txt(c, s, rx + 130, yy + 12, "semi", fit_size(s, "semi", 33, rw - 190), "ink")
                c.restore()
        # big idea
        bi = eo(lin(gt, t0 + 2.9, t0 + 3.6))
        with alpha_layer(c, bi):
            by = ry + rh - 78
            msg = "Every feature does one job — making diffusion as fast as possible."
            fit = fit_size(msg, "semi", 30, rw - 150)
            wtxt = tw(msg, "semi", fit)
            fill(c, rr(rx + 54, by - 34, wtxt + 28, 50, 12), "hl")
            txt(c, msg, rx + 68, by, "semi", fit, "ink")
        c.restore()


# ==========================================================================
# Narration script (12 lines) + synced captions + data-driven timeline
# ==========================================================================
SEG_TEXT = [
    "Right now, without even thinking about it, you're breathing, and every cell "
    "in your body is counting on it. To release energy, your cells need oxygen, "
    "and they make carbon dioxide as waste. So let's follow one breath and see "
    "what happens deep inside your lungs.",
    "The air travels down your windpipe, the trachea, which splits into two "
    "bronchi, one per lung. Those branch again and again into smaller tubes "
    "called bronchioles, like an upside-down tree. And at the very ends sit "
    "millions of tiny air sacs: the alveoli. This is where the magic happens.",
    "Each alveolus is wrapped in tiny blood vessels, capillaries. The blood "
    "arriving is tired: low in oxygen, loaded with carbon dioxide from your cells. "
    "The alveolus has one job, to swap them: fresh oxygen in, waste carbon dioxide out.",
    "But how do the gases move? By diffusion. Picture a crowded room: people "
    "spread out into the empty space next door. Gases do the same. They move from "
    "where they're crowded to where there's room, needing no energy.",
    "So follow the oxygen. The alveolus air is packed with oxygen, while the blood "
    "beside it has little, so oxygen diffuses across into the blood and is whisked "
    "off to your cells. Meanwhile carbon dioxide is crowded in the blood and sparse "
    "in the air, so it diffuses the other way, out to be breathed away.",
    "Here's the clever part. Diffusion is fast only when three things are true: a "
    "large surface area, a short distance to cross, and a steep concentration "
    "gradient. The alveolus nails all three.",
    "First, surface area. You don't have two big balloons. You have around five "
    "hundred million alveoli. Laid flat they'd cover about half a tennis court. "
    "All that surface lets oxygen pour into the blood at once.",
    "Second, distance. The alveolus wall is one cell thick, and so is the capillary "
    "wall, so oxygen only hops across two paper-thin layers. The shorter the trip, "
    "the faster the diffusion.",
    "Each alveolus is also coated in a thin film of moisture. Gases must dissolve "
    "before they cross, and this moist lining lets oxygen dissolve first, then slip "
    "into the blood.",
    "And third, the gradient. Your blood never stops flowing, carrying oxygen away, "
    "bringing more carbon dioxide, and every breath refreshes the air. So there's "
    "always more oxygen in the air than the blood, keeping the gradient steep and "
    "oxygen flooding in, non-stop.",
    "That's why, when you sprint for a bus, you end up breathing hard and fast. "
    "Your cells are burning oxygen, so your body ramps up breathing and blood flow "
    "to keep that gradient steep.",
    "So, to recap. The alveolus is perfect for gaseous exchange because of four "
    "things: a huge surface area; walls one cell thick for a short diffusion "
    "distance; a moist lining so gases dissolve; and a rich blood supply keeping a "
    "steep gradient. Every feature does the same job, making diffusion as fast as "
    "possible. Nail those four and you can explain any gas-exchange question.",
]

CAP_TEXT = [
    "You breathe without thinking — your *cells* need *oxygen* and make *carbon dioxide*.",
    "Air flows down the *trachea*, into *bronchi*, then *bronchioles* — to the *alveoli*.",
    "Each alveolus is wrapped in *capillaries*. Blood arrives *low in O₂*, *high in CO₂*.",
    "Gases move by *diffusion*: from *crowded* to *empty*, no energy needed.",
    "*Follow the oxygen*: it diffuses into the blood; *CO₂* diffuses out.",
    "Fast diffusion needs a *large surface area*, a *short distance*, a *steep gradient*.",
    "*Surface area*: ~500 million alveoli — about *half a tennis court*.",
    "*Short distance*: walls *one cell thick* — oxygen hops *two thin layers*.",
    "*Moist lining*: gases must *dissolve* before they cross.",
    "*Steep gradient*: flowing blood and fresh air keep O₂ higher in the air, *non-stop*.",
    "Sprint for a bus — you breathe *hard and fast* to keep the gradient steep.",
    "Four features, one job: make *diffusion* as fast as possible.",
]

GAP = 0.5
TAIL = 0.65
SR = 24000

TIMING = {}


def set_timing(durs):
    seg = [GAP + d + TAIL for d in durs]
    seg[0] = max(seg[0], 5.0)
    starts = [0.0]
    for s in seg[:-1]:
        starts.append(starts[-1] + s)
    TIMING.clear()
    TIMING.update(
        seg=seg, starts=starts,
        onsets=[starts[i] + GAP for i in range(len(seg))],
        open_end=starts[2],                 # the camera dive settles at L3 start
        duration=starts[-1] + seg[-1],
        caps=[(starts[i] + GAP, CAP_TEXT[i]) for i in range(len(seg))],
    )
    TIMING["nframes"] = int(round(TIMING["duration"] * FPS))
    return TIMING


def render_frame(c, gt):
    draw_background(c)
    heading(c, gt)
    draw_opening(c, gt)
    draw_diagram(c, gt)
    factor_chips(c, gt)
    crowd_cue(c, gt)
    runner_cue(c, gt)
    draw_caption(c, gt)
    draw_recap(c, gt)


# ==========================================================================
# Narration synthesis (Kokoro af_heart) + soundtrack assembly
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
            s = np.interp(np.linspace(0, len(s), n, endpoint=False),
                          np.arange(len(s)), s).astype(np.float32)
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
    return [st[1] + 0.55 * (st[2] - st[1]),          # the airway dive
            cue[4] + 0.55 * (st[5] - cue[4]),         # follow-the-oxygen moment
            cue[11] + 5.0]                            # recap


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
