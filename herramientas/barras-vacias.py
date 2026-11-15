"""
Crea public/img/hud/barra-<nombre>-vacia.png: la misma barra con los 10 segmentos apagados.

El HUD pone la barra vacia debajo y la barra llena encima, recortada justo en el
hueco entre dos segmentos (ver pintarBarras() en public/js/juego.js). Asi los
segmentos apagados se ven completos y parejos, sin bordes ni rayitas sueltas.

Uso:  python herramientas/barras-vacias.py      (requiere: pip install pillow)
Vuelve a correrlo si cambia alguna barra-*.png.
"""
import os
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HUD = os.path.join(RAIZ, "public", "img", "hud")
PISTA = (174, 56, 631, 103)          # x0, y0, x1, y1: zona de los segmentos en el sprite de 760x160
FONDO = (14, 16, 40)                 # azul marino del fondo de la pista
APAGADO = 0.8                        # cuanto se oscurece (0 = igual, 1 = fondo liso)

for nombre in ("salud", "comida", "energia", "radiacion"):
    im = Image.open(os.path.join(HUD, f"barra-{nombre}.png")).convert("RGBA")
    px = im.load()
    x0, y0, x1, y1 = PISTA
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            gris = (r + g + b) / 3
            # se apaga hacia el fondo, quitando casi todo el color
            r2, g2, b2 = [int((c * 0.35 + gris * 0.65) * (1 - APAGADO) + f * APAGADO) for c, f in zip((r, g, b), FONDO)]
            px[x, y] = (r2, g2, b2, a)
    im.save(os.path.join(HUD, f"barra-{nombre}-vacia.png"))
    print("listo", f"barra-{nombre}-vacia.png")
