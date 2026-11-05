# Fase 01 - Canvas base del editor

## Objetivo
Tener un lienzo funcional donde se puedan crear, seleccionar, mover, redimensionar y
rotar los objetos básicos (rectángulo, texto, imagen), con zoom, paneo y guías.

## Antes de empezar
Leer `00-vision.md`, `01-stack.md`, `02-esquema-plantilla.md` y `99-comportamiento.md`.

## Alcance SÍ
- Lienzo (Stage) con dimensiones configurables al crear el proyecto (presets: post
  1080×1080, historia 1080×1920, banner 1200×628, y personalizado).
- Zoom con rueda del mouse centrado en el puntero (0.25x a 3x). Botón "ajustar al 100%"
  y "ajustar a pantalla" en la barra superior.
- Paneo: mantener **Espacio** + arrastrar, o arrastre con botón central del mouse.
- Reglas laterales (superior e izquierda) con marcas, y guías arrastrables desde ellas.
- Botones/barra para insertar: rectángulo, texto, imagen (subida local o URL).
- Selección con clic; selección múltiple con Shift+clic.
- Mover objetos con arrastre y con flechas del teclado (Shift = 10px).
- Redimensionar con Transformer (8 handles; Shift mantiene proporción en imágenes).
- Rotar con handle del Transformer.
- Duplicar (Ctrl+D) y eliminar (Supr/Backspace). Atajos estándar.
- Guías inteligentes al mover: snap al centro vertical/horizontal del lienzo y a bordes
  de otros objetos, con tolerancia de 5px y líneas guía visibles mientras se arrastra.
- El estado de los objetos vive en el zustand store en el formato exacto de
  `02-esquema-plantilla.md` (campos comunes: id, name, type, x, y, width, height,
  rotation, opacity, visible, locked, shadow).
- El texto insertado usa las propiedades por defecto del esquema (`{{titulo}}` NO se
  implementa aún: el texto es contenido fijo; los bindings llegan en la fase 04).

## Alcance NO (no implementar aunque sea tentador)
- Panel derecho de propiedades detallado (fase 02). Solo lo mínimo indispensable.
- Edición inline de texto con cursor (fase 03); por ahora editar contenido con doble clic
  abriendo un prompt simple o input básico.
- Capas: panel, reordenar, bloquear (fase 02). `locked`/`visible` solo existen en el esquema.
- Google Fonts dinámicas (fase 03); usar fuentes del sistema por ahora.
- Bindings, Sheets, previsualización, render masivo, guardado de plantilla (fases 04-07).
- Degradados, filtros de imagen, recorte de imagen, grupos.

## Especificación
- Layout: barra superior (nombre del proyecto, zoom, insertar objeto), panel izquierdo
  (solo botones de insertar por ahora), lienzo central sobre fondo gris, sin panel derecho
  todavía (se agrega en fase 02).
- Fondo del lienzo: color sólido configurable al crear el proyecto (default blanco).
- La selección muestra el Transformer de Konva sobre el/los objetos seleccionados.
- Los objetos nacen centrados en el lienzo (aunque el stage esté con zoom/paneo).
- IDs generados como `obj_` + 6 caracteres alfanuméricos.

## Criterios de aceptación
1. `npm run dev` arranca sin errores y se ve el lienzo.
2. Puedo insertar un rectángulo, un texto y una imagen; aparecen centrados.
3. Puedo seleccionar, mover, redimensionar y rotar cada objeto.
4. Shift+clic selecciona varios objetos y el Transformer los envuelve a todos.
5. Ctrl+D duplica y Supr elimina.
6. La rueda del mouse hace zoom hacia el puntero; Espacio+arrastre panea.
7. Al mover un objeto cerca del centro del lienzo o del borde de otro objeto, hace snap
   y se ve la línea guía.
8. Los objetos del store cumplen el esquema de `02-esquema-plantilla.md`.

## Notas técnicas
- react-konva: `Stage`, `Layer`, `Rect`, `Text`, `Image` (con `use-image` o carga manual),
  `Transformer` (refrescar nodos al cambiar la selección).
- Zoom: `stage.scale({x,y})` + `stage.position()` recalculados respecto al puntero
  (fórmula estándar de zoom-to-pointer en documentación de Konva).
- Guías: implementar en `onDragMove` comparando posiciones del objeto arrastrado contra
  centro del lienzo y bounding boxes de los demás objetos; usar `dragBoundFunc` o ajustar
  posición y mostrar líneas de guía en una capa aparte.
- Snap también al soltar (`onDragEnd`), no solo durante el arrastre.
- Texto nuevo por defecto: "Doble clic para editar", fontSize 48, Inter/fallback del
  sistema, negro #111111, centrado, ancho 500, alto 80.
