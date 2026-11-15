// GET /api/radlab -> dosis de radiación diaria medida por CRaTER (LRO, en órbita lunar), desde NASA RadLab.
// RadLab no pide llave. Su API: https://visualization.osdr.nasa.gov/radlab/api/
// Los datos de CRaTER en RadLab llegan hasta junio de 2024, así que usamos mayo-junio de 2024:
// trae días tranquilos y las tormentas solares fuertes del 10-16 de mayo y del 8 de junio.
// Se puede cambiar la ventana con RADLAB_DESDE / RADLAB_HASTA (AAAA-MM-DD), o la URL completa con RADLAB_URL.
// Respuesta: { fuente, unidad, base, serie: [{ fecha, dosis }] }  (dosis = promedio del día)
const { conTiempo, responder } = require("./_util");

const API = "https://visualization.osdr.nasa.gov/radlab/api/";

function porDia(tsv) {
  const filas = tsv.trim().split("\n");
  const cab = filas.shift().split("\t");
  const iT = cab.indexOf("timestamp"), iD = cab.indexOf("absorbed_dose_rate");
  if (iT < 0 || iD < 0) return [];
  const dias = {};
  for (const f of filas) {
    const c = f.split("\t"), fecha = c[iT].replace(/"/g, "").slice(0, 10), v = Number(c[iD]);
    if (!Number.isFinite(v)) continue;
    (dias[fecha] = dias[fecha] || []).push(v);
  }
  return Object.keys(dias).sort().map((fecha) => ({ fecha, dosis: +(dias[fecha].reduce((a, b) => a + b, 0) / dias[fecha].length).toFixed(2) }));
}

module.exports = async (req, res) => {
  const desde = process.env.RADLAB_DESDE || "2024-05-01", hasta = process.env.RADLAB_HASTA || "2024-06-15";
  const url = process.env.RADLAB_URL ||
    `${API}?spacecraft=LRO&absorbed_dose_rate%3E0&format=tsv&timestamp%3E=${desde}&timestamp%3C${hasta}`;
  try {
    const r = await conTiempo(url, {}, 25000);
    if (!r.ok) throw new Error("RadLab respondió " + r.status);
    const serie = porDia(await r.text());
    if (serie.length < 7) throw new Error("RadLab devolvió muy pocos días (" + serie.length + ")");
    // "base" = día tranquilo típico (percentil 25): el juego compara cada día contra ella
    const orden = serie.map((x) => x.dosis).sort((a, b) => a - b), base = orden[Math.floor(orden.length / 4)];
    responder(res, 200, { fuente: "NASA RadLab · CRaTER (LRO)", unidad: "tasa de dosis absorbida (RadLab)", desde, hasta, base, serie }, 7 * 24 * 3600);
  } catch (e) {
    responder(res, 502, { error: "No se pudo leer RadLab", detalle: String(e.message || e) });
  }
};
