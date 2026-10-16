#!/usr/bin/env python3
"""
Choosing the Right Apparatus — Sec 4 G3 Pure Chemistry (O-Level)
Minimal, reel-ready explainer (Reels / TikTok / Shorts safe zone), rendered
frame-by-frame with Skia and encoded to H.264 MP4 (1080x1920, 9:16, 30 fps).
Visual rules live in STYLE.md.

Usage:
    python3 render.py                 # full render -> out/apparatus_selection_reel.mp4
    python3 render.py --stills 12.0 45.5 ...   # PNG stills at given seconds -> out/stills/
    python3 render.py --workers 4     # parallel segment rendering
"""
import argparse, math, os, re, subprocess, sys, wave
import numpy as np
import skia

W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

# --------------------------------------------------------------------------
# Palette (warm cream, muted teal, terracotta, amber)
# --------------------------------------------------------------------------
PAL = dict(
    cream="#F3EBDC", paper="#FBF7EE", paper2="#EEE2CD", paper3="#E4D4BA",
    teal="#3E7D7A", teal_d="#2A5957", teal_l="#9BC4BD", teal_xl="#D6E8E3",
    terra="#C0624A", terra_d="#97452F", terra_l="#E8AE97",
    amber="#D8973A", amber_d="#A86F1F", amber_l="#F1CE8A",
    ink="#2E2924", ink2="#6B6056", ink3="#A99D8F", white="#FFFFFF",
    shadow="#2A2A33",
    # --- UI tokens (text uses ONLY ink / ink2 / white; emphasis = yellow highlighter) ---
    bg="#F5F3EE", card="#FFFFFF", ink_ui="#1D2430", ink_ui2="#5E6673",
    accent="#0E7B76", accent_d="#0A5C58", hl="#FFD84D", hl_soft="#FFF1B8",
)


def col(h, a=1.0):
    h = PAL.get(h, h).lstrip("#")
    return skia.ColorSetARGB(int(round(255 * max(0, min(1, a)))),
                             int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


# --------------------------------------------------------------------------
# Fonts
# --------------------------------------------------------------------------
FONT_DIR = os.environ.get("FONT_DIR", "/usr/share/fonts/opentype/inter/")
MONO = os.environ.get("MONO_FONT", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf")


def _tf(name):
    p = os.path.join(FONT_DIR, name)
    t = skia.Typeface.MakeFromFile(p) if os.path.exists(p) else None
    return t or skia.Typeface("DejaVu Sans")


TF = {
    "reg": _tf("Inter-Regular.otf"), "med": _tf("Inter-Medium.otf"),
    "semi": _tf("Inter-SemiBold.otf"), "bold": _tf("Inter-Bold.otf"),
    "disp": _tf("InterDisplay-Bold.otf"), "dispx": _tf("InterDisplay-ExtraBold.otf"),
    "mono": skia.Typeface.MakeFromFile(MONO) if os.path.exists(MONO) else skia.Typeface("DejaVu Sans Mono"),
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


# ---- rich text: *word* = emphasised -------------------------------------
UNIT_GLUE = re.compile(r"(\d) (cm³|°C|g|s)(?![\w])")


def parse_rich(s):
    # keep a number and its unit on the same line (non-breaking space)
    s = UNIT_GLUE.sub(lambda m: m.group(1) + "\u00a0" + m.group(2), s)
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


def rich_draw(c, lines, x, y, size, lh, color="ink_ui", a=1.0,
              base="med", em="bold", align="l", hl="hl"):
    """*emphasised* words: same ink colour, bold, on a yellow highlighter stripe."""
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


def union(*paths):
    out = paths[0]
    for p in paths[1:]:
        out = skia.Op(out, p, skia.PathOp.kUnion_PathOp)
    return out


# --------------------------------------------------------------------------
# Drawing primitives (flat fills, soft lift shadows)
# --------------------------------------------------------------------------
_blur = {}


def blur(s):
    s = round(s, 1)
    if s not in _blur:
        _blur[s] = skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, s)
    return _blur[s]


def paper_paint(color, seed=0, a=1.0):
    return skia.Paint(AntiAlias=True, Color=col(color, a))


def drop_shadow(c, path, d=1.0, a=1.0):
    if d <= 0:
        return
    c.save(); c.translate(1.5 * d, 5 * d)
    c.drawPath(path, skia.Paint(AntiAlias=True, Color=col("shadow", 0.19 * a), MaskFilter=blur(3 + 4.5 * d)))
    c.restore()
    c.save(); c.translate(0.4 * d, 1.4 * d)
    c.drawPath(path, skia.Paint(AntiAlias=True, Color=col("shadow", 0.16 * a), MaskFilter=blur(1.1)))
    c.restore()


def cut(c, path, color, d=1.0, seed=0, edge=True):
    """A flat shape with a soft lift shadow and a crisp light edge (the apparatus look)."""
    drop_shadow(c, path, d)
    c.drawPath(path, paper_paint(color, seed))
    if edge:
        c.drawPath(path, skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style,
                                    StrokeWidth=1.4, Color=col("white", 0.30)))


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


def fill(c, path, color, a=1.0):
    c.drawPath(path, skia.Paint(AntiAlias=True, Color=col(color, a)))


def vessel(c, path, level_y=None, liq="teal_l", la=0.85, men=0.0, glass_a=0.42,
           shadow=0.5, outline_a=0.75, clip_inner=None, surface=True):
    """Glass (vellum) container with liquid whose *bottom of meniscus* is level_y."""
    drop_shadow(c, path, shadow, 0.6)
    fill(c, path, "white", glass_a)
    if level_y is not None:
        inner = clip_inner if clip_inner is not None else path
        b = inner.getBounds()
        c.save(); c.clipPath(inner, doAntiAlias=True)
        lp = skia.Path()
        lp.moveTo(b.left() - 2, level_y - men)
        lp.quadTo((b.left() + b.right()) / 2, level_y + men, b.right() + 2, level_y - men)
        lp.lineTo(b.right() + 2, b.bottom() + 4); lp.lineTo(b.left() - 2, b.bottom() + 4); lp.close()
        fill(c, lp, liq, la)
        if surface:
            sp = skia.Path(); sp.moveTo(b.left() - 2, level_y - men)
            sp.quadTo((b.left() + b.right()) / 2, level_y + men, b.right() + 2, level_y - men)
            stroke(c, sp, "teal_d", 2.2, 0.55 * la)
        c.restore()
    stroke(c, path, "teal_d", 3, outline_a)


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


# --------------------------------------------------------------------------
# Layout (native 1080x1920, everything important inside the reel safe zone)
# --------------------------------------------------------------------------
SAFE_L, SAFE_R = 60, 960          # right 120 px reserved for platform buttons
TAG_Y = 232                       # top of tag pill (top ~220 px is platform UI)
TITLE_Y = 362                     # title baseline
CAP_TOP = 392                     # key-point card top
BODY_TOP, BODY_BOTTOM = 640, 1420 # illustration region
CHIP_Y, CHIP_H = 1440, 112        # fact chips (bottom of safe zone ~1560)

# Apparatus drawings were authored for the region x 60–1020, y 380–1330.
# body() maps that region into the illustration area with one uniform scale.
BODY_S = (BODY_BOTTOM - BODY_TOP) / (1330 - 380)
BODY_TX = (SAFE_L + SAFE_R) / 2 - 540 * BODY_S
BODY_TY = BODY_TOP - 380 * BODY_S


class body:
    def __init__(self, c):
        self.c = c

    def __enter__(self):
        self.c.save(); self.c.translate(BODY_TX, BODY_TY); self.c.scale(BODY_S, BODY_S)

    def __exit__(self, *a):
        self.c.restore()


def draw_background(c, gt):
    c.clear(col("bg"))


STEP_SCENES = ["stopwatch", "thermo", "balance", "cylinder", "burette", "pipette"]


def heading(c, t, tag, title, step=None, size=76):
    with pop(c, t, 0.05, 160, TAG_Y + 25, dy=30) as v:
        if v:
            w = tw(tag, "bold", 26, 2.5)
            cut(c, rr(SAFE_L, TAG_Y, w + 48, 52, 26), "accent", 0.6)
            txt(c, tag, SAFE_L + 24, TAG_Y + 35, "bold", 26, "white", spacing=2.5)
    if step is not None:
        with alpha_layer(c, eo(lin(t, 0.1, 0.5))):
            for i in range(6):
                x = SAFE_R - 8 - (5 - i) * 30; y = TAG_Y + 26
                if i < step:
                    fill(c, circ(x, y, 8), "accent")
                elif i == step:
                    fill(c, circ(x, y, 11), "hl"); stroke(c, circ(x, y, 11), "ink_ui", 2.5)
                else:
                    stroke(c, circ(x, y, 7), "ink_ui2", 2.2, 0.6)
    with pop(c, t, 0.15, 400, TITLE_Y - 30, dy=40) as v:
        if v:
            txt(c, title, SAFE_L - 2, TITLE_Y, "disp", fit_size(title, "disp", size, SAFE_R - SAFE_L), "ink_ui")


def card(c, x, y, w, h, r=26, color="card", d=0.9):
    drop_shadow(c, rr(x, y, w, h, r), d, 0.7)
    fill(c, rr(x, y, w, h, r), color)


def chips(c, t, t0, items):
    gap = 18
    w = (SAFE_R - SAFE_L - 2 * gap) / 3
    x = SAFE_L
    for i, (lab, val) in enumerate(items):
        with pop(c, t, t0 + 0.12 * i, x + w / 2, CHIP_Y + CHIP_H / 2, dy=40) as v:
            if v:
                card(c, x, CHIP_Y, w, CHIP_H, 22)
                fill(c, circ(x + 26, CHIP_Y + 32, 6), "accent")
                txt(c, lab, x + 40, CHIP_Y + 40, "bold", 21, "ink_ui2", spacing=1.8)
                txt(c, val, x + 22, CHIP_Y + 92, "bold", fit_size(val, "bold", 42, w - 40), "ink_ui")
        x += w + gap


CAP_SIZE, CAP_LH = 42, 56
CAP_X = SAFE_L + 12 + 30
CAP_W = SAFE_R - CAP_X - 30


def caption_height(lines):
    return len(lines) * CAP_LH + 54


def draw_caption(c, t, caps, a=1.0):
    """Key-point card at the TOP (under the title). caps: list of (t0, text).
    When narration exists, card i appears exactly when narration line i starts."""
    ct = CAP_TIMES.get(CUR["scene"]) if "CAP_TIMES" in globals() else None
    if ct and len(ct) >= len(caps):
        caps = [(ct[i], caps[i][1]) for i in range(len(caps))]
        t = CUR["real_t"]
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
    with alpha_layer(c, a * enter):
        c.save(); c.translate(0, -24 * (1 - enter))
        card(c, SAFE_L, CAP_TOP, SAFE_R - SAFE_L, h, 26, d=1.1)
        c.save(); c.clipPath(rr(SAFE_L, CAP_TOP, SAFE_R - SAFE_L, h, 26), doAntiAlias=True)
        fill(c, rr(SAFE_L, CAP_TOP, 12, h, 0), "accent")
        ty = CAP_TOP + 27 + CAP_SIZE * 0.93
        if prev is not None and k < 1:
            rich_draw(c, prev, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(1 - k * 2))
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH, a=clamp(k * 2 - 1))
        else:
            rich_draw(c, cur, CAP_X, ty, CAP_SIZE, CAP_LH)
        c.restore()
        c.restore()


def tag_label(c, x, y, s, color=None, size=30, bg="card", align="l", d=0.8, kind="bold"):
    """Reading / note pill. Text is always ink (one text colour)."""
    w = tw(s, kind, size) + 40
    x0 = x - w / 2 if align == "c" else (x - w if align == "r" else x)
    hgt = size + 28
    card(c, x0, y - size * 0.95 - 14, w, hgt, hgt / 2, bg, d)
    txt(c, s, x0 + 20, y, kind, size, "ink_ui")
    return x0, w


def check_mark(c, cx, cy, s, color="white", w=None):
    p = skia.Path(); p.moveTo(cx - 0.5 * s, cy); p.lineTo(cx - 0.12 * s, cy + 0.36 * s); p.lineTo(cx + 0.55 * s, cy - 0.38 * s)
    stroke(c, p, color, w or s * 0.18)


def cross_mark(c, cx, cy, s, color="ink_ui2", w=None):
    line(c, cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2, color, w or s * 0.16)
    line(c, cx + s / 2, cy - s / 2, cx - s / 2, cy + s / 2, color, w or s * 0.16)


def eye(c, x, y, s=1.0):
    p = skia.Path(); p.moveTo(x - 30 * s, y)
    p.quadTo(x, y - 26 * s, x + 30 * s, y); p.quadTo(x, y + 26 * s, x - 30 * s, y); p.close()
    cut(c, p, "white", 0.6, seed=3)
    stroke(c, p, "ink", 2.5 * s)
    fill(c, circ(x + 5 * s, y, 10 * s), "teal_d")
    fill(c, circ(x + 5 * s, y, 4.5 * s), "ink")
    fill(c, circ(x + 8 * s, y - 3 * s, 2.2 * s), "white")


# --------------------------------------------------------------------------
# Magnifier inset (reading a scale / meniscus)
# --------------------------------------------------------------------------
def draw_inset(c, cx, cy, r, center, ppu, level, minor=1.0, major=5.0, direction=1,
               liquid="teal_l", tube_w=150, liq_w=None, men=14, fmt="{:g}", mark=None,
               show_eye=True, label_every=None):
    """direction=+1: values increase upward; -1: increase downward (burette)."""
    cut(c, circ(cx, cy, r + 12), "amber", 1.4, seed=40)
    c.save(); c.clipPath(circ(cx, cy, r), doAntiAlias=True)
    fill(c, circ(cx, cy, r), "paper")
    Y = lambda v: cy - (v - center) * ppu * direction
    x0, x1 = cx - tube_w / 2, cx + tube_w / 2
    tube = rr(x0, cy - r - 20, tube_w, 2 * r + 40, 0)
    fill(c, tube, "white", 0.75)
    ly = Y(level)
    lw = liq_w if liq_w else tube_w
    lx0 = cx - lw / 2
    lp = skia.Path()
    if men:
        lp.moveTo(lx0, ly - men); lp.quadTo(cx, ly + men, lx0 + lw, ly - men)
    else:
        lp.moveTo(lx0, ly); lp.lineTo(lx0 + lw, ly)
    lp.lineTo(lx0 + lw, cy + r + 30); lp.lineTo(lx0, cy + r + 30); lp.close()
    fill(c, lp, liquid, 0.9)
    sp = skia.Path()
    if men:
        sp.moveTo(lx0, ly - men); sp.quadTo(cx, ly + men, lx0 + lw, ly - men)
        stroke(c, sp, "teal_d", 2.5, 0.8)
    if mark is None:
        rng = r / ppu + minor
        n0, n1 = int(math.floor((center - rng) / minor)), int(math.ceil((center + rng) / minor))
        for n in range(n0, n1 + 1):
            v = n * minor
            is_major = abs(v / major - round(v / major)) < 1e-6
            is_half = abs(v / (major / 2) - round(v / (major / 2))) < 1e-6
            y = Y(v)
            L = tube_w * (0.55 if is_major else (0.38 if is_half else 0.24))
            p = skia.Path(); p.moveTo(x0, y); p.lineTo(x0 + L, y)
            stroke(c, p, "ink", 3.2 if is_major else 2.0, cap=False)
            if is_major:
                txt(c, fmt.format(round(v, 3)), x1 + 16, y + 11, "bold", 32, "ink2")
    else:
        y = Y(mark)
        p = skia.Path(); p.moveTo(x0 - 6, y); p.lineTo(x1 + 6, y)
        stroke(c, p, "ink", 4, cap=False)
        txt(c, "mark", x1 + 14, y + 10, "bold", 30, "ink2")
    stroke(c, poly([(x0, cy - r - 20), (x0, cy + r + 20)], False), "teal_d", 3.5)
    stroke(c, poly([(x1, cy - r - 20), (x1, cy + r + 20)], False), "teal_d", 3.5)
    if show_eye:
        ex = cx - r + 46
        line(c, ex + 30, ly, x0 - 4, ly, "amber_d", 3, dash=[10, 8])
        eye(c, ex, ly, 0.85)
    c.restore()
    stroke(c, circ(cx, cy, r), "amber_d", 3, 0.6)


def connector(c, x0, y0, x1, y1, a=1.0):
    line(c, x0, y0, x1, y1, "amber_d", 3, a, dash=[8, 8])
    fill(c, circ(x1, y1, 7), "amber_d", a)


# --------------------------------------------------------------------------
# Apparatus drawings
# --------------------------------------------------------------------------
def draw_stopwatch(c, cx, cy, r, secs, press=0.0, lcd=True):
    stem = rr(cx - 0.08 * r, cy - r - 0.2 * r, 0.16 * r, 0.24 * r, 0.04 * r)
    cut(c, stem, "amber_d", 0.6)
    cut(c, rr(cx - 0.18 * r, cy - r - 0.33 * r + press * 0.05 * r, 0.36 * r, 0.14 * r, 0.05 * r), "terra", 0.8)
    for ang in (-48, 48):
        c.save(); c.translate(cx, cy); c.rotate(ang)
        cut(c, rr(-0.07 * r, -r - 0.13 * r, 0.14 * r, 0.18 * r, 0.04 * r), "terra_d", 0.6)
        c.restore()
    cut(c, circ(cx, cy, r), "teal_d", 1.5, seed=1)
    cut(c, circ(cx, cy, r * 0.9), "amber", 0.6, seed=2)
    cut(c, circ(cx, cy, r * 0.82), "paper", 0.5, seed=3)
    for i in range(60):
        a = math.radians(i * 6)
        big = i % 5 == 0
        r0 = r * (0.68 if big else 0.73)
        p = skia.Path(); p.moveTo(cx + r0 * math.sin(a), cy - r0 * math.cos(a))
        p.lineTo(cx + 0.78 * r * math.sin(a), cy - 0.78 * r * math.cos(a))
        stroke(c, p, "ink" if big else "ink3", max(1.0, r * (0.016 if big else 0.008)), cap=False)
    for v, a in ((60, 0), (15, 90), (30, 180), (45, 270)):
        aa = math.radians(a)
        txt(c, str(v), cx + 0.55 * r * math.sin(aa), cy - 0.55 * r * math.cos(aa) + 0.05 * r,
            "bold", 0.12 * r, "ink2", align="c")
    c.save(); c.translate(cx, cy); c.rotate((secs % 60) * 6)
    cut(c, rr(-0.025 * r, -0.72 * r, 0.05 * r, 0.88 * r, 0.025 * r), "terra", 0.7)
    c.restore()
    cut(c, circ(cx, cy, 0.065 * r), "amber_d", 0.5)
    if lcd:
        cut(c, rr(cx - 0.4 * r, cy + 0.2 * r, 0.8 * r, 0.27 * r, 0.06 * r), "teal_xl", 0.6, seed=4)
        m, s = int(secs // 60), secs % 60
        s_txt = f"{m:02d}:{s:05.2f}"
        txt(c, s_txt, cx, cy + 0.2 * r + 0.205 * r, "mono", 0.17 * r, "teal_d", align="c")


def flask_path(cx, base_y, w, h, inset=0.0):
    nw = w * 0.30 - 2 * inset
    nh = h * 0.30
    top = base_y - h + (inset * 0.5)
    bw = w / 2 - inset
    by = base_y - inset
    p = skia.Path()
    p.moveTo(cx - nw / 2, top)
    p.lineTo(cx - nw / 2, base_y - h + nh)
    p.lineTo(cx - bw + 6, by - 18)
    p.quadTo(cx - bw, by, cx - bw + 22, by)
    p.lineTo(cx + bw - 22, by)
    p.quadTo(cx + bw, by, cx + bw - 6, by - 18)
    p.lineTo(cx + nw / 2, base_y - h + nh)
    p.lineTo(cx + nw / 2, top)
    p.close()
    return p


def draw_flask(c, cx, base_y, w, h, frac, liq="teal_l", la=0.8):
    outer = flask_path(cx, base_y, w, h)
    inner = flask_path(cx, base_y, w, h, 4)
    body_h = h * 0.7
    ly = base_y - 4 - frac * body_h
    vessel(c, outer, ly, liq, la, men=0, clip_inner=inner)
    cut(c, rr(cx - w * 0.15 - 6, base_y - h - 4, w * 0.3 + 12, 12, 6), "paper", 0.4)
    return ly


def beaker_path(x, top, w, h, inset=0.0):
    p = skia.Path()
    p.moveTo(x - w / 2 + inset - 10, top + inset)
    p.lineTo(x - w / 2 + inset, top + 14 + inset)
    p.lineTo(x - w / 2 + inset, top + h - 16 - inset)
    p.quadTo(x - w / 2 + inset, top + h - inset, x - w / 2 + 16 + inset, top + h - inset)
    p.lineTo(x + w / 2 - 16 - inset, top + h - inset)
    p.quadTo(x + w / 2 - inset, top + h - inset, x + w / 2 - inset, top + h - 16 - inset)
    p.lineTo(x + w / 2 - inset, top + inset)
    p.close()
    return p


def draw_beaker(c, x, top, w, h, level_y, liq="teal_l", la=0.7, glass_a=0.4):
    outer = beaker_path(x, top, w, h)
    vessel(c, outer, level_y, liq, la, men=0, glass_a=glass_a, clip_inner=beaker_path(x, top, w, h, 4))
    for i in range(1, 4):
        y = top + h - i * h / 4.5
        line(c, x - w / 2 + 14, y, x - w / 2 + 44, y, "teal_d", 2, 0.45)


# ---- thermometer ----------------------------------------------------------
TH_X, TH_TOP, TH_BULB = 330, 400, 1215
TH_Y0, TH_K = 1135, 5.9          # y of -10 °C ; px per °C


def th_y(T):
    return TH_Y0 - (T + 10) * TH_K


def draw_thermometer(c, T, x=TH_X):
    tube = union(rr(x - 17, TH_TOP, 34, TH_BULB - TH_TOP, 17), circ(x, TH_BULB, 30))
    cut(c, tube, "paper", 1.1, seed=7)
    for v in range(-10, 111, 2):
        y = th_y(v); big = v % 10 == 0
        p = skia.Path(); p.moveTo(x - 15, y); p.lineTo(x - (1 if big else 7), y)
        stroke(c, p, "ink" if big else "ink3", 2 if big else 1.3, cap=False)
        if big:
            s = str(v) if v >= 0 else "−10"
            txt(c, s, x + 30, y + 8, "semi", 22, "ink2")
    txt(c, "°C", x, TH_TOP - 14, "bold", 24, "ink2", align="c")
    fill(c, rr(x + 3, th_y(T), 7, TH_BULB - th_y(T), 3.5), "terra")
    fill(c, circ(x + 6, TH_BULB, 20), "terra")
    stroke(c, poly([(x - 9, TH_TOP + 20), (x - 9, TH_BULB - 40)], False), "white", 3, 0.6)


# ---- balance ---------------------------------------------------------------
def draw_balance(c, reading, tare_press=0.0, flash=0.0):
    cut(c, rr(190, 1238, 60, 22, 8), "ink2", 0.5); cut(c, rr(830, 1238, 60, 22, 8), "ink2", 0.5)
    cut(c, rr(160, 1010, 760, 238, 34), "teal", 1.8, seed=8)
    cut(c, rr(160, 1010, 760, 40, 20), "teal_d", 0.4, seed=9)
    cut(c, rr(270, 1075, 420, 118, 18), "teal_d", 0.6, seed=10)
    fill(c, rr(286, 1089, 388, 90, 12), "teal_xl", 0.95)
    if flash > 0:
        fill(c, rr(286, 1089, 388, 90, 12), "amber_l", 0.6 * flash)
    txt(c, f"{reading:.2f} g", 660, 1160, "mono", 64, "teal_d", align="r")
    by = 1082 + tare_press * 6
    cut(c, rr(722, by, 160, 58, 16), "amber", 0.9 * (1 - tare_press) + 0.2, seed=11)
    txt(c, "TARE", 802, by + 39, "bold", 26, "ink", align="c")
    cut(c, rr(722, 1152, 160, 46, 16), "terra_l", 0.8, seed=12)
    txt(c, "ON/OFF", 802, 1184, "bold", 20, "ink", align="c")
    cut(c, rr(515, 960, 50, 52, 8), "ink2", 0.6)
    cut(c, rr(300, 940, 480, 26, 13), "paper3", 1.3, seed=13)


def draw_boat(c, x, y, pile):
    p = poly([(x - 100, y - 64), (x + 100, y - 64), (x + 70, y), (x - 70, y)])
    cut(c, p, "terra_l", 1.0, seed=14)
    if pile > 0:
        c.save(); c.clipPath(p, doAntiAlias=True)
        cut(c, oval(x, y - 6, 64 * math.sqrt(pile), 44 * pile + 6), "paper", 0.4, seed=15)
        c.restore()
    stroke(c, p, "terra_d", 2.5, 0.6)


def draw_spatula(c, tipx, tipy, ang, load):
    c.save(); c.translate(tipx, tipy); c.rotate(ang)
    cut(c, rr(0, -9, 330, 18, 9), "ink2", 0.9, seed=16)
    cut(c, rr(220, -16, 140, 32, 14), "amber_d", 0.9, seed=17)
    cut(c, oval(-6, -2, 44, 16), "ink3", 0.6, seed=18)
    if load > 0:
        cut(c, oval(-8, -12, 34 * load + 4, 13 * load + 2), "paper", 0.4, seed=19)
    c.restore()


# ---- measuring cylinder -----------------------------------------------------
CY_X, CY_TOP, CY_BASE = 400, 650, 1255
CY_Y0, CY_K = 1236, 5.5   # y of 0 cm³, px per cm³ (100 cm³ at 686)


def cy_y(v):
    return CY_Y0 - v * CY_K


def draw_cylinder(c, vol):
    x0, x1 = CY_X - 62, CY_X + 62
    outer = skia.Path()
    outer.moveTo(x0 - 18, CY_TOP - 6); outer.lineTo(x0, CY_TOP + 14)
    outer.lineTo(x0, CY_BASE - 14); outer.quadTo(x0, CY_BASE, x0 + 14, CY_BASE)
    outer.lineTo(x1 - 14, CY_BASE); outer.quadTo(x1, CY_BASE, x1, CY_BASE - 14)
    outer.lineTo(x1, CY_TOP); outer.close()
    inner = rr(x0 + 4, CY_TOP + 4, x1 - x0 - 8, CY_Y0 - CY_TOP - 4 + 4, 10)
    level = cy_y(vol) if vol > 0.05 else None
    vessel(c, outer, level, "teal_l", 0.8, men=6 if vol > 0.5 else 0, clip_inner=inner)
    for v in range(1, 101):
        y = cy_y(v); big = v % 10 == 0; mid = v % 5 == 0
        L = 34 if big else (22 if mid else 12)
        p = skia.Path(); p.moveTo(x0 + 4, y); p.lineTo(x0 + 4 + L, y)
        stroke(c, p, "ink", 2.0 if big else 1.2, 0.85 if big else 0.6, cap=False)
        if big:
            txt(c, str(v), x1 + 12, y + 7, "semi", 21, "ink2")
    txt(c, "cm³", x1 + 12, CY_TOP + 10, "bold", 22, "ink2")
    cut(c, poly([(CY_X - 120, CY_BASE + 34), (CY_X + 120, CY_BASE + 34), (CY_X + 92, CY_BASE - 2), (CY_X - 92, CY_BASE - 2)]),
        "amber", 1.3, seed=21)
    stroke(c, poly([(x0 + 10, CY_TOP + 40), (x0 + 10, CY_BASE - 30)], False), "white", 4, 0.55)


def draw_pour_beaker(c, px, py, ang, frac_left):
    """Beaker whose lip (top-left corner) is at (px,py), rotated by ang degrees."""
    w, h = 200, 230
    c.save(); c.translate(px, py); c.rotate(ang)
    outer = beaker_path(w / 2 + 10, 0, w, h)
    inner = beaker_path(w / 2 + 10, 0, w, h, 4)
    drop_shadow(c, outer, 0.5, 0.6)
    fill(c, outer, "white", 0.45)
    c.clipPath(inner, doAntiAlias=True)
    c.setMatrix(skia.Matrix())
    # world-horizontal liquid surface
    if frac_left > 0:
        if abs(ang) < 5:
            ly = py + h - frac_left * (h - 30)
        else:
            ly = py - 8 - 70 * frac_left
        fill(c, skia.Path.Rect(skia.Rect.MakeLTRB(px - 400, ly, px + 600, py + 600)), "teal_l", 0.8)
    c.restore()
    c.save(); c.translate(px, py); c.rotate(ang)
    stroke(c, outer, "teal_d", 3, 0.75)
    c.restore()


# ---- burette ----------------------------------------------------------------
BU_X, BU_TOP, BU_TAP = 520, 372, 1078
BU_Y0, BU_K = 402, 12.5      # y of 0.00 cm³, px per cm³ (50.00 at 1027)


def bu_y(v):
    return BU_Y0 + v * BU_K


def draw_stand(c):
    cut(c, rr(100, 1296, 290, 30, 10), "terra_d", 1.4, seed=22)
    cut(c, rr(186, 380, 20, 920, 10), "ink2", 1.2, seed=23)
    cut(c, rr(186, 640, 300, 22, 8), "ink2", 1.0, seed=24)
    cut(c, rr(176, 628, 40, 46, 8), "amber_d", 0.8, seed=25)


def draw_burette(c, vol, tap_open, flask_frac, flask_col="teal_xl"):
    x0, x1 = BU_X - 21, BU_X + 21
    outer = union(rr(x0, BU_TOP, 42, BU_TAP - BU_TOP + 10, 10),
                  poly([(BU_X - 9, BU_TAP + 30), (BU_X + 9, BU_TAP + 30), (BU_X + 3, BU_TAP + 82), (BU_X - 3, BU_TAP + 82)]))
    inner_tube = rr(x0 + 4, BU_TOP + 4, 34, BU_TAP - BU_TOP, 8)
    vessel(c, outer, bu_y(vol), "teal_l", 0.8, men=6, clip_inner=inner_tube)
    fill(c, poly([(BU_X - 5, BU_TAP + 30), (BU_X + 5, BU_TAP + 30), (BU_X + 1.5, BU_TAP + 80), (BU_X - 1.5, BU_TAP + 80)]), "teal_l", 0.85)
    for v in range(0, 51):
        y = bu_y(v); big = v % 5 == 0
        L = 22 if big else 11
        p = skia.Path(); p.moveTo(x0 + 4, y); p.lineTo(x0 + 4 + L, y)
        stroke(c, p, "ink", 2.0 if big else 1.2, 0.85 if big else 0.6, cap=False)
        if big:
            txt(c, str(v), x1 + 10, y + 7, "semi", 19, "ink2")
    stroke(c, poly([(x0 + 8, BU_TOP + 20), (x0 + 8, BU_TAP - 20)], False), "white", 3, 0.5)
    # clamp jaws
    cut(c, rr(x0 - 16, 630, 74, 42, 10), "amber_d", 0.9, seed=26)
    # stopcock
    cut(c, rr(BU_X - 15, BU_TAP + 2, 30, 32, 8), "paper2", 0.8, seed=27)
    c.save(); c.translate(BU_X, BU_TAP + 18); c.rotate(90 * tap_open)
    cut(c, rr(-36, -7, 72, 14, 7), "terra", 0.9, seed=28)
    c.restore()
    fill(c, circ(BU_X, BU_TAP + 18, 6), "terra_d")
    # white tile + flask
    cut(c, rr(400, 1300, 240, 16, 4), "white", 0.8, seed=29)
    return draw_flask(c, BU_X, 1300, 190, 190, flask_frac, flask_col, 0.85)


# ---- volumetric pipette ------------------------------------------------------
def pip_geom(tx, ty):
    return dict(tip=ty, lower_top=ty - 230, bulb_top=ty - 450, top=ty - 760,
                mark=ty - 640, filler=ty - 805)


def pip_paths(tx, ty, inset=0.0):
    g = pip_geom(tx, ty)
    i = inset
    lower = poly([(tx - 3.5 + i * 0.3, ty), (tx + 3.5 - i * 0.3, ty), (tx + 10 - i, g["lower_top"] + 10), (tx - 10 + i, g["lower_top"] + 10)])
    bulb = rr(tx - 52 + i, g["bulb_top"], 104 - 2 * i, g["lower_top"] - g["bulb_top"] + 20, 52 - i)
    upper = rr(tx - 10 + i, g["top"], 20 - 2 * i, g["bulb_top"] - g["top"] + 30, 6)
    return union(lower, bulb, upper)


def draw_pipette(c, tx, ty, level_y, show_label=True):
    g = pip_geom(tx, ty)
    outer = pip_paths(tx, ty)
    inner = pip_paths(tx, ty, 3.5)
    vessel(c, outer, level_y, "teal_l", 0.85, men=4, clip_inner=inner, glass_a=0.5)
    line(c, tx - 16, g["mark"], tx + 16, g["mark"], "ink", 3.5)
    stroke(c, poly([(tx - 34, g["bulb_top"] + 50), (tx - 34, g["lower_top"] - 20)], False), "white", 4, 0.55)
    if show_label:
        c.save(); c.translate(tx + 6, (g["bulb_top"] + g["lower_top"]) / 2 + 10); c.rotate(-90)
        txt(c, "25 cm³", 0, 8, "bold", 24, "teal_d", align="c")
        c.restore()
    # pipette filler
    cut(c, rr(tx - 15, g["filler"] + 20, 30, 70, 10), "terra_d", 0.8, seed=30)
    cut(c, circ(tx, g["filler"], 48), "terra", 1.2, seed=31)
    fill(c, oval(tx - 16, g["filler"] - 16, 14, 9), "white", 0.35)


# ---- mini icons (for overview / comparison / quiz) ---------------------------
def mini_icon(c, kind, cx, cy, s=1.0):
    c.save(); c.translate(cx, cy); c.scale(s, s)
    if kind == "stopwatch":
        draw_stopwatch(c, 0, 8, 52, 12, lcd=False)
    elif kind == "thermo":
        cut(c, union(rr(-11, -70, 22, 120, 11), circ(0, 55, 19)), "paper", 0.8)
        fill(c, rr(-3, -25, 6, 80, 3), "terra"); fill(c, circ(0, 55, 12), "terra")
        for k in range(6):
            line(c, -9, -58 + k * 16, -3, -58 + k * 16, "ink3", 1.5)
    elif kind == "balance":
        cut(c, rr(-70, 0, 140, 52, 12), "teal", 0.9)
        fill(c, rr(-52, 14, 70, 24, 5), "teal_xl")
        cut(c, rr(28, 14, 30, 14, 4), "amber", 0.3)
        cut(c, rr(-8, -16, 16, 18, 3), "ink2", 0.3)
        cut(c, rr(-58, -24, 116, 11, 5), "paper3", 0.6)
        cut(c, poly([(-26, -60), (26, -60), (18, -26), (-18, -26)]), "terra_l", 0.5)
    elif kind == "cylinder":
        o = rr(-20, -78, 40, 140, 7)
        vessel(c, o, -12, "teal_l", 0.85, men=3, shadow=0.3, clip_inner=rr(-17, -75, 34, 134, 5))
        for k in range(7):
            line(c, -17, 46 - k * 16, -7, 46 - k * 16, "ink", 1.4, 0.7)
        cut(c, poly([(-42, 72), (42, 72), (32, 58), (-32, 58)]), "amber", 0.6)
    elif kind == "burette":
        o = rr(-9, -82, 18, 128, 5)
        vessel(c, o, -50, "teal_l", 0.85, men=2, shadow=0.3, clip_inner=rr(-6, -79, 12, 122, 3))
        cut(c, rr(-26, 46, 52, 9, 4), "terra", 0.4)
        fill(c, poly([(-4, 55), (4, 55), (1, 78), (-1, 78)]), "teal_d", 0.7)
        for k in range(6):
            line(c, -6, -66 + k * 20, 0, -66 + k * 20, "ink", 1.3, 0.7)
    elif kind == "pipette":
        o = union(rr(-5, -84, 10, 60, 3), rr(-20, -30, 40, 60, 20), poly([(-5, 25), (5, 25), (1.5, 82), (-1.5, 82)]))
        vessel(c, o, -60, "teal_l", 0.85, men=2, shadow=0.3, clip_inner=o)
        line(c, -9, -64, 9, -64, "ink", 2.4)
    elif kind == "beaker":
        draw_beaker(c, 0, -60, 110, 125, 0, "teal_l", 0.75)
    c.restore()


# --------------------------------------------------------------------------
# Scenes
# --------------------------------------------------------------------------
CX = (SAFE_L + SAFE_R) / 2   # visual centre of the safe zone (510)


def sc_title(c, t, d):
    with pop(c, t, 0.0, CX, 330, dy=40) as v:
        if v:
            s = "SEC 4  ·  G3 PURE CHEMISTRY"
            w = tw(s, "bold", 28, 2.6) + 56
            cut(c, rr(CX - w / 2, 300, w, 60, 30), "accent", 0.8)
            txt(c, s, CX - (w - 56) / 2, 341, "bold", 28, "white", spacing=2.6)
    with pop(c, t, 0.15, CX, 720, dy=100, sc=0.95, dur=0.8) as v:
        if v:
            card(c, SAFE_L, 400, SAFE_R - SAFE_L, 640, 48, "accent_d", 2.0)
    for i, (s, size, colr, y) in enumerate([("Choosing the", 88, "white", 580),
                                              ("Right", 130, "hl", 720),
                                              ("Apparatus", 130, "hl", 850)]):
        with pop(c, t, 0.55 + 0.18 * i, CX, y - 40, dy=50) as v:
            if v:
                txt(c, s, CX, y, "disp", fit_size(s, "disp", size, 820), colr, align="c")
    with pop(c, t, 1.2, CX, 950, dy=30) as v:
        if v:
            txt(c, "time · temperature · mass · volume", CX, 965, "semi", 38, "white", a=0.85, align="c")
    with pop(c, t, 1.5, 230, 1300, dy=60, rot=-6) as v:
        if v:
            draw_flask(c, 230, 1420, 230, 250, 0.45, "amber_l", 0.9)
    with pop(c, t, 1.95, 500, 1290, dy=60, rot=-3) as v:
        if v:
            c.save(); c.translate(500, 1290); c.rotate(8)
            mini_icon(c, "thermo", 0, 0, 1.5)
            c.restore()
    with pop(c, t, 1.7, 770, 1290, dy=60, rot=6) as v:
        if v:
            draw_stopwatch(c, 770, 1310, 120, max(0, t - 1.7) * 3.0)


def sc_overview(c, t, d):
    heading(c, t, "FOUR QUANTITIES", "What are you measuring?", size=70)
    items = [("Time", "unit: s", "stopwatch"), ("Temperature", "unit: °C", "thermo"),
             ("Mass", "unit: g", "balance"), ("Volume", "unit: cm³", "cylinder")]
    cw, ch, gap = (SAFE_R - SAFE_L - 20) / 2, 380, 20
    for i, (name, unit, icon) in enumerate(items):
        x = SAFE_L + (i % 2) * (cw + gap); y = 610 + (i // 2) * (ch + gap)
        with pop(c, t, 0.3 + 0.15 * i, x + cw / 2, y + ch / 2, dy=60, rot=(-2 if i % 2 else 2)) as v:
            if v:
                card(c, x, y, cw, ch, 34, d=1.2)
                fill(c, circ(x + cw / 2, y + 150, 104), "bg")
                mini_icon(c, icon, x + cw / 2, y + 150, 1.25)
                txt(c, name, x + cw / 2, y + 305, "disp", 50, "ink_ui", align="c")
                txt(c, unit, x + cw / 2, y + 352, "semi", 34, "ink_ui2", align="c")
    draw_caption(c, t, [(0.5, "Choose by *what* you measure and *how precisely* you need it.")])


def sc_stopwatch(c, t, d):
    heading(c, t, "TIME", "Stopwatch", step=0)
    run = lin(t, 1.2, 6.0)
    secs = 34.62 * run
    press = max(1 - abs(t - 1.2) / 0.15, 1 - abs(t - 6.0) / 0.15, 0)
    with body(c):
        with pop(c, t, 0.25, 360, 760, dy=70, rot=-3) as v:
            if v:
                draw_stopwatch(c, 360, 800, 245, secs, press)
        with pop(c, t, 0.45, 810, 1080, dy=70, rot=3) as v:
            if v:
                cut(c, rr(660, 1240, 300, 50, 10), "white", 1.0, seed=70)
                cross_mark(c, 810, 1215, 70, "ink", 12)
                cloud = 0.15 + 0.83 * eio(lin(t, 1.2, 6.0))
                draw_flask(c, 810, 1240, 230, 260, 0.55, "amber_l", cloud)
                if 1.2 < t < 6.0:
                    txt(c, f"sped up ×{34.62 / (CUR['warp'].inv(6.0) - CUR['warp'].inv(1.2)):.0f}", 810, 935, "semi", 30, "ink_ui2", align="c")
        if t > 1.0:
            with alpha_layer(c, eo(lin(t, 1.0, 1.4))):
                tag_label(c, 810, 880, "START: acid added" if t < 6.0 else "STOP: X hidden", size=34, align="c")
    chips(c, t, 0.8, [("MEASURES", "time"), ("UNIT", "s"), ("READS TO", "0.01 s")])
    draw_caption(c, t, [(0.6, "Start and stop at the *exact moments* of the event."),
                        (4.3, "Reads to *0.01 s*, but your *reaction time* limits real precision.")])


def sc_thermo(c, t, d):
    heading(c, t, "TEMPERATURE", "Thermometer", step=1)
    T = 22 + 6.5 * eo(lin(t, 1.0, 4.2))
    with body(c):
        with pop(c, t, 0.25, 330, 800, dy=80, rot=-2) as v:
            if v:
                draw_thermometer(c, T)
                draw_beaker(c, 330, 1000, 300, 300, 1080, "teal_l", 0.55, glass_a=0.15)
        ia = eo(lin(t, 3.6, 4.2))
        if ia > 0:
            with alpha_layer(c, ia):
                c.save(); c.translate(0, 30 * (1 - ia))
                connector(c, 600, 760, TH_X + 12, th_y(T))
                draw_inset(c, 790, 700, 200, 28.5, 30, T, minor=1, major=5, liquid="terra",
                           tube_w=120, liq_w=34, men=0)
                tag_label(c, 790, 1000, f"{T:.1f} °C", size=52, align="c")
                st = lin(t, 4.4, 4.8)
                if st > 0:
                    with alpha_layer(c, st):
                        txt(c, "steady reading", 790, 1075, "semi", 34, "ink_ui2", align="c")
                c.restore()
    chips(c, t, 0.8, [("MEASURES", "temperature"), ("UNIT", "°C"), ("READS TO", "0.5 °C")])
    draw_caption(c, t, [(0.6, "Keep the bulb in the liquid. Wait for a *steady* reading."),
                        (4.2, "Read at *eye level* to the nearest 0.5 °C: here *28.5 °C*.")])


def sc_balance(c, t, d):
    heading(c, t, "MASS", "Electronic balance", step=2)
    land = eo(lin(t, 1.0, 1.5))
    boat_y = lerp(560, 940, land) if t < 1.5 else 940 + 6 * math.sin(min(1, (t - 1.5) / 0.3) * math.pi) * (1 - lin(t, 1.5, 1.8))
    add = lin(t, 3.6, 6.0)
    if t < 1.5:
        reading = 0.0
    elif t < 2.6:
        reading = 1.84
    elif t < 3.7:
        reading = 0.0
    else:
        reading = math.floor(2.50 * eio(add) * 100 + 1e-6) / 100
    press = max(0, 1 - abs(t - 2.5) / 0.15)
    flash = max(0, 1 - abs(t - 2.6) / 0.25)
    with body(c):
        c.save(); c.translate(0, -60)
        with pop(c, t, 0.25, 540, 1100, dy=80) as v:
            if v:
                draw_balance(c, reading, press, flash)
                if t > 0.9:
                    draw_boat(c, 540, boat_y, eio(add))
        if 3.0 < t < 6.8:
            sa = eo(lin(t, 3.0, 3.5)) * (1 - lin(t, 6.3, 6.8))
            with alpha_layer(c, sa):
                shake = 3 * math.sin(t * 40) if 3.6 < t < 6.0 else 0
                draw_spatula(c, 590, 800 + shake, -28, 1 - add)
                rng = np.random.default_rng(5)
                for k in range(26):
                    t0 = 3.6 + k * 0.09
                    ft = (t - t0) / 0.35
                    if 0 < ft < 1:
                        x = 585 + rng.uniform(-14, 10)
                        fill(c, circ(x, 800 + ft * ft * 120, 4), "paper", 1)
                        stroke(c, circ(x, 800 + ft * ft * 120, 4), "ink3", 1)
        if t > 2.3:
            a = eo(lin(t, 2.3, 2.6)) * (1 - lin(t, 3.4, 3.7))
            if a > 0:
                with alpha_layer(c, a):
                    tag_label(c, 540, 1345, "TARE → 0.00 g", size=40, align="c")
        if t > 6.1:
            with alpha_layer(c, eo(lin(t, 6.1, 6.5))):
                tag_label(c, 540, 1345, "mass of solid = 2.50 g", size=40, align="c")
        c.restore()
    chips(c, t, 0.8, [("MEASURES", "mass"), ("UNIT", "g"), ("READS TO", "0.01 g")])
    draw_caption(c, t, [(0.6, "Put the empty container on, then press *TARE* to reset to *0.00 g*."),
                        (3.7, "Add the solid. The display now shows its mass only: *2.50 g*.")])


def sc_cylinder(c, t, d):
    heading(c, t, "VOLUME · APPROX.", "Measuring cylinder", step=3)
    vol = 45.5 * eio(lin(t, 1.4, 4.4))
    with body(c):
        with pop(c, t, 0.25, CY_X, 950, dy=80, rot=-2) as v:
            if v:
                draw_cylinder(c, vol)
        if 0.5 < t < 5.4:
            come = eo(lin(t, 0.5, 1.0)); go = eio(lin(t, 4.6, 5.3))
            ang = -72 * eio(lin(t, 0.9, 1.35)) * (1 - eio(lin(t, 4.4, 4.9)))
            px = lerp(760, 452, come) + 560 * go
            py = 610
            if 1.35 < t < 4.4:
                sx = px - 4
                p = skia.Path(); p.moveTo(sx, py + 2)
                p.cubicTo(sx - 6, py + 60, sx - 14, py + 120, sx - 16, cy_y(vol) - 4)
                w = 10 * min(1, (t - 1.35) / 0.2, (4.4 - t) / 0.2)
                stroke(c, p, "teal_l", max(1, w), 0.9)
            with alpha_layer(c, 1 - go):
                draw_pour_beaker(c, px, py, ang, 1 - lin(t, 1.4, 4.4) * 0.8)
        ia = eo(lin(t, 4.6, 5.2))
        if ia > 0:
            with alpha_layer(c, ia):
                c.save(); c.translate(0, 30 * (1 - ia))
                connector(c, 616, 880, CY_X + 62, cy_y(vol))
                draw_inset(c, 810, 840, 195, 45.5, 26, vol, minor=1, major=5, liquid="teal_l",
                           tube_w=150, men=16)
                tag_label(c, 810, 1135, "45.5 cm³", size=52, align="c")
                c.restore()
    chips(c, t, 0.8, [("MEASURES", "volume"), ("UNIT", "cm³"), ("READS TO", "0.5 cm³")])
    draw_caption(c, t, [(0.6, "Quick and easy, but only for *approximate* volumes."),
                        (4.6, "Read the *bottom of the meniscus* at eye level: *45.5 cm³*.")])


def sc_burette(c, t, d):
    heading(c, t, "VOLUME · VARIABLE", "Burette", step=4)
    k = lin(t, 1.8, 6.2)
    vol = 1.20 + 23.45 * (1 - (1 - k) ** 1.6) if t > 1.8 else 1.20
    tap = eio(lin(t, 1.5, 1.8)) * (1 - eio(lin(t, 6.2, 6.5)))
    endp = eo(lin(t, 5.9, 6.4))
    with body(c):
        with pop(c, t, 0.25, 420, 850, dy=80, rot=-2) as v:
            if v:
                draw_stand(c)
                fl_ly = draw_burette(c, vol, tap, 0.25 + 0.12 * k, "terra_l" if endp > 0.5 else "teal_xl")
                if 1.8 < t < 6.3:
                    for n in range(int((t - 1.8) / 0.2) + 1):
                        ft = (t - 1.8 - n * 0.2) / 0.2
                        if 0 <= ft < 1:
                            y = BU_TAP + 84 + ft * ft * (fl_ly - BU_TAP - 84)
                            fill(c, circ(BU_X, y, 5.5), "teal_l", 0.95)
                            stroke(c, circ(BU_X, y, 5.5), "teal_d", 1.5, 0.6)
        ia = eo(lin(t, 0.8, 1.3))
        if ia > 0:
            with alpha_layer(c, ia):
                connector(c, 652, 620, BU_X + 22, bu_y(vol))
                draw_inset(c, 830, 610, 178, vol, 110, vol, minor=0.1, major=1, direction=-1,
                           liquid="teal_l", tube_w=130, men=14)
                tag_label(c, 830, 880, f"{round(vol * 20) / 20:.2f} cm³", size=46, align="c")
        if t > 1.0:
            with alpha_layer(c, eo(lin(t, 1.0, 1.4))):
                txt(c, "Initial", 640, 975, "semi", 34, "ink_ui2")
                txt(c, "1.20", 1015, 975, "bold", 38, "ink_ui", align="r")
        if t > 6.5:
            with alpha_layer(c, eo(lin(t, 6.5, 6.9))):
                txt(c, "Final", 640, 1030, "semi", 34, "ink_ui2")
                txt(c, "24.65", 1015, 1030, "bold", 38, "ink_ui", align="r")
        if t > 7.0:
            with pop(c, t, 7.0, 828, 1160, dy=30) as v:
                if v:
                    card(c, 625, 1065, 400, 190, 26, "accent", 1.2)
                    txt(c, "Volume added", 825, 1112, "semi", 30, "white", align="c")
                    txt(c, "24.65 − 1.20", 825, 1160, "semi", 34, "white", a=0.9, align="c")
                    txt(c, "= 23.45 cm³", 825, 1225, "bold", 48, "white", align="c")
    chips(c, t, 0.8, [("MEASURES", "variable vol."), ("UNIT", "cm³"), ("READS TO", "0.05 cm³")])
    draw_caption(c, t, [(0.6, "Delivers *variable* volumes. The scale reads *0.00 at the top*."),
                        (4.9, "Volume added = final − initial = *23.45 cm³* (read to 0.05 cm³).")])


def sc_pipette(c, t, d):
    heading(c, t, "VOLUME · FIXED", "Volumetric pipette", step=5)
    tx, ty = 420, 1225
    g = pip_geom(tx, ty)
    fill_k = eio(lin(t, 1.0, 2.4)); adj = eio(lin(t, 2.5, 3.3)); drain = lin(t, 5.6, 7.6)
    if t < 5.6:
        above = g["mark"] - 45
        lvl = lerp(ty + 10, above, fill_k) if t < 2.5 else lerp(above, g["mark"], adj)
    else:
        lvl = lerp(g["mark"], ty - 26, 1 - (1 - drain) ** 1.4)
    out_k = eio(lin(t, 4.4, 4.9)); in_k = eio(lin(t, 4.9, 5.5))
    flask_frac = 0.33 * (1 - (1 - drain) ** 1.4) if t > 5.6 else 0.0
    with body(c):
        if out_k < 1:
            with pop(c, t, 0.25, tx, 1180, dy=60) as v:
                if v:
                    with alpha_layer(c, 1 - out_k):
                        c.save(); c.translate(0, 280 * out_k)
                        draw_beaker(c, tx, 1050, 260, 250, 1160 + 40 * fill_k, "teal_l", 0.75)
                        c.restore()
        draw_pipette(c, tx, ty, lvl) if t > 0.5 else None
        if in_k > 0:
            with alpha_layer(c, in_k):
                c.save(); c.translate(0, 280 * (1 - in_k))
                draw_flask(c, tx, 1300, 240, 230, flask_frac, "teal_l", 0.8)
                c.restore()
            if 5.6 < t < 7.4:
                ffl = 1300 - 4 - flask_frac * 0.7 * 230
                p = skia.Path(); p.moveTo(tx, ty); p.lineTo(tx + 0.5, ffl)
                stroke(c, p, "teal_l", 4, 0.9)
        if t > 0.9:
            with alpha_layer(c, eo(lin(t, 0.9, 1.3)) * (1 - lin(t, 4.0, 4.4))):
                tag_label(c, tx - 70, g["filler"] + 12, "pipette filler", size=34, align="r")
        ia = eo(lin(t, 3.0, 3.5)) * (1 - lin(t, 4.1, 4.5))
        if ia > 0:
            with alpha_layer(c, ia):
                connector(c, 625, 640, tx + 12, g["mark"])
                draw_inset(c, 810, 640, 180, 0, 3.2, -(lvl - g["mark"]), liquid="teal_l",
                           tube_w=110, men=14, mark=0)
                tag_label(c, 810, 910, "on the mark", size=42, align="c")
        if t > 7.4:
            with alpha_layer(c, eo(lin(t, 7.4, 7.8))):
                tag_label(c, 770, 1000, "25.0 cm³ delivered", size=42, align="c")
    chips(c, t, 0.8, [("MEASURES", "fixed volume"), ("UNIT", "cm³"), ("DELIVERS", "25.0 cm³")])
    draw_caption(c, t, [(0.6, "Delivers *one fixed volume*, e.g. 25.0 cm³. Fill until the meniscus sits on the *mark*."),
                        (4.6, "Let it drain, tip touching the flask. *Don't blow out* the last drop.")])


TABLE = [("Stopwatch", "time", "0.01 s", "stopwatch"),
         ("Thermometer", "temperature", "0.5 °C", "thermo"),
         ("Electronic balance", "mass", "0.01 g", "balance"),
         ("Measuring cylinder", "approximate volume", "0.5 cm³", "cylinder"),
         ("Burette", "variable volume", "0.05 cm³", "burette"),
         ("Volumetric pipette", "one fixed volume", "fixed 25.0 cm³", "pipette")]


def sc_table(c, t, d):
    heading(c, t, "SUMMARY", "Side by side")
    with alpha_layer(c, eo(lin(t, 0.3, 0.7))):
        txt(c, "APPARATUS · MEASURES", SAFE_L + 4, 668, "bold", 22, "ink_ui2", spacing=2)
        txt(c, "READS TO", SAFE_R - 4, 668, "bold", 22, "ink_ui2", spacing=2, align="r")
    rh, rg = 126, 12
    for i, (name, meas, prec, icon) in enumerate(TABLE):
        y = 690 + i * (rh + rg)
        with pop(c, t, 0.4 + 0.2 * i, CX, y + rh / 2, dy=50, rot=(1 if i % 2 else -1)) as v:
            if v:
                card(c, SAFE_L, y, SAFE_R - SAFE_L, rh, 24)
                fill(c, circ(SAFE_L + 66, y + rh / 2, 48), "bg")
                mini_icon(c, icon, SAFE_L + 66, y + rh / 2 + 4, 0.55)
                w = tw(prec, "bold", 32) + 40
                txt(c, name, SAFE_L + 134, y + 58, "bold", fit_size(name, "bold", 38, SAFE_R - SAFE_L - 160 - w), "ink_ui")
                txt(c, meas, SAFE_L + 134, y + 100, "med", 30, "ink_ui2")
                cut(c, rr(SAFE_R - 22 - w, y + 33, w, 60, 30), "accent", 0.5)
                txt(c, prec, SAFE_R - 22 - w + 20, y + 74, "bold", 32, "white")
    draw_caption(c, t, [(1.0, "Match the *quantity* first. For volume: *fixed* or *variable*, and how *precise*?")])


def sc_precision(c, t, d):
    heading(c, t, "PRECISION", "Measuring 25 cm³")
    X = lambda v: 120 + (v - 24.0) * 390
    rows = [("Measuring cylinder", 0.5, "±0.5", "terra"),
            ("Burette (per reading)", 0.05, "±0.05", "teal"),
            ("Volumetric pipette", 0.06, "±0.06", "teal_d")]
    with alpha_layer(c, eo(lin(t, 0.4, 0.9))):
        line(c, X(25), 640, X(25), 1260, "ink3", 2.5, dash=[10, 10])
        line(c, X(24), 1260, X(26), 1260, "ink_ui", 3)
        for v in (24.0, 24.5, 25.0, 25.5, 26.0):
            line(c, X(v), 1250, X(v), 1272, "ink_ui", 3)
            txt(c, f"{v:.1f}", X(v), 1315, "semi", 30, "ink_ui2", align="c")
        txt(c, "volume / cm³", X(25), 1360, "semi", 28, "ink_ui2", align="c")
    for i, (name, u, lab, cc) in enumerate(rows):
        y = 660 + i * 200
        with pop(c, t, 0.5 + 0.35 * i, CX, y + 60, dy=40) as v:
            if v:
                txt(c, name, SAFE_L + 10, y + 34, "bold", 38, "ink_ui")
                txt(c, lab + " cm³", SAFE_R - 10, y + 34, "bold", 38, "ink_ui", align="r")
                k = eo(lin(t, 0.8 + 0.35 * i, 1.6 + 0.35 * i))
                half = max(4, u * 390 * k)
                cut(c, rr(X(25) - half, y + 66, 2 * half, 50, min(10, half)), cc, 1.0)
                line(c, X(25), y + 56, X(25), y + 126, "ink_ui", 3)
    if t > 2.6:
        with pop(c, t, 2.6, CX, 1440, dy=30) as v:
            if v:
                tag_label(c, CX, 1455, "narrower band = more precise", size=36, bg="hl", align="c")
    with alpha_layer(c, eo(lin(t, 1.5, 2.0))):
        txt(c, "Typical values; tolerance depends on the grade of glassware.", CX, 1530, "med", 25, "ink_ui2", align="c")
    draw_caption(c, t, [(0.8, "A measuring cylinder is about *10× less precise* than a burette or pipette.")])


QUIZ_OPTS = [("A", "Beaker", "beaker", "Its markings are only a rough guide."),
             ("B", "Measuring cylinder", "cylinder", "Only ±0.5 cm³: not accurate enough."),
             ("C", "Burette", "burette", "For adding variable volumes (the titrant)."),
             ("D", "Volumetric pipette", "pipette", "Delivers a fixed 25.0 cm³ accurately.")]


def sc_quiz(c, t, d):
    heading(c, t, "TRY THIS", "Exam-style question", size=72)
    q = "A student needs exactly *25.0 cm³* of NaOH(aq) in a conical flask for a titration. Which apparatus should be used?"
    lines = rich_layout(q, 40, CAP_W)
    qh = len(lines) * 54 + 54
    with pop(c, t, 0.3, CX, CAP_TOP + qh / 2, dy=40) as v:
        if v:
            card(c, SAFE_L, CAP_TOP, SAFE_R - SAFE_L, qh, 26, d=1.1)
            c.save(); c.clipPath(rr(SAFE_L, CAP_TOP, SAFE_R - SAFE_L, qh, 26), doAntiAlias=True)
            fill(c, rr(SAFE_L, CAP_TOP, 12, qh, 0), "accent"); c.restore()
            rich_draw(c, lines, CAP_X, CAP_TOP + 26 + 38, 40, 54)
    R = QUIZ["R"]
    reveal = eo(lin(t, R, R + 0.6))
    gy = CAP_TOP + qh + 28
    cw, ch, gap = (SAFE_R - SAFE_L - 20) / 2, 300, 20
    for i, (L, name, icon, why) in enumerate(QUIZ_OPTS):
        x = SAFE_L + (i % 2) * (cw + gap); y = gy + (i // 2) * (ch + gap)
        correct = L == "D"
        with pop(c, t, 0.9 + 0.15 * i, x + cw / 2, y + ch / 2, dy=50) as v:
            if not v:
                continue
            with alpha_layer(c, 1 if correct else 1 - 0.4 * reveal):
                c.save()
                if correct and reveal > 0:
                    s = 1 + 0.04 * math.sin(reveal * math.pi)
                    c.translate(x + cw / 2, y + ch / 2); c.scale(s, s); c.translate(-(x + cw / 2), -(y + ch / 2))
                card(c, x, y, cw, ch, 28, d=1.1)
                if correct and reveal > 0:
                    fill(c, rr(x, y, cw, ch, 28), "accent", reveal)
                on = correct and reveal > 0.5
                tc = "white" if on else "ink_ui"
                fill(c, circ(x + 58, y + 62, 34), "hl")
                txt(c, L, x + 58, y + 76, "disp", 38, "ink_ui", align="c")
                txt(c, name, x + 28, y + 162, "bold", fit_size(name, "bold", 38, cw - 50), tc)
                c.save(); c.translate(x + cw - 66, y + 66)
                if on:
                    fill(c, circ(0, 0, 50), "white", 0.9)
                mini_icon(c, icon, 0, 0, 0.48)
                c.restore()
                if reveal > 0:
                    with alpha_layer(c, reveal):
                        wl = rich_layout(why, 28, cw - 90)
                        rich_draw(c, wl, x + 28, y + 206, 28, 36, color="white" if correct else "ink_ui2")
                        if correct:
                            fill(c, circ(x + cw - 42, y + ch - 42, 26), "hl")
                            check_mark(c, x + cw - 42, y + ch - 42, 26, "ink_ui", 5)
                        else:
                            cross_mark(c, x + cw - 42, y + ch - 42, 22, "ink_ui2", 4.5)
                c.restore()
    by = gy + 2 * (ch + gap) + 6
    if 1.6 < t < R:
        k = lin(t, 1.8, R - 0.2)
        with alpha_layer(c, eo(lin(t, 1.6, 2.0)) * (1 - lin(t, R - 0.2, R))):
            fill(c, rr(SAFE_L, by, SAFE_R - SAFE_L, 14, 7), "ink3", 0.35)
            fill(c, rr(SAFE_L, by, (SAFE_R - SAFE_L) * (1 - k), 14, 7), "accent")
            txt(c, "Pause and choose A, B, C or D", CX, by + 66, "semi", 36, "ink_ui", align="c")
    if t > R + 0.3:
        with pop(c, t, R + 0.3, CX, by + 70, dy=30) as v:
            if v:
                al = rich_layout("Answer: *D*. A fixed, accurate volume → volumetric pipette.", 36, SAFE_R - SAFE_L - 60)
                hh = len(al) * 48 + 44
                card(c, SAFE_L, by - 6, SAFE_R - SAFE_L, hh, 24, "card", 1.1)
                rich_draw(c, al, SAFE_L + 30, by - 6 + 22 + 34, 36, 48)


def sc_outro(c, t, d):
    with pop(c, t, 0.0, CX, 700, dy=40) as v:
        if v:
            txt(c, "Choose wisely.", CX, 720, "disp", 100, "ink_ui", align="c")
    for i, s in enumerate(["Quantity", "Apparatus", "Precision"]):
        with pop(c, t, 0.25 + 0.2 * i, CX, 860 + i * 140, dy=40) as v:
            if v:
                w = tw(s, "bold", 46) + 84
                cut(c, rr(CX - w / 2, 820 + i * 150, w, 90, 45), "accent" if i != 1 else "hl", 1.0)
                txt(c, s, CX, 881 + i * 150, "bold", 46, "white" if i != 1 else "ink_ui", align="c")
                if i < 2:
                    line(c, CX, 914 + i * 150, CX, 960 + i * 150, "ink_ui2", 4)
                    fill(c, poly([(CX - 10, 950 + i * 150), (CX + 10, 950 + i * 150), (CX, 964 + i * 150)]), "ink_ui2")
    with alpha_layer(c, eo(lin(t, 0.8, 1.2))):
        txt(c, "Sec 4 · G3 Pure Chemistry", CX, 1340, "semi", 32, "ink_ui2", align="c")


BASE_SCENES = [  # name, start, base duration, fn  (base timings of the animation)
    ("title", 0.0, 5.5, sc_title),
    ("overview", 5.5, 4.0, sc_overview),
    ("stopwatch", 9.5, 8.0, sc_stopwatch),
    ("thermo", 17.5, 8.0, sc_thermo),
    ("balance", 25.5, 8.0, sc_balance),
    ("cylinder", 33.5, 8.5, sc_cylinder),
    ("burette", 42.0, 9.5, sc_burette),
    ("pipette", 51.5, 8.5, sc_pipette),
    ("table", 60.0, 8.0, sc_table),
    ("precision", 68.0, 5.5, sc_precision),
    ("quiz", 73.5, 14.0, sc_quiz),
    ("outro", 87.5, 2.0, sc_outro),
]

# ---- Voice-over driven timeline ---------------------------------------------------
# Each scene is re-timed to fit its narration with a piecewise-linear time warp:
# base animation time [0, CAP2] plays over [0, start of line 2] and [CAP2, base] over the
# rest, so the animation reaches the moment the second key point describes exactly when
# that line is spoken. Key-point card i appears when narration line i starts.
CAP2_BASE = {"stopwatch": 4.3, "thermo": 4.2, "balance": 3.7, "cylinder": 4.6, "burette": 4.9, "pipette": 4.6}
VO_LEAD, VO_GAP, VO_TAIL = 0.45, 0.4, 0.8
MIN_DUR = {"table": 6.0}   # scenes allowed to play faster than their base timing
CUR = dict(scene=None, real_t=0.0, warp=None)
QUIZ = dict(R=7.0)


def _load_plan():
    p = os.path.join(HERE, "vo", "plan.json")
    if os.path.exists(p):
        import json
        with open(p) as f:
            return json.load(f)
    return None


PLAN = _load_plan()


class Warp:
    """Maps real scene time -> base animation time (piecewise linear, monotonic)."""

    def __init__(self, knots):          # list of (real, base), starting at (0, 0)
        self.k = knots

    def __call__(self, t):
        k = self.k
        for (r0, b0), (r1, b1) in zip(k, k[1:]):
            if t <= r1:
                return b0 + (t - r0) * (b1 - b0) / (r1 - r0)
        (r0, b0), (r1, b1) = k[-2], k[-1]
        return b1 + (t - r1) * (b1 - b0) / (r1 - r0)

    def inv(self, b):
        k = self.k
        for (r0, b0), (r1, b1) in zip(k, k[1:]):
            if b <= b1:
                return r0 + (b - b0) * (r1 - r0) / (b1 - b0)
        return k[-1][0]


def build_timeline():
    scenes, events, cap_times, t0 = [], [], {}, 0.0
    for name, _, base, fn in BASE_SCENES:
        lines = PLAN["scenes"].get(name, []) if PLAN else []
        starts, dur = [], base
        if name == "quiz" and len(lines) == 2:
            s1 = 0.4; R = max(7.0, s1 + lines[0]["dur"] + 1.5)   # ~2 s thinking pause
            s2 = R + 0.5
            starts = [s1, s2]; QUIZ["R"] = R
            dur = s2 + lines[1]["dur"] + 1.5
            warp = Warp([(0, 0), (dur, dur)])                      # quiz is timed explicitly
        elif lines:
            tc = 0.7 if name == "title" else VO_LEAD
            for l in lines:
                starts.append(tc); tc += l["dur"] + VO_GAP
            dur = max(MIN_DUR.get(name, base), tc - VO_GAP + VO_TAIL)
            if len(lines) == 2 and name in CAP2_BASE:
                warp = Warp([(0, 0), (starts[1], CAP2_BASE[name]), (dur, base)])
            else:
                warp = Warp([(0, 0), (dur, base)])
        else:
            warp = Warp([(0, 0), (base, base)])
        scenes.append((name, t0, dur, fn, warp))
        cap_times[name] = starts
        events += [(t0 + st, l["file"]) for st, l in zip(starts, lines)]
        t0 += dur
    return scenes, events, cap_times


SCENES, VO_EVENTS, CAP_TIMES = build_timeline()
DURATION = SCENES[-1][1] + SCENES[-1][2]
NFRAMES = int(round(DURATION * FPS))


def render_frame(c, gt):
    draw_background(c, gt)
    for name, st, du, fn, warp in SCENES:
        if st <= gt < st + du or (name == SCENES[-1][0] and gt >= st):
            t = gt - st
            CUR.update(scene=name, real_t=t, warp=warp)
            out = 1 - eio(lin(t, du - 0.32, du)) if name != "outro" else 1.0
            with alpha_layer(c, out):
                c.save(); c.translate(0, -30 * (1 - out))
                fn(c, warp(t), du)
                c.restore()
            break


# --------------------------------------------------------------------------
# Audio: ambient pad + paper-cut sound design (all synthesised)
# --------------------------------------------------------------------------
SR = 48000


def make_audio(path):
    """Voice-over only: each narration line placed at its scheduled time (48 kHz)."""
    import soundfile as sf
    from scipy.signal import resample_poly
    n = int((DURATION + 0.2) * SR)
    out = np.zeros(n)
    for t0, fname in VO_EVENTS:
        x, sr = sf.read(os.path.join(HERE, "vo", fname))
        if x.ndim > 1:
            x = x.mean(1)
        x = resample_poly(x, SR, sr)
        i0 = int(t0 * SR)
        L = min(len(x), n - i0)
        out[i0:i0 + L] += x[:L]
    out = out[: int(DURATION * SR)]
    out *= 0.89 / (np.abs(out).max() + 1e-9)
    pcm = (out * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(np.stack([pcm, pcm], 1).tobytes())


# Gentle voice polish: rumble cut, light compression, loudness to -16 LUFS (social standard).
VOICE_AF = "highpass=f=75,acompressor=threshold=-21dB:ratio=2.5:attack=8:release=120:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7"


# --------------------------------------------------------------------------
# Rendering drivers
# --------------------------------------------------------------------------
def render_segment(args):
    i0, i1, path = args[:3]
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-g", "60", "-bf", "2", "-aspect", "9:16", path]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(i0, i1):
        c.clear(col("cream"))
        render_frame(c, i / FPS)
        pr.stdin.write(surf.makeImageSnapshot().toarray().tobytes())
        if (i - i0) % 150 == 0:
            print(f"  [{os.path.basename(path)}] frame {i}/{i1}", flush=True)
    pr.stdin.close(); pr.wait()
    return path


def render_still(t, path):
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    c.clear(col("cream"))
    render_frame(c, t)
    surf.makeImageSnapshot().save(path, skia.kPNG)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", nargs="*", type=float)
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 2)
    ap.add_argument("--out", default=os.path.join(OUT, "apparatus_selection_reel.mp4"))
    ap.add_argument("--cover", type=float, default=None, help="save a cover PNG at this time (s)")
    ap.add_argument("--remux-audio", action="store_true",
                    help="regenerate the soundtrack and remux it into an existing --out file")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    if a.cover is not None:
        p = os.path.join(OUT, "reel_cover.png")
        render_still(a.cover, p); print(p)
        return
    if a.remux_audio:
        wav = os.path.join(OUT, "soundtrack.wav"); make_audio(wav)
        tmp = a.out + ".tmp.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.out, "-i", wav, "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-aspect", "9:16", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", tmp], check=True)
        os.replace(tmp, a.out); os.remove(wav); print("Remuxed audio into", a.out)
        return
    if a.stills is not None:
        d = os.path.join(OUT, "stills"); os.makedirs(d, exist_ok=True)
        for t in a.stills:
            p = os.path.join(d, f"t{t:05.1f}.png"); render_still(t, p); print(p)
        return
    import multiprocessing as mp
    nw = max(1, a.workers)
    bounds = [round(NFRAMES * k / nw) for k in range(nw + 1)]
    segs = [(bounds[k], bounds[k + 1], os.path.join(OUT, f"seg{k}.mp4")) for k in range(nw)]
    print(f"Rendering {NFRAMES} frames ({DURATION:.1f} s) with {nw} workers…")
    with mp.Pool(nw) as pool:
        pool.map(render_segment, segs)
    lst = os.path.join(OUT, "segments.txt")
    with open(lst, "w") as f:
        for sg in segs:
            f.write(f"file '{sg[2]}'\n")
    wav = os.path.join(OUT, "soundtrack.wav")
    make_audio(wav)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-i", wav, "-c:v", "copy", "-aspect", "9:16", "-af", VOICE_AF, "-ar", "48000", "-c:a", "aac", "-b:a", "160k", "-shortest",
                    "-movflags", "+faststart", a.out], check=True)
    for sg in segs:
        os.remove(sg[2])
    os.remove(lst); os.remove(wav)
    print("Wrote", a.out)


if __name__ == "__main__":
    main()
