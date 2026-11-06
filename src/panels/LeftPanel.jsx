import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { extraerCamposPlantilla, normalizarNombreCampo } from '../template/fields.js';
import { valoresDeFila } from '../sheets/mapper.js';
import GoogleSheetsConnector from './GoogleSheetsConnector.jsx';

const PESTANAS = [
  { id: 'elementos', label: 'Elementos', icon: 'shapes' },
  { id: 'campos', label: 'Campos', icon: 'fields' },
  { id: 'datos', label: 'Datos', icon: 'sheet' },
  { id: 'capas', label: 'Capas', icon: 'layers' },
];

const ESTILOS = `
.gp-left{width:300px;min-width:300px;height:100%;display:flex;flex-direction:column;background:#0f172a;color:#e2e8f0;border-right:1px solid #1e293b;font-family:Inter,system-ui,sans-serif;}
.gp-tabs{display:flex;border-bottom:1px solid #1e293b;}
.gp-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;background:transparent;border:0;color:#94a3b8;font-size:11px;cursor:pointer;}
.gp-tab.is-active{color:#7dd3fc;background:#1e293b;}
.gp-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px;}
.gp-title{margin:0;font-size:15px;font-weight:700;color:#f8fafc;}
.gp-hint{margin:0;font-size:12px;line-height:1.5;color:#94a3b8;}
.gp-hint code{background:#1e293b;padding:2px 5px;border-radius:4px;color:#7dd3fc;}
.gp-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:13px;font-weight:600;cursor:pointer;}
.gp-btn:hover:not(:disabled){background:#334155;}
.gp-btn:disabled{opacity:.45;cursor:not-allowed;}
.gp-btn.primary{background:#0ea5e9;border-color:#0ea5e9;color:#04121d;}
.gp-btn.primary:hover:not(:disabled){background:#38bdf8;}
.gp-row{display:flex;gap:8px;}
.gp-input,.gp-select{width:100%;padding:9px 10px;border-radius:8px;border:1px solid #334155;background:#0b1220;color:#e2e8f0;font-size:13px;}
.gp-input:focus,.gp-select:focus{outline:2px solid #0ea5e9;outline-offset:1px;}
.gp-card{border:1px solid #1e293b;border-radius:12px;padding:12px;background:#111c2e;display:flex;flex-direction:column;gap:8px;}
.gp-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.gp-card-head strong{font-size:13px;color:#f8fafc;}
.gp-badge{font-size:10px;text-transform:uppercase;letter-spacing:.06em;padding:3px 7px;border-radius:999px;background:#1e293b;color:#94a3b8;}
.gp-badge.imagen{background:#4c1d95;color:#ddd6fe;}
.gp-actions{display:flex;gap:6px;}
.gp-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid #334155;background:#0b1220;color:#cbd5f5;cursor:pointer;}
.gp-icon-btn:hover:not(:disabled){background:#334155;}
.gp-icon-btn:disabled{opacity:.4;cursor:not-allowed;}
.gp-layer{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid #1e293b;background:#111c2e;}
.gp-layer.is-selected{border-color:#0ea5e9;background:#0c2436;}
.gp-layer-name{flex:1;min-width:0;font-size:12px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gp-map{display:flex;flex-direction:column;gap:8px;}
.gp-map-row{display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;font-size:12px;color:#cbd5f5;}
.gp-summary{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px;background:#111c2e;border:1px solid #1e293b;font-size:12px;}
.gp-progress{height:6px;border-radius:999px;background:#1e293b;overflow:hidden;}
.gp-progress > div{height:100%;background:#0ea5e9;transition:width .2s ease;}
.gp-error{margin:0;color:#fca5a5;font-size:12px;}
.gp-success{margin:0;color:#86efac;font-size:12px;}
.gp-shapes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.gp-shape{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:10px;border:1px solid #1e293b;background:#111c2e;color:#cbd5f5;font-size:11px;cursor:pointer;}
.gp-shape:hover:not(:disabled){background:#1e293b;}
.gp-nav{display:flex;align-items:center;gap:6px;padding:6px;border:1px solid #1e293b;border-radius:10px;background:#111c2e;}
.gp-nav-label{flex:1;text-align:center;font-size:11px;font-weight:700;color:#e2e8f0;font-variant-numeric:tabular-nums;}
.gp-thumbs{display:flex;gap:4px;overflow-x:auto;padding:4px 2px;}
.gp-thumb{width:46px;height:34px;flex-shrink:0;border-radius:6px;border:1px solid #1e293b;background:#0b1220;display:grid;place-items:center;color:#64748b;cursor:pointer;padding:0;overflow:hidden;}
.gp-thumb.is-active{border-color:#0ea5e9;box-shadow:0 0 0 1px rgba(14,165,233,.5);}
.gp-thumb img{width:100%;height:100%;object-fit:cover;}
.gp-preview{display:flex;flex-direction:column;gap:6px;}
.gp-preview-row{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#cbd5f5;}
.gp-preview-row strong{color:#7dd3fc;font-weight:600;}
.gp-column{border:1px solid #1e293b;border-radius:10px;padding:8px 10px;background:#111c2e;}
.gp-column-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}
.gp-column-head strong{font-size:12px;color:#f8fafc;}
.gp-status{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 7px;border-radius:999px;}
.gp-status.is-mapped{background:#064e3b;color:#6ee7b7;}
.gp-status.is-suggested{background:#78350f;color:#fcd34d;}
.gp-status.is-empty{background:#1e293b;color:#94a3b8;}
.gp-column-hint{margin:0 0 6px;font-size:11px;color:#94a3b8;}
.gp-column-hint.is-suggested{color:#fcd34d;}
`;

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function buscarCoincidencia(header, nombres) {
  const columna = normalizarTexto(header);
  if (!columna) return '';
  const exacta = nombres.find((nombre) => normalizarTexto(nombre) === columna);
  if (exacta) return exacta;
  const parcial = nombres.find((nombre) => {
    const limpio = normalizarTexto(nombre);
    return limpio && (columna.includes(limpio) || limpio.includes(columna));
  });
  return parcial ?? '';
}

export default function LeftPanel({ onInsertText, onInsertRect, onInsertCircle, onInsertLine, onInsertImage, onImageUrl, onGenerarLote, onCancelarLote, onReintentarLote, onActualizarDatos, loteEstado, locked }) {
  const [pestana, setPestana] = useState('elementos');
  const [nuevoCampo, setNuevoCampo] = useState('');
  const [busquedaDraft, setBusquedaDraft] = useState('');
  const [busquedaColumna, setBusquedaColumna] = useState('');
  const template = useTemplateStore((state) => state.template);
  const fields = useTemplateStore((state) => state.fields);
  const selectedIds = useTemplateStore((state) => state.selectedIds);
  const sheets = useTemplateStore((state) => state.sheets);
  const addField = useTemplateStore((state) => state.addField);
  const removeField = useTemplateStore((state) => state.removeField);
  const renameField = useTemplateStore((state) => state.renameField);
  const setFieldDefault = useTemplateStore((state) => state.setFieldDefault);
  const setColumnField = useTemplateStore((state) => state.setColumnField);
  const setActiveRowIndex = useTemplateStore((state) => state.setActiveRowIndex);
  const selectLayer = useTemplateStore((state) => state.selectLayer);
  const renameLayer = useTemplateStore((state) => state.renameLayer);
  const toggleLayerVisible = useTemplateStore((state) => state.toggleLayerVisible);
  const toggleLayerLocked = useTemplateStore((state) => state.toggleLayerLocked);
  const reorderLayer = useTemplateStore((state) => state.reorderLayer);
  const capas = template.capas;
  const campos = useMemo(() => Object.values(fields), [fields]);
  const camposDetectados = useMemo(() => extraerCamposPlantilla({ capas }), [capas]);
  const nombresCampos = useMemo(() => {
    const nombres = new Set(camposDetectados.map((campo) => campo.nombre));
    Object.keys(fields).forEach((nombre) => nombres.add(nombre));
    return Array.from(nombres);
  }, [camposDetectados, fields]);
  const campoSeleccionado = selectedIds.length === 1 ? capas.find((capa) => capa.id === selectedIds[0]) : null;
  const progreso = loteEstado.total ? Math.round((loteEstado.actual / loteEstado.total) * 100) : 0;
  const indiceActivo = sheets.activeRowIndex ?? 0;
  const filaActiva = sheets.activeRowIndex != null ? sheets.rows[sheets.activeRowIndex] : null;
  const valoresFilaActiva = useMemo(
    () => (filaActiva ? valoresDeFila(filaActiva, sheets.headers, sheets.columnToField, fields) : {}),
    [filaActiva, sheets.headers, sheets.columnToField, fields],
  );
  const miniaturas = useMemo(() => {
    const total = sheets.rows.length;
    if (!total) return [];
    const activo = sheets.activeRowIndex ?? 0;
    const inicio = Math.max(0, Math.min(activo - 6, Math.max(0, total - 12)));
    const fin = Math.min(total, inicio + 12);
    return Array.from({ length: fin - inicio }, (_, offset) => {
      const indice = inicio + offset;
      const valores = valoresDeFila(sheets.rows[indice], sheets.headers, sheets.columnToField, fields);
      const campoImagen = camposDetectados.find((campo) => campo.tipo === 'imagen' && valores[campo.nombre]);
      return { indice, url: campoImagen ? String(valores[campoImagen.nombre]) : '', etiqueta: `Fila ${indice + 1}` };
    });
  }, [sheets.rows, sheets.activeRowIndex, sheets.headers, sheets.columnToField, fields, camposDetectados]);
  const columnasFiltradas = useMemo(() => {
    const busqueda = normalizarTexto(busquedaColumna);
    if (!busqueda) return sheets.headers;
    return sheets.headers.filter((header) => normalizarTexto(header).includes(busqueda));
  }, [busquedaColumna, sheets.headers]);
  const columnasMapeadas = Object.keys(sheets.columnToField).length;

  useEffect(() => {
    if (sheets.status === 'ready' && sheets.rows.length && sheets.activeRowIndex == null) setActiveRowIndex(0);
  }, [sheets.status, sheets.rows.length, sheets.activeRowIndex, setActiveRowIndex]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBusquedaColumna(busquedaDraft), 180);
    return () => window.clearTimeout(timer);
  }, [busquedaDraft]);

  function irAFila(indice) {
    if (locked || indice < 0 || indice >= sheets.rows.length) return;
    setActiveRowIndex(indice);
  }

  useEffect(() => {
    if (pestana !== 'datos' || locked || !sheets.rows.length) return undefined;
    function keydown(event) {
      const target = event.target;
      if (target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); irAFila(indiceActivo - 1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); irAFila(indiceActivo + 1); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [pestana, locked, sheets.rows.length, indiceActivo]);

  function agregarCampo(event) {
    event.preventDefault();
    const nombre = normalizarNombreCampo(nuevoCampo);
    if (!nombre || fields[nombre]) return;
    addField(nombre);
    setNuevoCampo('');
  }

  function mapearAutomatico() {
    sheets.headers.forEach((header) => {
      if (sheets.columnToField[header]) return;
      const coincidencia = buscarCoincidencia(header, nombresCampos);
      if (coincidencia) setColumnField(header, coincidencia);
    });
  }

  function limpiarMapeo() {
    Object.keys(sheets.columnToField).forEach((header) => setColumnField(header, ''));
  }

  return (
    <aside className="gp-left">
      <style>{ESTILOS}</style>
      <div className="gp-tabs" role="tablist">
        {PESTANAS.map((opcion) => (
          <button key={opcion.id} type="button" role="tab" aria-selected={pestana === opcion.id} className={`gp-tab ${pestana === opcion.id ? 'is-active' : ''}`} onClick={() => setPestana(opcion.id)}>
            <Icon name={opcion.icon} size={16} />
            <span>{opcion.label}</span>
          </button>
        ))}
      </div>

      <div className="gp-body">
        {pestana === 'elementos' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="gp-title">Elementos</h2>
            <p className="gp-hint">Añade contenido al lienzo.</p>
            <button type="button" className="gp-btn primary" onClick={onInsertText} disabled={locked}><Icon name="text" size={16} /><span>Añadir texto</span></button>
            <div className="gp-shapes">
              <button type="button" className="gp-shape" onClick={onInsertRect} disabled={locked}><Icon name="square" size={20} /><span>Rectángulo</span></button>
              <button type="button" className="gp-shape" onClick={onInsertCircle} disabled={locked}><Icon name="circle" size={20} /><span>Círculo</span></button>
              <button type="button" className="gp-shape" onClick={onInsertLine} disabled={locked}><Icon name="line" size={20} /><span>Línea</span></button>
            </div>
            <button type="button" className="gp-btn" onClick={onInsertImage} disabled={locked}><Icon name="image" size={16} /><span>Añadir imagen</span></button>
            <button type="button" className="gp-btn" onClick={onImageUrl} disabled={locked}><Icon name="link" size={16} /><span>Imagen desde URL</span></button>
          </section>
        )}

        {pestana === 'campos' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="gp-title">Campos</h2>
            <p className="gp-hint">Escribe <code>[nombre]</code> en el texto de una capa para crear un campo dinámico.</p>
            <form className="gp-row" onSubmit={agregarCampo}>
              <input className="gp-input" value={nuevoCampo} onChange={(event) => setNuevoCampo(event.target.value)} placeholder="nombre" aria-label="Nombre del nuevo campo" />
              <button className="gp-icon-btn" type="submit" disabled={locked || !normalizarNombreCampo(nuevoCampo) || Boolean(fields[normalizarNombreCampo(nuevoCampo)])} title="Añadir campo"><Icon name="plus" size={16} /></button>
            </form>
            <p className="gp-hint">Ejemplo: <code>[cliente]</code></p>
            {campos.map((campo) => (
              <article key={campo.nombre} className="gp-card">
                <header className="gp-card-head">
                  <strong>{campo.nombre}</strong>
                  <span className={`gp-badge ${campo.tipo}`}>{campo.tipo}</span>
                </header>
                <input className="gp-input" value={campo.defaultValue ?? ''} onChange={(event) => setFieldDefault(campo.nombre, event.target.value)} placeholder="Valor por defecto" aria-label={`Valor por defecto de ${campo.nombre}`} />
                <div className="gp-actions">
                  <button type="button" className="gp-icon-btn" title="Insertar en la capa seleccionada" disabled={locked || !campoSeleccionado} onClick={() => {
                    const capa = campoSeleccionado;
                    if (!capa) return;
                    if (capa.tipo === 'texto') useTemplateStore.getState().updateObject(capa.id, { texto: { ...capa.texto, texto: `${capa.texto?.texto ?? ''}[${campo.nombre}]` } });
                    if (capa.tipo === 'imagen') useTemplateStore.getState().updateObject(capa.id, { imagen: { ...capa.imagen, src: `[${campo.nombre}]` } });
                  }}><Icon name="plus" size={15} /></button>
                  <button type="button" className="gp-icon-btn" title="Renombrar campo" disabled={locked} onClick={() => {
                    const nombre = window.prompt('Nuevo nombre del campo', campo.nombre);
                    if (nombre) renameField(campo.nombre, normalizarNombreCampo(nombre));
                  }}><Icon name="edit" size={15} /></button>
                  <button type="button" className="gp-icon-btn" title="Eliminar campo" disabled={locked} onClick={() => removeField(campo.nombre)}><Icon name="trash" size={15} /></button>
                </div>
              </article>
            ))}
          </section>
        )}

        {pestana === 'datos' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="gp-title">Datos</h2>
            <GoogleSheetsConnector locked={locked} />
            {sheets.status === 'ready' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="gp-summary">
                  <strong>{sheets.title || 'Hoja conectada'}</strong>
                  <span>{columnasMapeadas}/{sheets.headers.length} mapeadas</span>
                </div>
                <input className="gp-input" type="search" placeholder="Buscar columna…" value={busquedaDraft} onChange={(event) => setBusquedaDraft(event.target.value)} aria-label="Buscar columna" />
                <div className="gp-row">
                  <button type="button" className="gp-btn" onClick={mapearAutomatico} disabled={locked || !nombresCampos.length} title="Mapear columnas con coincidencias"><Icon name="sparkle" size={15} /><span>Mapeo automático</span></button>
                  <button type="button" className="gp-btn" onClick={limpiarMapeo} disabled={locked || !columnasMapeadas} title="Limpiar mapeo"><Icon name="close" size={15} /><span>Limpiar</span></button>
                </div>
                <div className="gp-map">
                  {columnasFiltradas.map((header) => {
                    const campo = sheets.columnToField[header];
                    const sugerido = !campo ? buscarCoincidencia(header, nombresCampos) : '';
                    const estado = campo ? 'is-mapped' : (sugerido ? 'is-suggested' : 'is-empty');
                    const etiqueta = campo ? 'Mapeada' : (sugerido ? 'Sugerida' : 'Sin mapear');
                    return (
                      <div key={header} className="gp-column">
                        <div className="gp-column-head">
                          <strong>{header}</strong>
                          <span className={`gp-status ${estado}`}>{etiqueta}</span>
                        </div>
                        {sugerido && <p className="gp-column-hint is-suggested">Coincidencia sugerida: [{sugerido}]</p>}
                        <select className="gp-select" value={campo ?? ''} disabled={locked} onChange={(event) => setColumnField(header, event.target.value)} aria-label={`Campo para la columna ${header}`}>
                          <option value="">Sin mapear</option>
                          {nombresCampos.map((nombre) => <option key={nombre} value={nombre}>{`[${nombre}]`}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  {columnasFiltradas.length === 0 && <p className="gp-hint">No hay columnas que coincidan con la búsqueda.</p>}
                </div>
                <div className="gp-nav">
                  <button type="button" className="gp-icon-btn" title="Fila anterior (←)" disabled={locked || indiceActivo <= 0} onClick={() => irAFila(indiceActivo - 1)}>←</button>
                  <span className="gp-nav-label">Fila {indiceActivo + 1} de {sheets.rows.length}</span>
                  <button type="button" className="gp-icon-btn" title="Fila siguiente (→)" disabled={locked || indiceActivo >= sheets.rows.length - 1} onClick={() => irAFila(indiceActivo + 1)}>→</button>
                </div>
                <div className="gp-thumbs" role="listbox" aria-label="Miniaturas de filas">
                  {miniaturas.map((miniatura) => (
                    <button key={miniatura.indice} type="button" role="option" aria-selected={miniatura.indice === indiceActivo} className={`gp-thumb ${miniatura.indice === indiceActivo ? 'is-active' : ''}`} title={miniatura.etiqueta} disabled={locked} onClick={() => irAFila(miniatura.indice)}>
                      {miniatura.url ? <img src={miniatura.url} alt="" /> : <Icon name="image" size={14} />}
                    </button>
                  ))}
                </div>
                {filaActiva && (
                  <div className="gp-card gp-preview">
                    <div className="gp-card-head"><strong>Vista previa</strong><span className="gp-badge">Fila {indiceActivo + 1}</span></div>
                    {nombresCampos.map((nombre) => (
                      <div key={nombre} className="gp-preview-row">
                        <strong>{`[${nombre}]`}</strong>
                        <span>{String(valoresFilaActiva[nombre] ?? '') || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="gp-btn" onClick={onActualizarDatos}><Icon name="refresh" size={16} /><span>Actualizar datos</span></button>
                <button type="button" className="gp-btn primary" onClick={onGenerarLote} disabled={locked}><Icon name="download" size={16} /><span>Generar lote</span></button>
              </div>
            )}
            {loteEstado.estado !== 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loteEstado.estado === 'generando' && (
                  <>
                    <div className="gp-progress"><div style={{ width: `${progreso}%` }} /></div>
                    <p className="gp-hint">{loteEstado.actual} / {loteEstado.total} imágenes</p>
                    <button type="button" className="gp-btn" onClick={onCancelarLote}>Cancelar</button>
                  </>
                )}
                {loteEstado.estado === 'listo' && <p className="gp-success">Listo: {loteEstado.exitosos} de {loteEstado.total} imágenes.</p>}
                {loteEstado.estado === 'error' && <p className="gp-error">{loteEstado.error}</p>}
                {loteEstado.fallidos.length > 0 && loteEstado.estado !== 'generando' && (
                  <button type="button" className="gp-btn" onClick={() => onReintentarLote(loteEstado.fallidos.map((fila) => fila - 1))}><Icon name="refresh" size={16} /><span>Reintentar {loteEstado.fallidos.length} fila(s)</span></button>
                )}
              </div>
            )}
          </section>
        )}

        {pestana === 'capas' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="gp-title">Capas</h2>
            <p className="gp-hint">Selecciona, renombra, oculta, bloquea o reordena los elementos.</p>
            {capas.map((capa) => (
              <div key={capa.id} className={`gp-layer ${selectedIds.includes(capa.id) ? 'is-selected' : ''}`}>
                <button type="button" className="gp-icon-btn" title={capa.visible ? 'Ocultar' : 'Mostrar'} onClick={() => toggleLayerVisible(capa.id)}>{capa.visible ? '👁' : '🚫'}</button>
                <button type="button" className="gp-icon-btn" title={capa.bloqueada ? 'Desbloquear' : 'Bloquear'} onClick={() => toggleLayerLocked(capa.id)}>{capa.bloqueada ? '🔓' : '🔒'}</button>
                <button type="button" className="gp-layer-name" style={{ background: 'transparent', border: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', padding: 0 }} onClick={() => selectLayer(capa.id)} onDoubleClick={() => {
                  const nombre = window.prompt('Nuevo nombre de la capa', capa.nombre);
                  if (nombre) renameLayer(capa.id, nombre);
                }} title="Clic para seleccionar; doble clic para renombrar">{capa.nombre}</button>
                <button type="button" className="gp-icon-btn" title="Subir" disabled={locked} onClick={() => reorderLayer(capas.findIndex((item) => item.id === capa.id), Math.min(capas.length - 1, capas.findIndex((item) => item.id === capa.id) + 1))}>↑</button>
                <button type="button" className="gp-icon-btn" title="Bajar" disabled={locked} onClick={() => reorderLayer(capas.findIndex((item) => item.id === capa.id), Math.max(0, capas.findIndex((item) => item.id === capa.id) - 1))}>↓</button>
              </div>
            ))}
            {capas.length === 0 && <p className="gp-hint">Todavía no hay capas en el lienzo.</p>}
          </section>
        )}
      </div>
    </aside>
  );
}
