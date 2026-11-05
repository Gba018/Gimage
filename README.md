# Lienzo · Fase 03 (Texto avanzado: edición inline, Google Fonts, Auto-fit y Overflow)

Editor de plantillas de imagen 100 % en navegador con React 18, Vite, react-konva, Zustand y `webfontloader`. Incluye el lienzo base de la **Fase 01**, el panel de capas/propiedades/degradados/`undo/redo` de la **Fase 02** y el alcance completo de la **Fase 03**: edición inline de texto sobre el canvas, carga dinámica de Google Fonts, `Auto-fit` en caja y control de `Overflow` (`ajustar`, `recortar`, `libre`), cumpliendo estrictamente el contrato `docs/02-esquema-plantilla.md` v2.

> **El proyecto vive solo en memoria.** El mapeo de campos dinámicos, la conexión con Google Sheets, la generación por lotes en ZIP y el guardado de plantilla corresponden a fases posteriores.

## Arranque

Requisitos: Node.js 20 o superior y npm.

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. Para comprobar la compilación de producción ejecuta `npm run build`.

## Controles principales

- **Texto avanzado (Fase 03)**:
  - **Edición inline en el lienzo**: haz **doble clic** sobre cualquier objeto `texto` para editarlo directamente sobre su caja con la misma fuente, tamaño, color, alineación y rotación (`Enter` confirma, `Shift + Enter` inserta salto de línea, `Escape` cancela y restaura el valor anterior, clic fuera confirma).
  - **Google Fonts dinámicas (`WebFont.load`)**: selector con catálogo curado (`Inter`, `Roboto`, `Open Sans`, `Lato`, `Montserrat`, `Poppins`, `Oswald`, `Playfair Display`, `Merriweather`, `Bebas Neue`) más campo libre para cargar cualquier otra familia de Google Fonts bajo demanda con indicador de estado de carga.
  - **Auto-fit y Overflow**: toggle **Auto-fit en caja** (reduce progresivamente `fontSize` hasta mín. `8 px` para caber en `W × H` sin alterar dimensiones de la caja) y modos de desbordamiento **`Ajustar`**, **`Recortar`** (clipping Konva al bounding box) y **`Libre`**.
- **Panel izquierdo (`Elementos` / `Capas`)**:
  - **Elementos**: insertar **Texto**, **Rectángulo**, **Círculo**, **Línea** o **Imagen** (archivo local o URL).
  - **Capas**: lista ordenada (`1.ª = Fondo`, última = `Frente`), selección simple/múltiple, doble clic para renombrar, ojo para mostrar/ocultar, candado para bloquear y reordenamiento drag & drop o con **`Ctrl/Cmd + [`** y **`Ctrl/Cmd + ]`**.
- **Panel derecho (`Propiedades`) y `<Fill>`**:
  - Edita el fondo del lienzo o las propiedades comunes y específicas de cada capa, con soporte completo de rellenos **Sólido** y **Degradado** (**Lineal** `0–360°` o **Radial** con 2–8 paradas).
- **Historial y atajos**:
  - **`Ctrl/Cmd + Z`** deshacer · **`Ctrl/Cmd + Y`** (o `Ctrl/Cmd + Shift + Z`) rehacer.
  - **`Ctrl/Cmd + D`** duplicar · **`Supr` / `Backspace`** eliminar · **Flechas** mover `1 px` (`Shift` = `10 px`) · **`Espacio` + arrastrar** paneo · **Rueda** zoom al puntero (`25 %–300 %`).

## Pruebas

```bash
npx playwright install chromium
npm test
```
