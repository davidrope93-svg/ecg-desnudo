"""Iconos de la app instalable (PWA): trazo del logotipo sobre papel milimetrado oscuro. Uso: python3 tools/make_icons.py"""
from PIL import Image, ImageDraw
PTS = [(1, 12), (8, 12), (10, 8), (12, 17), (15, 1), (18, 15), (20, 12), (29, 12)]  # mismo trazo que el logotipo de la cabecera (viewBox 30 × 20)
BG, MINOR, MAJOR, RED = (22, 25, 29), (31, 35, 40), (44, 50, 57), (229, 72, 77)

def icon(size, trace_w, radius, out):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(radius * S), fill=BG)
    step = S / 16
    for k in range(1, 16):
        col, w = (MAJOR, 6) if k % 4 == 0 else (MINOR, 3)
        d.line([(k * step, 0), (k * step, S)], fill=col, width=w)
        d.line([(0, k * step), (S, k * step)], fill=col, width=w)
    if radius:  # recorta la cuadrícula a las esquinas redondeadas
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(radius * S), fill=255)
        im.putalpha(mask)
    sc = trace_w * S / 28
    ox, oy = (S - 28 * sc) / 2 - 1 * sc, (S - 16 * sc) / 2 - 1 * sc
    pts = [(ox + x * sc, oy + y * sc) for x, y in PTS]
    lw = max(4, int(sc * 2.1))
    d.line(pts, fill=RED, width=lw, joint='curve')
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - lw / 2, y - lw / 2, x + lw / 2, y + lw / 2], fill=RED)
    im = im.resize((size, size), Image.LANCZOS)
    if not radius:
        im = im.convert('RGB')
    im.save(out, optimize=True)
    print(out, size)

icon(192, 0.74, 0.22, 'icons/icon-192.png')
icon(512, 0.74, 0.22, 'icons/icon-512.png')
icon(512, 0.58, 0, 'icons/icon-maskable-512.png')  # zona segura: el trazo cabe en el círculo central del 80 %
icon(180, 0.68, 0, 'icons/apple-touch-icon.png')  # iOS redondea las esquinas
