import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Circle, Image as KonvaImage, Line, Rect, Text } from 'react-konva';
import { cargarImagen } from './image-loader.js';
import { useTemplateStore } from '../state/template-store.js';
import { konvaFillProps, medirCajaTexto, normalizarStroke } from '../template/schema.js';

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

export default function CanvasObject({ object, registerNode, onDragStart, onDragMove, onDragEnd, panMode }) {
  const selectObject = useTemplateStore((state) => state.selectObject);
  const updateObject = useTemplateStore((state) => state.updateObject);
  const image = usarImagen(object.tipo === 'imagen' ? object.imagen.src : '');
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
    }
    registerNode(object.id, node);
  }, [object.id, object.tipo, registerNode]);

  const medidaTexto = useMemo(
    () => (object.tipo === 'texto' ? medirCajaTexto(object.texto) : null),
    [object.tipo, object.texto],
  );

  function select(event) {
    if (panMode || object.bloqueada || (event.evt.button !== undefined && event.evt.button !== 0)) return;
    event.cancelBubble = true;
    selectObject(object.id, Boolean(event.evt.shiftKey));
  }

  function editText(event) {
    if (object.tipo !== 'texto' || panMode || object.bloqueada) return;
    event.cancelBubble = true;
    const nuevoTexto = window.prompt('Editar texto', object.texto.texto);
    if (nuevoTexto !== null) {
      updateObject(object.id, { texto: { ...object.texto, texto: nuevoTexto } });
    }
  }

  const common = {
    ref: setNode,
    id: object.id,
    name: 'canvas-object',
    x: object.x,
    y: object.y,
    rotation: object.rotation,
    opacity: object.opacity,
    visible: object.visible,
    listening: !object.bloqueada,
    draggable: !object.bloqueada && !panMode,
    onMouseDown: select,
    onTouchStart: select,
    onDblClick: editText,
    onDblTap: editText,
    onDragStart: (event) => onDragStart(object.id, event),
    onDragMove: () => onDragMove(object.id),
    onDragEnd: () => onDragEnd(object.id),
    onMouseEnter: (event) => {
      if (!panMode && !object.bloqueada) event.target.getStage().container().style.cursor = 'move';
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
    const fillProps = konvaFillProps(object.texto.fill, {
      minX: 0,
      minY: 0,
      width: medidaTexto?.width || 1,
      height: medidaTexto?.height || 1,
    });
    return (
      <Text
        {...common}
        text={object.texto.texto}
        fontFamily={`${object.texto.fontFamily}, system-ui, sans-serif`}
        fontSize={object.texto.fontSize}
        fontStyle={object.texto.fontStyle}
        align={object.texto.align}
        letterSpacing={object.texto.letterSpacing}
        lineHeight={object.texto.lineHeight}
        {...fillProps}
      />
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
