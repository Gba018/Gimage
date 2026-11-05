import React, { useLayoutEffect, useMemo } from 'react';
import { Transformer } from 'react-konva';

const TODOS_LOS_TIRADORES = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const TIRADORES_ESQUINA = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const TIRADORES_LINEA = ['middle-left', 'middle-right'];

export default function SelectionTransformer({
  transformerRef,
  nodeRefs,
  selectedIds,
  objects,
  textBoxes,
  editingTextId,
  zoom,
  onTransformStart,
  onTransform,
  onTransformEnd,
}) {
  const activeLayers = useMemo(
    () => objects.filter(
      (capa) => selectedIds.includes(capa.id) && capa.visible && !capa.bloqueada && capa.id !== editingTextId,
    ),
    [editingTextId, objects, selectedIds],
  );

  const singleType = activeLayers.length === 1 ? activeLayers[0].tipo : null;
  const keepRatio = activeLayers.length > 1 || singleType === 'circulo';
  const enabledAnchors = useMemo(() => {
    if (singleType === 'linea') return TIRADORES_LINEA;
    if (singleType === 'circulo') return TIRADORES_ESQUINA;
    return TODOS_LOS_TIRADORES;
  }, [singleType]);

  useLayoutEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    transformer.nodes(activeLayers.map((capa) => nodeRefs.current[capa.id]).filter(Boolean));
    transformer.forceUpdate();
    transformer.getLayer()?.batchDraw();
  }, [activeLayers, objects, textBoxes, nodeRefs, transformerRef]);

  // DECISION: se desactiva la inversión de objetos porque el contrato no admite escalas negativas.
  return (
    <Transformer
      ref={transformerRef}
      enabledAnchors={enabledAnchors}
      keepRatio={keepRatio}
      shiftBehavior={keepRatio ? 'none' : 'default'}
      flipEnabled={false}
      rotateEnabled
      borderStroke="#6c9851"
      borderStrokeWidth={1.4}
      anchorStroke="#628c4a"
      anchorStrokeWidth={1.3}
      anchorFill="#ffffff"
      anchorCornerRadius={2}
      anchorSize={10}
      rotateAnchorOffset={28}
      padding={0}
      boundBoxFunc={(oldBox, newBox) => {
        if (singleType === 'linea') {
          return Math.abs(newBox.width) < Math.max(4, zoom) ? oldBox : newBox;
        }
        const minSize = singleType === 'texto' ? Math.max(8 * zoom, zoom) : zoom;
        return Math.abs(newBox.width) < minSize || Math.abs(newBox.height) < minSize ? oldBox : newBox;
      }}
      onTransformStart={onTransformStart}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
    />
  );
}
