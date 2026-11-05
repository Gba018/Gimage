# Fase 03 — Texto avanzado

## Objetivo

Convertir el texto básico de la fase 01 en un objeto de texto editable inline, con Google Fonts, auto-fit y control de overflow, sin alterar el contrato de `02-esquema-plantilla.md`.

## Antes de empezar

Leer `00-vision.md`, `01-stack.md`, `02-esquema-plantilla.md`, `99-comportamiento.md`, y revisar la implementación actual de fases 01 y 02.

## Alcance SÍ

- Doble clic sobre un objeto `texto` en el canvas abre edición inline:
  - Aparece un textarea/input superpuesto exactamente sobre el bounding box del texto.
  - El texto se edita con el mismo tamaño, fuente, color y alineación visibles.
  - Enter confirma; Escape cancela y restaura el valor anterior.
  - Click fuera del input también confirma.
- Cargar Google Fonts dinámicamente con `WebFont.load()`:
  - Incluir un catálogo base curado de fuentes: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Oswald, Playfair Display, Merriweather, Bebas Neue.
  - Cargar la fuente al seleccionarla y antes de renderizar el texto.
  - Mostrar un estado de carga breve si la fuente aún no está disponible.
- En el panel derecho, para texto:
  - Select de `fontFamily` con las fuentes del catálogo.
  - Input libre permitiendo escribir otra familia de Google Fonts; al confirmar, intentar cargarla con WebFont.
  - `fontSize`, `fill`, `align`, `fontStyle` (`normal` / `bold`), `letterSpacing` y `lineHeight`.
- Auto-fit:
  - Toggle por objeto de texto: activado/desactivado.
  - Cuando está activado, reducir progresivamente `fontSize` hasta que el texto quepa dentro de `width` y `height` definidos.
  - No modificar `width`/`height` del objeto durante el auto-fit.
  - Guardar el `fontSize` resultante en el esquema; no introducir un campo nuevo de auto-fit en el JSON.
- Overflow:
  - Toggle con tres modos: `ajustar`, `recortar`, `libre`.
  - `ajustar`: equivale a usar auto-fit para que el texto entre en la caja.
  - `recortar`: renderizar solo la porción visible dentro del bounding box; usar clipping de Konva.
  - `libre`: el texto puede desbordar la caja sin recorte ni reducción.
  - El modo se guarda como comportamiento de UI/render; si requiere persistencia, usar solo campos existentes del esquema y preguntar antes de agregar uno nuevo.

## Alcance NO

- Campos dinámicos `{{campo}}`, panel de campos ni bindings (fase 04).
- Google Sheets (fase 05).
- Render masivo o ZIP (fase 06).
- Guardado/carga de plantilla o autoguardado (fase 07).
- Rich text: no implementar negrita/itálica por fragmento, colores por palabra ni listas.
- Fuentes locales o URLs arbitrarias distintas de Google Fonts.

## Especificación

- La edición inline no debe romper zoom ni paneo: deshabilitar drag del objeto mientras se edita.
- Al terminar la edición, actualizar `capas[].texto.texto` en el store y disparar undo.
- El textarea debe posicionarse usando las coordenadas del nodo Konva convertidas a coordenadas de pantalla, teniendo en cuenta zoom y paneo.
- Si el texto tiene rotación, el input debe rotarse con la misma transformación o, si es complejo, editar en un panel modal simple; elegir la opción más simple y marcarla con `// DECISION:`.
- Al cambiar fuente, volver a medir el texto y aplicar auto-fit si está activo.
- Mantener compatibilidad con textos creados en fase 01: deben seguir editándose con el nuevo mecanismo.

## Criterios de aceptación

1. `npm run dev` arranca sin errores.
2. Doble clic en un texto permite editarlo directamente sobre el canvas.
3. Enter, Escape y click fuera comportan correctamente.
4. Puedo elegir una Google Font y el texto se renderiza con ella.
5. Puedo escribir una familia adicional de Google Fonts y se carga correctamente.
6. Auto-fit reduce el tamaño hasta que el texto cabe en su caja.
7. Overflow en `recortar` no dibuja texto fuera del bounding box.
8. Overflow en `libre` permite que el texto se extienda más allá de la caja.
9. Todos los cambios quedan en undo/redo.
10. El JSON interno sigue cumpliendo `02-esquema-plantilla.md` v2.
