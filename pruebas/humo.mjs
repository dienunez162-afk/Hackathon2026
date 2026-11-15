// Prueba de humo: abre el juego de verdad en un navegador, lo juega solo y falla si algo se rompe.
//   npm run humo                                 levanta el servidor local y prueba ahí
//   HUMO_URL=https://gnosis-kappa.vercel.app npm run humo     prueba un sitio ya publicado
// Necesita Chrome instalado (en GitHub Actions ya viene). Otro Chrome: CHROME_PATH=/ruta/a/chrome
//
// Existe porque una guarda nueva llegó a omitir TODAS las preguntas y las pruebas de funciones sueltas no lo notaron.
// Aquí se juega una misión completa y se comprueba que hubo errores, preguntas, pasos y un final.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEMILLA = process.env.HUMO_SEMILLA || "7";
const LIMITE_MISION_MS = +process.env.HUMO_LIMITE_MS || 360000;
const resultados = [];
const ok = (nombre, cond, detalle = "") => { resultados.push({ nombre, cond: !!cond, detalle }); console.log(`${cond ? "  ✔" : "  ✖"} ${nombre}${detalle ? "  (" + detalle + ")" : ""}`); };

async function esperarServidor(url, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch (e) { /* todavía no */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("el servidor no arrancó en " + url);
}

function vigilar(page, nombre, base) {
  const problemas = [];
  const propio = (u) => { try { return new URL(u).origin === new URL(base).origin; } catch (e) { return false; } };
  page.on("pageerror", (e) => problemas.push(`[${nombre}] error de página: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // los avisos de red (APIs de la NASA sin internet, fuentes) no rompen el juego; los errores del juego sí
    if (/Failed to load resource|net::ERR|ERR_|favicon/i.test(t)) return;
    problemas.push(`[${nombre}] console.error: ${t.slice(0, 200)}`);
  });
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && propio(u) && !/\/api\/|favicon/.test(u)) problemas.push(`[${nombre}] ${r.status()} en ${u}`);
  });
  return problemas;
}

let servidor = null, navegador = null;
const sitio = process.env.HUMO_URL ? process.env.HUMO_URL.replace(/\/$/, "") : null;
const puerto = 3100 + Math.floor(Math.random() * 800);
const base = sitio || `http://localhost:${puerto}`;

try {
  if (!sitio) {
    servidor = spawn(process.execPath, ["scripts/servidor-local.js", String(puerto)], { cwd: raiz, stdio: "ignore" });
    await esperarServidor(base + "/");
  }
  console.log(`Prueba de humo en ${base}`);
  navegador = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--autoplay-policy=no-user-gesture-required"] });

  // ---------- 1. el menú principal ----------
  console.log("\n1. Menú principal");
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const problemas = vigilar(page, "menú", base);
    await page.goto(base + "/", { waitUntil: "load" });
    await page.waitForFunction(() => window.GNOSIS && GNOSIS.estado().estado === "menu", null, { timeout: 30000 });
    ok("el juego arranca en el menú", true);
    ok("las herramientas del equipo están ocultas para un niño", await page.evaluate(() => getComputedStyle(document.getElementById("ctrl")).display === "none"));
    await page.waitForSelector("#btn-menu", { state: "visible", timeout: 10000 });
    await page.click("#btn-menu");
    ok("el menú ☰ se despliega", await page.isVisible("#menu-caja"));
    ok("hay botones de idioma y cuenta dentro del menú", (await page.locator("#menu-idioma button").count()) === 2 && (await page.locator("#menu-cuenta").count()) === 1);
    await Promise.all([page.waitForLoadState("load"), page.click('#menu-idioma [data-l="en"]')]);
    await page.waitForFunction(() => document.documentElement.lang === "en", null, { timeout: 10000 });
    ok("cambiar a inglés funciona", true);
    ok("sin errores en el menú", problemas.length === 0, problemas.join(" | "));
    await ctx.close();
  }

  // ---------- 2. jugar a mano: el tutorial y los avisos de Laika, con clics de ratón reales ----------
  console.log("\n2. Tutorial y avisos de Laika con clics reales");
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const problemas = vigilar(page, "a mano", base);
    await page.goto(base + "/?semilla=3", { waitUntil: "load" });
    await page.waitForFunction(() => window.GNOSIS && GNOSIS.estado().estado === "menu", null, { timeout: 30000 });
    await page.keyboard.press("Enter");
    let clics = 0, entendidos = 0, atorados = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && entendidos < 2) {
      const st = await page.evaluate(() => GNOSIS.estado().estado);
      if (st === "aterrizaje") { await page.keyboard.press("Enter"); await page.waitForTimeout(300); continue; }
      const boton = await page.evaluateHandle(() => {
        const l = [...document.querySelectorAll("#consola .op:not([disabled])")].filter((b) => b.offsetParent && b.getBoundingClientRect().width > 0);
        return l.find((b) => b.classList.contains("prim")) || l[0] || null;
      });
      const el = boton.asElement();
      if (!el) { await page.waitForTimeout(200); continue; }
      const texto = (await el.innerText()).trim();
      await el.scrollIntoViewIfNeeded();                    // como haría una persona: desplaza el panel hasta ver el botón
      const caja = await el.boundingBox();
      if (!caja) { await page.waitForTimeout(200); continue; }
      await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);       // clic real, no .click() del DOM
      clics++;
      try { await page.waitForFunction((b) => b.disabled || !b.isConnected, el, { timeout: 2500 }); }
      catch (e) { atorados.push(texto); }
      if (/Entendido|Got it/i.test(texto)) entendidos++;
      if ((await page.evaluate(() => !document.getElementById("mj").hidden))) break;      // llegó al primer minijuego
    }
    // los cables del día 1 y el botón que sigue (antes el «Continuar» quedaba en un panel que ya no estaba en pantalla: el juego esperaba un clic imposible)
    let sigue = false;
    {
      try {
        await page.waitForSelector("#mj:not([hidden]) .op.prim", { state: "visible", timeout: 8000 });        // las instrucciones del primer minijuego
        await page.click("#mj .op.prim");
        await page.waitForSelector("#mj .cable", { timeout: 5000 });
        await page.waitForTimeout(1000);                                           // el minijuego tarda un instante en aceptar clics
        const pares = (await page.locator("#mj .cable").count()) / 2;
        for (let i = 0; i < pares; i++) { await page.click(`#mj [data-l="${i}"]`); await page.waitForTimeout(120); await page.click(`#mj [data-r="${i}"]`); await page.waitForTimeout(150); }
        await page.waitForSelector("#consola .op.prim:not([disabled])", { state: "visible", timeout: 4000 });
        const antes = await page.evaluate(() => document.getElementById("consola").innerText);
        const b = await page.$("#consola .op.prim:not([disabled])");
        await b.scrollIntoViewIfNeeded(); const caja = await b.boundingBox();
        await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
        await page.waitForFunction((t) => document.getElementById("consola").innerText !== t, antes, { timeout: 3000 });
        sigue = true;
      } catch (e) { console.log("     (cables:", String(e.message).split("\n")[0].slice(0, 160), ")", JSON.stringify(await page.evaluate(() => ({ mjOculto: document.getElementById("mj").hidden, mj: document.getElementById("mj").innerText.slice(0, 120), consola: document.getElementById("consola").innerText.slice(0, 100), botones: [...document.querySelectorAll("#consola .op")].map((b) => b.innerText.trim() + ":" + b.disabled) })))); }
    }
    ok("después de los cables aparece el botón que sigue y avanza", sigue);
    ok("los botones del tutorial responden a un clic real", clics >= 8 && atorados.length === 0, atorados.length ? "no respondieron: " + atorados.join(", ") : clics + " clics");
    ok("los avisos «¡Entendido!» de Laika responden", entendidos >= 2, entendidos + " avisos");
    ok("sin errores jugando a mano", problemas.length === 0, problemas.slice(0, 3).join(" | "));
    await ctx.close();
  }

  // ---------- 3. una misión completa en automático ----------
  console.log("\n2. Una misión completa (modo automático 4×)");
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const problemas = vigilar(page, "misión", base);
    // sigue los máximos de cada contador, porque al terminar la misión el estado se reinicia
    await page.addInitScript(() => {
      setInterval(() => {
        try {
          const J = window.GNOSIS && GNOSIS.estado().J; if (!J) return;
          const m = (window.__max = window.__max || { p0: J.partida, partida: 0, pq: 0, pq1: 0, reg: 0, pasos: 0, dia: 0, mj: 0 });
          m.partida = Math.max(m.partida, J.partida); m.pq = Math.max(m.pq, J.cuenta.pq); m.pq1 = Math.max(m.pq1, J.cuenta.pq1);
          m.reg = Math.max(m.reg, J.registro.length); m.pasos = Math.max(m.pasos, J.pasos.length); m.dia = Math.max(m.dia, J.dia); m.mj = Math.max(m.mj, J.cuenta.mj);
        } catch (e) { /* aún no hay partida */ }
      }, 300);
    });
    await page.goto(`${base}/?auto=1&vel=4&semilla=${SEMILLA}`, { waitUntil: "load" });
    const t0 = Date.now();
    let termino = true;
    try {
      await page.waitForFunction(() => window.__max && window.__max.partida > window.__max.p0, null, { timeout: LIMITE_MISION_MS, polling: 1000 });
    } catch (e) { termino = false; }
    const m = await page.evaluate(() => window.__max || {});
    console.log(`     (${Math.round((Date.now() - t0) / 1000)} s, contadores: ${JSON.stringify(m)})`);
    ok("la misión llega hasta el final", termino, termino ? "" : "se acabó el tiempo");
    ok("se llegó al menos al día 12", m.dia >= 12, "día " + m.dia);
    ok("se contestaron preguntas (no se omitieron)", m.pq >= 5, m.pq + " preguntas");
    ok("hubo respuestas a la primera", m.pq1 >= 1, m.pq1 + " a la primera");
    ok("se anotaron las decisiones del niño", m.reg >= 5, m.reg + " retos");
    ok("se anotaron los nodos visitados", m.pasos >= 6, m.pasos + " nodos");
    ok("se jugaron minijuegos", m.mj >= 3, m.mj + " minijuegos");
    ok("la bitácora tiene entradas", (await page.evaluate(() => { try { return Object.values(JSON.parse(localStorage.getItem("gnosis-bitacora-v1") || "{}")).flat().length; } catch (e) { return 0; } })) > 0);
    ok("sin errores durante la misión", problemas.length === 0, problemas.slice(0, 3).join(" | "));
    await ctx.close();
  }
} catch (e) {
  ok("la prueba pudo correr completa", false, String((e && e.message) || e).split("\n")[0]);
} finally {
  if (navegador) await navegador.close().catch(() => {});
  if (servidor) servidor.kill();
}

const fallos = resultados.filter((r) => !r.cond);
console.log(`\n${fallos.length ? "FALLÓ" : "TODO BIEN"}: ${resultados.length - fallos.length} de ${resultados.length} comprobaciones.`);
process.exit(fallos.length ? 1 : 0);
