// Servidor local sin dependencias: sirve public/ y las funciones de api/ como en Vercel.
// Uso: node scripts/servidor-local.js [puerto]   (por defecto 3000)
const http = require("http"), fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, ".."), pub = path.join(raiz, "public");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".mp3": "audio/mpeg", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const puerto = +process.argv[2] || 3000;

http.createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const fn = ruta.match(/^\/api\/([a-z]+)$/);
  if (fn) {
    const archivo = path.join(raiz, "api", fn[1] + ".js");
    if (!fs.existsSync(archivo)) { res.statusCode = 404; return res.end("{}"); }
    try { return await require(archivo)(req, res); } catch (e) { res.statusCode = 500; return res.end(JSON.stringify({ error: String(e) })); }
  }
  let f = path.join(pub, ruta === "/" ? "index.html" : ruta);
  if (!f.startsWith(pub)) { res.statusCode = 403; return res.end(); }
  if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  fs.readFile(f, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end("no encontrado"); }
    res.setHeader("Content-Type", TIPOS[path.extname(f)] || "application/octet-stream");
    res.end(buf);
  });
}).listen(puerto, () => console.log(`G-NOSIS en http://localhost:${puerto}`));
