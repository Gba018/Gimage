import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { normalizarNombreCampo } from '../template/fields.js';

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
`;

export default function LeftPanel({ onInsertText, onInsertRect, onInsertCircle, onInsertLine, onInsertImage, onImageUrl, onGenerarLote, onCancelarLote, onReintentarLote, loteEstado, locked }) {
  const [pestana, setPestana] = useState('elementos');
  const [nuevoCampo, setNuevoCampo] = useState('');
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
  const setSheetsConfig = useTemplateStore((state) => state.setSheetsConfig);
  const connectSheet = useTemplateStore((state) => state.connectSheet);
  const [sheetUrl, setSheetUrl] = useState(sheets.spreadsheetId || '');
  const campos = useMemo(() => Object.values(fields), [fields]);
  const capas = template.capas;
  const campoSeleccionado = selectedIds.length === 1 ? capas.find((capa) => capa.id === selectedIds[0]) : null;
  const progreso = loteEstado.total ? Math.round((loteEstado.actual / loteEstado.total) * 100) : 0;
  const sinConexion = sheets.status === 'idle' || sheets.status === 'disconnected';

  useEffect(() => {
    function actualizar() { connectSheet().catch(() => {}); }
    window.addEventListener('gimage:actualizar-sheets', actualizar);
    return () => window.removeEventListener('gimage:actualizar-sheets', actualizar);
  }, [connectSheet]);

  function agregarCampo(event) {
    event.preventDefault();
    const nombre = normalizarNombreCampo(nuevoCampo);
    if (!nombre || fields[nombre]) return;
    addField(nombre);
    setNuevoCampo('');
  }

  function conectarHoja() {
    setSheetsConfig({ spreadsheetId: sheetUrl.trim() });
    window.setTimeout(() => { connectSheet().catch(() => {}); }, 0);
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
            {sinConexion && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="gp-hint">Pega la URL de una hoja de Google Sheets publicada o accesible.</p>
                <input className="gp-input" value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/..." aria-label="URL de Google Sheets" />
                <button type="button" className="gp-btn primary" onClick={conectarHoja}><Icon name="sheet" size={16} /><span>Conectar hoja</span></button>
              </div>
            )}
            {sheets.status === 'loading' && <p className="gp-hint">Cargando hoja…</p>}
            {sheets.status === 'error' && <p className="gp-error">No se pudo cargar la hoja. Revisa que sea pública o que tengas acceso.</p>}
            {sheets.status === 'ready' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="gp-summary">
                  <strong>{sheets.title}</strong>
                  <span>{sheets.rows.length} filas</span>
                </div>
                <div className="gp-map">
                  {sheets.headers.map((columna) => (
                    <label key={columna} className="gp-map-row">
                      <span>{columna}</span>
                      <select className="gp-select" value={sheets.columnToField[columna] ?? ''} onChange={(event) => setColumnField(columna, event.target.value)}>
                        <option value="">Sin mapear</option>
                        {campos.map((campo) => <option key={campo.nombre} value={campo.nombre}>{`[${campo.nombre}]`}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <label className="gp-map-row">
                  <span>Fila activa</span>
                  <select className="gp-select" value={sheets.activeRowIndex} onChange={(event) => setActiveRowIndex(Number(event.target.value))}>
                    {sheets.rows.map((_, indice) => <option key={indice} value={indice}>{indice + 1}</option>)}
                  </select>
                </label>
                <button type="button" className="gp-btn" onClick={() => connectSheet().catch(() => {})}><Icon name="refresh" size={16} /><span>Actualizar datos</span></button>
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
