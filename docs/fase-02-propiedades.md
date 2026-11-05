# Fase 02 — Propiedades y capas (incluye editor de degradado)

## Objetivo
Panel derecho de propiedades de la capa seleccionada y panel izquierdo de capas, con edición completa del relleno sólido/degradado según el esquema `<Fill>`.

## Panel de capas (izquierda)
- Lista ordenada (primera = fondo). Click selecciona; doble click renombra; ojo = visible; candado = bloqueada.
- Arrastrar para reordenar (subir/bajar también con botones y atajos Ctrl+[ / Ctrl+]).
- Botones: duplicar (Ctrl+D), borrar (Supr), agrupar/no (deseado, si es simple).

## Panel de propiedades (derecha) — según tipo de capa
Comunes a todas: posición x/y, tamaño w/h (o radio), rotación, opacidad (slider 0–1), nombre, visible/bloqueada.
- **rect**: cornerRadius, fill, stroke (color + ancho).
- **circulo**: fill, stroke.
- **linea**: points editables por grosor/color (longitud vía Transformer), stroke (color + width).
- **texto**: contenido (textarea), fontFamily (select con Google Fonts ya usadas + input libre), fontSize, fill, align, bold, letterSpacing, lineHeight. (Detección visual de `{{campo}}` se puede adelantar si es trivial: resaltarlos, sin UI de mapeo.)
- **imagen**: reemplazar imagen, recorte básico (si simple), w/h con candado de proporción.

## Editor de Fill (reutilizable, usado por rect, circulo, texto y fondo del canvas)
- Toggle **Sólido / Degradado**.
- Sólido: color picker nativo + input hex.
- Degradado:
  - Tipo: **lineal** / **radial**.
  - Si linear: slider de **ángulo** (0–360°, con vista previa del sentido: 0=→, 90=↓, 180=←, 270=↑).
  - Si radial: controles de centro x/y en % (por defecto 50/50).
  - **Barra de stops**: mínimo 2, máximo 8. Click en la barra agrega stop; arrastrar lo mueve (0–100%); doble click en un stop lo borra (no permitir borrar si quedan < 2). Cada stop: color picker + hex + tooltip de %.
  - Vista previa en vivo aplicada a la capa seleccionada mientras se edita.
- Serialización exacta al esquema `<Fill>` de `02-esquema-plantilla.md` (nada de campos extra).
- Render en Konva con `fillLinearGradient*` / `fillRadialGradient*` (ver notas de implementación en `02-esquema-plantilla.md`).

## También en esta fase
- Edición del **fondo del canvas** desde el panel (mismo editor de Fill).
- Inputs numéricos con flechas y validación (entero para posiciones, 1 decimal máx para opacidad).
- Todo cambio pasa por el store y entra en el historial de undo/redo (fase 01).

## Fuera de alcance
- Fuentes nuevas por URL arbitraria (fase 03). Mapeo de campos (fase 04). Sheets (05). ZIP (06). Guardar plantilla (07).

## Cómo probar
Seleccionar una forma → aplicarle degradado lineal 0° con stops naranja→amarillo → cambiar a radial con centro desplazado → reordenar capas → renombrar → bloquear una capa y verificar que no se puede seleccionar en canvas → undo/redo de cada cambio.

## Nota de actualización (2026-11-05) — leer antes de implementar

1. **Contrato de Fill**: serializar los rellenos según `02-esquema-plantilla.md` **v2** (adjunta, reemplaza a la anterior). Sí se aceptan los formatos que propusiste: degradado lineal `{ "type": "linear", "angle", "stops": [{ "offset", "color" }] }` y radial `{ "type": "radial", "centerX", "centerY", "stops" }`. Los sólidos actuales (cadenas hex) siguen válidos; también se acepta `{ "type": "solid", "color" }`. Usar `"version": 2` en la plantilla cuando contenga degradados.
2. **Undo/redo pendiente de fase 01**: la implementación actual no tiene historial y esta fase lo presupone. **Implementarlo en esta fase** en el store (zustand): pilas undo/redo sobre el estado de capas + selección, atajos Ctrl+Z / Ctrl+Y, y debe cubrir también todos los cambios del panel de propiedades y del editor de degradado.

El resto de la fase queda como está escrita.
