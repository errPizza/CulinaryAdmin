---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Licencias (shell de CulinaryAdmin)

Scope: el shell completo del panel y su primera pantalla, Licencias. Mode: operate.
Audience: el proveedor y 2-3 personas de confianza, en oficina, sesiones largas. Job: emitir, ajustar, renovar, revocar y liberar licencias; atender tickets; publicar versiones.
Constraints: API /admin/v1 de CulinaryServer; Tauri + React + Vite; español de México.
User pin: panel oscuro, colores principales negro y rojo, "como el tablero de llaves pero mejor diseñado".

## Direction contract
THESIS: Cada licencia es una llave en el casillero de la recepción: de un vistazo se ve cuál salió, cuál nunca se entregó y cuál se retiró. Rechaza el panel SaaS de tarjetas de métricas e insignias índigo.
OWN-WORLD: Casillero lacado negro (#0d0d0f a #1a1a1d), rojo lacre (#d7263d) solo en acciones y en el gancho de la licencia seleccionada, latón apagado (#c9a46a) para vencimientos, texto marfil (#eceae4). Placas de llave con esquina recortada y un orificio, números en mono tabular.
STORY: El proveedor ve primero qué vence o ya venció, filtra por estado y abre una licencia para actuar; la acción irreversible siempre lleva nombre.
FIRST VIEWPORT: Riel izquierdo negro con las secciones y contadores; encabezado con búsqueda y "Nueva licencia" en rojo; franja "Vencen pronto" ordenada por fecha en columnas fijas; filtros por estado; casillero de placas en rejilla con un modo tabla; panel lateral de la licencia al seleccionar.
FORM: Tablero de llaves, candidato 6 de 7 de mi lista ordenada, asignado por el sorteo y fijado por el usuario en negro y rojo. seed:42d0075c1f72d8a2
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
