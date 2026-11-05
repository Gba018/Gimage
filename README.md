# Lienzo · Fase 02 (Propiedades, capas, degradados e historial)

Editor de plantillas de imagen 100 % en navegador con React 18, Vite, react-konva y Zustand. Incluye el lienzo base de la Fase 01 y el alcance completo de la **Fase 02**: panel de capas, panel de propiedades por tipo de objeto, editor reutilizable de rellenos sólidos y degradados (`<Fill>` lineal y radial), edición del fondo del lienzo e historial de deshacer/rehacer (`undo/redo`).

> **El proyecto vive solo en memoria.** El mapeo de campos, la conexión con Google Sheets, la generación por lotes en ZIP y el guardado de plantilla corresponden a fases posteriores.

## Arranque

Requisitos: Node.js 20 o superior y npm.

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. Para comprobar la compilación de producción ejecuta `npm run build`.

## Controles principales

- **Panel izquierdo (`Elementos` / `Capas`)**:
  - **Elementos**: insertar **Texto**, **Rectángulo**, **Círculo**, **Línea** o **Imagen** (archivo local o URL).
  - **Capas**: lista ordenada (`1.ª = Fondo`, última = `Frente`), clic para seleccionar (`Shift + clic` selección múltiple), doble clic para renombrar, icono de ojo para mostrar/ocultar e icono de candado para bloquear/desbloquear en el lienzo.
  - Reordenar capas arrastrando filas, con botones de barra o con **`Ctrl/Cmd + [`** (hacia el fondo) y **`Ctrl/Cmd + ]`** (hacia el frente).
- **Panel derecho (`Propiedades`)**:
  - Sin selección (o pulsando **Lienzo**): edita el **fondo del canvas** con el editor de `<Fill>`.
  - Con una capa seleccionada: nombre, visibilidad, bloqueo, posición `X/Y` (enteros), tamaño (`W/H`, `Radio` o `Longitud`), rotación y opacidad (`0–1` con máximo 1 decimal), más propiedades específicas de cada tipo (`rect`, `circulo`, `linea`, `texto` con resaltado informativo de `{{campo}}`, `imagen` con candado de proporción, reemplazo y recorte básico).
- **Editor de `<Fill>`**:
  - Alterna entre **Sólido** (`color picker` + hexadecimal) y **Degradado** (**Lineal** `0–360°` con indicador visual del sentido o **Radial** con centro `X/Y %`).
  - Barra interactiva de **2 a 8 paradas**: clic en la barra añade una parada interpolada, arrastrar mueve su posición (`0–100 %`) en vivo, y doble clic elimina una parada cuando hay más de 2.
- **Historial y atajos**:
  - **`Ctrl/Cmd + Z`** deshacer · **`Ctrl/Cmd + Y`** (o `Ctrl/Cmd + Shift + Z`) rehacer.
  - **`Ctrl/Cmd + D`** duplicar · **`Supr` / `Backspace`** eliminar · **Flechas** mover `1 px` (`Shift` = `10 px`) · **`Espacio` + arrastrar** paneo · **Rueda** zoom al puntero (`25 %–300 %`).

## Pruebas

```bash
npx playwright install chromium
npm test
```
