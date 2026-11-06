# Fase 07 — Guardado y carga de plantilla

## Objetivo
Conservar el trabajo del usuario sin backend: autoguardado en el navegador, exportación a `.json` y apertura de plantillas.

## Implementación
- `src/template/persistencia.js`: serializa, valida, guarda en `localStorage` y descarga archivos.
- `src/state/template-store.js`: agrega `guardarEnNavegador`, `cargarDesdeNavegador` e `importarPlantilla`.
- `src/App.jsx`: restaura el autoguardado al iniciar, guarda con debounce de 800 ms y maneja la importación.
- `src/panels/TopBar.jsx`: agrega botones **Abrir plantilla** y **Guardar plantilla**.

## Formato del archivo

```json
{
  "app": "gimage",
  "version": 3,
  "guardadoEn": "2026-11-05T00:00:00.000Z",
  "template": { "nombre": "", "canvas": {}, "capas": [] },
  "fields": {}
}
```

## Reglas
- El autoguardado incluye `template` y `fields`; no incluye conexión ni filas de Google Sheets.
- La API key de Sheets sigue guardándose por separado en `gimage_sheets_api_key`.
- Abrir una plantilla reemplaza el proyecto actual, limpia historial y selección.
- `Ctrl/Cmd + S` descarga la plantilla como `.json`.

## Cómo probar
1. Crear elementos y recargar la página: debe restaurarse el último trabajo.
2. Pulsar **Guardar plantilla** o `Ctrl/Cmd + S`: debe descargarse un `.gimage.json`.
3. Pulsar **Abrir plantilla** y elegir el archivo: debe reemplazarse el lienzo.
4. Intentar abrir un JSON inválido: debe mostrarse un error sin romper la app.
