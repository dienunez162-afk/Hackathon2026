// Auditoría de idioma: juega en inglés y reporta todo texto que siga (total o parcialmente) en español.
//   npm run idioma                      levanta el servidor local
//   HUMO_URL=https://... npm run idioma  revisa un sitio publicado
// Cubre: pantallas del juego, minijuegos, informes, preguntas, el manual y todas las pestañas de la bitácora.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIMITE_MS = +process.env.HUMO_LIMITE_MS || 330000;
const sitio = process.env.HUMO_URL ? process.env.HUMO_URL.replace(/\/$/, "") : null;
const puerto = 3900 + Math.floor(Math.random() * 90);
const base = sitio || `http://localhost:${puerto}`;
const VERBOSO = process.argv.includes("--todo");

let servidor = null, navegador = null, codigo = 0;
try {
  if (!sitio) {
    servidor = spawn(process.execPath, ["scripts/servidor-local.js", String(puerto)], { cwd: raiz, stdio: "ignore" });
    for (let i = 0; i < 60; i++) { try { if ((await fetch(base + "/")).ok) break; } catch (e) { /* aún no */ } await new Promise((r) => setTimeout(r, 250)); }
  }
  navegador = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }) });
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("gnosis-idioma", "en"); } catch (e) { /* nada */ } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("error de página:", e.message));

  // detector de español: letras con acento o palabras muy comunes que no existen en inglés
  await page.addInitScript(() => {
    const PAL = /(?<![\p{L}'])(el|la|los|las|del|que|con|para|por|una|un|es|se|su|sus|al|más|tu|te|si|como|cuando|donde|pero|muy|hay|ya|lo|le|les|mi|nos|esta|este|esto|estos|estas|son|está|están|sin|sobre|hasta|entre|también|porque|qué|cómo|cuál|dónde|cuánto|cuántas|cuántos|días|día|energía|comida|salud|radiación|agua)(?![\p{L}'])/iu;
    const ACENTOS = /[áéíóúñ¿¡Ñ]/;
    const IGNORAR = /^(Español|Dra\. Ortiz|Control de Misión)$/;
    window.__es = new Map();
    window.__escanear = (raiz) => {
      const w = document.createTreeWalker(raiz || document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.data.replace(/\s+/g, " ").trim(); if (t.length < 3 || IGNORAR.test(t)) continue;
        const p = n.parentElement; if (!p || p.closest("script, style, [data-sin-traducir], #ctrl")) continue;
        if (!(ACENTOS.test(t) || PAL.test(t))) continue;
        // ignorar palabras sueltas como «sol» que en inglés también pueden ser nombres propios
        if (!ACENTOS.test(t) && t.split(" ").length < 2) continue;
        const ctx = (p.closest("[id]") && p.closest("[id]").id) || p.className || p.tagName;
        if (!window.__es.has(t)) window.__es.set(t, ctx);
      }
    };
    // se revisa un instante DESPUÉS del cambio: así el traductor del juego ya tuvo tiempo de actuar
    let pendiente = false;
    new MutationObserver(() => { if (pendiente) return; pendiente = true; setTimeout(() => { pendiente = false; try { window.__escanear(document.body); } catch (e) { /* nada */ } }, 250); })
      .observe(document, { subtree: true, childList: true, characterData: true });
    setInterval(() => { try { const J = window.GNOSIS && GNOSIS.estado().J; if (!J) return; const m = (window.__max = window.__max || { p0: J.partida, partida: 0, dia: 0 }); m.partida = Math.max(m.partida, J.partida); m.dia = Math.max(m.dia, J.dia); } catch (e) { /* nada */ } }, 400);
  });

  await page.goto(`${base}/?auto=1&vel=4&semilla=11`, { waitUntil: "load" });
  console.log("Jugando una misión en inglés…");
  try { await page.waitForFunction(() => window.__max && window.__max.partida > window.__max.p0, null, { timeout: LIMITE_MS, polling: 1000 }); } catch (e) { console.log("(no terminó la misión a tiempo; se revisa lo visto)"); }

  // la bitácora, pestaña por pestaña
  await page.evaluate(() => { const b = document.getElementById("btn-bitacora"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const pestanas = await page.evaluate(() => [...document.querySelectorAll("#bitacora [data-sec]")].map((b) => b.dataset.sec));
  for (const sec of pestanas) {
    await page.evaluate((s) => { const b = document.querySelector(`#bitacora [data-sec="${s}"]`); if (b) b.click(); }, sec);
    await page.waitForTimeout(300);
    // abre cada entrada de la lista para leerla completa
    const n = await page.evaluate(() => document.querySelectorAll("#bitacora .lista button, #bitacora .entrada, #bitacora li button").length);
    for (let i = 0; i < Math.min(n, 40); i++) { await page.evaluate((k) => { const l = document.querySelectorAll("#bitacora .lista button, #bitacora .entrada, #bitacora li button"); if (l[k]) l[k].click(); }, i); await page.waitForTimeout(60); }
    await page.evaluate(() => window.__escanear(document.getElementById("bitacora")));
  }
  const encontrados = await page.evaluate(() => [...window.__es.entries()]);
  console.log(`\nTextos en español dentro del juego en inglés: ${encontrados.length}`);
  for (const [t, c] of encontrados) console.log(`  · [${c}] ${t.slice(0, VERBOSO ? 400 : 170)}`);
  codigo = encontrados.length ? 1 : 0;
  console.log(codigo ? "\nFALLÓ: hay texto sin traducir." : "\nTODO BIEN: no se vio texto en español.");
} catch (e) {
  console.log("la auditoría no pudo correr:", e.message); codigo = 1;
} finally {
  if (navegador) await navegador.close().catch(() => {});
  if (servidor) servidor.kill();
}
process.exit(codigo);
