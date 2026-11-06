# Fase 08 — Exportar lienzo a PNG

## Objetivo
Exportar el área exacta del lienzo como imagen PNG en alta resolución.

## Implementación
- `src/canvas/CanvasStage.jsx`: expone `exportarPNG({ pixelRatio })`; oculta guías manuales e inteligentes durante el render.
- `src/template/persistencia.js`: agrega `descargarDataUrl`.
- `src/panels/TopBar.jsx`: agrega el botón **Exportar PNG**.
- `src/App.jsx`: conecta el botón y `Ctrl/Cmd + E`; muestra avisos de éxito o error.

## Reglas
- Exporta solo el rectángulo del lienzo, no las reglas ni la interfaz.
- Usa `pixelRatio: 2` por defecto: un lienzo de 1080 × 1350 genera 2160 × 2700 px.
- Las guías no aparecen en el PNG.
- Si una imagen externa bloquea CORS, el navegador impide exportar; la app muestra una advertencia clara.

## Cómo probar
1. Crear un diseño con texto, forma e imagen.
2. Pulsar el botón PNG o `Ctrl/Cmd + E`.
3. Verificar que se descarga `nombre-del-proyecto.png`.
4. Abrir la imagen y comprobar que mide el doble del lienzo y no incluye guías.
