# Fase 10 — Pulido, validación y preparación para uso real

## Objetivo
Consolidar el flujo completo —diseñar, mapear, previsualizar, generar y descargar— con validaciones claras, diagnóstico visible y errores accionables.

## Implementación
- `src/template/validation.js`: valida tokens, campos mapeados, imágenes y capas fuera del lienzo.
- `src/panels/DiagnosticsPanel.jsx`: panel flotante con errores y advertencias en tiempo real.
- `src/App.jsx`: integra el diagnóstico y guarda el motivo de cada fila fallida.
- `src/state/template-store.js`: traduce errores comunes de Google Sheets a mensajes útiles.
- `tests/fase-10-validacion.spec.js`: verifica el panel y su acceso por teclado.

## Validaciones
- Campo mapeado que no existe en la plantilla: **error**.
- Imagen sin URL o archivo: **error**.
- Imagen con URL inválida: **error**.
- Imagen dinámica sin valor por defecto antes de conectar Sheets: **advertencia**.
- Capa completamente fuera del lienzo: **advertencia**.
- Hoja conectada sin columnas mapeadas: **advertencia**.

## Errores de Sheets
- API key inválida.
- Hoja sin permisos de lectura pública.
- Pestaña o rango inválido.
- Hoja no encontrada.

## Lote
- No permite generar si el diagnóstico tiene errores.
- Registra fila y motivo de cada fallo.
- Muestra el total de imágenes exitosas y fallidas.

## Cómo probar
1. Abrir la app: el diagnóstico debe decir “Sin problemas detectados”.
2. Crear una imagen con URL inválida: debe aparecer un error.
3. Mapear una columna a un campo inexistente: debe aparecer un error.
4. Conectar una hoja sin permisos: debe mostrarse la causa específica.
5. Generar un lote con una imagen sin CORS: la fila debe quedar registrada como fallida con su motivo.
