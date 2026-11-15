# Diseño

Material de diseño y prototipos. No se despliega en Vercel (solo `public/` se publica).

- `mapa-mision-lunar.html`: mapa interactivo del grafo de 14 días con el simulador de balance.
- `escenarios/`: biblia de escenarios (las 8 escenas ASCII con sus estados, la paleta y la cobertura de eventos).
- `panel-maestro/panel-grupo.dc.html`: maqueta del panel del maestro (modo Salón).
- `simulacion-ares14/`: primer prototipo jugable (todavía con el nombre ARES-14), reemplazado por `public/`. No incluye el audio.

Las páginas de `escenarios/` y `simulacion-ares14/` se escribieron como artifacts, así que no tienen `<!doctype>`. Para abrirlas, sírvelas con `npx serve diseno`.
