import { create } from 'zustand';
import { actualizarVersionPlantilla, calcularFontSizeAutoFit, clamp, crearCapa, crearIdCapa, crearPlantillaVacia, hidratarPlantilla, normalizarCajaTexto, normalizarFill, sincronizarCambioCajaTexto } from '../template/schema.js';
import { extraerCamposPlantilla, normalizarNombreCampo, renombrarCampoEnCapas, reemplazarCampoEnCapas, resolverTexto } from '../template/fields.js';
import { extraerSpreadsheetId, leerHoja } from '../sheets/sheets-client.js';
import { normalizarRespuestaValues } from '../sheets/mapper.js';
import { guardarPlantillaLocal, leerPlantillaLocal, parsearPlantilla } from '../template/persistencia.js';
import { esDescendiente, puedeMoverCapa } from './layers-selectors.js';

const MAX_HISTORIAL = 100;
const VENTANA_COALESCENCIA_MS = 350;
const SHEETS_API_KEY_STORAGE = 'gimage_sheets_api_key';
const GRID_STORAGE = 'gimage_grid';

function clonar(valor) { return typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone(valor) : JSON.parse(JSON.stringify(valor)); }
function leerApiKeyGuardada() { if (typeof localStorage === 'undefined') return ''; return localStorage.getItem(SHEETS_API_KEY_STORAGE) ?? ''; }
function guardarApiKey(apiKey) { if (typeof localStorage === 'undefined') return; if (apiKey) localStorage.setItem(SHEETS_API_KEY_STORAGE, apiKey); else localStorage.removeItem(SHEETS_API_KEY_STORAGE); }
function traducirErrorSheets(error) { const mensaje = String(error?.message ?? ''); if (/API key not valid|API_KEY_INVALID|invalid API key/i.test(mensaje)) return 'La API key no es válida o no tiene habilitada la Google Sheets API.'; if (/PERMISSION_DENIED|403/i.test(mensaje)) return 'No se pudo leer la hoja: compártela como “Cualquier persona con el enlace puede ver”.'; if (/Unable to parse range|400/i.test(mensaje)) return 'No se pudo leer la hoja: revisa el nombre de la pestaña y el rango.'; return mensaje; }

function leerGridGuardada() {
  const base = { visible:false, size:50, color:'#94a3b8', opacity:0.25 };
  if (typeof localStorage === 'undefined') return base;
  try {
    const raw = localStorage.getItem(GRID_STORAGE);
    if (!raw) return base;
    const datos = JSON.parse(raw);
    return {
      visible: Boolean(datos.visible),
      size: Math.max(10, Math.round(Number(datos.size) || 50)),
      color: typeof datos.color === 'string' && datos.color ? datos.color : '#94a3b8',
      opacity: clamp(Number(datos.opacity) || 0.25, 0.05, 1),
    };
  } catch { return base; }
}
function guardarGrid(grid) { if (typeof localStorage === 'undefined') return; localStorage.setItem(GRID_STORAGE, JSON.stringify(grid)); }

export function obtenerCajaTexto(capa) { if (!capa || capa.tipo !== 'texto') return null; return normalizarCajaTexto(capa.texto?.caja, capa.texto); }
function normalizarCapaTextoConCaja(capa, cambioCaja = null, fields = {}) { if (!capa || capa.tipo !== 'texto' || !capa.texto) return capa; const cajaBase = obtenerCajaTexto(capa); const caja = cambioCaja ? sincronizarCambioCajaTexto(cajaBase, cambioCaja) : cajaBase; const textoParaMedir = resolverTexto(capa.texto.texto, fields); const fontSizeCalculado = caja.autoFit ? calcularFontSizeAutoFit({ ...capa.texto, texto:textoParaMedir }, caja.width, caja.height) : capa.texto.fontSize; return { ...capa, texto:{ ...capa.texto, fontSize:fontSizeCalculado, caja } }; }
function crearSnapshot(state) { return { template:clonar(state.template), selectedIds:[...state.selectedIds], fields:clonar(state.fields) }; }
function filtrarSeleccionValida(capas, selectedIds) { const ids = new Set(capas.map((capa) => capa.id)); return selectedIds.filter((id) => ids.has(id)); }
export function cajaCapa(capa) {
  if (!capa) return { x:0, y:0, width:0, height:0 };
  if (capa.tipo === 'texto') { const caja = obtenerCajaTexto(capa) ?? { width:0, height:0 }; return { x:capa.x, y:capa.y, width:caja.width, height:caja.height }; }
  if (capa.tipo === 'rect') return { x:capa.x, y:capa.y, width:capa.rect?.width ?? 0, height:capa.rect?.height ?? 0 };
  if (capa.tipo === 'imagen') return { x:capa.x, y:capa.y, width:capa.imagen?.width ?? 0, height:capa.imagen?.height ?? 0 };
  if (capa.tipo === 'circulo') { const radio = capa.circulo?.radius ?? 0; return { x:capa.x, y:capa.y, width:radio*2, height:radio*2 }; }
  if (capa.tipo === 'linea') { const puntos = capa.linea?.points ?? [0,0,0,0]; return { x:capa.x + Math.min(puntos[0], puntos[2]), y:capa.y + Math.min(puntos[1], puntos[3]), width:Math.abs(puntos[2]-puntos[0]), height:Math.abs(puntos[3]-puntos[1]) }; }
  return { x:capa.x, y:capa.y, width:0, height:0 };
}

export const useTemplateStore = create((set, get) => {
  function aplicarCambio(mutador, opciones = {}) {
    set((state) => {
      const resultado = mutador(state);
      if (!resultado) return {};
      const nextTemplate = actualizarVersionPlantilla(resultado.template ?? state.template);
      const nextFields = resultado.fields ?? state.fields;
      const nextSelectedIds = filtrarSeleccionValida(nextTemplate.capas, resultado.selectedIds ?? state.selectedIds);
      const sinCambiosTemplate = JSON.stringify(nextTemplate) === JSON.stringify(state.template);
      const sinCambiosFields = JSON.stringify(nextFields) === JSON.stringify(state.fields);
      const sinCambiosSeleccion = JSON.stringify(nextSelectedIds) === JSON.stringify(state.selectedIds);
      if (sinCambiosTemplate && sinCambiosFields && sinCambiosSeleccion) return {};
      const ahora = Date.now(); const historyKey = opciones.historyKey || null;
      const enBatch = state._batchDepth > 0 && state._batchPushed;
      const coalescePorTiempo = Boolean(historyKey && state._lastHistoryKey === historyKey && ahora - state._lastHistoryTime < VENTANA_COALESCENCIA_MS && state.past.length > 0);
      const nextPast = enBatch || coalescePorTiempo ? state.past : [...state.past.slice(-(MAX_HISTORIAL - 1)), crearSnapshot(state)];
      return { template:nextTemplate, fields:nextFields, selectedIds:nextSelectedIds, past:nextPast, future:[], _batchDepth:state._batchDepth, _batchPushed:state._batchDepth > 0 ? true : false, _lastHistoryKey:historyKey, _lastHistoryTime:ahora };
    });
  }
  function cargarDatos(datos) {
    const plantilla = hidratarPlantilla(clonar(datos.template));
    set((state) => ({ template:plantilla, fields:clonar(datos.fields ?? {}), selectedIds:[], guides:[], past:[], future:[], _batchDepth:0, _batchPushed:false, _lastHistoryKey:null, projectRevision:state.projectRevision + 1 }));
  }
  return {
    template:crearPlantillaVacia(), fields:{}, selectedIds:[], guides:[], projectRevision:0, past:[], future:[], _batchDepth:0, _batchPushed:false, _lastHistoryKey:null, _lastHistoryTime:0,
    sheets:{ apiKey:leerApiKeyGuardada(), spreadsheetId:'', sheetName:'', range:'A1:Z1000', headers:[], rows:[], columnToField:{}, activeRowIndex:null, status:'idle', error:'' },
    grid: leerGridGuardada(),
    beginHistoryBatch:() => set((state) => ({ _batchDepth:state._batchDepth + 1, _batchPushed:state._batchDepth > 0 ? state._batchPushed : false, _lastHistoryKey:null })),
    endHistoryBatch:() => set({ _batchDepth:0, _batchPushed:false, _lastHistoryKey:null }),
    undo:() => set((state) => { if (!state.past.length) return {}; const anterior = state.past[state.past.length - 1]; const tpl = clonar(anterior.template); return { template:tpl, fields:clonar(anterior.fields), selectedIds:filtrarSeleccionValida(tpl.capas, anterior.selectedIds), past:state.past.slice(0, -1), future:[...state.future, crearSnapshot(state)], _batchDepth:0, _batchPushed:false, _lastHistoryKey:null }; }),
    redo:() => set((state) => { if (!state.future.length) return {}; const siguiente = state.future[state.future.length - 1]; const tpl = clonar(siguiente.template); return { template:tpl, fields:clonar(siguiente.fields), selectedIds:filtrarSeleccionValida(tpl.capas, siguiente.selectedIds), past:[...state.past.slice(-(MAX_HISTORIAL - 1)), crearSnapshot(state)], future:[...state.future, crearSnapshot(state)], _batchDepth:0, _batchPushed:false, _lastHistoryKey:null }; }),
    undoTo:(pasos=1) => { const n = Math.max(1, Math.min(Number(pasos)||1, get().past.length)); for (let i=0;i<n;i+=1) get().undo(); },
    redoTo:(pasos=1) => { const n = Math.max(1, Math.min(Number(pasos)||1, get().future.length)); for (let i=0;i<n;i+=1) get().redo(); },
    newProject:({ name, nombre, width, height, background }) => set((state) => ({ template:crearPlantillaVacia((nombre ?? name ?? '').trim() || 'Proyecto sin título', width, height, background), fields:{}, selectedIds:[], guides:[], past:[], future:[], _batchDepth:0, _batchPushed:false, _lastHistoryKey:null, projectRevision:state.projectRevision + 1 })),
    loadTemplate:(plantillaEntrada) => set((state) => ({ template:hidratarPlantilla(clonar(plantillaEntrada)), fields:{}, selectedIds:[], guides:[], past:[], future:[], _batchDepth:0, _batchPushed:false, _lastHistoryKey:null, projectRevision:state.projectRevision + 1 })),
    guardarEnNavegador:() => { const { template, fields } = get(); return guardarPlantillaLocal(template, fields); },
    cargarDesdeNavegador:() => { const datos = leerPlantillaLocal(); if (!datos?.template) return false; cargarDatos(datos); return true; },
    importarPlantilla:(texto) => { try { const datos = parsearPlantilla(texto); cargarDatos(datos); return { ok:true }; } catch (error) { return { ok:false, error:error.message }; } },
    setName:(nombre) => aplicarCambio((state) => ({ template:{ ...state.template, nombre } }), { historyKey:'template.nombre' }),
    setCanvasBackground:(fill, opciones = {}) => aplicarCambio((state) => ({ template:{ ...state.template, canvas:{ ...state.template.canvas, background:{ fill:normalizarFill(fill, '#ffffff') } } } }), { historyKey:opciones.historyKey ?? null }),
    insertObject:(tipo, opciones) => { const capa = crearCapa(tipo, get().template, opciones); aplicarCambio((state) => ({ template:{ ...state.template, capas:[...state.template.capas, capa] }, selectedIds:[capa.id] })); return capa.id; },
    selectObject:(id, agregar = false) => set((state) => { const capa = state.template.capas.find((item) => item.id === id); if (!capa || capa.bloqueada || !capa.visible) return {}; if (agregar) return { selectedIds:state.selectedIds.includes(id) ? state.selectedIds.filter((actual) => actual !== id) : [...state.selectedIds, id] }; return state.selectedIds.includes(id) ? {} : { selectedIds:[id] }; }),
    selectLayer:(id, agregar = false) => set((state) => { const capa = state.template.capas.find((item) => item.id === id); if (!capa) return {}; if (agregar) return { selectedIds:state.selectedIds.includes(id) ? state.selectedIds.filter((actual) => actual !== id) : [...state.selectedIds, id] }; return state.selectedIds.length === 1 && state.selectedIds[0] === id ? {} : { selectedIds:[id] }; }),
    setSelectedIds:(ids) => set((state) => { const validos = filtrarSeleccionValida(state.template.capas, Array.isArray(ids) ? ids : []); return JSON.stringify(validos) === JSON.stringify(state.selectedIds) ? {} : { selectedIds:validos }; }),
    clearSelection:() => set((state) => (state.selectedIds.length ? { selectedIds:[] } : {})),
    alignSelected:(modo) => aplicarCambio((state) => {
      const seleccion = state.template.capas.filter((capa) => state.selectedIds.includes(capa.id) && capa.visible && !capa.bloqueada);
      if (!seleccion.length) return null;
      const items = seleccion.map((capa) => ({ capa, caja:cajaCapa(capa) }));
      const minX = Math.min(...items.map((item) => item.caja.x));
      const maxX = Math.max(...items.map((item) => item.caja.x + item.caja.width));
      const minY = Math.min(...items.map((item) => item.caja.y));
      const maxY = Math.max(...items.map((item) => item.caja.y + item.caja.height));
      const cambios = {};
      items.forEach(({ capa, caja }) => {
        let dx = 0; let dy = 0;
        if (modo === 'left') dx = minX - caja.x;
        if (modo === 'center-h') dx = (minX + maxX) / 2 - (caja.x + caja.width / 2);
        if (modo === 'right') dx = maxX - (caja.x + caja.width);
        if (modo === 'top') dy = minY - caja.y;
        if (modo === 'middle-h') dy = (minY + maxY) / 2 - (caja.y + caja.height / 2);
        if (modo === 'bottom') dy = maxY - (caja.y + caja.height);
        if (!dx && !dy) return;
        cambios[capa.id] = { x:Math.round(capa.x + dx), y:Math.round(capa.y + dy) };
      });
      if (!Object.keys(cambios).length) return null;
      return { template:{ ...state.template, capas:state.template.capas.map((capa) => (cambios[capa.id] ? { ...capa, ...cambios[capa.id] } : capa)) } };
    }),
    distributeSelected:(eje) => aplicarCambio((state) => {
      const seleccion = state.template.capas.filter((capa) => state.selectedIds.includes(capa.id) && capa.visible && !capa.bloqueada);
      if (seleccion.length < 3) return null;
      const items = seleccion.map((capa) => ({ capa, caja:cajaCapa(capa) }));
      const horizontal = eje === 'horizontal';
      items.sort((a, b) => (horizontal ? a.caja.x - b.caja.x : a.caja.y - b.caja.y));
      const primero = items[0]; const ultimo = items[items.length - 1];
      const inicio = horizontal ? primero.caja.x : primero.caja.y;
      const fin = horizontal ? ultimo.caja.x + ultimo.caja.width : ultimo.caja.y + ultimo.caja.height;
      const tamanoUltimo = horizontal ? ultimo.caja.width : ultimo.caja.height;
      const paso = (fin - inicio - tamanoUltimo) / (items.length - 1);
      const cambios = {};
      items.forEach((item, indice) => {
        const objetivo = inicio + indice * paso;
        const actual = horizontal ? item.capa.x : item.capa.y;
        const delta = Math.round(objetivo - actual);
        if (!delta) return;
        cambios[item.capa.id] = horizontal ? { x:Math.round(item.capa.x + delta) } : { y:Math.round(item.capa.y + delta) };
      });
      return { template:{ ...state.template, capas:state.template.capas.map((capa) => (cambios[capa.id] ? { ...capa, ...cambios[capa.id] } : capa)) } };
    }),
    flipSelected:(eje) => aplicarCambio((state) => {
      const clave = eje === 'vertical' ? 'flipY' : 'flipX';
      let cambio = false;
      const capas = state.template.capas.map((capa) => {
        if (!state.selectedIds.includes(capa.id) || capa.visible === false || capa.bloqueada) return capa;
        cambio = true;
        return { ...capa, [clave]: !capa[clave] };
      });
      return cambio ? { template:{ ...state.template, capas } } : null;
    }),
    duplicateLayerAt:(id, x, y) => {
      const state = get();
      const capa = state.template.capas.find((item) => item.id === id);
      if (!capa || capa.bloqueada) return null;
      const ids = state.template.capas.map((item) => item.id);
      const copia = clonar(capa);
      copia.id = crearIdCapa(ids);
      copia.nombre = `${capa.nombre} copia`;
      copia.x = Math.round(x);
      copia.y = Math.round(y);
      aplicarCambio((actual) => ({ template:{ ...actual.template, capas:[...actual.template.capas, copia] }, selectedIds:[copia.id] }));
      return copia.id;
    },
    updateObject:(id, cambios, opciones = {}) => aplicarCambio((state) => { let huboCambio = false; const capas = state.template.capas.map((capa) => { if (capa.id !== id) return capa; huboCambio = true; let actualizada = { ...capa, ...cambios }; if (capa.tipo && cambios[capa.tipo]) actualizada[capa.tipo] = { ...capa[capa.tipo], ...cambios[capa.tipo] }; if (actualizada.tipo === 'texto') actualizada = normalizarCapaTextoConCaja(actualizada, cambios.texto?.caja || null, state.fields); return actualizada; }); if (!huboCambio) return null; const siguienteSeleccion = cambios.bloqueada === true ? state.selectedIds.filter((selId) => selId !== id) : state.selectedIds; return { template:{ ...state.template, capas }, selectedIds:siguienteSeleccion }; }, { historyKey:opciones.historyKey ?? null }),
    updateTextBox:(id, parcial, opciones = {}) => aplicarCambio((state) => { const existe = state.template.capas.some((capa) => capa.id === id && capa.tipo === 'texto'); if (!existe) return null; const capas = state.template.capas.map((capa) => (capa.id === id ? normalizarCapaTextoConCaja(capa, parcial, state.fields) : capa)); return { template:{ ...state.template, capas } }; }, { historyKey:opciones.historyKey ?? null }),
    reapplyAutoFitForFont:(familia, opciones = {}) => aplicarCambio((state) => { const objetivo = String(familia ?? '').trim().toLowerCase(); if (!objetivo) return null; let huboAjuste = false; const capas = state.template.capas.map((capa) => { if (capa.tipo !== 'texto' || String(capa.texto?.fontFamily ?? '').trim().toLowerCase() !== objetivo) return capa; const caja = obtenerCajaTexto(capa); if (!caja?.autoFit) return capa; const ajustada = normalizarCapaTextoConCaja(capa, null, state.fields); if (ajustada.texto.fontSize !== capa.texto.fontSize) huboAjuste = true; return ajustada.texto.fontSize !== capa.texto.fontSize ? ajustada : capa; }); return huboAjuste ? { template:{ ...state.template, capas } } : null; }, { historyKey:opciones.historyKey ?? null }),
    updateObjects:(cambiosPorId, opciones = {}) => aplicarCambio((state) => { const capas = state.template.capas.map((capa) => { const cambio = cambiosPorId[capa.id]; if (!cambio) return capa; const { textBox:cambioCaja, ...cambioCapa } = cambio; let actualizada = { ...capa, ...cambioCapa }; if (capa.tipo && cambioCapa[capa.tipo]) actualizada[capa.tipo] = { ...capa[capa.tipo], ...cambioCapa[capa.tipo] }; if (actualizada.tipo === 'texto') actualizada = normalizarCapaTextoConCaja(actualizada, cambioCaja || cambioCapa.texto?.caja || null, state.fields); return actualizada; }); return { template:{ ...state.template, capas } }; }, { historyKey:opciones.historyKey ?? null }),
    renameLayer:(id, nombre) => { const limpio = String(nombre ?? '').trim(); if (!limpio) return; aplicarCambio((state) => ({ template:{ ...state.template, capas:state.template.capas.map((capa) => (capa.id === id ? { ...capa, nombre:limpio } : capa)) } })); },
    toggleLayerVisible:(id) => aplicarCambio((state) => { const objetivo = state.template.capas.find((capa) => capa.id === id); if (!objetivo) return null; const nuevaVisibilidad = !objetivo.visible; return { template:{ ...state.template, capas:state.template.capas.map((capa) => (capa.id === id ? { ...capa, visible:nuevaVisibilidad } : capa)) }, selectedIds:nuevaVisibilidad ? state.selectedIds : state.selectedIds.filter((selId) => selId !== id) }; }),
    toggleLayerLocked:(id) => aplicarCambio((state) => { const objetivo = state.template.capas.find((capa) => capa.id === id); if (!objetivo) return null; const nuevoBloqueo = !objetivo.bloqueada; return { template:{ ...state.template, capas:state.template.capas.map((capa) => (capa.id === id ? { ...capa, bloqueada:nuevoBloqueo } : capa)) }, selectedIds:nuevoBloqueo ? state.selectedIds.filter((selId) => selId !== id) : state.selectedIds }; }),
    reorderLayer:(fromIndex, toIndex) => aplicarCambio((state) => { const total = state.template.capas.length; if (fromIndex < 0 || fromIndex >= total || toIndex < 0 || toIndex >= total || fromIndex === toIndex) return null; const capas = [...state.template.capas]; if ((capas[fromIndex].parentId ?? null) !== (capas[toIndex].parentId ?? null)) return null; const [movida] = capas.splice(fromIndex, 1); capas.splice(toIndex, 0, movida); return { template:{ ...state.template, capas } }; }, { historyKey:'layer:reorder' }),
    createGroup:() => aplicarCambio((state) => {
      const existentes = state.template.capas.map((capa) => capa.id);
      const id = crearIdCapa(existentes);
      const grupo = { id, tipo:'grupo', nombre:'Grupo', visible:true, bloqueada:false, x:0, y:0, rotation:0, opacity:1, parentId:null, order:state.template.capas.length, collapsed:false, blendMode:'normal', fill:1, mask:null, effects:[], linkedLayerIds:[] };
      return { template:{ ...state.template, capas:[...state.template.capas, grupo] }, selectedIds:[id] };
    }, { historyKey:'group:create' }),
    groupSelected:() => aplicarCambio((state) => {
      const seleccion = state.template.capas.filter((capa) => state.selectedIds.includes(capa.id));
      if (!seleccion.length) return null;
      const ids = new Set(seleccion.map((capa) => capa.id));
      const grupoId = crearIdCapa(state.template.capas.map((capa) => capa.id));
      const primerIndice = state.template.capas.findIndex((capa) => ids.has(capa.id));
      const grupo = { id:grupoId, tipo:'grupo', nombre:'Grupo', visible:true, bloqueada:false, x:0, y:0, rotation:0, opacity:1, parentId:null, order:primerIndice, collapsed:false, blendMode:'normal', fill:1, mask:null, effects:[], linkedLayerIds:[] };
      const capas = state.template.capas.map((capa) => (ids.has(capa.id) ? { ...capa, parentId:grupoId } : capa));
      capas.splice(primerIndice, 0, grupo);
      return { template:{ ...state.template, capas }, selectedIds:[grupoId] };
    }, { historyKey:'group:group-selected' }),
    ungroupSelected:() => aplicarCambio((state) => {
      const grupos = state.template.capas.filter((capa) => capa.tipo === 'grupo' && state.selectedIds.includes(capa.id));
      if (!grupos.length) return null;
      const grupoIds = new Set(grupos.map((grupo) => grupo.id));
      const capas = state.template.capas.filter((capa) => !grupoIds.has(capa.id)).map((capa) => (grupoIds.has(capa.parentId) ? { ...capa, parentId:grupos.find((grupo) => grupo.id === capa.parentId).parentId } : capa));
      return { template:{ ...state.template, capas }, selectedIds:[] };
    }, { historyKey:'group:ungroup' }),
    toggleGroupCollapsed:(id) => aplicarCambio((state) => {
      const objetivo = state.template.capas.find((capa) => capa.id === id && capa.tipo === 'grupo');
      if (!objetivo) return null;
      const capas = state.template.capas.map((capa) => (capa.id === id ? { ...capa, collapsed:!capa.collapsed } : capa));
      return { template:{ ...state.template, capas } };
    }, { historyKey:`group:${id}:collapse` }),
    moveLayerRelative:(id, targetId, posicion) => aplicarCambio((state) => {
      if (!puedeMoverCapa(state.template.capas, id, targetId, posicion)) return null;
      const capas = [...state.template.capas];
      const fromIndex = capas.findIndex((capa) => capa.id === id);
      const dragged = capas[fromIndex];
      const sinArrastrada = capas.filter((capa) => capa.id !== id);

      if (posicion === 'inside') {
        const indiceTarget = sinArrastrada.findIndex((capa) => capa.id === targetId);
        sinArrastrada.splice(indiceTarget + 1, 0, { ...dragged, parentId:targetId });
        return { template:{ ...state.template, capas:sinArrastrada } };
      }

      let insertIndex = sinArrastrada.findIndex((capa) => capa.id === targetId);
      if (posicion === 'after') insertIndex += 1;
      sinArrastrada.splice(insertIndex, 0, dragged);
      return { template:{ ...state.template, capas:sinArrastrada } };
    }, { historyKey:'layer:move' }),
    moveSelectedForward:() => aplicarCambio((state) => { if (!state.selectedIds.length) return null; const seleccion = new Set(state.selectedIds); const capas = [...state.template.capas]; let movio = false; for (let i = capas.length - 2; i >= 0; i -= 1) { if (seleccion.has(capas[i].id) && !seleccion.has(capas[i + 1].id)) { [capas[i], capas[i + 1]] = [capas[i + 1], capas[i]]; movio = true; } } return movio ? { template:{ ...state.template, capas } } : null; }),
    moveSelectedBackward:() => aplicarCambio((state) => { if (!state.selectedIds.length) return null; const seleccion = new Set(state.selectedIds); const capas = [...state.template.capas]; let movio = false; for (let i = 1; i < capas.length; i += 1) { if (seleccion.has(capas[i].id) && !seleccion.has(capas[i - 1].id)) { [capas[i - 1], capas[i]] = [capas[i], capas[i - 1]]; movio = true; } } return movio ? { template:{ ...state.template, capas } } : null; }),
    moveSelected:(dx, dy) => aplicarCambio((state) => { if (!state.selectedIds.length) return null; let movio = false; const capas = state.template.capas.map((capa) => { if (!state.selectedIds.includes(capa.id) || capa.bloqueada) return capa; movio = true; return { ...capa, x:Math.round(capa.x + dx), y:Math.round(capa.y + dy) }; }); return movio ? { template:{ ...state.template, capas } } : null; }, { historyKey:'keyboard-move' }),
    deleteSelected:() => aplicarCambio((state) => { const restantes = state.template.capas.filter((capa) => !state.selectedIds.includes(capa.id) || capa.bloqueada); if (restantes.length === state.template.capas.length) return null; return { template:{ ...state.template, capas:restantes }, selectedIds:[] }; }),
    duplicateSelected:() => aplicarCambio((state) => { const seleccionadas = state.template.capas.filter((capa) => state.selectedIds.includes(capa.id) && !capa.bloqueada); if (!seleccionadas.length) return null; const ids = state.template.capas.map((capa) => capa.id); const copias = seleccionadas.map((capa) => { const copia = clonar(capa); copia.id = crearIdCapa(ids); ids.push(copia.id); copia.nombre = `${capa.nombre} copia`; copia.x = Math.round(capa.x + 24); copia.y = Math.round(capa.y + 24); if (copia.tipo === 'texto') return normalizarCapaTextoConCaja(copia, null, state.fields); return copia; }); return { template:{ ...state.template, capas:[...state.template.capas, ...copias] }, selectedIds:copias.map((copia) => copia.id) }; }),
    setFieldDefault:(nombre, valor) => aplicarCambio((state) => { const limpio = normalizarNombreCampo(nombre); if (!limpio) return null; const existe = extraerCamposPlantilla(state.template).some((campo) => campo.nombre === limpio); if (!existe) return null; return { fields:{ ...state.fields, [limpio]:{ ...(state.fields[limpio] || {}), defaultValue:valor ?? '' } } }; }, { historyKey:`field:${normalizarNombreCampo(nombre)}:default` }),
    renameField:(nombreAnterior, nombreNuevo) => aplicarCambio((state) => { const anterior = normalizarNombreCampo(nombreAnterior); const siguiente = normalizarNombreCampo(nombreNuevo); if (!anterior || !siguiente || anterior === siguiente) return null; const existe = extraerCamposPlantilla(state.template).some((campo) => campo.nombre === anterior); if (!existe) return null; const capas = renombrarCampoEnCapas(state.template.capas, anterior, siguiente); const fields = { ...state.fields }; if (fields[anterior]) { fields[siguiente] = { ...fields[anterior] }; delete fields[anterior]; } return { template:{ ...state.template, capas }, fields }; }),
    removeField:(nombre) => aplicarCambio((state) => { const limpio = normalizarNombreCampo(nombre); if (!limpio) return null; const existe = extraerCamposPlantilla(state.template).some((campo) => campo.nombre === limpio); if (!existe) return null; const defecto = state.fields[limpio]?.defaultValue ?? ''; const capas = reemplazarCampoEnCapas(state.template.capas, limpio, { valorTexto:String(defecto ?? ''), valorImagen:String(defecto ?? '') }); const fields = { ...state.fields }; delete fields[limpio]; return { template:{ ...state.template, capas }, fields }; }),
    setSheetsConfig:(parcial) => set((state) => { const next = { ...state.sheets, ...parcial }; if (parcial.apiKey !== undefined) guardarApiKey(parcial.apiKey); return { sheets:next }; }),
    setGrid:(parcial) => set((state) => { const next = { ...state.grid, ...parcial }; next.size = Math.max(10, Math.round(Number(next.size) || 50)); next.opacity = clamp(Number(next.opacity) || 0.25, 0.05, 1); guardarGrid(next); return { grid:next }; }),
    toggleGrid:() => set((state) => { const next = { ...state.grid, visible: !state.grid.visible }; guardarGrid(next); return { grid:next }; }),
    connectSheet:async () => {
      const sheets = get().sheets;
      const spreadsheetId = extraerSpreadsheetId(sheets.spreadsheetId);
      if (!sheets.apiKey || !spreadsheetId) { set({ sheets:{ ...sheets, status:'error', error:'Ingresa una API key y un ID o URL válida de Google Sheets.' } }); return false; }
      set({ sheets:{ ...sheets, status:'loading', error:'', activeRowIndex:null } });
      try {
        const datos = await leerHoja({ apiKey:sheets.apiKey, spreadsheetId, sheetName:sheets.sheetName, range:sheets.range });
        const { headers, rows } = normalizarRespuestaValues(datos.values);
        set({ sheets:{ ...get().sheets, spreadsheetId, headers, rows, columnToField:{}, activeRowIndex:null, status:'ready', error:'' } });
        return true;
      } catch (error) { set({ sheets:{ ...get().sheets, status:'error', error:traducirErrorSheets(error) } }); return false; }
    },
    mapColumnToField:(columna, campo) => set((state) => { const columnToField = { ...state.sheets.columnToField }; if (!campo) delete columnToField[columna]; else columnToField[columna] = campo; return { sheets:{ ...state.sheets, columnToField } }; }),
    setActiveRowIndex:(indice) => set((state) => { const total = state.sheets.rows.length; const siguiente = indice == null || indice < 0 || indice >= total ? null : indice; if (state.sheets.activeRowIndex === siguiente) return {}; return { sheets:{ ...state.sheets, activeRowIndex:siguiente } }; }),
    disconnectSheet:() => set((state) => ({ sheets:{ ...state.sheets, headers:[], rows:[], columnToField:{}, activeRowIndex:null, status:'idle', error:'' } })),
    addGuide:(orientation, position) => set((state) => ({ guides:[...state.guides, { id:`guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, orientation, position }] })),
    updateGuide:(id, position) => set((state) => ({ guides:state.guides.map((guia) => (guia.id === id ? { ...guia, position } : guia)) })),
    removeGuide:(id) => set((state) => ({ guides:state.guides.filter((guia) => guia.id !== id) })),
  };
});
