# 01 - Stack y convenciones técnicas

Este archivo cierra las decisiones técnicas. El agente NO debe cambiarlas ni proponer
alternativas salvo instrucción explícita del usuario.

## Stack
- **React 18** con **Vite** (plantilla `react` de Vite, JavaScript, sin TypeScript).
- **react-konva** + **konva** para todo lo relacionado con el canvas.
- **zustand** para el estado global de la plantilla (objetos, selección, canvas).
- **JSZip** + descarga vía Blob/URL.createObjectURL para el paquete de imágenes.
- **Google Fonts** cargadas dinámicamente con el loader oficial (`WebFont`).
- Sin backend, sin framework CSS pesado: CSS plano con variables. Estética tipo editor
  (barras laterales oscuras, lienzo claro central).

## Integración con Google Sheets (lectura)
- Endpoint: `https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}?key={API_KEY}`
- La hoja debe estar compartida como "Cualquier persona con el enlace puede ver".
- El usuario pega: API key, ID de la hoja (o URL completa, se extrae el ID), y nombre de
  pestaña + rango (default: primera pestaña, `A1:Z1000`).
- El API key se guarda solo en localStorage, nunca en la plantilla JSON.

## Estructura de carpetas
```
src/
  main.jsx
  App.jsx
  state/
    template-store.js      # zustand: canvas, objetos, selección, bindings
  canvas/
    CanvasStage.jsx        # Stage, zoom, paneo, guías
    CanvasObject.jsx       # renderiza un objeto según su tipo
    SelectionTransformer.jsx
    Guides.jsx             # guías inteligentes y snap
  panels/
    LeftPanel.jsx          # pestañas: Objetos / Capas / Campos / Datos
    RightPanel.jsx         # propiedades del objeto seleccionado
    TopBar.jsx
  template/
    schema.js              # validación y utilidades del esquema (ver 02)
    serialize.js           # plantilla <-> JSON
  sheets/
    sheets-client.js       # lectura de Sheets
    mapper.js              # columnas -> bindings
  batch/
    renderer.js            # render por filas -> PNG -> ZIP
    preview.js
  styles/
    editor.css
public/
  (fuentes/íconos si se requieren locales)
```

## Convenciones
- Componentes: PascalCase (`CanvasStage.jsx`). Utilidades: camelCase (`serialize.js`).
- Textos de UI en español.
- Comentarios de código en español, solo donde aporten (no comentar lo obvio).
- Nada de código muerto: si una fase no usa algo, no se escribe.

## Decisiones deliberadamente NO tomadas aún
- Autenticación OAuth (fase posterior, solo si se pide).
- Backend de render (no se hará salvo instrucción explícita).
