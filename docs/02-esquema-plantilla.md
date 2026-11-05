# 02 — Esquema de plantilla (contrato JSON) — v2

Toda plantilla se guarda/serializa con esta forma. El agente codificador NO debe inventar campos fuera de este contrato; si falta algo, preguntar.

## Versionado
- `version: 1` — plantillas de la fase 01 (solo rellenos sólidos, cadenas hex).
- `version: 2` — admite **degradados**. Obligatorio usar `version: 2` en cuanto la plantilla contenga al menos un degradado (fondo, forma o texto).

```json
{
  "version": 2,
  "nombre": "Plantilla oferta",
  "canvas": {
    "width": 1080,
    "height": 1080,
    "background": { "fill": <Fill> }
  },
  "capas": [
    {
      "id": "uuid",
      "tipo": "rect" | "circulo" | "linea" | "texto" | "imagen",
      "nombre": "Caja fondo",
      "visible": true,
      "bloqueada": false,
      "x": 0, "y": 0, "rotation": 0,
      "opacity": 1,
      "rect":   { "width": 500, "height": 300, "fill": <Fill>, "stroke": <Stroke>, "cornerRadius": 12 },
      "circulo":{ "radius": 120, "fill": <Fill>, "stroke": <Stroke> },
      "linea":  { "points": [0,0, 200,0], "stroke": <Stroke>, "strokeWidth": 4 },
      "texto":  { "texto": "Hola {{nombre}}", "fontFamily": "Inter", "fontSize": 48, "fill": <Fill>, "align": "left|center|right", "fontStyle": "normal|bold", "letterSpacing": 0, "lineHeight": 1.2 },
      "imagen": { "src": "dataURL", "width": 400, "height": 300 }
    }
  ]
}
```

## Fill (relleno) — COLOR SÓLIDO o DEGRADADO

Un `<Fill>` puede ser cualquiera de estas formas:

```json
// 1) Sólido LEGACY (fase 01, sigue siendo válido al leer y escribir)
"#FF5733"

// 2) Sólido como objeto
{ "type": "solid", "color": "#FF5733" }

// 3) Degradado LINEAL
{ "type": "linear", "angle": 0, "stops": [
  { "offset": 0, "color": "#ff8800" },
  { "offset": 1, "color": "#ffdd00" }
] }

// 4) Degradado RADIAL
{ "type": "radial", "centerX": 0.5, "centerY": 0.5, "stops": [
  { "offset": 0, "color": "#ff8800" },
  { "offset": 1, "color": "#ffdd00" }
] }
```

Reglas:
- **Stop**: `{ "offset": <0–1>, "color": "#RRGGBB" }`. Mínimo 2 stops, máximo 8, ordenados por `offset`.
- **Linear**: `angle` en grados — 0 = izquierda→derecha, 90 = arriba→abajo, 180 = derecha→izquierda, 270 = abajo→arriba.
- **Radial**: `centerX`/`centerY` en fracciones 0–1 del ancho/alto de la forma (0.5, 0.5 = centro geométrico). No usa `angle`.
- (Opacidad por stop: fase posterior si se requiere.)
- Al serializar, se puede escribir el sólido en cualquiera de las dos formas (1 o 2); al leer hay que aceptar ambas.
- Render en Konva:
  - linear → `fillLinearGradientStartPoint/EndPoint` + `fillLinearGradientColorStops` (convertir `offset` a la posición 0–1 que pide Konva y `angle` a start/end points según el tamaño de la forma).
  - radial → `fillRadialGradientStartPoint/EndPoint/StartRadius/EndRadius` + `fillRadialGradientColorStops`.
- El mismo `<Fill>` sirve para fondo del canvas, rectángulos, círculos y texto.

## Stroke (borde)

```json
{ "color": "#222222", "width": 2 }
```
Si `width` es 0, no hay borde.
