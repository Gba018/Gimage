# Fase 05 — Conexión a Google Sheets

## Objetivo
Conectar una hoja pública de Google Sheets de solo lectura, leer encabezados y filas, y mapear columnas a campos dinámicos.

## Implementación
- `src/sheets/sheets-client.js`: extrae el ID desde URL o ID directo, construye el rango y llama a Sheets API v4 con API key.
- `src/sheets/mapper.js`: normaliza la primera fila como encabezados, normaliza filas y resuelve valores por campo.
- `src/state/template-store.js`: estado `sheets` de sesión con API key en `localStorage`, conexión, errores, encabezados, filas y `columnToField`.
- `src/panels/LeftPanel.jsx`: pestaña **Datos** con conexión, estado, errores, columnas y mapeo.

## Reglas
- La API key se guarda solo en `localStorage`; nunca en la plantilla JSON.
- Encabezados y filas son datos de sesión; no se serializan en la plantilla.
- La hoja debe estar compartida como “Cualquier persona con el enlace puede ver”.
- La primera fila del rango se interpreta como encabezados.

## Fuera de alcance
- Previsualización por fila, render masivo, ZIP y guardado de plantilla: fases 06 y 07.

## Cómo probar
1. Crear un texto con `{{cliente}}`.
2. Ir a **Datos**, pegar API key, URL de hoja, pestaña y rango.
3. Pulsar **Conectar y leer**.
4. Mapear la columna correspondiente a `{{cliente}}`.
5. Verificar que se muestran la cantidad de filas y las columnas.
