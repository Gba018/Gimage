import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { normalizarNombreCampo } from '../template/fields.js';

const OPCIONES_FUENTE = [
  { id: 'texto', label: 'Texto', icon: 'text' },
  { id: 'formas', label: 'Formas', icon: 'shapes' },
  { id: 'imagen', label: 'Imagen', icon: 'image' },
  { id: 'campos', label: 'Campos', icon: 'fields' },
  { id: 'hoja', label: 'Hoja', icon: 'sheet' },
];

export default function LeftPanel({ onInsertText, onInsertRect, onInsertCircle, onInsertLine, onInsertImage, onImageUrl, onGenerarLote, onCancelarLote, onReintentarLote, onActualizarDatos, loteEstado, locked }) {
  const [fuente, setFuente] = useState('texto');
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
  const setSheetStatus = useTemplateStore((state) => state.setSheetStatus);
  const setSheetsConfig = useTemplateStore((state) => state.setSheetsConfig);
  const connectSheet = useTemplateStore((state) => state.connectSheet);
  const [sheetUrl, setSheetUrl] = useState(sheets.spreadsheetId || '');
  const campos = useMemo(() => Object.values(fields), [fields]);
  const campoSeleccionado = selectedIds.length === 1 ? template.capas.find((capa) => capa.id === selectedIds[0]) : null;
  const progreso = loteEstado.total ? Math.round((loteEstado.actual / loteEstado.total) * 100) : 0;

  useEffect(() => {
    function actualizar() { connectSheet().catch(() => setSheetStatus('error')); }
    window.addEventListener('gimage:actualizar-sheets', actualizar);
    return () => window.removeEventListener('gimage:actualizar-sheets', actualizar);
  }, [connectSheet, setSheetStatus]);

  function agregarCampo(event) {
    event.preventDefault();
    const nombre = normalizarNombreCampo(nuevoCampo);
    if (!nombre || fields[nombre]) return;
    addField(nombre);
    setNuevoCampo('');
  }

  function conectarHoja() {
    setSheetsConfig({ spreadsheetId: sheetUrl.trim() });
    window.setTimeout(() => { connectSheet().catch(() => setSheetStatus('error')); }, 0);
  }

  return (
    <aside className="left-panel">
      <div className="panel-tabs" role="tablist" aria-label="Fuentes de capas y datos">
        {OPCIONES_FUENTE.map((opcion) => (
          <button key={opcion.id} type="button" role="tab" aria-selected={fuente === opcion.id} className={`panel-tab ${fuente === opcion.id ? 'is-active' : ''}`} onClick={() => setFuente(opcion.id)}>
            <Icon name={opcion.icon} size={16} />
            <span>{opcion.label}</span>
          </button>
        ))}
      </div>

      {fuente === 'texto' && (
        <section className="panel-section">
          <h2>Texto</h2>
          <p>Añade un cuadro de texto editable al lienzo.</p>
          <button type="button" className="primary-action" onClick={onInsertText} disabled={locked}><Icon name="plus" size={16} /><span>Añadir texto</span></button>
        </section>
      )}

      {fuente === 'formas' && (
        <section className="panel-section">
          <h2>Formas</h2>
          <div className="shape-grid">
            <button type="button" onClick={onInsertRect} disabled={locked}><Icon name="square" size={20} /><span>Rectángulo</span></button>
            <button type="button" onClick={onInsertCircle} disabled={locked}><Icon name="circle" size={20} /><span>Círculo</span></button>
            <button type="button" onClick={onInsertLine} disabled={locked}><Icon name="line" size={20} /><span>Línea</span></button>
          </div>
        </section>
      )}

      {fuente === 'imagen' && (
        <section className="panel-section">
          <h2>Imagen</h2>
          <p>Usa un archivo local o una URL directa.</p>
          <div className="stack">
            <button type="button" className="secondary-action" onClick={onInsertImage} disabled={locked}><Icon name="image" size={16} /><span>Añadir imagen</span></button>
            <button type="button" className="secondary-action" onClick={onImageUrl} disabled={locked}><Icon name="link" size={16} /><span>Desde URL</span></button>
          </div>
        </section>
      )}

      {fuente === 'campos' && (
        <section className="panel-section">
          <h2>Campos</h2>
          <p>Escribe <code>[nombre]</code> en el texto de una capa para crear un campo dinámico.</p>
          <form className="field-form" onSubmit={agregarCampo}>
            <input value={nuevoCampo} onChange={(event) => setNuevoCampo(event.target.value)} placeholder="nombre" aria-label="Nombre del nuevo campo" />
            <button type="submit" disabled={locked || !normalizarNombreCampo(nuevoCampo) || Boolean(fields[normalizarNombreCampo(nuevoCampo)])}><Icon name="plus" size={16} /></button>
          </form>
          <p className="hint">Ejemplo: <code>[cliente]</code></p>
          <div className="field-list">
            {campos.map((campo) => (
              <article key={campo.nombre} className="field-card">
                <header>
                  <strong>{campo.nombre}</strong>
                  <span className={`badge ${campo.tipo}`}>{campo.tipo}</span>
                </header>
                <input value={campo.defaultValue ?? ''} onChange={(event) => setFieldDefault(campo.nombre, event.target.value)} placeholder="Valor por defecto" aria-label={`Valor por defecto de ${campo.nombre}`} />
                <div className="field-actions">
                  <button type="button" onClick={() => {
                    const capa = campoSeleccionado;
                    if (!capa) return;
                    if (capa.tipo === 'texto') useTemplateStore.getState().updateObject(capa.id, { texto: { ...capa.texto, texto: `${capa.texto?.texto ?? ''}[${campo.nombre}]` } });
                    if (capa.tipo === 'imagen') useTemplateStore.getState().updateObject(capa.id, { imagen: { ...capa.imagen, src: `[${campo.nombre}]` } });
                  }} disabled={locked || !campoSeleccionado} title="Insertar en la capa seleccionada"><Icon name="plus" size={16} /></button>
                  <button type="button" onClick={() => {
                    const nombre = window.prompt('Nuevo nombre del campo', campo.nombre);
                    if (nombre) renameField(campo.nombre, normalizarNombreCampo(nombre));
                  }} disabled={locked} title="Renombrar campo"><Icon name="edit" size={16} /></button>
                  <button type="button" onClick={() => removeField(campo.nombre)} disabled={locked} title="Eliminar campo"><Icon name="trash" size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {fuente === 'hoja' && (
        <section className="panel-section">
          <h2>Hoja de cálculo</h2>
          {sheets.status === 'disconnected' && (
            <div className="stack">
              <p>Pega la URL de una hoja de Google Sheets publicada o accesible.</p>
              <input value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/..." aria-label="URL de Google Sheets" />
              <button type="button" className="primary-action" onClick={conectarHoja}><Icon name="sheet" size={16} /><span>Conectar hoja</span></button>
            </div>
          )}
          {sheets.status === 'loading' && <p>Cargando hoja…</p>}
          {sheets.status === 'error' && <p className="error-text">No se pudo cargar la hoja. Revisa que sea pública o que tengas acceso.</p>}
          {sheets.status === 'ready' && (
            <div className="stack">
              <div className="sheet-summary">
                <strong>{sheets.title}</strong>
                <span>{sheets.rows.length} filas</span>
              </div>
              <div className="mapping-list">
                {sheets.headers.map((columna) => (
                  <label key={columna} className="mapping-row">
                    <span>{columna}</span>
                    <select value={sheets.columnToField[columna] ?? ''} onChange={(event) => setColumnField(columna, event.target.value)}>
                      <option value="">Sin mapear</option>
                      {campos.map((campo) => <option key={campo.nombre} value={campo.nombre}>{`[${campo.nombre}]`}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <label className="mapping-row">
                <span>Fila activa</span>
                <select value={sheets.activeRowIndex} onChange={(event) => setActiveRowIndex(Number(event.target.value))}>
                  {sheets.rows.map((_, indice) => <option key={indice} value={indice}>{indice + 1}</option>)}
                </select>
              </label>
              <div className="stack">
                <button type="button" className="secondary-action" onClick={() => connectSheet().catch(() => setSheetStatus('error'))}><Icon name="refresh" size={16} /><span>Actualizar datos</span></button>
                <button type="button" className="primary-action" onClick={onGenerarLote} disabled={locked}><Icon name="download" size={16} /><span>Generar lote</span></button>
              </div>
            </div>
          )}
          {loteEstado.estado !== 'idle' && (
            <div className="batch-status">
              {loteEstado.estado === 'generando' && (
                <>
                  <div className="progress"><div style={{ width: `${progreso}%` }} /></div>
                  <p>{loteEstado.actual} / {loteEstado.total} imágenes</p>
                  <button type="button" onClick={onCancelarLote}>Cancelar</button>
                </>
              )}
              {loteEstado.estado === 'listo' && <p className="success-text">Listo: {loteEstado.exitosos} de {loteEstado.total} imágenes.</p>}
              {loteEstado.estado === 'error' && <p className="error-text">{loteEstado.error}</p>}
              {loteEstado.fallidos.length > 0 && loteEstado.estado !== 'generando' && (
                <button type="button" className="secondary-action" onClick={() => onReintentarLote(loteEstado.fallidos.map((fila) => fila - 1))}><Icon name="refresh" size={16} /><span>Reintentar {loteEstado.fallidos.length} fila(s)</span></button>
              )}
            </div>
          )}
        </section>
      )}
    </aside>
  );
}
