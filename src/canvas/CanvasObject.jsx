import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva';
import { cargarGoogleFont, estadoGoogleFont, suscribirFuentes } from './font-loader.js';
import { cargarImagen } from './image-loader.js';
import { obtenerCajaTexto, useTemplateStore } from '../state/template-store.js';
import { DEFAULT_TEXT_BOX, clamp, konvaFillProps, normalizarStroke } from '../template/schema.js';
import { esCampoImagen, resolverImagenSrc, resolverTexto } from '../template/fields.js';

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
  fieldsPreview = null,
}) {
  const selectObject = useTemplateStore((state) => state.selectObject);
  const updateObject = useTemplateStore((state) => state.updateObject);
  const reapplyAutoFitForFont = useTemplateStore((state) => state.reapplyAutoFitForFont);
  const fields = useTemplateStore((state) => state.fields);
  const isSelected = useTemplateStore((state) => state.selectedIds.includes(object.id));
  const camposResolucion = fieldsPreview ?? fields;

  const textBox = useMemo(
    () => (object.tipo === 'texto' ? obtenerCajaTexto(object) : null),
    [object],
  );

  const textBoxRef = useRef(textBox);
  textBoxRef.current = textBox;
  const textNodeRef = useRef(null);
  const [renderedFontFamily, setRenderedFontFamily] = useState(
    () => (object.tipo === 'texto' ? (object.texto?.fontFamily || 'Inter') : 'Inter'),
  );

  const imagenDinamica = object.tipo === 'imagen' && esCampoImagen(object.imagen?.src);
  const imagenSrcResuelta = object.tipo === 'imagen'
    ? resolverImagenSrc(object.imagen?.src, camposResolucion)
    : '';
  const textoResuelto = object.tipo === 'texto'
    ? resolverTexto(object.texto?.texto, camposResolucion)
    : '';
  const textoConCampos = object.tipo === 'texto'
    && /\{\{\s*([a-z0-9_-]+)\s*\}\}/.test(object.texto?.texto ?? '');

  const image = usarImagen(imagenSrcResuelta);

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
      node.getClientRect = function getClientRectTexto(config = {}) {
        const caja = textBoxRef.current || DEFAULT_TEXT_BOX;
        const selfRect = {
          x: 0,
          y: 0,
          width: caja.width,
          height: caja.height,
        };
        if (config.skipTransform) {
          return selfRect;
        }
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
    scaleX: object.flipX ? -1 : 1,
    scaleY: object.flipY ? -1 : 1,
    listening: !object.bloqueada,
    draggable: !object.bloqueada && !panMode && !isEditing,
    onMouseDown: select,
    onTouchStart: select,
    onDblClick: editText,
    onDblTap: editText,
    onDragStart: (event) => onDragStart(object.id, event),
    onDragMove: () => onDragMove(object.id),
    onDragEnd: (event) => onDragEnd(object.id, event),
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
    const box = textBox || DEFAULT_TEXT_BOX;
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
          stroke={textoConCampos && isSelected ? '#7c5cff' : undefined}
          strokeWidth={textoConCampos && isSelected ? 2 : 0}
          dash={textoConCampos && isSelected ? [6, 4] : undefined}
          listening={false}
        />
        <Text
          ref={textNodeRef}
          id={object.id}
          x={0}
          y={0}
          width={box.width}
          wrap="word"
          visible={!isEditing}
          text={textoResuelto}
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
    const frameW = object.imagen.width;
    const frameH = object.imagen.height;
    const ajuste = object.imagen.ajuste ?? 'llenar';

    if (imagenDinamica && !image) {
      return (
        <Rect
          {...common}
          width={frameW}
          height={frameH}
          fill="#eef1f4"
          stroke="#9ca3af"
          strokeWidth={2}
          dash={[6, 4]}
        />
      );
    }

    if (ajuste === 'ajustar' && image) {
      const escala = Math.min(frameW / image.naturalWidth, frameH / image.naturalHeight);
      const ancho = image.naturalWidth * escala;
      const alto = image.naturalHeight * escala;
      return (
        <Group
          {...common}
          width={frameW}
          height={frameH}
          clipX={0}
          clipY={0}
          clipWidth={frameW}
          clipHeight={frameH}
        >
          <KonvaImage
            x={(frameW - ancho) / 2}
            y={(frameH - alto) / 2}
            width={ancho}
            height={alto}
            image={image}
            listening={false}
          />
        </Group>
      );
    }

    let crop;
    if (image) {
      const aspectoMarco = frameW / frameH;
      const aspectoImagen = image.naturalWidth / image.naturalHeight;
      let cropW;
      let cropH;
      if (aspectoImagen > aspectoMarco) {
        cropH = image.naturalHeight;
        cropW = cropH * aspectoMarco;
      } else {
        cropW = image.naturalWidth;
        cropH = cropW / aspectoMarco;
      }
      const rangoX = Math.max(0, image.naturalWidth - cropW);
      const rangoY = Math.max(0, image.naturalHeight - cropH);
      const proporcionX = ajuste === 'recortar' ? clamp(object.imagen.offsetX ?? 0.5, 0, 1) : 0.5;
      const proporcionY = ajuste === 'recortar' ? clamp(object.imagen.offsetY ?? 0.5, 0, 1) : 0.5;
      crop = { x: proporcionX * rangoX, y: proporcionY * rangoY, width: cropW, height: cropH };
    }

    function recorteDragEnd(event) {
      const nodo = event.target;
      const dx = nodo.x() - object.x;
      const dy = nodo.y() - object.y;
      nodo.position({ x: object.x, y: object.y });
      nodo.getLayer()?.batchDraw();
      if ((!dx && !dy) || !image || !crop) return;
      const rangoX = Math.max(1, image.naturalWidth - crop.width);
      const rangoY = Math.max(1, image.naturalHeight - crop.height);
      const siguienteX = clamp((object.imagen.offsetX ?? 0.5) - (dx * (crop.width / frameW)) / rangoX, 0, 1);
      const siguienteY = clamp((object.imagen.offsetY ?? 0.5) - (dy * (crop.height / frameH)) / rangoY, 0, 1);
      updateObject(object.id, { imagen: { ...object.imagen, offsetX: siguienteX, offsetY: siguienteY } });
    }

    return (
      <KonvaImage
        {...common}
        width={frameW}
        height={frameH}
        image={image}
        crop={crop}
        onDragEnd={ajuste === 'recortar' ? recorteDragEnd : common.onDragEnd}
        stroke={imagenDinamica && isSelected ? '#7c5cff' : undefined}
        strokeWidth={imagenDinamica && isSelected ? 2 : 0}
        dash={imagenDinamica && isSelected ? [6, 4] : undefined}
      />
    );
  }

  return null;
}
