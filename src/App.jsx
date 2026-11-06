import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import CanvasStage from './canvas/CanvasStage.jsx';
import { cargarImagen } from './canvas/image-loader.js';
import CropDialog from './components/CropDialog.jsx';
import ImageDialog from './components/ImageDialog.jsx';
import ProjectDialog from './components/ProjectDialog.jsx';
import { Icon } from './components/Icons.jsx';
import LeftPanel from './panels/LeftPanel.jsx';
import RightPanel from './panels/RightPanel.jsx';
import TopBar from './panels/TopBar.jsx';
import { useTemplateStore } from './state/template-store.js';
import { descargarPlantilla } from './template/persistencia.js';
import { dimensionesInicialesImagen } from './template/schema.js';
import { validarPlantilla } from './template/validation.js';
import { valoresDeFila } from './sheets/mapper.js';

const AUTOGUARDADO_MS = 800;
const PAUSA_ENTRE_RENDERES_MS = 50;
const TOKEN_IMAGEN = /\{\{\s*([\w.-]+)\s*\}\}/;

function leerArchivo(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.')); reader.readAsDataURL(file); }); }
function leerArchivoTexto(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.')); reader.readAsText(file); }); }
function descargarBlob(blob, nombreArchivo) { const url = URL.createObjectURL(blob); const enlace = document.createElement('a'); enlace.href = url; enlace.download = nombreArchivo; document.body.appendChild(enlace); enlace.click(); enlace.remove(); URL.revokeObjectURL(url); }

async function precargarImagenesDeFila(indice) {
  const state = useTemplateStore.getState();
  const { sheets, fields, template } = state;
  const fila = sheets.rows[indice];
  if (!fila) return;
  const valores = valoresDeFila(fila, sheets.headers, sheets.columnToField, fields);
  await Promise.all(template.capas.filter((capa) => capa.tipo === 'imagen').map(async (capa) => {
    const coincidencia = TOKEN_IMAGEN.exec(capa.imagen.src || '');
    if (!coincidencia) return;
    const valor = valores[coincidencia[1]] ?? fields[coincidencia[1]]?.defaultValue ?? '';
    if (!valor) return;
    try { await cargarImagen(valor); } catch { /* la fila fallará si no puede renderizarse */ }
  }));
}

export default function App() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const templateInputRef = useRef(null);
  const replaceLayerIdRef = useRef(null);
  const autoguardadoRef = useRef(null);
  const cancelarLoteRef = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [spacePressed, setSpacePressed] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [cropLayerId, setCropLayerId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loteEstado, setLoteEstado] = useState({ estado:'idle', actual:0, total:0, exitosos:0, fallidos:[], detalles:[], error:'' });
  const template = useTemplateStore((state) => state.template);
  const fields = useTemplateStore((state) => state.fields);
  const sheets = useTemplateStore((state) => state.sheets);
  const capas = template.capas;
  const insertObject = useTemplateStore((state) => state.insertObject);
  const updateObject = useTemplateStore((state) => state.updateObject);
  const generandoLote = loteEstado.estado === 'generando';
  const diagnostico = useMemo(() => validarPlantilla({ template, fields, sheets }), [template, fields, sheets]);

  const closeDialog = useCallback(() => { replaceLayerIdRef.current = null; setDialog(null); }, []);
  const notifyFitLimit = useCallback(() => { setNotice({ type:'warning', text:'El lienzo no cabe por completo: el zoom mínimo es 25 %. Puedes desplazarte para ver el resto.' }); }, []);

  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(null), 6000); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => { const restaurado = useTemplateStore.getState().cargarDesdeNavegador(); if (restaurado) setNotice({ type:'success', text:'Se restauró tu último trabajo guardado en este navegador.' }); }, []);
  useEffect(() => {
    const desuscribir = useTemplateStore.subscribe((state, anterior) => {
      const cambioRelevante = state.template !== anterior.template || state.fields !== anterior.fields;
      if (!cambioRelevante) return;
      window.clearTimeout(autoguardadoRef.current);
      autoguardadoRef.current = window.setTimeout(() => useTemplateStore.getState().guardarEnNavegador(), AUTOGUARDADO_MS);
    });
    return () => { desuscribir(); window.clearTimeout(autoguardadoRef.current); };
  }, []);

  useEffect(() => {
    if (dialog || cropLayerId) setSpacePressed(false);
    function isTyping(target) { return target instanceof HTMLElement && (['INPUT','TEXTAREA','SELECT'].includes(target.tagName) || target.isContentEditable); }
    function keydown(event) {
      if (dialog || cropLayerId) return;
      const state = useTemplateStore.getState();
      const mod = event.ctrlKey || event.metaKey;
      const keyLower = event.key.toLowerCase();
      if (mod && !event.altKey && keyLower === 'z' && !event.shiftKey) { event.preventDefault(); state.undo(); return; }
      if (mod && !event.altKey && (keyLower === 'y' || (keyLower === 'z' && event.shiftKey))) { event.preventDefault(); state.redo(); return; }
      if (mod && !event.altKey && (event.key === '[' || event.code === 'BracketLeft')) { event.preventDefault(); state.moveSelectedBackward(); return; }
      if (mod && !event.altKey && (event.key === ']' || event.code === 'BracketRight')) { event.preventDefault(); state.moveSelectedForward(); return; }
      if (isTyping(event.target)) return;
      if (event.code === 'Space') { event.preventDefault(); setSpacePressed(true); return; }
      if (mod && keyLower === 'd') { event.preventDefault(); state.duplicateSelected(); return; }
      if (mod && keyLower === 's') { event.preventDefault(); const { template: plantilla, fields: campos } = state; descargarPlantilla(plantilla, campos, plantilla.nombre); setNotice({ type:'success', text:'Plantilla descargada como archivo JSON.' }); return; }
      if (mod && !event.altKey && keyLower === 'e') { event.preventDefault(); exportarPng(); return; }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); state.deleteSelected(); return; }
      if (event.key === 'Escape') { state.clearSelection(); return; }
      const distance = event.shiftKey ? 10 : 1;
      const movements = { ArrowLeft:[-distance,0], ArrowRight:[distance,0], ArrowUp:[0,-distance], ArrowDown:[0,distance] };
      if (movements[event.key] && state.selectedIds.length) { event.preventDefault(); state.moveSelected(...movements[event.key]); }
    }
    function keyup(event) { if (event.code === 'Space') setSpacePressed(false); }
    function blur() { setSpacePressed(false); }
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); };
  }, [dialog, cropLayerId]);

  async function addOrReplaceImage(src, targetLayerId = null) {
    const { image, corsSafe } = await cargarImagen(src);
    if (targetLayerId) { const dims = dimensionesInicialesImagen(image.naturalWidth, image.naturalHeight); updateObject(targetLayerId, { imagen:{ src, width:dims.width, height:dims.height } }); }
    else insertObject('imagen', { src, naturalWidth:image.naturalWidth, naturalHeight:image.naturalHeight });
    if (!corsSafe) setNotice({ type:'warning', text:'La imagen se muestra, pero su servidor no permite CORS; podría impedir exportaciones futuras.' });
  }
  async function fileChanged(event) {
    const file = event.target.files?.[0]; const targetId = replaceLayerIdRef.current; replaceLayerIdRef.current = null; event.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) { setNotice({ type:'error', text:'Selecciona un archivo de imagen.' }); return; }
    try { const dataUrl = await leerArchivo(file); await addOrReplaceImage(dataUrl, targetId); } catch (error) { setNotice({ type:'error', text:error.message || 'No se pudo añadir la imagen.' }); }
  }
  async function templateFileChanged(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try { const texto = await leerArchivoTexto(file); const resultado = useTemplateStore.getState().importarPlantilla(texto); if (resultado.ok) setNotice({ type:'success', text:`Plantilla “${file.name}” abierta.` }); else setNotice({ type:'error', text:resultado.error }); }
    catch (error) { setNotice({ type:'error', text:error.message || 'No se pudo abrir la plantilla.' }); }
  }
  const guardarArchivo = () => { const { template: plantilla, fields: campos } = useTemplateStore.getState(); descargarPlantilla(plantilla, campos, plantilla.nombre); setNotice({ type:'success', text:'Plantilla descargada como archivo JSON.' }); };
  const exportarPng = async () => {
    try { await canvasRef.current?.exportarPNG({ pixelRatio:2 }); setNotice({ type:'success', text:'Lienzo exportado como PNG en 2x.' }); }
    catch (error) { setNotice({ type:'error', text:error.message === "Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported." ? 'No se pudo exportar: una imagen externa no permite CORS. Reemplázala por una imagen local o de un servidor con CORS.' : error.message || 'No se pudo exportar el PNG.' }); }
  };
  const generarLote = async () => {
    const state = useTemplateStore.getState();
    const { sheets: hoja, template: plantilla } = state;
    if (hoja.status !== 'ready' || !hoja.rows.length || !Object.keys(hoja.columnToField).length) { setLoteEstado({ estado:'error', actual:0, total:0, exitosos:0, fallidos:[], detalles:[], error:'Conecta una hoja y mapea al menos una columna antes de generar.' }); return; }
    if (!diagnostico.ok) { setLoteEstado({ estado:'error', actual:0, total:0, exitosos:0, fallidos:[], detalles:[], error:'Corrige los errores del diagnóstico antes de generar el lote.' }); return; }
    cancelarLoteRef.current = false;
    const total = hoja.rows.length;
    const filaActivaAnterior = hoja.activeRowIndex;
    const zip = new JSZip(); const fallidos = []; const detalles = [];
    const base = String(plantilla.nombre || 'plantilla').trim().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'plantilla';
    setLoteEstado({ estado:'generando', actual:0, total, exitosos:0, fallidos:[], detalles:[], error:'' });
    for (let indice = 0; indice < total; indice += 1) {
      if (cancelarLoteRef.current) break;
      useTemplateStore.getState().setActiveRowIndex(indice);
      await precargarImagenesDeFila(indice);
      await new Promise((resolve) => window.setTimeout(resolve, PAUSA_ENTRE_RENDERES_MS));
      try {
        const dataUrl = await canvasRef.current?.renderizarPNG({ pixelRatio:2 });
        if (!dataUrl) throw new Error('El lienzo no está disponible.');
        zip.file(`${base}-${String(indice + 1).padStart(3, '0')}.png`, dataUrl.split(',')[1], { base64:true });
        setLoteEstado((anterior) => ({ ...anterior, actual:indice + 1, exitosos:anterior.exitosos + 1 }));
      } catch (error) {
        const motivo = String(error?.message || 'Error desconocido al renderizar.');
        fallidos.push(indice + 1); detalles.push({ fila:indice + 1, motivo });
        setLoteEstado((anterior) => ({ ...anterior, actual:indice + 1, fallidos:[...anterior.fallidos, indice + 1], detalles:[...anterior.detalles, { fila:indice + 1, motivo }] }));
      }
    }
    useTemplateStore.getState().setActiveRowIndex(filaActivaAnterior);
    if (cancelarLoteRef.current) { setLoteEstado({ estado:'idle', actual:0, total:0, exitosos:0, fallidos:[], detalles:[], error:'' }); setNotice({ type:'warning', text:'Generación del lote cancelada.' }); return; }
    if (fallidos.length < total) {
      try { const blob = await zip.generateAsync({ type:'blob' }); descargarBlob(blob, `${base}-lote.zip`); setLoteEstado({ estado:'listo', actual:total, total, exitosos:total - fallidos.length, fallidos, detalles, error:'' }); return; }
      catch (error) { setLoteEstado({ estado:'error', actual:total, total, exitosos:total - fallidos.length, fallidos, detalles, error:error.message || 'No se pudo crear el ZIP.' }); return; }
    }
    setLoteEstado({ estado:'error', actual:total, total, exitosos:0, fallidos, detalles, error:'Todas las filas fallaron; revisa las imágenes y permisos CORS.' });
  };
  const cancelarLote = () => { cancelarLoteRef.current = true; };
  const insertText = () => insertObject('texto');
  const insertRect = () => insertObject('rect');
  const insertCircle = () => insertObject('circulo');
  const insertLine = () => insertObject('linea');
  const insertImage = () => { replaceLayerIdRef.current = null; fileInputRef.current?.click(); };
  const replaceImageFile = (layerId) => { replaceLayerIdRef.current = layerId; fileInputRef.current?.click(); };
  const replaceImageUrl = (layerId) => { replaceLayerIdRef.current = layerId; setDialog('image-replace'); };
  const cropLayer = cropLayerId ? capas.find((capa) => capa.id === cropLayerId && capa.tipo === 'imagen') : null;

  return (
    <div className="app-shell">
      <TopBar zoom={zoom} disabled={generandoLote} diagnostico={diagnostico} onZoomIn={() => canvasRef.current?.zoomIn()} onZoomOut={() => canvasRef.current?.zoomOut()} onZoom100={() => canvasRef.current?.zoom100()} onFit={() => canvasRef.current?.fitToScreen()} onNewProject={() => setDialog('project')} onInsertText={insertText} onInsertRect={insertRect} onInsertCircle={insertCircle} onInsertLine={insertLine} onInsertImage={insertImage} onOpenTemplate={() => templateInputRef.current?.click()} onSaveTemplate={guardarArchivo} onExportPng={exportarPng} />
      <div className="editor-body">
        <LeftPanel onInsertText={insertText} onInsertRect={insertRect} onInsertCircle={insertCircle} onInsertLine={insertLine} onInsertImage={insertImage} onImageUrl={() => { replaceLayerIdRef.current = null; setDialog('image'); }} onGenerarLote={generarLote} onCancelarLote={cancelarLote} loteEstado={loteEstado} locked={generandoLote} />
        <CanvasStage ref={canvasRef} spacePressed={spacePressed} onZoomChange={setZoom} onFitLimit={notifyFitLimit} />
        <RightPanel onReplaceImageFile={replaceImageFile} onReplaceImageUrl={replaceImageUrl} onOpenCrop={(id) => setCropLayerId(id)} />
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={fileChanged} className="visually-hidden" aria-label="Seleccionar archivo de imagen" />
      <input ref={templateInputRef} type="file" accept="application/json,.json" onChange={templateFileChanged} className="visually-hidden" aria-label="Abrir archivo de plantilla JSON" />
      {dialog === 'project' && <ProjectDialog onClose={closeDialog} />}
      {(dialog === 'image' || dialog === 'image-replace') && <ImageDialog onClose={closeDialog} onAdd={(url) => addOrReplaceImage(url, dialog === 'image-replace' ? replaceLayerIdRef.current : null)} />}
      {cropLayer && <CropDialog layer={cropLayer} onClose={() => setCropLayerId(null)} onApply={(nuevaImagen) => updateObject(cropLayer.id, { imagen:nuevaImagen })} />}
      {notice && (
        <div className={`toast toast-${notice.type}`} role="status" aria-live="polite">
          <Icon name="info" size={18} />
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Ocultar aviso" title="Ocultar aviso"><Icon name="close" size={16} /></button>
        </div>
      )}
    </div>
  );
}
