// Utilidades compartidas por las funciones de /api (Vercel las ignora como ruta por empezar con _).
const conTiempo = (url, opciones = {}, ms = 8000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opciones, signal: ctrl.signal }).finally(() => clearTimeout(id));
};
const fecha = (d) => d.toISOString().slice(0, 10);
function responder(res, status, cuerpo, cacheSeg = 3600) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // la CDN de Vercel guarda la respuesta: así no gastamos la cuota de la NASA con cada niño
  if (status === 200) res.setHeader("Cache-Control", `s-maxage=${cacheSeg}, stale-while-revalidate=86400`);
  res.statusCode = status;
  res.end(JSON.stringify(cuerpo));
}
module.exports = { conTiempo, fecha, responder };
