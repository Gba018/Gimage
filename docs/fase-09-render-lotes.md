# Fase 09 — Render masivo por lotes y ZIP

## Objetivo
Generar una imagen PNG por cada fila de Google Sheets usando la plantilla y los campos mapeados, y descargar todas en un ZIP.

## Implementación
- `package.json`: agrega `jszip`.
- `src/canvas/CanvasStage.jsx`: `renderizarPNG` normaliza el Stage a origen y escala 1 antes de exportar; oculta guías y selección.
- `src/App.jsx`: recorre filas, precarga imágenes dinámicas de cada fila, renderiza en 2x y arma el ZIP.
- `src/panels/LeftPanel.jsx`: agrega **Generar imágenes**, progreso y cancelación; bloquea edición durante el lote.
- `src/panels/TopBar.jsx`: bloquea inserción, guardado, apertura, exportación y nuevo proyecto durante el lote.

## Correcciones incluidas
- El PNG siempre usa el lienzo completo en su origen, sin el zoom ni desplazamiento del editor.
- Antes de renderizar una fila, se precargan las imágenes dinámicas resueltas para esa fila.
- El manejador de selección se desmonta durante la exportación, así no aparece en el PNG.
- Durante la generación se bloquean las acciones que pueden modificar la plantilla o la conexión a Sheets.
- Las filas con error se registran y el lote continúa; al final se descarga el ZIP con las imágenes exitosas.

## Cómo probar
1. Conectar una hoja con varias filas y mapear columnas.
2. Pulsar **Generar imágenes**.
3. Verificar progreso, cancelación y descarga del ZIP.
4. Abrir el ZIP y comprobar un PNG por fila, centrado y sin guías ni selección.
5. Probar una imagen sin CORS: la fila debe registrarse como fallida sin detener el resto.
