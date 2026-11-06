import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Group, Layer, Rect, Stage } from 'react-konva';
import CanvasObject from './CanvasObject.jsx';
import InlineTextEditor from './InlineTextEditor.jsx';
import SelectionTransformer from './SelectionTransformer.jsx';
import { ManualGuides, SmartGuides, Ruler } from './Guides.jsx';
import { Icon } from '../components/Icons.jsx';
import { obtenerCajaTexto, useTemplateStore } from '../state/template-store.js';
import { clamp, esFillOscuro, konvaFillProps } from '../template/schema.js';
import { valoresDeFila } from '../sheets/mapper.js';
import { descargarDataUrl } from '../template/persistencia.js';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

function limitesNodos(nodes, parent) {
  const cajas = nodes.filter(Boolean).map((node) => node.getClientRect({ relativeTo: parent, skipShadow: true, skipStroke: true }));
  if (!cajas.length) return null;
  const x = Math.min(...cajas.map((caja) => caja.x));
  const y = Math.min(...cajas.map((caja) => caja.y));
  const right = Math.max(...cajas.map((caja) => caja.x + caja.width));
  const bottom = Math.max(...cajas.map((caja) => caja.y + caja.height));
  return { x, y, width: right - x, height: bottom - y };
}

function mejorAjuste(anclas, destinos) {
  let mejor = null;
  destinos.forEach((destino) => anclas.forEach((ancla) => {
    const diferencia = destino - ancla;
    if (Math.abs(diferencia) <= 5 && (!mejor || Math.abs(diferencia) < Math.abs(mejor.diferencia))) {
      mejor = { diferencia, posicion: destino };
    }
  }));
  return mejor;
}

const CanvasStage = forwardRef(function CanvasStage({ spacePressed, onZoomChange, onFitLimit }, ref) {
  const canvas = useTemplateStore((state) => state.template.canvas);
  const projectName = useTemplateStore((state) => state.template.nombre);
  const capas = useTemplateStore((state) => state.template.capas);
  const selectedIds = useTemplateStore((state) => state.selectedIds);
  const revision = useTemplateStore((state) => state.projectRevision);
  const fields = useTemplateStore((state) => state.fields);
  const sheets = useTemplateStore((state) => state.sheets);
  const clearSelection = useTemplateStore((state) => state.clearSelection);
  const updateObject = useTemplateStore((state) => state.updateObject);
  const updateObjects = useTemplateStore((state) => state.updateObjects);
  const addGuide = useTemplateStore((state) => state.addGuide);

  const holderRef = useRef(null);
  const stageRef = useRef(null);
  const objectGroupRef = useRef(null);
  const transformerRef = useRef(null);
  const nodeRefs = useRef({});
  const dragRef = useRef(null);
  const transformRef = useRef(null);
  const panCleanupRef = useRef(null);
  const guideCleanupRef = useRef(null);
  const canvasRef = useRef(canvas);
  const sizeRef = useRef({ width: 0, height: 0 });
  const initializedRef = useRef(false);
  const previousRevision = useRef(revision);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  const [panning, setPanning] = useState(false);
  const [draftGuide, setDraftGuide] = useState(null);
  const [smartGuides, setSmartGuides] = useState([]);
  const [editingTextId, setEditingTextId] = useState(null);
  const [exportando, setExportando] = useState(false);
  canvasRef.current = canvas;

  const fieldsPreview = useMemo(() => {
    if (sheets.activeRowIndex == null) return null;
    const fila = sheets.rows[sheets.activeRowIndex];
    if (!fila) return null;
    return valoresDeFila(fila, sheets.headers, sheets.columnToField, fields);
  }, [fields, sheets.activeRowIndex, sheets.columnToField, sheets.headers, sheets.rows]);

  useEffect(() => {
    if (!editingTextId) return;
    const activa = capas.find((capa) => capa.id === editingTextId && capa.tipo === 'texto' && capa.visible && !capa.bloqueada);
    if (!activa) setEditingTextId(null);
  }, [capas, editingTextId]);

  const changeView = useCallback((next) => {
    viewRef.current = next;
    setView(next);
    onZoomChange(next.scale);
  }, [onZoomChange]);

  const fitToScreen = useCallback(() => {
    const { width, height } = sizeRef.current;
    const currentCanvas = canvasRef.current;
    if (!width || !height) return;
    const scale = clamp(
      Math.min(Math.max(1, width - 96) / currentCanvas.width, Math.max(1, height - 96) / currentCanvas.height),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    changeView({ x: (width - currentCanvas.width * scale) / 2, y: (height - currentCanvas.height * scale) / 2, scale });
    if (currentCanvas.width * scale > width || currentCanvas.height * scale > height) onFitLimit();
  }, [changeView, onFitLimit]);

  const zoomAtPoint = useCallback((scale, point) => {
    const current = viewRef.current;
    const newScale = clamp(scale, MIN_ZOOM, MAX_ZOOM);
    const worldX = (point.x - current.x) / current.scale;
    const worldY = (point.y - current.y) / current.scale;
    changeView({ x: point.x - worldX * newScale, y: point.y - worldY * newScale, scale: newScale });
  }, [changeView]);

  const renderizarPNG = useCallback(async ({ pixelRatio = 2 } = {}) => {
    const stage = stageRef.current;
    const currentCanvas = canvasRef.current;
    if (!stage || !currentCanvas) throw new Error('El lienzo aún no está listo.');

    const vistaAnterior = {
      x: stage.x(),
      y: stage.y(),
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
    };

    stage.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
    setExportando(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      return stage.toDataURL({
        x: 0,
        y: 0,
        width: currentCanvas.width,
        height: currentCanvas.height,
        pixelRatio: clamp(pixelRatio, 1, 4),
        mimeType: 'image/png',
      });
    } finally {
      stage.setAttrs(vistaAnterior);
      setExportando(false);
      stage.batchDraw();
    }
  }, []);

  const exportarPNG = useCallback(async ({ pixelRatio = 2 } = {}) => {
    const dataUrl = await renderizarPNG({ pixelRatio });
    const base = String(projectName || 'plantilla').trim().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'plantilla';
    descargarDataUrl(dataUrl, `${base}.png`);
    return dataUrl;
  }, [projectName, renderizarPNG]);

  useImperativeHandle(ref, () => ({
    fitToScreen,
    exportarPNG,
    renderizarPNG,
    zoom100: () => zoomAtPoint(1, { x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 }),
    zoomIn: () => zoomAtPoint(viewRef.current.scale * 1.2, { x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 }),
    zoomOut: () => zoomAtPoint(viewRef.current.scale / 1.2, { x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 }),
  }), [exportarPNG, fitToScreen, renderizarPNG, zoomAtPoint]);

  useLayoutEffect(() => {
    const holder = holderRef.current;
    if (!holder) return undefined;
    const observer = new ResizeObserver(() => {
      const next = { width: holder.clientWidth, height: holder.clientHeight };
      sizeRef.current = next;
      setSize((old) => (old.width === next.width && old.height === next.height ? old : next));
      if (!initializedRef.current && next.width && next.height) {
        initializedRef.current = true;
        fitToScreen();
      }
    });
    observer.observe(holder);
    return () => observer.disconnect();
  }, [fitToScreen]);

  useEffect(() => {
    if (previousRevision.current !== revision) {
      previousRevision.current = revision;
      setDraftGuide(null);
      setSmartGuides([]);
      setEditingTextId(null);
      fitToScreen();
    }
  }, [revision, fitToScreen]);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return undefined;
    function wheel(event) {
      event.preventDefault();
      if (!event.deltaY) return;
      const bounds = holder.getBoundingClientRect();
      const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAtPoint(viewRef.current.scale * factor, pointer);
    }
    holder.addEventListener('wheel', wheel, { passive: false });
    return () => holder.removeEventListener('wheel', wheel);
  }, [zoomAtPoint]);

  useEffect(() => () => {
    panCleanupRef.current?.();
    guideCleanupRef.current?.();
  }, []);

  const registerNode = useCallback((id, node) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  }, []);

  function beginPan(event) {
    if (event.button !== 1 && !(event.button === 0 && spacePressed)) return;
    event.preventDefault();
    event.stopPropagation();
    panCleanupRef.current?.();
    const start = { x: event.clientX, y: event.clientY, view: viewRef.current };
    setPanning(true);
    function move(moveEvent) {
      changeView({ ...start.view, x: start.view.x + moveEvent.clientX - start.x, y: start.view.y + moveEvent.clientY - start.y });
    }
    function stop() { cleanup(); setPanning(false); }
    function cleanup() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
      panCleanupRef.current = null;
    }
    panCleanupRef.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
  }

  function beginGuide(orientation, event) {
    if (event.button !== 0) return;
    event.preventDefault();
    guideCleanupRef.current?.();
    function coordinates(pointerEvent) {
      const rect = holderRef.current.getBoundingClientRect();
      const current = viewRef.current;
      return {
        x: (pointerEvent.clientX - rect.left - current.x) / current.scale,
        y: (pointerEvent.clientY - rect.top - current.y) / current.scale,
      };
    }
    function move(pointerEvent) {
      const position = coordinates(pointerEvent);
      setDraftGuide({ orientation, position: orientation === 'vertical' ? position.x : position.y });
    }
    function stop(pointerEvent) {
      const position = coordinates(pointerEvent);
      const currentCanvas = canvasRef.current;
      if (position.x >= 0 && position.x <= currentCanvas.width && position.y >= 0 && position.y <= currentCanvas.height) {
        addGuide(orientation, orientation === 'vertical' ? position.x : position.y);
      }
      setDraftGuide(null);
      cleanup();
    }
    function cleanup() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', cancel);
      guideCleanupRef.current = null;
    }
    function cancel() { setDraftGuide(null); cleanup(); }
    guideCleanupRef.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', cancel);
    move(event);
  }

  function dragStart(id, event) {
    event.cancelBubble = true;
    if (dragRef.current?.ids.includes(id)) return;
    const state = useTemplateStore.getState();
    const candidatas = state.selectedIds.includes(id) ? state.selectedIds : [id];
    const activas = state.template.capas.filter(
      (capa) => candidatas.includes(capa.id) && !capa.bloqueada && capa.visible,
    );
    const ids = activas.map((capa) => capa.id);
    if (!ids.length) return;
    const posiciones = {};
    activas.forEach((capa) => {
      posiciones[capa.id] = { x: capa.x, y: capa.y };
    });
    dragRef.current = { id, ids, posiciones };
  }

  function dragMove(id) {
    const drag = dragRef.current;
    if (!drag || !drag.ids.includes(id)) return;
    const movingNode = nodeRefs.current[drag.id];
    if (!movingNode) return;
    const origin = drag.posiciones[drag.id];
    const dx = movingNode.x() - origin.x;
    const dy = movingNode.y() - origin.y;
    drag.ids.forEach((selectedId) => {
      if (selectedId !== drag.id && nodeRefs.current[selectedId] && drag.posiciones[selectedId]) {
        nodeRefs.current[selectedId].position({
          x: drag.posiciones[selectedId].x + dx,
          y: drag.posiciones[selectedId].y + dy,
        });
      }
    });

    const state = useTemplateStore.getState();
    const seleccion = limitesNodos(drag.ids.map((selectedId) => nodeRefs.current[selectedId]), objectGroupRef.current);
    if (!seleccion) return;
    const destinoX = [state.template.canvas.width / 2];
    const destinoY = [state.template.canvas.height / 2];
    state.template.capas.filter((capa) => capa.visible && !drag.ids.includes(capa.id)).forEach((capa) => {
      const caja = limitesNodos([nodeRefs.current[capa.id]], objectGroupRef.current);
      if (caja) {
        destinoX.push(caja.x, caja.x + caja.width);
        destinoY.push(caja.y, caja.y + caja.height);
      }
    });
    state.guides.forEach((guide) => (guide.orientation === 'vertical' ? destinoX : destinoY).push(guide.position));
    const ajusteX = mejorAjuste([seleccion.x, seleccion.x + seleccion.width / 2, seleccion.x + seleccion.width], destinoX);
    const ajusteY = mejorAjuste([seleccion.y, seleccion.y + seleccion.height / 2, seleccion.y + seleccion.height], destinoY);
    const guias = [];
    if (ajusteX) guias.push({ orientation: 'vertical', position: ajusteX.posicion });
    if (ajusteY) guias.push({ orientation: 'horizontal', position: ajusteY.posicion });
    if (ajusteX || ajusteY) {
      drag.ids.forEach((selectedId) => {
        const node = nodeRefs.current[selectedId];
        if (node) {
          node.position({
            x: node.x() + (ajusteX?.diferencia || 0),
            y: node.y() + (ajusteY?.diferencia || 0),
          });
        }
      });
    }
    setSmartGuides(guias);
    transformerRef.current?.forceUpdate();
    movingNode.getLayer()?.batchDraw();
  }

  function dragEnd(id) {
    const drag = dragRef.current;
    if (!drag || !drag.ids.includes(id)) return;
    dragMove(id);
    const cambios = {};
    drag.ids.forEach((selectedId) => {
      const node = nodeRefs.current[selectedId];
      if (node) {
        const x = Math.round(node.x());
        const y = Math.round(node.y());
        node.position({ x, y });
        cambios[selectedId] = { x, y };
      }
    });
    updateObjects(cambios);
    dragRef.current = null;
    setSmartGuides([]);
  }

  function transformStart() {
    const state = useTemplateStore.getState();
    const activas = state.template.capas.filter(
      (capa) => state.selectedIds.includes(capa.id) && !capa.bloqueada && capa.visible,
    );
    const ids = activas.map((capa) => capa.id);
    const nodes = ids.map((id) => nodeRefs.current[id]).filter(Boolean);
    const positions = {};
    ids.forEach((id) => {
      const node = nodeRefs.current[id];
      if (!node) return;
      positions[id] = {
        x: node.x(),
        y: node.y(),
        width: node.width(),
        height: node.height(),
        rotation: node.rotation(),
      };
    });
    transformRef.current = {
      ids,
      positions,
      bounds: limitesNodos(nodes, objectGroupRef.current),
      type: activas.length === 1 ? activas[0].tipo : 'multiple',
    };
  }

  function transform(event) {
    const session = transformRef.current;
    const anchor = transformerRef.current?.getActiveAnchor();
    const horizontales = ['middle-left', 'middle-right'];
    const verticales = ['top-center', 'bottom-center'];
    if (!session || (!horizontales.includes(anchor) && !verticales.includes(anchor))) return;

    if (session.type === 'imagen' && event.evt?.shiftKey) {
      const node = nodeRefs.current[session.ids[0]];
      const original = session.positions[session.ids[0]];
      if (!node || !original) return;
      const factor = Math.abs(horizontales.includes(anchor) ? node.scaleX() : node.scaleY());
      const newWidth = original.width * factor;
      const newHeight = original.height * factor;
      let localX = (original.width - newWidth) / 2;
      let localY = (original.height - newHeight) / 2;
      if (anchor === 'middle-right') localX = 0;
      if (anchor === 'middle-left') localX = original.width - newWidth;
      if (anchor === 'top-center') localY = 0;
      if (anchor === 'bottom-center') localY = original.height - newHeight;
      const angle = (original.rotation * Math.PI) / 180;
      node.setAttrs({
        x: original.x + localX * Math.cos(angle) - localY * Math.sin(angle),
        y: original.y + localX * Math.sin(angle) + localY * Math.cos(angle),
        scaleX: factor,
        scaleY: factor,
      });
    } else if (session.type === 'multiple' && session.bounds) {
      const nodes = session.ids.map((id) => nodeRefs.current[id]).filter(Boolean);
      const current = limitesNodos(nodes, objectGroupRef.current);
      const initial = session.bounds;
      if (!current || !initial.width || !initial.height) return;
      const factor = horizontales.includes(anchor) ? current.width / initial.width : current.height / initial.height;
      let anchorX = initial.x + initial.width / 2;
      let anchorY = initial.y + initial.height / 2;
      if (anchor === 'middle-left') anchorX = initial.x + initial.width;
      if (anchor === 'middle-right') anchorX = initial.x;
      if (anchor === 'top-center') anchorY = initial.y;
      if (anchor === 'bottom-center') anchorY = initial.y + initial.height;
      session.ids.forEach((id) => {
        const node = nodeRefs.current[id];
        const original = session.positions[id];
        if (node && original) {
          node.setAttrs({
            x: anchorX + (original.x - anchorX) * factor,
            y: anchorY + (original.y - anchorY) * factor,
            rotation: original.rotation,
            scaleX: factor,
            scaleY: factor,
            skewX: 0,
            skewY: 0,
          });
        }
      });
    }
  }

  function transformEnd() {
    const session = transformRef.current;
    if (!session) return;
    const state = useTemplateStore.getState();
    const cambios = {};

    session.ids.forEach((id) => {
      const node = nodeRefs.current[id];
      const capa = state.template.capas.find((item) => item.id === id);
      if (!node || !capa) return;

      const sx = Math.abs(node.scaleX());
      const sy = Math.abs(node.scaleY());
      const x = Math.round(node.x());
      const y = Math.round(node.y());
      const rotation = Math.round(node.rotation());
      node.setAttrs({ x, y, rotation, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 });

      if (capa.tipo === 'rect') {
        const width = Math.max(1, Math.round(capa.rect.width * sx));
        const height = Math.max(1, Math.round(capa.rect.height * sy));
        node.setAttrs({ width, height });
        cambios[id] = { x, y, rotation, rect: { width, height } };
      } else if (capa.tipo === 'imagen') {
        const width = Math.max(1, Math.round(capa.imagen.width * sx));
        const height = Math.max(1, Math.round(capa.imagen.height * sy));
        node.setAttrs({ width, height });
        cambios[id] = { x, y, rotation, imagen: { width, height } };
      } else if (capa.tipo === 'circulo') {
        const factor = Math.max(sx, sy);
        const radius = Math.max(1, Math.round(capa.circulo.radius * factor));
        node.radius(radius);
        cambios[id] = { x, y, rotation, circulo: { radius } };
      } else if (capa.tipo === 'linea') {
        const [x1, y1, x2, y2] = capa.linea.points;
        let nx1 = Math.round(x1 * sx);
        let ny1 = Math.round(y1 * sy);
        let nx2 = Math.round(x2 * sx);
        let ny2 = Math.round(y2 * sy);
        if (nx1 === nx2 && ny1 === ny2) nx2 = nx1 + 1;
        const points = [nx1, ny1, nx2, ny2];
        node.points(points);
        cambios[id] = { x, y, rotation, linea: { points } };
      } else if (capa.tipo === 'texto') {
        const cajaActual = obtenerCajaTexto(capa);
        const width = Math.max(8, Math.round(cajaActual.width * sx));
        const height = Math.max(8, Math.round(cajaActual.height * sy));
        node.setAttrs({ width, height });
        if (session.type === 'multiple') {
          const fontSize = clamp(Math.round(capa.texto.fontSize * sx), 8, 600);
          cambios[id] = { x, y, rotation, texto: { fontSize, caja: { ...cajaActual, width, height } } };
        } else {
          cambios[id] = { x, y, rotation, texto: { caja: { ...cajaActual, width, height } } };
        }
      }
    });

    updateObjects(cambios);
    transformRef.current = null;
  }

  const selectionText = selectedIds.length === 0
    ? 'Sin selección'
    : selectedIds.length === 1
      ? '1 elemento seleccionado'
      : `${selectedIds.length} elementos seleccionados`;
  const artboardLeft = view.x;
  const artboardTop = view.y;
  const bgFillProps = konvaFillProps(canvas.background.fill, {
    minX: 0,
    minY: 0,
    width: canvas.width,
    height: canvas.height,
  });

  const editingLayer = editingTextId
    ? capas.find((capa) => capa.id === editingTextId && capa.tipo === 'texto' && capa.visible && !capa.bloqueada)
    : null;
  const editingBox = editingLayer ? obtenerCajaTexto(editingLayer) : null;

  return (
    <main className="workspace" aria-label="Editor de lienzo">
      <div className="workspace-topline">
        <div className="workspace-crumb">
          <span>ESPACIO DE TRABAJO</span>
          <Icon name="chevron" size={13} />
          <strong>Gimage</strong>
          <span className="workspace-live-dot" />
        </div>
        <div className="selection-status" aria-live="polite">
          <Icon name="cursor" size={14} /> {selectionText}
        </div>
      </div>
      <div className="board-grid">
        <div className="ruler-corner" aria-hidden="true"><span /></div>
        <Ruler orientation="horizontal" size={size.width} offset={view.x} zoom={view.scale} onStartGuide={beginGuide} />
        <Ruler orientation="vertical" size={size.height} offset={view.y} zoom={view.scale} onStartGuide={beginGuide} />
        <div
          className={`stage-holder ${spacePressed ? 'pan-ready' : ''} ${panning ? 'is-panning' : ''}`}
          ref={holderRef}
          onMouseDownCapture={beginPan}
          data-testid="stage-holder"
          aria-label="Lienzo de diseño"
        >
          {size.width > 0 && size.height > 0 && (
            <Stage
              ref={stageRef}
              width={size.width}
              height={size.height}
              x={view.x}
              y={view.y}
              scaleX={view.scale}
              scaleY={view.scale}
              onMouseDown={(event) => {
                if (event.target === event.target.getStage() && !spacePressed) clearSelection();
              }}
              onTouchStart={(event) => {
                if (event.target === event.target.getStage()) clearSelection();
              }}
            >
              <Layer listening={false}>
                <Rect
                  x={0}
                  y={0}
                  width={canvas.width}
                  height={canvas.height}
                  {...bgFillProps}
                  shadowColor="#183024"
                  shadowBlur={35}
                  shadowOpacity={0.13}
                  shadowOffsetY={10}
                />
              </Layer>
              <Layer listening={false} visible={!exportando}>
                <ManualGuides canvas={canvas} zoom={view.scale} draftGuide={draftGuide} />
              </Layer>
              <Layer>
                <Group ref={objectGroupRef}>
                  {capas.map((capa) => (
                    <CanvasObject
                      key={capa.id}
                      object={capa}
                      registerNode={registerNode}
                      onDragStart={dragStart}
                      onDragMove={dragMove}
                      onDragEnd={dragEnd}
                      onStartTextEdit={(layerId) => setEditingTextId(layerId)}
                      isEditing={editingTextId === capa.id}
                      panMode={spacePressed || panning}
                      fieldsPreview={fieldsPreview}
                    />
                  ))}
                </Group>
                {!exportando && (
                  <SelectionTransformer
                    transformerRef={transformerRef}
                    nodeRefs={nodeRefs}
                    selectedIds={selectedIds}
                    objects={capas}
                    editingTextId={editingTextId}
                    zoom={view.scale}
                    onTransformStart={transformStart}
                    onTransform={transform}
                    onTransformEnd={transformEnd}
                  />
                )}
              </Layer>
              <Layer listening={false} visible={!exportando}>
                <SmartGuides canvas={canvas} zoom={view.scale} smartGuides={smartGuides} />
              </Layer>
            </Stage>
          )}
          {editingLayer && editingBox && (
            <InlineTextEditor
              key={editingLayer.id}
              layer={editingLayer}
              box={editingBox}
              view={view}
              onCommit={(nuevoTexto) => {
                if (nuevoTexto !== editingLayer.texto.texto) {
                  updateObject(
                    editingLayer.id,
                    { texto: { ...editingLayer.texto, texto: nuevoTexto } },
                  );
                }
                setEditingTextId(null);
              }}
              onCancel={() => setEditingTextId(null)}
            />
          )}
          <div className="artboard-label" style={{ left: artboardLeft, top: artboardTop - 28 }} aria-hidden="true">
            <span>01</span>
            <strong>{projectName || 'Proyecto sin título'}</strong>
            <small>{canvas.width} × {canvas.height}</small>
          </div>
          {capas.length === 0 && (
            <div
              className={`empty-canvas-hint ${esFillOscuro(canvas.background.fill) ? 'on-dark' : ''}`}
              style={{
                left: artboardLeft + (canvas.width * view.scale) / 2,
                top: artboardTop + (canvas.height * view.scale) / 2,
                maxWidth: Math.max(0, Math.min(280, canvas.width * view.scale - 24)),
              }}
              aria-hidden="true"
            >
              <div className="empty-symbol">
                <span className="empty-shape empty-shape-back" />
                <span className="empty-shape empty-shape-front"><Icon name="sparkle" size={22} /></span>
                <span className="empty-star">✳</span>
              </div>
              <span className="empty-eyebrow">TU ESPACIO PARA CREAR</span>
              <strong>Todo empieza aquí.</strong>
              <p>Agrega texto, formas o imágenes<br />y dale vida a tus ideas.</p>
            </div>
          )}
        </div>
      </div>
      <div className="workspace-footer">
        <div><Icon name="ruler" size={16} /><span>Arrastra desde las reglas para crear guías</span></div>
        <div className="footer-shortcut">
          <Icon name="hand" size={15} />
          <kbd>Espacio</kbd> + arrastrar para moverte <span className="footer-dot" /> Rueda para zoom
        </div>
      </div>
    </main>
  );
});

export default CanvasStage;
