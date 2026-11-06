import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import CanvasStage from './canvas/CanvasStage.jsx';
import { cargarImagen } from './canvas/image-loader.js';
import CropDialog from './components/CropDialog.jsx';
import ImageDialog from './components/ImageDialog.jsx';
import ProjectDialog from './components/ProjectDialog.jsx';
import LeftPanel from './panels/LeftPanel.jsx';
import RightPanel from './panels/RightPanel.jsx';
import TopBar from './panels/TopBar.jsx';
import { useTemplateStore } from './state/template-store.js';
import { descargarPlantilla } from './template/persistencia.js';
import { dimensionesInicialesImagen } from './template/schema.js';
import { validarPlantilla } from './template/validation.js';
import { valoresDeFila } from './sheets/mapper.js';

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url; enlace.download = nombre; document.body.appendChild(enlace); enlace.click(); enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const inicial = { estado: 'idle', actual: 0, total: 0, exitosos: 0, fallidos: [], detalles: [], error: '' };
const pausa = () => new Promise(resolve => window.setTimeout(resolve, 50));
export default function App() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const templateInputRef = useRef(null);
  const reemplazo = useRef(null);
  const cancelar = useRef(false);
  const ocupado = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [spacePressed, setSpacePressed] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [cropLayerId, setCropLayerId] = useState(null);
  const [notice, setNotice] = useState('');
  const [loteEstado, setLoteEstado] = useState(inicial);
  const template = useTemplateStore(s => s.template);
  const fields = useTemplateStore(s => s.fields);
  const sheets = useTemplateStore(s => s.sheets);
  const diagnostico = validarPlantilla({ template, fields, sheets });
  const locked = loteEstado.estado === 'generando';
  const guardar = () => { const s = useTemplateStore.getState(); descargarPlantilla(s.template, s.fields, s.template.nombre); };
  const exportar = async () => { try { await canvasRef.current?.exportarPNG({ pixelRatio: 2 }); } catch (e) { setNotice(e.message); } };
  useEffect(() => { useTemplateStore.getState().cargarDesdeNavegador(); }, []);
  useEffect(() => {
    let timer;
    const unsubscribe = useTemplateStore.subscribe((s, anterior) => {
      if (s.template === anterior.template && s.fields === anterior.fields) return;
      window.clearTimeout(timer); timer = window.setTimeout(() => useTemplateStore.getState().guardarEnNavegador(), 800);
    });
    return () => { unsubscribe(); window.clearTimeout(timer); };
  }, []);
  useEffect(() => {
    function down(e) {
      if (dialog || cropLayerId || locked) return;
      if (e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
      const s = useTemplateStore.getState(); const mod = e.ctrlKey || e.metaKey; const key = e.key.toLowerCase();
      if (mod && key === 's') { e.preventDefault(); guardar(); }
      else if (mod && key === 'e') { e.preventDefault(); exportar(); }
      else if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); }
      else if (mod && key === 'y') { e.preventDefault(); s.redo(); }
      else if (mod && key === 'd') { e.preventDefault(); s.duplicateSelected(); }
      else if (mod && (e.key === '[' || e.key === ']')) { e.preventDefault(); e.key === '[' ? s.moveSelectedBackward() : s.moveSelectedForward(); }
      else if (e.code === 'Space') { e.preventDefault(); setSpacePressed(true); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); s.deleteSelected(); }
      else if (e.key === 'Escape') s.clearSelection();
      else { const d = e.shiftKey ? 10 : 1; const moves = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }; if (moves[e.key] && s.selectedIds.length) { e.preventDefault(); s.moveSelected(...moves[e.key]); } }
    }
    const up = e => { if (e.code === 'Space') setSpacePressed(false); };
    const blur = () => setSpacePressed(false);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [dialog, cropLayerId, locked]);
  async function imagen(src) {
    const { image, corsSafe } = await cargarImagen(src);
    const s = useTemplateStore.getState();
    if (reemplazo.current) { const dims = dimensionesInicialesImagen(image.naturalWidth, image.naturalHeight); s.updateObject(reemplazo.current, { imagen: { src, width: dims.width, height: dims.height } }); }
    else s.insertObject('imagen', { src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
    reemplazo.current = null;
    if (!corsSafe) setNotice('La imagen no permite CORS y podría impedir la exportación.');
  }
  async function generarLote(indices) {
    if (ocupado.current) return;
    const s = useTemplateStore.getState(); const hoja = s.sheets;
    const error = mensaje => setLoteEstado({ ...inicial, estado: 'error', error: mensaje });
    if (hoja.status !== 'ready' || !hoja.rows.length || !Object.values(hoja.columnToField).some(Boolean)) return error('Conecta una hoja y mapea al menos una columna.');
    const filas = indices === undefined ? hoja.rows.map((_, i) => i) : indices;
    if (!Array.isArray(filas) || !filas.length || filas.some(i => !Number.isInteger(i) || i < 0 || i >= hoja.rows.length)) return error('Selecciona al menos una fila válida.');
    const elegidas = [...new Set(filas)].sort((a, b) => a - b);
    const diagnosticoActual = validarPlantilla({ template: s.template, fields: s.fields, sheets: { ...hoja, rows: elegidas.map(i => hoja.rows[i]) } });
    if (!diagnosticoActual.ok) return error('Corrige los errores del diagnóstico antes de generar.');
    const total = elegidas.length; const anterior = hoja.activeRowIndex; const zip = new JSZip(); const fallidos = []; const detalles = [];
    const base = String(s.template.nombre || 'plantilla').trim().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'plantilla';
    cancelar.current = false; ocupado.current = true;
    setLoteEstado({ ...inicial, estado: 'generando', total });
    try {
      for (let paso = 0; paso < total; paso++) {
        if (cancelar.current) break;
        const indice = elegidas[paso];
        try {
          const valores = valoresDeFila(hoja.rows[indice], hoja.headers, hoja.columnToField, s.fields);
          await Promise.all(s.template.capas.filter(c => c.tipo === 'imagen').map(async c => {
            const token = /(?:\[\s*|\{\{\s*)([\w.-]+)(?:\s*\]|\s*\}\})/.exec(c.imagen.src || '');
            if (!token) return;
            const url = valores[token[1]] ?? s.fields[token[1]]?.defaultValue ?? '';
            if (!url) throw new Error(`Imagen ${token[1]} sin URL.`);
            await cargarImagen(url);
          }));
          useTemplateStore.getState().setActiveRowIndex(indice);
          await pausa();
          const data = await canvasRef.current?.renderizarPNG({ pixelRatio: 2 });
          if (!data) throw new Error('El lienzo no está disponible.');
          zip.file(`${base}-${String(indice + 1).padStart(3, '0')}.png`, data.split(',')[1], { base64: true });
        } catch (e) { fallidos.push(indice + 1); detalles.push({ fila: indice + 1, motivo: e.message || 'Error al generar.' }); }
        setLoteEstado({ estado: 'generando', actual: paso + 1, total, exitosos: paso + 1 - fallidos.length, fallidos: [...fallidos], detalles: [...detalles], error: '' });
      }
      if (cancelar.current) { setLoteEstado(inicial); setNotice('Generación cancelada.'); return; }
      if (fallidos.length === total) { setLoteEstado({ ...inicial, estado: 'error', total, actual: total, fallidos, detalles, error: 'Todas las filas fallaron. Revisa las imágenes y permisos CORS.' }); return; }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      descargar(blob, `${base}-lote.zip`);
      setLoteEstado({ estado: 'listo', actual: total, total, exitosos: total - fallidos.length, fallidos, detalles, error: '' });
    } catch (e) { setLoteEstado({ ...inicial, estado: 'error', total, fallidos, detalles, error: e.message || 'No se pudo crear el ZIP.' }); }
    finally { useTemplateStore.getState().setActiveRowIndex(anterior); ocupado.current = false; }
  }
  const insertar = tipo => useTemplateStore.getState().insertObject(tipo);
  const insertarImagen = () => useTemplateStore.getState().insertObject('imagen', { src: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#e5e7eb"/></svg>'), naturalWidth: 800, naturalHeight: 600 });
  const close = () => { reemplazo.current = null; setDialog(null); };
  const crop = template.capas.find(c => c.id === cropLayerId && c.tipo === 'imagen');
  return <div className="app-shell">
    <TopBar zoom={zoom} disabled={locked} diagnostico={diagnostico} onZoomIn={() => canvasRef.current?.zoomIn()} onZoomOut={() => canvasRef.current?.zoomOut()} onZoom100={() => canvasRef.current?.zoom100()} onFit={() => canvasRef.current?.fitToScreen()} onNewProject={() => setDialog('project')} onInsertText={() => insertar('texto')} onInsertRect={() => insertar('rect')} onInsertCircle={() => insertar('circulo')} onInsertLine={() => insertar('linea')} onInsertImage={insertarImagen} onOpenTemplate={() => templateInputRef.current?.click()} onSaveTemplate={guardar} onExportPng={exportar} />
    <div className="editor-body">
      <LeftPanel onInsertText={() => insertar('texto')} onInsertRect={() => insertar('rect')} onInsertCircle={() => insertar('circulo')} onInsertLine={() => insertar('linea')} onInsertImage={insertarImagen} onImageUrl={() => { reemplazo.current = null; setDialog('image'); }} onGenerarLote={generarLote} onCancelarLote={() => { cancelar.current = true; }} onReintentarLote={generarLote} onActualizarDatos={() => window.dispatchEvent(new CustomEvent('gimage:actualizar-sheets'))} loteEstado={loteEstado} locked={locked} />
      <CanvasStage ref={canvasRef} spacePressed={spacePressed} onZoomChange={setZoom} onFitLimit={() => setNotice('El zoom mínimo es 25 %. Puedes desplazarte para ver el resto.')} />
      <RightPanel onReplaceImageFile={id => { reemplazo.current = id; fileInputRef.current?.click(); }} onReplaceImageUrl={id => { reemplazo.current = id; setDialog('image'); }} onOpenCrop={setCropLayerId} />
    </div>
    <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" aria-label="Seleccionar imagen" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { const src = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); await imagen(src); } catch (err) { setNotice(err.message || 'No se pudo cargar la imagen.'); } }} />
    <input ref={templateInputRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Abrir plantilla" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const r = useTemplateStore.getState().importarPlantilla(await f.text()); setNotice(r.ok ? 'Plantilla abierta.' : r.error); } catch (err) { setNotice(err.message); } }} />
    {dialog === 'project' && <ProjectDialog onClose={close} />}
    {dialog === 'image' && <ImageDialog onClose={close} onAdd={imagen} />}
    {crop && <CropDialog layer={crop} onClose={() => setCropLayerId(null)} onApply={valor => useTemplateStore.getState().updateObject(crop.id, { imagen: valor })} />}
    {notice && <div className="toast toast-warning" role="status">{notice}<button type="button" onClick={() => setNotice('')}>Cerrar</button></div>}
  </div>;
}
