"""
G-NOSIS - sprites pixel art de los cuadros de texto, eventos y misiones.

Mismo estilo que las barras del HUD (marco biselado con esquinas cortadas,
pantalla hundida, tornillos y las rayas "//"), en 4 temas segun la tension:

  normal      lavanda   tareas, decisiones, recorrido, cartas, manual
  llamada     turquesa  llamadas y misiones de Control de Mision (calma)
  alerta      ambar     eventos sin alarma (cuidado)
  catastrofe  rojo      eventos con alarma, averias y evacuacion (peligro)

Genera:
  public/img/dialogo/   sprites a 2x para el juego (el HUD mide 1280x720)
  diseno/dialogo/sprites/   kit a 1x y 4x (tema normal) para la demo

Uso:  python herramientas/generar-sprites-dialogo.py     (requiere: pip install pillow)
"""
import os
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JUEGO = os.path.join(RAIZ, "public", "img", "dialogo")
KIT = os.path.join(RAIZ, "diseno", "dialogo", "sprites")

CONTORNO = (24, 22, 52)
BLANCO = (255, 255, 255)
CREMA = (255, 241, 212)
CREMA_LUZ = (255, 252, 242)
CREMA_SOMBRA = (216, 186, 138)

TEMAS = {
    "normal": dict(luz=(198, 190, 250), base=(152, 142, 224), sombra=(110, 100, 188), oscuro=(74, 66, 142),
                   pant_borde=(11, 12, 28), pant=(19, 21, 45), pant_brillo=(31, 34, 66),
                   deco=(255, 152, 38), deco2=(196, 98, 18), adorno="rayas"),
    "llamada": dict(luz=(170, 246, 250), base=(84, 196, 212), sombra=(46, 140, 168), oscuro=(26, 90, 122),
                    pant_borde=(5, 15, 26), pant=(11, 30, 46), pant_brillo=(22, 52, 74),
                    deco=(12, 52, 80), deco2=(28, 92, 124), adorno="ondas"),
    "alerta": dict(luz=(255, 222, 140), base=(238, 170, 62), sombra=(186, 116, 32), oscuro=(124, 70, 20),
                   pant_borde=(18, 12, 10), pant=(34, 24, 20), pant_brillo=(52, 38, 28),
                   deco=(64, 34, 10), deco2=(40, 20, 6), adorno="rayas"),
    "catastrofe": dict(luz=(255, 150, 140), base=(222, 62, 62), sombra=(152, 32, 42), oscuro=(92, 16, 28),
                       pant_borde=(16, 4, 8), pant=(36, 10, 16), pant_brillo=(60, 18, 26),
                       deco=(255, 214, 40), deco2=(28, 10, 14), adorno="peligro"),
}


class Lienzo:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def rect(self, x0, y0, x1, y1, c, corte=0):
        """Rectangulo relleno con las esquinas cortadas en diagonal."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if min(x - x0, x1 - x) + min(y - y0, y1 - y) >= corte:
                    self.set(x, y, c)

    def cambiar(self, x, y, de, a):
        if self.get(x, y) == de:
            self.set(x, y, a)

    def imagen(self):
        img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x]:
                    img.putpixel((x, y), self.px[y][x] + (255,))
        return img


def guardar(L, carpeta, nombre, escalas):
    os.makedirs(carpeta, exist_ok=True)
    img = L.imagen()
    for e, sufijo in escalas:
        img.resize((L.w * e, L.h * e), Image.NEAREST).save(os.path.join(carpeta, nombre + sufijo + ".png"))


def bisel(L, x0, y0, x1, y1, p):
    """Luz arriba/izquierda, sombra abajo/derecha (con doble sombra abajo, como las barras)."""
    b = p["base"]
    for x in range(x0, x1 + 1):
        L.cambiar(x, y0, b, p["luz"]); L.cambiar(x, y1, b, p["oscuro"]); L.cambiar(x, y1 - 1, b, p["sombra"])
    for y in range(y0, y1 + 1):
        L.cambiar(x0, y, b, p["luz"]); L.cambiar(x1, y, b, p["oscuro"])
    for y in range(y0, y1 + 1):            # diagonales de las esquinas
        for x in range(x0, x1 + 1):
            if L.get(x, y) != b:
                continue
            v = [L.get(x - 1, y), L.get(x, y - 1), L.get(x + 1, y), L.get(x, y + 1)]
            if None in v or CONTORNO in v:
                izq_arriba = L.get(x - 1, y) in (None, CONTORNO) or L.get(x, y - 1) in (None, CONTORNO)
                L.set(x, y, p["luz"] if izq_arriba and x - x0 < (x1 - x0) / 2 else p["sombra"])


def tornillo(L, x, y, p):
    L.set(x, y, p["luz"]); L.set(x + 1, y, p["sombra"]); L.set(x, y + 1, p["sombra"]); L.set(x + 1, y + 1, p["oscuro"])


def adorno(L, x0, y0, p, alto=5):
    """Detalle de la esquina superior derecha segun el tema."""
    if p["adorno"] == "rayas":                       # las dos rayas "//" de las barras
        for n in range(2):
            for k in range(alto):
                x = x0 + n * 5 + (alto - 1 - k) // 2 + (alto - 1 - k) % 2
                L.set(x, y0 + k, p["deco"]); L.set(x + 1, y0 + k, p["deco2"] if k == alto - 1 else p["deco"])
    elif p["adorno"] == "ondas":                     # ondas de radio ((( · de la llamada
        for n in range(3):
            for k, dx in enumerate((1, 0, 0, 0, 1)):
                L.set(x0 + n * 3 + dx, y0 + k, p["deco"] if n else p["deco2"])
        L.set(x0 + 10, y0 + 2, p["deco"]); L.set(x0 + 11, y0 + 2, p["deco"])
    elif p["adorno"] == "peligro":                   # franjas de peligro amarillo/negro
        for k in range(alto):
            for x in range(x0 - 2, x0 + 12):
                L.set(x, y0 + k, p["deco"] if ((x + k) // 2) % 2 == 0 else p["deco2"])


# ---------------- panel (9-slice, corte 16 px a 1x) ----------------
def panel(p):
    W, H = 72, 48
    L = Lienzo(W, H)
    L.rect(0, 0, W - 1, H - 1, CONTORNO, 4)
    L.rect(1, 1, W - 2, H - 2, p["base"], 3)
    bisel(L, 1, 1, W - 2, H - 2, p)
    for x in range(6, W - 6):                        # pantalla hundida
        L.cambiar(x, 6, p["base"], p["sombra"]); L.cambiar(x, H - 7, p["base"], p["luz"])
    for y in range(6, H - 6):
        L.cambiar(6, y, p["base"], p["sombra"]); L.cambiar(W - 7, y, p["base"], p["luz"])
    L.rect(7, 7, W - 8, H - 8, p["pant_borde"], 2)
    L.rect(8, 8, W - 9, H - 9, p["pant"], 1)
    for x in range(9, W - 9):
        L.set(x, 8, p["pant_brillo"])
    tornillo(L, 3, H - 5, p); tornillo(L, W - 5, H - 5, p)
    if p["adorno"] == "peligro":
        adorno(L, 3, 1, p); adorno(L, W - 15, 1, p)
    else:
        tornillo(L, 3, 3, p); adorno(L, W - 15, 1, p)
    L.set(W - 4, 2, BLANCO)
    return L


# ---------------- etiqueta (9-slice horizontal, corte 10 px) ----------------
def etiqueta(p):
    W, H = 40, 12
    L = Lienzo(W, H)
    L.rect(0, 0, W - 1, H - 1, CONTORNO, 3)
    L.rect(1, 1, W - 2, H - 2, p["base"], 2)
    bisel(L, 1, 1, W - 2, H - 2, p)
    if p["adorno"] == "peligro":
        for k in range(7):
            for x in range(2, 9):
                L.cambiar(x, 2 + k, p["base"], p["deco"] if ((x + k) // 2) % 2 == 0 else p["deco2"])
    else:
        col = p["deco"] if p["adorno"] != "ondas" else p["oscuro"]
        for k in range(6):
            L.set(3 + (5 - k) // 2, 3 + k, col); L.set(6 + (5 - k) // 2, 3 + k, col)
    L.set(W - 3, 2, BLANCO)
    return L


# ---------------- boton principal crema (9-slice, corte 6 px) ----------------
def boton(relleno, luz, sombra, presionado=False, borde=CONTORNO):
    W, H = 44, 14
    L = Lienzo(W, H)
    top = 1 if presionado else 0
    L.rect(0, top, W - 1, H - 1, borde, 3)
    L.rect(1, top + 1, W - 2, H - 2, relleno, 2)
    for x in range(2, W - 2):
        L.cambiar(x, top + 1, relleno, luz)
        if not presionado:
            L.cambiar(x, H - 2, relleno, sombra); L.cambiar(x, H - 3, relleno, sombra)
    for y in range(top + 1, H - 3):
        L.cambiar(1, y, relleno, luz)
    return L


# ---------------- extras del kit ----------------
def flechas(p):
    L = Lienzo(12, 7)
    for f in range(2):
        for y in range(7):
            for x in range(4 - abs(3 - y)):
                L.set(f * 7 + x, y, CONTORNO)
    I = Lienzo(16, 6)
    for f in range(2):
        for y in range(4):
            for x in range(y, 7 - y):
                I.set(f * 8 + x, y + f, (255, 152, 38) if y < 3 else (196, 98, 18))
    return L, I


def marco_icono(p):
    S = 30
    L = Lienzo(S, S)
    L.rect(0, 0, S - 1, S - 1, CONTORNO, 9)
    L.rect(1, 1, S - 2, S - 2, p["base"], 8)
    bisel(L, 1, 1, S - 2, S - 2, p)
    L.rect(5, 5, S - 6, S - 6, p["sombra"], 6)
    L.rect(6, 6, S - 7, S - 7, p["pant_borde"], 5)
    L.rect(7, 7, S - 8, S - 8, p["pant"], 4)
    return L


def icono_capitan():
    m = ["....WWWWWW....", "..WWWWWWWWWW..", ".WWGGGGGGGGWW.", ".WGBBBBBBBBGW.", "WWGBbbBBBBBGWW",
         "WWGBbBBBBBBGWW", "WWGBBBBBBBBGWW", "WWGBBBBBBBBGWW", ".WGGBBBBBBGGW.", ".WWGGGGGGGGWW.",
         "..WWWOOWWWW...", ".GWWWOOWWWWWG.", "GGWWWWWWWWWWGG", "GGWWWWWWWWWWGG"]
    pal = {"W": (236, 238, 248), "G": (150, 158, 186), "B": (52, 132, 255), "b": (196, 232, 255), "O": (255, 152, 38)}
    L = Lienzo(len(m[0]), len(m))
    for y, fila in enumerate(m):
        for x, ch in enumerate(fila):
            if ch in pal:
                L.set(x, y, pal[ch])
    return L


if __name__ == "__main__":
    juego = [(2, "")]
    for nombre, p in TEMAS.items():
        guardar(panel(p), JUEGO, f"panel-{nombre}", juego)
        guardar(etiqueta(p), JUEGO, f"etiqueta-{nombre}", juego)
    guardar(boton(CREMA, CREMA_LUZ, CREMA_SOMBRA), JUEGO, "boton", juego)
    guardar(boton((255, 249, 230), BLANCO, (236, 196, 120), borde=(196, 98, 18)), JUEGO, "boton-hover", juego)
    guardar(boton((238, 216, 176), CREMA, CREMA_SOMBRA, presionado=True), JUEGO, "boton-presionado", juego)

    # kit de la demo (tema normal) a 1x y 4x
    kit = [(1, "_1x"), (4, "")]
    p = TEMAS["normal"]
    guardar(panel(p), KIT, "dialogo_panel", kit)
    guardar(etiqueta(p), KIT, "dialogo_etiqueta", kit)
    guardar(boton(CREMA, CREMA_LUZ, CREMA_SOMBRA), KIT, "boton_normal", kit)
    guardar(boton((255, 249, 230), BLANCO, (236, 196, 120), borde=(196, 98, 18)), KIT, "boton_hover", kit)
    guardar(boton((238, 216, 176), CREMA, CREMA_SOMBRA, presionado=True), KIT, "boton_presionado", kit)
    fl, ind = flechas(p)
    guardar(fl, KIT, "flecha_boton", kit)
    guardar(ind, KIT, "indicador_continuar", kit)
    guardar(marco_icono(p), KIT, "marco_icono", kit)
    guardar(icono_capitan(), KIT, "icono_capitan", kit)
    for nombre in TEMAS:                              # los 4 temas tambien en el kit
        guardar(panel(TEMAS[nombre]), KIT, f"panel_{nombre}", kit)
        guardar(etiqueta(TEMAS[nombre]), KIT, f"etiqueta_{nombre}", kit)
    print("Listo:", os.path.relpath(JUEGO, RAIZ), "y", os.path.relpath(KIT, RAIZ))
