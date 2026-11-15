"""
G-NOSIS - demos animadas (GIF pixel art) de los 12 minijuegos.

Antes de cada minijuego el juego muestra instrucciones cortas y una de estas
demos (public/img/minijuegos/<tipo>.gif): una manita juega una ronda de ejemplo.

Uso:  python herramientas/generar-demos-minijuegos.py      (requiere: pip install pillow)
"""
import os
import random
from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(RAIZ, "public", "img", "minijuegos")
os.makedirs(OUT, exist_ok=True)

W, H, ESC, MS = 160, 96, 3, 110      # tamano a 1x, escala del GIF, ms por cuadro

FONDO = (10, 12, 28); PANEL = (22, 24, 54); BORDE = (64, 60, 118); TINTA = (235, 240, 255); TENUE = (110, 116, 150)
ROJO = (255, 90, 80); AMBAR = (255, 170, 60); CIAN = (120, 245, 255); VERDE = (90, 220, 120); LILA = (168, 162, 232)
CREMA = (255, 246, 225); AZUL = (70, 125, 245); POLVO = (120, 112, 170); OSCURO = (24, 22, 52)

MANO = ["..X....", ".XWX...", ".XWX...", ".XWXXX.", "XXWWWWX", "XWWWWWX", "XWWWWWX", ".XWWWX.", "..XXX.."]

# fuente de 3x5 para numeros y pocas letras
DIG = {"0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
       "5": "111100111001111", "R": "110101110101101", "+": "000010111010000", "-": "000000111000000", "?": "111001011000010",
       "<": "001010100010001", ">": "100010001010100", "^": "010101000000000", "v": "000000101010000", "@": "010101111100011"}


def texto(d, x, y, s, c=TINTA):
    for ch in s:
        m = DIG.get(ch)
        if m:
            for i, b in enumerate(m):
                if b == "1":
                    d.point((x + i % 3, y + i // 3), fill=c)
        x += 4


def caja(d, x0, y0, x1, y1, relleno, borde=BORDE):
    d.rectangle((x0, y0, x1, y1), fill=relleno, outline=borde)


def mano(img, x, y, toca=False):
    d = ImageDraw.Draw(img)
    if toca:   # destello al tocar
        for dx, dy in ((-3, 0), (3, 0), (0, -3), (-2, -2), (2, -2)):
            d.point((x + 2 + dx, y + dy), fill=CREMA)
    for j, fila in enumerate(MANO):
        for i, ch in enumerate(fila):
            if ch != ".":
                d.point((x + i, y + j), fill=OSCURO if ch == "X" else TINTA)


def lienzo():
    img = Image.new("RGB", (W, H), FONDO)
    return img, ImageDraw.Draw(img)


def camino(a, b, n):
    return [(round(a[0] + (b[0] - a[0]) * k / n), round(a[1] + (b[1] - a[1]) * k / n)) for k in range(1, n + 1)]


def guardar(nombre, cuadros):
    grandes = [c.resize((W * ESC, H * ESC), Image.NEAREST) for c in cuadros]
    grandes[0].save(os.path.join(OUT, nombre + ".gif"), save_all=True, append_images=grandes[1:], duration=MS, loop=0, optimize=True)
    print("listo", nombre + ".gif", len(cuadros), "cuadros")


# ---------------- 1. cables ----------------
def cables():
    cols = [ROJO, AMBAR, CIAN]; der = [1, 2, 0]
    L = [(14, 18 + i * 22) for i in range(3)]; R = [(104, 18 + i * 22) for i in range(3)]
    hechos, cuadros, pos = [], [], (80, 80)

    def pintar(sel=None, mpos=(0, 0), toca=False):
        img, d = lienzo()
        for i, (x, y) in enumerate(L):
            caja(d, x, y, x + 40, y + 14, PANEL, cols[i] if i not in hechos else TENUE)
            if sel == i: d.rectangle((x + 1, y + 1, x + 39, y + 13), fill=cols[i])
            d.rectangle((x + 4, y + 5, x + 7, y + 8), fill=cols[i])
        for j, (x, y) in enumerate(R):
            i = der[j]
            caja(d, x, y, x + 40, y + 14, PANEL, cols[i] if i not in hechos else TENUE)
            d.rectangle((x + 33, y + 5, x + 36, y + 8), fill=cols[i])
        for i in hechos:
            j = der.index(i)
            d.line((L[i][0] + 40, L[i][1] + 7, R[j][0], R[j][1] + 7), fill=cols[i], width=2)
        mano(img, *mpos, toca)
        return img
    for i in range(3):
        a = (L[i][0] + 20, L[i][1] + 8)
        for p in camino(pos, a, 5): cuadros.append(pintar(None, p))
        cuadros += [pintar(i, a, True), pintar(i, a)]
        b = (R[der.index(i)][0] + 18, R[der.index(i)][1] + 8)
        for p in camino(a, b, 6): cuadros.append(pintar(i, p))
        hechos.append(i); cuadros += [pintar(None, b, True), pintar(None, b), pintar(None, b)]
        pos = b
    cuadros += [pintar(None, pos)] * 6
    return cuadros


# ---------------- 2. limpiar ----------------
def limpiar():
    C, F, cw, ch, x0, y0 = 10, 4, 12, 14, 20, 18
    limpio = set(); cuadros = []
    ruta = []
    for f in range(F):
        cols = range(C) if f % 2 == 0 else range(C - 1, -1, -1)
        ruta += [(c, f) for c in cols]

    def pintar(mpos):
        img, d = lienzo()
        caja(d, x0 - 3, y0 - 3, x0 + C * cw + 2, y0 + F * ch + 2, (20, 30, 70))
        for f in range(F):
            for c in range(C):
                col = AZUL if (c, f) in limpio else POLVO
                d.rectangle((x0 + c * cw, y0 + f * ch, x0 + c * cw + cw - 2, y0 + f * ch + ch - 2), fill=col)
                if (c, f) not in limpio: d.point((x0 + c * cw + 4, y0 + f * ch + 5), fill=(80, 74, 120))
                else: d.line((x0 + c * cw + 1, y0 + f * ch + 1, x0 + c * cw + 4, y0 + f * ch + 1), fill=(150, 190, 255))
        mano(img, *mpos, True)
        return img
    for k, (c, f) in enumerate(ruta):
        limpio.add((c, f))
        if k % 1 == 0: cuadros.append(pintar((x0 + c * cw + 3, y0 + f * ch + 4)))
    cuadros += [pintar((x0 + 3, y0 + 3 * ch + 4))] * 8
    return cuadros


# ---------------- 3. atrapar ----------------
def atrapar():
    Lc, lw, x0 = 5, 24, 20
    cuadros = []; plat = 2; atrap = 0
    caidas = [(4, 0), (1, 14), (3, 28)]

    def pintar(obj, flecha=None):
        img, d = lienzo()
        for l in range(Lc):
            d.rectangle((x0 + l * lw, 8, x0 + l * lw + lw - 2, 80), fill=(20, 22, 50))
        if obj: d.rectangle((x0 + obj[0] * lw + 8, obj[1], x0 + obj[0] * lw + 14, obj[1] + 6), fill=AMBAR)
        d.rectangle((x0 + plat * lw + 2, 76, x0 + plat * lw + lw - 4, 79), fill=CIAN)
        for k, s in enumerate("<>"):
            on = flecha == k
            caja(d, 60 + k * 26, 84, 80 + k * 26, 94, CREMA if on else PANEL)
            texto(d, 68 + k * 26, 87, s, OSCURO if on else TINTA)
        return img
    for lane, t0 in caidas:
        for y in range(8, 72, 4):
            fl = None
            if plat != lane and y > 24 and y % 8 == 0:
                fl = 0 if lane < plat else 1
                plat += -1 if lane < plat else 1
            cuadros.append(pintar((lane, y), fl))
        cuadros += [pintar(None)] * 3
    return cuadros


# ---------------- 4. laberinto ----------------
def laberinto():
    mapa = ["#########", "#@..#...#", "#.#.#.#.#", "#.#...#R#", "#########"]
    cs = 12; x0, y0 = 26, 12
    ruta = [(1, 1), (2, 1), (3, 1), (3, 2), (3, 3), (4, 3), (5, 3), (5, 2), (5, 1), (6, 1), (7, 1), (7, 2), (7, 3)]
    dirs = []
    for a, b in zip(ruta, ruta[1:]):
        dirs.append({(1, 0): 3, (-1, 0): 0, (0, 1): 2, (0, -1): 1}[(b[0] - a[0], b[1] - a[1])])
    cuadros = []

    def pintar(p, flecha=None, fin=False):
        img, d = lienzo()
        for y, fila in enumerate(mapa):
            for x, ch in enumerate(fila):
                X, Y = x0 + x * cs, y0 + y * cs
                if ch == "#": d.rectangle((X, Y, X + cs - 1, Y + cs - 1), fill=(60, 58, 110))
                else: d.rectangle((X, Y, X + cs - 1, Y + cs - 1), fill=(30, 32, 70))
                if ch == "R": d.rectangle((X + 2, Y + 2, X + cs - 3, Y + cs - 3), fill=VERDE if fin else (40, 90, 60)); texto(d, X + 4, Y + 3, "R", OSCURO)
        X, Y = x0 + p[0] * cs, y0 + p[1] * cs
        d.rectangle((X + 3, Y + 3, X + cs - 4, Y + cs - 4), fill=CREMA)
        for k, s in enumerate("<^v>"):
            on = flecha == k
            caja(d, 44 + k * 18, 76, 58 + k * 18, 88, CREMA if on else PANEL)
            texto(d, 50 + k * 18, 80, s, OSCURO if on else TINTA)
        return img
    for i, p in enumerate(ruta):
        cuadros.append(pintar(p, dirs[i - 1] if i else None))
        cuadros.append(pintar(p))
    cuadros += [pintar(ruta[-1], fin=True)] * 8
    return cuadros


# ---------------- 5. tapar ----------------
def tapar():
    C, F, cw, ch, x0, y0 = 6, 3, 20, 18, 20, 16
    orden = [(1, 0), (4, 2), (2, 1), (5, 0)]
    tapados = set(); cuadros = []; pos = (80, 86)

    def pintar(hoyo, mpos, toca=False):
        img, d = lienzo()
        for f in range(F):
            for c in range(C):
                X, Y = x0 + c * cw, y0 + f * ch
                col = (90, 96, 140)
                if (c, f) in tapados: col = (70, 150, 90)
                if (c, f) == hoyo: col = (12, 10, 20)
                caja(d, X, Y, X + cw - 3, Y + ch - 3, col, ROJO if (c, f) == hoyo else BORDE)
                if (c, f) == hoyo:
                    for k in range(3): d.point((X + 6 + k * 3, Y - 2 - k), fill=CIAN)
        mano(img, *mpos, toca)
        return img
    for h in orden:
        tgt = (x0 + h[0] * cw + 6, y0 + h[1] * ch + 6)
        cuadros += [pintar(h, pos)] * 2
        for p in camino(pos, tgt, 4): cuadros.append(pintar(h, p))
        tapados.add(h); cuadros += [pintar(None, tgt, True), pintar(None, tgt)]
        pos = tgt
    cuadros += [pintar(None, pos)] * 6
    return cuadros


# ---------------- 6. secuencia ----------------
def secuencia():
    posic = [(14, 50), (84, 50), (14, 72), (84, 72)]
    numeros = [3, 1, 4, 2]       # lo que dice cada boton
    hechos = []; cuadros = []; pos = (80, 30)

    def pintar(mpos, toca=False):
        img, d = lienzo()
        caja(d, 14, 8, 146, 42, (14, 16, 38))
        for k, n in enumerate(hechos):
            d.rectangle((20, 12 + k * 7, 24, 16 + k * 7), fill=VERDE); d.line((28, 14 + k * 7, 60, 14 + k * 7), fill=VERDE)
            texto(d, 64, 12 + k * 7, str(n), VERDE)
        for i, (x, y) in enumerate(posic):
            hecho = numeros[i] in hechos
            caja(d, x, y, x + 60, y + 16, (30, 32, 70) if not hecho else (30, 60, 40), VERDE if hecho else BORDE)
            texto(d, x + 6, y + 6, str(numeros[i]), VERDE if hecho else TINTA)
            d.line((x + 14, y + 8, x + 50, y + 8), fill=TENUE)
        mano(img, *mpos, toca)
        return img
    for n in range(1, 5):
        i = numeros.index(n); tgt = (posic[i][0] + 30, posic[i][1] + 8)
        for p in camino(pos, tgt, 5): cuadros.append(pintar(p))
        hechos.append(n); cuadros += [pintar(tgt, True), pintar(tgt)]
        pos = tgt
    cuadros += [pintar(pos)] * 7
    return cuadros


# ---------------- 7. ajustar ----------------
def ajustar():
    cuadros = []; ag = 20; z0, z1 = 86, 112; dentro = 0

    def pintar(boton=None):
        img, d = lienzo()
        for x in range(16, 145):    # degradado azul -> gris -> naranja
            t = (x - 16) / 128
            c = tuple(int(a + (b - a) * t) for a, b in zip((70, 150, 255), (255, 120, 70)))
            d.line((x, 28, x, 44), fill=c)
        d.rectangle((z0, 25, z1, 47), outline=VERDE); d.rectangle((z0 + 1, 26, z1 - 1, 46), outline=VERDE)
        d.rectangle((ag - 1, 22, ag + 1, 50), fill=CREMA)
        d.rectangle((16, 58, 16 + int(128 * dentro / 14), 61), fill=VERDE)
        for k, s in enumerate("-+"):
            on = boton == k
            caja(d, 56 + k * 30, 70, 76 + k * 30, 86, CREMA if on else PANEL)
            texto(d, 64 + k * 30, 76, s, OSCURO if on else TINTA)
        return img
    while ag < 96:
        ag += 6; cuadros += [pintar(1), pintar()]
    for k in range(14):
        ag += random.choice((-2, 0, 2)); ag = max(z0 + 3, min(z1 - 3, ag))
        dentro += 1; cuadros.append(pintar(None if k % 4 else (0 if ag > 100 else 1)))
    cuadros += [pintar()] * 6
    return cuadros


# ---------------- 8. buscar ----------------
def buscar():
    C, F, cw, ch, x0, y0 = 8, 4, 16, 16, 16, 12
    random.seed(3)
    malas = [(1, 0), (5, 1), (2, 3), (6, 2)]
    hechas = set(); cuadros = []; pos = (80, 90)

    def pintar(mpos, toca=False):
        img, d = lienzo()
        for f in range(F):
            for c in range(C):
                X, Y = x0 + c * cw, y0 + f * ch
                mala = (c, f) in malas and (c, f) not in hechas
                ok = (c, f) in hechas
                caja(d, X, Y, X + cw - 2, Y + ch - 2, (20, 50, 30) if not ok else VERDE, (50, 110, 70))
                if mala: texto(d, X + 5, Y + 5, "@", (200, 140, 70))
                elif not ok: d.point((X + 7, Y + 7), fill=VERDE); d.point((X + 6, Y + 8), fill=VERDE); d.point((X + 8, Y + 8), fill=VERDE)
        mano(img, *mpos, toca)
        return img
    for m in malas:
        tgt = (x0 + m[0] * cw + 5, y0 + m[1] * ch + 6)
        for p in camino(pos, tgt, 5): cuadros.append(pintar(p))
        hechas.add(m); cuadros += [pintar(tgt, True), pintar(tgt)]
        pos = tgt
    cuadros += [pintar(pos)] * 6
    return cuadros


# ---------------- 9. grafica ----------------
def grafica():
    valores = [20, 35, 25, 60, 40, 30]
    cuadros = []; pos = (80, 40)

    def pintar(mpos, elegido=None, toca=False, brillo=0):
        img, d = lienzo()
        d.line((14, 62, 146, 62), fill=BORDE)
        for k, v in enumerate(valores):
            col = VERDE if v < 30 else AMBAR if v < 50 else ROJO
            x = 18 + k * 21
            d.rectangle((x, 62 - v * 0.8, x + 14, 61), fill=col)
            if k == len(valores) - 1 and brillo: d.rectangle((x - 1, 62 - v * 0.8 - 1, x + 15, 62), outline=CREMA)
        for k, (lbl, col) in enumerate((("SI", VERDE), ("NO", ROJO))):
            on = elegido == k
            caja(d, 34 + k * 52, 72, 76 + k * 52, 88, col if on else PANEL, col)
            d.line((44 + k * 52, 80, 66 + k * 52, 80), fill=OSCURO if on else col)
        mano(img, *mpos, toca)
        return img
    cuadros += [pintar(pos, brillo=k % 2) for k in range(8)]
    tgt = (52, 80)
    for p in camino(pos, tgt, 6): cuadros.append(pintar(p, brillo=1))
    cuadros += [pintar(tgt, 0, True, 1)] + [pintar(tgt, 0, False, 1)] * 10
    return cuadros


# ---------------- 10. rover ----------------
def rover():
    C, F, cs, x0, y0 = 10, 5, 12, 20, 6
    hielo = (8, 3); ruta = [(1, 1), (2, 1), (3, 1), (4, 1), (4, 2), (5, 2), (6, 2), (6, 3), (7, 3), (8, 3)]
    vistos = set(); cuadros = []

    def pintar(p, radar=0, fin=False):
        img, d = lienzo()
        for f in range(F):
            for c in range(C):
                X, Y = x0 + c * cs, y0 + f * cs
                d.rectangle((X, Y, X + cs - 2, Y + cs - 2), fill=(80, 76, 150) if (c, f) in vistos else (8, 9, 20))
        if fin:
            X, Y = x0 + hielo[0] * cs, y0 + hielo[1] * cs
            d.rectangle((X + 1, Y + 1, X + cs - 3, Y + cs - 3), fill=CIAN)
        X, Y = x0 + p[0] * cs, y0 + p[1] * cs
        if radar:
            d.ellipse((X + 5 - radar, Y + 5 - radar, X + 5 + radar, Y + 5 + radar), outline=CIAN)
        d.rectangle((X + 2, Y + 3, X + cs - 4, Y + cs - 5), fill=CREMA); d.point((X + 3, Y + cs - 4), fill=TINTA); d.point((X + cs - 5, Y + cs - 4), fill=TINTA)
        d.rectangle((24, 70, 24 + 6 * 12, 74), fill=(40, 42, 80)); d.rectangle((24, 70, 24 + max(0, 6 - len(vistos) // 4) * 12, 74), fill=VERDE)
        caja(d, 110, 66, 140, 80, CIAN if radar else PANEL)
        return img
    for i, p in enumerate(ruta):
        vistos.add(p)
        cuadros.append(pintar(p))
        if i in (3, 6):
            for r in (4, 8, 12, 16): cuadros.append(pintar(p, r))
    cuadros += [pintar(ruta[-1], 0, True)] * 10
    return cuadros


# ---------------- 11. energia ----------------
def energia():
    on = [True, True, True, True]; consumo = [3, 2, 4, 1]; tope = 6
    cuadros = []; pos = (80, 90)

    def pintar(mpos, toca=False, ok=False):
        img, d = lienzo()
        total = sum(c for c, o in zip(consumo, on) if o)
        d.rectangle((14, 8, 146, 16), fill=(30, 32, 70))
        d.rectangle((14, 8, 14 + total * 13, 16), fill=VERDE if total <= tope else ROJO)
        d.line((14 + tope * 13, 5, 14 + tope * 13, 19), fill=CREMA)
        for k in range(4):
            y = 24 + k * 13
            caja(d, 14, y, 120, y + 10, PANEL)
            d.rectangle((18, y + 3, 26, y + 7), fill=VERDE if on[k] else (60, 60, 80))
            d.line((32, y + 5, 32 + consumo[k] * 14, y + 5), fill=TENUE)
        caja(d, 124, 78, 150, 92, CREMA if ok else PANEL)
        mano(img, *mpos, toca)
        return img
    for k in (2, 0):
        tgt = (20, 24 + k * 13 + 5)
        for p in camino(pos, tgt, 5): cuadros.append(pintar(p))
        on[k] = False; cuadros += [pintar(tgt, True), pintar(tgt), pintar(tgt)]
        pos = tgt
    tgt = (134, 85)
    for p in camino(pos, tgt, 5): cuadros.append(pintar(p))
    cuadros += [pintar(tgt, True, True)] + [pintar(tgt, False, True)] * 8
    return cuadros


# ---------------- 12. quiz ----------------
def quiz():
    cuadros = []; pos = (80, 20)

    def pintar(mpos, elegido=None, toca=False):
        img, d = lienzo()
        caja(d, 54, 6, 106, 34, CREMA, AMBAR)       # la carta
        d.rectangle((60, 12, 100, 15), fill=AMBAR); d.line((60, 22, 98, 22), fill=TENUE); d.line((60, 27, 90, 27), fill=TENUE)
        for k in range(3):
            y = 42 + k * 17
            ok = elegido == 1 and k == 1
            caja(d, 20, y, 140, y + 13, (30, 60, 40) if ok else PANEL, VERDE if ok else BORDE)
            d.line((28, y + 6, 100 - k * 14, y + 6), fill=VERDE if ok else TENUE)
        mano(img, *mpos, toca)
        return img
    cuadros += [pintar(pos)] * 5
    tgt = (90, 65)
    for p in camino(pos, tgt, 6): cuadros.append(pintar(p))
    cuadros += [pintar(tgt, 1, True)] + [pintar(tgt, 1)] * 10
    return cuadros


if __name__ == "__main__":
    random.seed(7)
    for nombre, fn in [("cables", cables), ("limpiar", limpiar), ("atrapar", atrapar), ("laberinto", laberinto),
                       ("tapar", tapar), ("secuencia", secuencia), ("ajustar", ajustar), ("buscar", buscar),
                       ("grafica", grafica), ("rover", rover), ("energia", energia), ("quiz", quiz)]:
        guardar(nombre, fn())
