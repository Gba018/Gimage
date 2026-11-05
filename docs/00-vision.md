# 00 - Visión del proyecto

## Nombre provisional
Generador de imágenes masivas desde Sheets (editor de plantillas + render por lotes).

## Qué se construye
Una aplicación web que permite:
1. Diseñar plantillas de imagen en un lienzo visual estilo Canva (sin IA): objetos de texto,
   imágenes y formas, con posición, estilo, color, sombra, rotación, etc.
2. Vincular objetos a campos dinámicos (`{{titulo}}`, `{{precio}}`, `{{foto}}`...).
3. Conectar una hoja de Google Sheets y usar sus columnas como fuente de datos.
4. Previsualizar el diseño con los datos de cada fila.
5. Generar imágenes en masa (una por fila) con el mismo diseño, descargables en ZIP.

## Flujo de usuario completo
Diseñar plantilla → definir campos dinámicos → pegar ID de hoja de Sheets → mapear columnas
a campos → previsualizar fila por fila → generar lote → descargar ZIP.

## Principios rectores
- **Sin IA**: todo es layout determinístico sobre canvas.
- **Sin backend**: la app corre 100% en el navegador. El render masivo se hace con
  `stage.toDataURL()` y el ZIP con JSZip en el cliente.
- **La plantilla es JSON**: el diseño se guarda como un documento JSON versionado
  (ver `02-esquema-plantilla.md`). El editor y el motor de render comparten ese contrato.
- **Datos en vivo desde Sheets**: lectura directa vía Google Sheets API v4 con API key.

## Qué NO es (fuera de alcance)
- No es un editor tipo Photoshop (sin pinceles, máscaras ni retoque).
- No genera imágenes con IA.
- No tiene usuarios, cuentas ni persistencia en servidor (solo localStorage).
- No edita la hoja de Sheets: la hoja es solo lectura.

## Decisiones de arquitectura (cerradas)
| Decisión | Elección |
|---|---|
| Motor de canvas | Konva.js vía react-konva |
| UI | React 18 + Vite, JavaScript (JSX) |
| Estado de la plantilla | zustand |
| Render masivo | Cliente: Konva `toDataURL` + JSZip |
| Fuente de datos | Google Sheets API v4 + API key |
| Fuentes tipográficas | Google Fonts |
| Idioma de la UI | Español |
