# Recorta los sprites del HUD a PNG transparentes y mide las partes dinámicas.
# Uso (PowerShell de Windows, sin instalar nada):
#   powershell -ExecutionPolicy Bypass -File herramientas\recortar-sprites.ps1 `
#     -Hoja hud.jpeg -Barras barras.jpeg -Libro libro.jpeg -Salida public\img\hud
# Escribe los PNG y sprites.json (posición de cada segmento de las barras y de los
# recuadros del panel de día), que usa public/js/juego.js.
param([string]$Hoja, [string]$Barras, [string]$Libro, [string]$Salida)

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

public static class Sprites {
  static int[] Leer(Bitmap b) {
    var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var p = new int[b.Width * b.Height]; Marshal.Copy(d.Scan0, p, 0, p.Length); b.UnlockBits(d); return p;
  }
  static void Guardar(int[] p, int w, int h, string ruta) {
    var b = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    var d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    Marshal.Copy(p, 0, d.Scan0, p.Length); b.UnlockBits(d); b.Save(ruta, ImageFormat.Png); b.Dispose();
  }
  static int R(int c) { return (c >> 16) & 255; } static int G(int c) { return (c >> 8) & 255; } static int B(int c) { return c & 255; }
  static int Suma(int c) { return R(c) + G(c) + B(c); }
  static bool Claro(int c) { int mx = Math.Max(R(c), Math.Max(G(c), B(c))), mn = Math.Min(R(c), Math.Min(G(c), B(c))); return mn > 205 && mx - mn < 28; }
  static bool Negro(int c) { return Suma(c) < 75; }
  static bool Oscuro(int c) { return Suma(c) < 200; }
  static bool Lavanda(int c) { return B(c) > R(c) && B(c) > 150 && R(c) > 100; }

  // quita el fondo (claro u oscuro) conectado a los bordes; true = sprite
  static bool[] Mascara(int[] p, int w, int h, bool fondoClaro) {
    var fondo = new bool[w * h]; var cola = new Queue<int>();
    for (int x = 0; x < w; x++) { cola.Enqueue(x); cola.Enqueue((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { cola.Enqueue(y * w); cola.Enqueue(y * w + w - 1); }
    while (cola.Count > 0) {
      int i = cola.Dequeue(); if (fondo[i]) continue;
      if (fondoClaro ? !Claro(p[i]) : !Negro(p[i])) continue;
      fondo[i] = true; int x = i % w, y = i / w;
      if (x > 0) cola.Enqueue(i - 1); if (x < w - 1) cola.Enqueue(i + 1); if (y > 0) cola.Enqueue(i - w); if (y < h - 1) cola.Enqueue(i + w);
    }
    var m = new bool[w * h]; for (int i = 0; i < m.Length; i++) m[i] = !fondo[i]; return m;
  }
  static List<Rectangle> Piezas(bool[] m, int w, int h, int minArea) {
    var vis = new bool[w * h]; var res = new List<Rectangle>(); var cola = new Queue<int>();
    for (int s = 0; s < m.Length; s++) {
      if (!m[s] || vis[s]) continue;
      int x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0; cola.Enqueue(s); vis[s] = true;
      while (cola.Count > 0) {
        int i = cola.Dequeue(); int x = i % w, y = i / w; n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && m[i - 1] && !vis[i - 1]) { vis[i - 1] = true; cola.Enqueue(i - 1); }
        if (x < w - 1 && m[i + 1] && !vis[i + 1]) { vis[i + 1] = true; cola.Enqueue(i + 1); }
        if (y > 0 && m[i - w] && !vis[i - w]) { vis[i - w] = true; cola.Enqueue(i - w); }
        if (y < h - 1 && m[i + w] && !vis[i + w]) { vis[i + w] = true; cola.Enqueue(i + w); }
      }
      if (n >= minArea) res.Add(new Rectangle(x0, y0, x1 - x0 + 1, y1 - y0 + 1));
    }
    return res;
  }
  static int[] Recorte(int[] p, bool[] m, int w, Rectangle r) {
    var o = new int[r.Width * r.Height];
    for (int y = 0; y < r.Height; y++) for (int x = 0; x < r.Width; x++) {
      int i = (r.Y + y) * w + r.X + x; o[y * r.Width + x] = m[i] ? (p[i] | unchecked((int)0xFF000000)) : 0;
    }
    return o;
  }
  static void Pintar(int[] c, int w, Rectangle r, int color) { for (int y = r.Y; y < r.Bottom; y++) for (int x = r.X; x < r.Right; x++) c[y * w + x] = color; }

  // ---------- barras segmentadas ----------
  static bool Segmento(int c) { return (uint)c >> 24 != 0 && !Oscuro(c) && !Lavanda(c); }
  public static string Barras(string ruta, string salida) {
    var bm = new Bitmap(ruta); int w = bm.Width, h = bm.Height; var p = Leer(bm); bm.Dispose();
    var m = Mascara(p, w, h, false);
    var piezas = Piezas(m, w, h, 5000); piezas.Sort((a, b) => a.Y.CompareTo(b.Y));
    string[] nombres = { "salud", "comida", "energia", "radiacion" };   // orden de la imagen
    var j = new StringBuilder();
    for (int k = 0; k < piezas.Count && k < 4; k++) {
      var r = piezas[k]; var c = Recorte(p, m, w, r); int cw = r.Width, ch = r.Height, ym = ch / 2;
      var segs = new List<Rectangle>(); int ini = -1;
      for (int x = (int)(cw * 0.18); x <= (int)(cw * 0.86); x++) {          // sin el adorno "//" de la derecha
        bool s = x < (int)(cw * 0.86) && Segmento(c[ym * cw + x]);
        if (s && ini < 0) ini = x;
        if (!s && ini >= 0) {
          if (x - ini >= 8) {
            int xm = (ini + x) / 2, y0 = ym, y1 = ym;
            while (y0 > 0 && Segmento(c[(y0 - 1) * cw + xm])) y0--;
            while (y1 < ch - 1 && Segmento(c[(y1 + 1) * cw + xm])) y1++;
            segs.Add(new Rectangle(ini, y0, x - ini, y1 - y0 + 1));
          }
          ini = -1;
        }
      }
      Guardar(c, cw, ch, salida + "\\barra-" + nombres[k] + ".png");
      j.AppendFormat("\"barra-{0}\":{{\"w\":{1},\"h\":{2},\"segmentos\":[", nombres[k], cw, ch);
      for (int s = 0; s < segs.Count; s++) j.AppendFormat("{0}[{1},{2},{3},{4}]", s > 0 ? "," : "", segs[s].X, segs[s].Y, segs[s].Width, segs[s].Height);
      j.Append("]},");
    }
    return j.ToString();
  }

  // ---------- panel de día e ícono del libro (hoja con fondo blanco) ----------
  static bool Borde(int c) { return (uint)c >> 24 == 0 || (Lavanda(c) && Suma(c) > 380); }
  static Rectangle Compartimento(int[] c, int w, int h, bool derecho) {
    int ym = (int)(h * 0.45), sep = -1;
    for (int x = (int)(w * 0.3); x < (int)(w * 0.6); x++) { if (Suma(c[ym * w + x]) > 420) { sep = x; break; } }
    int xa, xb;
    if (derecho) { xa = sep + 1; while (xa < w && !Oscuro(c[ym * w + xa])) xa++; xb = xa; while (xb < w - 1 && !Borde(c[ym * w + xb + 1])) xb++; }
    else { xb = sep - 1; while (xb > 0 && !Oscuro(c[ym * w + xb])) xb--; xa = xb; while (xa > 1 && !Borde(c[ym * w + xa - 1])) xa--; }
    int xm = derecho ? xa + 4 : xb - 4, y0 = ym, y1 = ym;
    while (y0 > 0 && !Borde(c[(y0 - 1) * w + xm])) y0--;
    while (y1 < h - 1 && !Borde(c[(y1 + 1) * w + xm])) y1++;
    return new Rectangle(xa, y0, xb - xa + 1, y1 - y0 + 1);
  }
  public static string Hoja(string ruta, string salida) {
    var bm = new Bitmap(ruta); int w = bm.Width, h = bm.Height; var p = Leer(bm); bm.Dispose();
    var m = Mascara(p, w, h, true);
    var der = Piezas(m, w, h, 4000).FindAll(r => r.X >= w / 2); der.Sort((a, b) => a.Y.CompareTo(b.Y));
    if (der.Count < 2) return "\"error-hoja\":" + der.Count + ",";
    int navy = unchecked((int)0xFF0E1028);
    var r0 = der[0]; var c = Recorte(p, m, w, r0);
    var texto = Compartimento(c, r0.Width, r0.Height, true);
    // recuadro del sol: de la primera zona oscura a la izquierda hasta el separador (el sol se queda dibujado)
    int ymi = (int)(r0.Height * 0.45), xi = 0; while (xi < r0.Width && !Oscuro(c[ymi * r0.Width + xi])) xi++;
    var icono = new Rectangle(xi, texto.Y, Math.Max(10, texto.X - xi - 14), texto.Height);
    Pintar(c, r0.Width, texto, navy);
    Guardar(c, r0.Width, r0.Height, salida + "\\panel-dia.png");
    var r1 = der[1]; Guardar(Recorte(p, m, w, r1), r1.Width, r1.Height, salida + "\\bitacora-icono.png");
    return string.Format("\"panel-dia\":{{\"w\":{0},\"h\":{1},\"texto\":[{2},{3},{4},{5}],\"icono\":[{6},{7},{8},{9}]}},\"bitacora-icono\":{{\"w\":{10},\"h\":{11}}},",
      r0.Width, r0.Height, texto.X, texto.Y, texto.Width, texto.Height, icono.X, icono.Y, icono.Width, icono.Height, r1.Width, r1.Height);
  }

  // ---------- libro abierto (fondo de la bitácora) ----------
  public static string Libro(string ruta, string salida) {
    var bm = new Bitmap(ruta); int w = bm.Width, h = bm.Height; var p = Leer(bm); bm.Dispose();
    var m = Mascara(p, w, h, true);
    var piezas = Piezas(m, w, h, 20000); piezas.Sort((a, b) => (b.Width * b.Height).CompareTo(a.Width * a.Height));
    var r = piezas[0]; Guardar(Recorte(p, m, w, r), r.Width, r.Height, salida + "\\bitacora-libro.png");
    return string.Format("\"bitacora-libro\":{{\"w\":{0},\"h\":{1}}}", r.Width, r.Height);
  }
}
"@

New-Item -ItemType Directory -Force $Salida | Out-Null
$out = (Resolve-Path $Salida).Path
$json = "{" + [Sprites]::Barras((Resolve-Path $Barras).Path, $out) + [Sprites]::Hoja((Resolve-Path $Hoja).Path, $out) + [Sprites]::Libro((Resolve-Path $Libro).Path, $out) + "}"
[System.IO.File]::WriteAllText((Join-Path $out "sprites.json"), $json)
Write-Output $json
