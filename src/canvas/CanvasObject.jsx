import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva';
import { cargarGoogleFont, estadoGoogleFont, suscribirFuentes } from './font-loader.js';
import { cargarImagen } from './image-loader.js';
import { obtenerCajaTexto, useTemplateStore } from '../state/template-store.js';
import { konvaFillProps, normalizarStroke } from '../template/schema.js';

function usarImagen(src) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    let vigente = true;
    setImage(null);
    if (src) {
      cargarImagen(src)
        .then((resultado) => { if (vigente) setImage(resultado.image); })
        .catch(() => {});
    }
    return () => { vigente = false; };
  }, [src]);
  return image;
}

export default function CanvasObject({
  object,
  registerNode,
  onDragStart,
  onDragMove,
  onDragEnd,
  onStartTextEdit,
  isEditing = false,
  panMode,
}) {
  const selectObject = useTemplateStore((state) => state.selectObject);
  const reapplyAutoFitForFont = useTemplateStore((state) => state.reapplyAutoFitForFont);
  const rawTextBox = useTemplateStore((state) => (
    object.tipo === 'texto' ? state.textBoxes[object.id] : null
  ));

  const textBox = useMemo(
    () => (object.tipo === 'texto'
      ? obtenerCajaTexto(object, rawTextBox ? { [object.id]: rawTextBox } : {})
      : null),
    [object, rawTextBox],
  );

  const textBoxRef = useRef(textBox);
  textBoxRef.current = textBox;
  const textNodeRef = useRef(null);
  const [renderedFontFamily, setRenderedFontFamily] = useState(
    () => (object.tipo === 'texto' ? (object.texto?.fontFamily || 'Inter') : 'Inter'),
  );

  const image = usarImagen(object.tipo === 'imagen' ? object.imagen.src : '');

  useEffect(() => {
    if (object.tipo !== 'texto' || !object.texto?.fontFamily) return undefined;
    const familia = object.texto.fontFamily;
    let activo = true;

    const activarYRemedir = () => {
      if (!activo) return;
      setRenderedFontFamily(familia);
      window.requestAnimationFrame(() => {
        if (!activo) return;
        const nodoTexto = textNodeRef.current;
        if (nodoTexto) {
          nodoTexto._setTextData?.();
          nodoTexto.getLayer()?.batchDraw();
        }
        reapplyAutoFitForFont(familia, { historyKey: `font-autofit:${object.id}` });
      });
    };

    if (estadoGoogleFont(familia) === 'loaded') {
      activarYRemedir();
      return () => { activo = false; };
    }

    cargarGoogleFont(familia).then(() => {
      activarYRemedir();
    });

    const cancelarSuscripcion = suscribirFuentes((evento) => {
      if (
        (evento.status === 'loaded' || evento.status === 'error')
        && evento.family.toLowerCase() === String(familia).trim().toLowerCase()
      ) {
        activarYRemedir();
      }
    });

    return () => {
      activo = false;
      cancelarSuscripcion();
    };
  }, [object.id, object.tipo, object.texto?.fontFamily, reapplyAutoFitForFont]);

  const setNode = useCallback((node) => {
    if (node && object.tipo === 'linea') {
      // Garantiza una altura mínima de caja para que Konva.Transformer pueda escalar líneas horizontales a cualquier zoom.
      node.getSelfRect = () => {
        const pts = node.points();
        const xs = pts.filter((_, idx) => idx % 2 === 0);
        const ys = pts.filter((_, idx) => idx % 2 === 1);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const rawH = maxY - minY;
        const padY = rawH < 12 ? (12 - rawH) / 2 : 0;
        return {
          x: minX,
          y: minY - padY,
          width: Math.max(1, maxX - minX),
          height: Math.max(12, rawH),
        };
      };
    } else if (node && object.tipo === 'texto') {
      // Mantiene el bounding box del Group anclado a width × height de la caja de texto en los 3 modos de overflow.
      node.getClientRect = function getClientRectTexto(config = {}) {
        const caja = textBoxRef.current || { width: 520, height: 80 };
        const sx = node.scaleX();
        const sy = node.scaleY();
        const selfRect = {
          x: 0,
          y: 0,
          width: caja.width,
          height: caja.height,
        };
        if (config.skipTransform) {
          return selfRect;
        }
        // _transformedRect aplica posición, rotación y escala actual (incluyendo durante el arrastre de Transformer)
        return this._transformedRect(selfRect, config.relativeTo);
      };
    }
    registerNode(object.id, node);
  }, [object.id, object.tipo, registerNode]);

  function select(event) {
    if (panMode || object.bloqueada || (event.evt.button !== undefined && event.evt.button !== 0)) return;
    event.cancelBubble = true;
    selectObject(object.id, Boolean(event.evt.shiftKey));
  }

  function editText(event) {
    if (object.tipo !== 'texto' || panMode || object.bloqueada) return;
    event.cancelBubble = true;
    selectObject(object.id, false);
    onStartTextEdit?.(object.id);
  }

  const common = {
    ref: setNode,
    id: object.tipo === 'texto' ? `${object.id}__box` : object.id,
    name: 'canvas-object',
    x: object.x,
    y: object.y,
    rotation: object.rotation,
    opacity: object.opacity,
    visible: object.visible,
    listening: !object.bloqueada,
    draggable: !object.bloqueada && !panMode && !isEditing,
    onMouseDown: select,
    onTouchStart: select,
    onDblClick: editText,
    onDblTap: editText,
    onDragStart: (event) => onDragStart(object.id, event),
    onDragMove: () => onDragMove(object.id),
    onDragEnd: () => onDragEnd(object.id),
    onMouseEnter: (event) => {
      if (!panMode && !object.bloqueada && !isEditing) {
        event.target.getStage().container().style.cursor = 'move';
      }
    },
    onMouseLeave: (event) => {
      event.target.getStage().container().style.cursor = '';
    },
  };

  if (object.tipo === 'rect') {
    const { width, height, cornerRadius, fill } = object.rect;
    const stroke = normalizarStroke(object.rect.stroke);
    const fillProps = konvaFillProps(fill, { minX: 0, minY: 0, width, height });
    return (
      <Rect
        {...common}
        width={width}
        height={height}
        cornerRadius={cornerRadius}
        {...fillProps}
        strokeEnabled={stroke.width > 0}
        stroke={stroke.color}
        strokeWidth={stroke.width}
      />
    );
  }

  if (object.tipo === 'circulo') {
    const { radius, fill } = object.circulo;
    const stroke = normalizarStroke(object.circulo.stroke);
    const fillProps = konvaFillProps(fill, {
      minX: -radius,
      minY: -radius,
      width: radius * 2,
      height: radius * 2,
      isCircle: true,
    });
    return (
      <Circle
        {...common}
        radius={radius}
        {...fillProps}
        strokeEnabled={stroke.width > 0}
        stroke={stroke.color}
        strokeWidth={stroke.width}
      />
    );
  }

  if (object.tipo === 'linea') {
    const strokeWidth = object.linea.strokeWidth ?? object.linea.stroke?.width ?? 4;
    const strokeColor = object.linea.stroke?.color || '#1f2b23';
    return (
      <Line
        {...common}
        points={object.linea.points}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeEnabled={strokeWidth > 0}
        hitStrokeWidth={Math.max(18, strokeWidth + 12)}
        lineCap="round"
      />
    );
  }

  if (object.tipo === 'texto') {
    const box = textBox || { width: 520, height: 80, overflow: 'libre', autoFit: false };
    const recortar = box.overflow === 'recortar';
    const fillProps = konvaFillProps(object.texto.fill, {
      minX: 0,
      minY: 0,
      width: box.width,
      height: box.height,
    });

    return (
      <Group
        {...common}
        width={box.width}
        height={box.height}
        clipX={recortar ? 0 : undefined}
        clipY={recortar ? 0 : undefined}
        clipWidth={recortar ? box.width : undefined}
        clipHeight={recortar ? box.height : undefined}
      >
        <Rect
          x={0}
          y={0}
          width={box.width}
          height={box.height}
          fill="rgba(0,0,0,0)"
        />
        <Text
          ref={textNodeRef}
          id={object.id}
          x={0}
          y={0}
          width={box.width}
          wrap="word"
          visible={!isEditing}
          text={object.texto.texto}
          fontFamily={`${renderedFontFamily || object.texto.fontFamily}, system-ui, sans-serif`}
          fontSize={object.texto.fontSize}
          fontStyle={object.texto.fontStyle}
          align={object.texto.align}
          letterSpacing={object.texto.letterSpacing}
          lineHeight={object.texto.lineHeight}
          {...fillProps}
        />
      </Group>
    );
  }

  if (object.tipo === 'imagen') {
    return (
      <KonvaImage
        {...common}
        width={object.imagen.width}
        height={object.imagen.height}
        image={image}
      />
    );
  }

  return null;
}
