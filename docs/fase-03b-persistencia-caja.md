# Corrección post-fase 03 — Persistencia de caja de texto

## Objetivo

Mover `width`, `height`, `autoFit` y `overflow` del estado transitorio `textBoxes` al contrato de plantilla, para que la fase 07 pueda guardar y restaurar fielmente las cajas de texto.

## Alcance SÍ

- Extender `capas[].texto` con:
  ```json
  "caja": {
    "width": 500,
    "height": 120,
    "autoFit": false,
    "overflow": "libre"
  }
  ```
- Usar `version: 3` cuando exista al menos un texto con `caja`.
- Al leer plantillas v2 sin `caja`, derivar valores iniciales y aplicar defaults.
- Eliminar la dependencia estructural de `textBoxes` para persistencia; puede mantenerse como caché/UI, pero la fuente de verdad pasa a ser `capa.texto.caja`.
- Actualizar undo/redo, panel de propiedades, edición inline, auto-fit y overflow para leer/escribir `caja`.
- Mantener `fontSize` como tamaño final resultante del auto-fit.

## Alcance NO

- No implementar fases 04–07.
- No cambiar la representación de degradados ni otros objetos.
- No refactorizar más allá de lo necesario para migrar el estado de caja.

## Criterios de aceptación

1. Crear un texto, definir caja, auto-fit y overflow.
2. Serializar el estado interno: `caja` debe aparecer en `capa.texto`.
3. Recargar o reconstruir el estado desde esa estructura: la caja y el comportamiento se restauran.
4. Una plantilla sin `caja` sigue funcionando con defaults.
5. Undo/redo sigue cubriendo todos los cambios.
