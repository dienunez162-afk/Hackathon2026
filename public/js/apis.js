/* =========================================================
   G-NOSIS  -  datos reales de la NASA
   El navegador pide a las funciones de /api (Vercel); ninguna llave
   llega aquí. Si no hay conexión (o la vista previa no tiene /api),
   se usa una copia guardada de datos reales, marcada como tal.
     DONKI  (api.nasa.gov, NASA_API_KEY)  -> pronóstico y tormenta sorpresa
     RadLab (CRaTER en la Luna, sin llave) -> gráfica de radiación
     OSDR   (estudios biológicos, sin llave) -> informes del invernadero
   ========================================================= */
(() => {
  "use strict";
  const dia = (k) => new Date(Date.now() - k * 864e5).toISOString().slice(0, 10);
  // DONKI cambia cada día, así que sin conexión se arma una muestra con fechas recientes
  const MUESTRA_DONKI = {
    fuente: "NASA DONKI (muestra sin conexión)", muestra: true,
    llamaradas: [], tormentas: [{ fecha: dia(5), kp: 5 }],
    cmes: [{ fecha: dia(4), nota: "CME hacia el este" }, { fecha: dia(1), nota: "CME lenta" }],
  };
  // copia de /api/radlab: dosis diaria real de CRaTER, mayo-junio de 2024 (incluye las tormentas de mayo)
  const COPIA_RADLAB = {"fuente":"NASA RadLab · CRaTER (LRO) (copia guardada)","unidad":"tasa de dosis absorbida (RadLab)","base":5.37,"serie":[["2024-05-01",4.98],["2024-05-02",5.14],["2024-05-03",5.03],["2024-05-04",5.05],["2024-05-05",5.03],["2024-05-06",5.16],["2024-05-07",5.07],["2024-05-08",5.6],["2024-05-09",11.16],["2024-05-10",229.67],["2024-05-11",1082.47],["2024-05-12",242.83],["2024-05-13",363.2],["2024-05-14",1528.23],["2024-05-15",514.72],["2024-05-16",219.49],["2024-05-17",64.34],["2024-05-18",14.3],["2024-05-19",9.13],["2024-05-20",9.59],["2024-05-21",14.27],["2024-05-22",12.39],["2024-05-23",10.83],["2024-05-24",9.71],["2024-05-25",8.63],["2024-05-26",7.88],["2024-05-27",7.19],["2024-05-28",6.98],["2024-05-29",6.45],["2024-05-30",6.39],["2024-05-31",5.97],["2024-06-01",5.58],["2024-06-02",5.55],["2024-06-03",5.37],["2024-06-04",5.31],["2024-06-05",5.08],["2024-06-06",4.82],["2024-06-07",4.81],["2024-06-08",6363.54],["2024-06-09",563.61],["2024-06-10",88.31],["2024-06-11",28.52],["2024-06-12",140.55],["2024-06-13",93.58],["2024-06-14",25.63]]};
  COPIA_RADLAB.serie = COPIA_RADLAB.serie.map(([fecha, dosis]) => ({ fecha, dosis }));
  // copia de /api/osdr?tema=plantas
  const COPIA_OSDR = {"fuente":"NASA OSDR (copia guardada)","tema":"plantas","estudios":[{"id":"OSD-772","titulo":"PH-04 Chile Peppers in Space","organismo":"Microbiota","mision":"SpaceX-22","url":"https://osdr.nasa.gov/bio/repo/data/studies/OSD-772"},{"id":"OSD-177","titulo":"Draft Genome Sequences of Two Fusarium oxysporum Isolates Cultured from Infected Zinnia hybrida Plants Grown on the International Space Station","organismo":"Fusarium oxysporum","mision":"SpaceX-3","url":"https://osdr.nasa.gov/bio/repo/data/studies/OSD-177"},{"id":"OSD-773","titulo":"Exposed Root On Orbit Test System (XROOTS), an aeroponic and hydroponic plant growth system technical demonstration on the International Space Station (ISS)","organismo":"Microbiota","mision":"SpaceX-26  SpaceX-27  NG-17","url":"https://osdr.nasa.gov/bio/repo/data/studies/OSD-773"},{"id":"OSD-615","titulo":"Glycome profiling and immunohistochemistry uncover changes in cell walls of Arabidopsis thaliana roots during spaceflight: Advanced Plant EXperiment (APEX) 03-1","organismo":"Arabidopsis thaliana","mision":"SpaceX-5","url":"https://osdr.nasa.gov/bio/repo/data/studies/OSD-615"},{"id":"OSD-594","titulo":"Advancing the automation of plant nucleic acid extraction for rapid diagnosis of plant diseases in space","organismo":"Microbiota","mision":"","url":"https://osdr.nasa.gov/bio/repo/data/studies/OSD-594"}]};

  const conTiempo = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("tiempo agotado")), ms))]);
  async function pedir(url) {
    const r = await conTiempo(fetch(url, { headers: { accept: "application/json" } }), 9000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  const A = {
    datos: { donki: MUESTRA_DONKI, radlab: COPIA_RADLAB, osdr: COPIA_OSDR },
    estado: { donki: "muestra", radlab: "copia", osdr: "copia" },
    listo: null,
    base: window.GNOSIS_API_BASE || "/api",
    cargar() {
      if (this.listo) return this.listo;
      if (location.protocol === "file:") return (this.listo = Promise.resolve(this.datos));
      this.listo = Promise.allSettled([pedir(this.base + "/donki"), pedir(this.base + "/radlab"), pedir(this.base + "/osdr?tema=plantas")]).then(([d, r, o]) => {
        if (d.status === "fulfilled" && d.value && Array.isArray(d.value.cmes)) { this.datos.donki = d.value; this.estado.donki = "real"; }
        if (r.status === "fulfilled" && r.value && Array.isArray(r.value.serie) && r.value.serie.length >= 7) { this.datos.radlab = r.value; this.estado.radlab = "real"; }
        if (o.status === "fulfilled" && o.value && Array.isArray(o.value.estudios) && o.value.estudios.length) { this.datos.osdr = o.value; this.estado.osdr = "real"; }
        return this.datos;
      });
      return this.listo;
    },
    // peso dinámico N-D11 -> N-D12b: el Sol está activo esta semana si hubo
    // 2+ llamaradas M/X, una tormenta geomagnética con Kp >= 6, o 3+ CME
    tormentaProbable() {
      const d = this.datos.donki, hace7 = Date.now() - 7 * 864e5, reciente = (f) => Date.parse(f) >= hace7;
      if (!d) return false;
      const fuertes = (d.llamaradas || []).filter((f) => /^[MX]/i.test(f.clase || "") && reciente(f.fecha)).length;
      const kp6 = (d.tormentas || []).some((g) => g.kp >= 6 && reciente(g.fecha));
      const cmes = (d.cmes || []).filter((c) => reciente(c.fecha)).length;
      return fuertes >= 2 || kp6 || cmes >= 3;
    },
    // 7 días seguidos de la serie de RadLab (al azar: a veces tranquilos, a veces con tormenta)
    semanaRadiacion() {
      const r = this.datos.radlab, s = r.serie;
      const i = Math.floor(Math.random() * (s.length - 6));
      return { fuente: r.fuente, base: r.base, dias: s.slice(i, i + 7) };
    },
    estudio() { const e = this.datos.osdr && this.datos.osdr.estudios; return e && e.length ? e[Math.floor(Math.random() * Math.min(5, e.length))] : null; },
  };
  window.GNOSIS_APIS = A;
})();
