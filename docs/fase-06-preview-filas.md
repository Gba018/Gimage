# Fase 06 — Vista previa por fila

## Objetivo
Permitir seleccionar una fila de Google Sheets y previsualizar sus valores en el lienzo sin modificar la plantilla.

## Implementación
- `src/state/template-store.js`: agrega `sheets.activeRowIndex` y `setActiveRowIndex`.
- `src/canvas/CanvasStage.jsx`: calcula los valores de la fila activa con `valoresDeFila`.
- `src/canvas/CanvasObject.jsx`: acepta `fieldsPreview` y usa esos valores para resolver texto e imágenes.
- `src/panels/LeftPanel.jsx`: agrega el selector **Fila activa** en la pestaña Datos.

## Reglas
- La vista previa es temporal y de sesión.
- No modifica `template`, `fields` ni los valores por defecto.
- Si no hay fila activa, el lienzo usa los valores por defecto.
- Al reconectar o desconectar la hoja, se limpia la fila activa.

## Cómo probar
1. Conectar una hoja y mapear columnas.
2. Seleccionar **Fila 1** en **Vista previa**.
3. Verificar que los textos e imágenes con campos muestran los valores de esa fila.
4. Cambiar a **Fila 2** y verificar la actualización.
5. Volver a **Sin vista previa** y verificar que regresan los valores por defecto.
