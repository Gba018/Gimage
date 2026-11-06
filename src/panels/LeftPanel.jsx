import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { esFillDegradado, fillACss } from '../template/schema.js';
import { extraerCamposPlantilla } from '../template/fields.js';
import GoogleSheetsConnector from './GoogleSheetsConnector.jsx';

function InsertCard({ icon, title, description, onClick, label, disabled }) {
  return (
    <button type="button" className="insert-card" onClick={onClick} aria-label={label} title={label} disabled={disabled}>
      <span className={`insert-icon insert-icon-${icon}`}><Icon name={icon} size={18} /></span>
      <span className="insert-copy"><strong>{title}</strong><small>{description}</small></span>
      <span className="insert-plus"><Icon name="plus" size={15} /></span>
    </button>
  );
}

const ICONO_POR_TIPO = { rect: 'square', circulo: 'circle', linea: 'line', texto: 'text', imagen: 'image' };

function muestraCapaCss(capa) {
  if (capa.tipo === 'rect') return fillACss(capa.rect.fill);
  if (capa.tipo === 'circulo') return fillACss(capa.circulo.fill);
  if (capa.tipo === 'texto') return fillACss(capa.texto.fill);
  if (capa.tipo === 'linea') return capa.linea.stroke?.color || '#1f2b23';
  return null;
}

function FieldRow({ campo, valorDefecto, onCambiarValor, onRenombrar, onEliminar, onAplicarAImagen, onInsertarEnTexto, puedeAplicarAImagen, puedeInsertarEnTexto }) {
  const [editando, setEditando] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(campo.nombre);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);

  function confirmarRenombrado() {
    onRenombrar(nombreDraft);
    setEditando(false);
  }

  return (
    <li className="layer-row field-row" data-testid={`field-item-${campo.nombre}`}>
      <span className="layer-type-badge" aria-hidden="true"><Icon name={campo.tipo === 'imagen' ? 'image' : 'text'} size={13} /></span>
      <div className="layer-title-cell">
        {editando ? (
          <input ref={inputRef} type="text" className="layer-rename-input" aria-label="Nuevo nombre del campo" value={nombreDraft} onChange={(event) => setNombreDraft(event.target.value)} onBlur={confirmarRenombrado} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); confirmarRenombrado(); } else if (event.key === 'Escape') { event.preventDefault(); setEditando(false); setNombreDraft(campo.nombre); } }} />
        ) : (
          <span className="layer-name" title={`${campo.usos.length} uso(s)`}>{`{{${campo.nombre}}}`}</span>
        )}
        <small className="layer-pos-tag">{campo.tipo === 'imagen' ? 'Imagen' : 'Texto'} · {campo.usos.length} uso(s)</small>
      </div>
      <div className="field-controls">
        <input type="text" className="layer-rename-input" aria-label={`Valor por defecto para ${campo.nombre}`} placeholder={campo.tipo === 'imagen' ? 'URL o dataURL' : 'Valor por defecto'} value={valorDefecto} onChange={(event) => onCambiarValor(event.target.value)} />
        <div className="field-actions">
          <button type="button" className="layer-icon-btn" aria-label={`Renombrar campo ${campo.nombre}`} title="Renombrar campo" onClick={() => { setNombreDraft(campo.nombre); setEditando(true); }}><Icon name="text" size={14} /></button>
          {campo.tipo === 'imagen' && <button type="button" className="layer-icon-btn" aria-label={`Usar ${campo.nombre} en la imagen seleccionada`} title="Usar en imagen seleccionada" disabled={!puedeAplicarAImagen} onClick={onAplicarAImagen}><Icon name="image" size={14} /></button>}
          {campo.tipo === 'texto' && <button type="button" className="layer-icon-btn" aria-label={`Insertar ${campo.nombre} en el texto seleccionado`} title="Insertar en texto seleccionado" disabled={!puedeInsertarEnTexto} onClick={onInsertarEnTexto}><Icon name="plus" size={14} /></button>}
          <button type="button" className="layer-icon-btn is-danger" aria-label={`Eliminar campo ${campo.nombre}`} title="Eliminar campo" onClick={onEliminar}><Icon name="trash" size={14} /></button>
        </div>
      </div>
    </li>
  );
}

export default function LeftPanel({ onInsertText, onInsertRect, onInsertCircle, onInsertLine, onInsertImage, onImageUrl, onGenerarLote, onCancelarLote, loteEstado, locked = false }) {
  const canvas = useTemplateStore((state) => state.template.canvas);
  const capas = useTemplateStore((state) => state.template.capas);
  const fields = useTemplateStore((state) => state.fields);
  const selectedIds = useTemplateStore((state) => state.selectedIds);
  const selectLayer = useTemplateStore((state) => state.selectLayer);
  const renameLayer = useTemplateStore((state) => state.renameLayer);
  const toggleLayerVisible = useTemplateStore((state) => state.toggleLayerVisible);
  const toggleLayerLocked = useTemplateStore((state) => state.toggleLayerLocked);
  const reorderLayer = useTemplateStore((state) => state.reorderLayer);
  const moveSelectedForward = useTemplateStore((state) => state.moveSelectedForward);
  const moveSelectedBackward = useTemplateStore((state) => state.moveSelectedBackward);
  const duplicateSelected = useTemplateStore((state) => state.duplicateSelected);
  const deleteSelected = useTemplateStore((state) => state.deleteSelected);
  const setFieldDefault = useTemplateStore((state) => state.setFieldDefault);
  const renameField = useTemplateStore((state) => state.renameField);
  const removeField = useTemplateStore((state) => state.removeField);
  const updateObject = useTemplateStore((state) => state.updateObject);
  const sheets = useTemplateStore((state) => state.sheets);
  const mapColumnToField = useTemplateStore((state) => state.mapColumnToField);
  const setActiveRowIndex = useTemplateStore((state) => state.setActiveRowIndex);
  const disconnectSheet = useTemplateStore((state) => state.disconnectSheet);

  const [tab, setTab] = useState('objetos');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const renameInputRef = useRef(null);

  const camposDetectados = useMemo(() => extraerCamposPlantilla({ capas }), [capas]);
  const capaSeleccionada = useMemo(() => (selectedIds.length === 1 ? capas.find((capa) => capa.id === selectedIds[0]) || null : null), [capas, selectedIds]);
  const columnasMapeadas = Object.keys(sheets.columnToField).length;
  const puedeGenerarLote = sheets.status === 'ready' && sheets.rows.length > 0 && columnasMapeadas > 0;
  const generando = loteEstado.estado === 'generando';

  useEffect(() => {
    if (editingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingId]);

  function iniciarRenombrado(capa) {
    setEditingId(capa.id);
    setEditingName(capa.nombre);
  }

  function confirmarRenombrado() {
    if (editingId) {
      const limpio = editingName.trim();
      if (limpio) renameLayer(editingId, limpio);
    }
    setEditingId(null);
  }

  const haySeleccion = selectedIds.length > 0;
  const algunaDesbloqueada = capas.some((capa) => selectedIds.includes(capa.id) && !capa.bloqueada);
  const puedeBajar = haySeleccion && capas.some((capa, idx) => idx > 0 && selectedIds.includes(capa.id) && !selectedIds.includes(capas[idx - 1].id));
  const puedeSubir = haySeleccion && capas.some((capa, idx) => idx < capas.length - 1 && selectedIds.includes(capa.id) && !selectedIds.includes(capas[idx + 1].id));

  return (
    <aside className="sidebar" aria-label="Herramientas, campos, datos y capas">
      <div className="sidebar-tabs" role="tablist" aria-label="Secciones del panel izquierdo">
        <button type="button" role="tab" aria-selected={tab === 'objetos'} className={`sidebar-tab ${tab === 'objetos' ? 'is-active' : ''}`} onClick={() => setTab('objetos')}><Icon name="plus" size={14} /><span>Elementos</span></button>
        <button type="button" role="tab" aria-selected={tab === 'campos'} className={`sidebar-tab ${tab === 'campos' ? 'is-active' : ''}`} onClick={() => setTab('campos')}><Icon name="sparkle" size={14} /><span>Campos</span><em className="layers-count">{camposDetectados.length}</em></button>
        <button type="button" role="tab" aria-selected={tab === 'datos'} className={`sidebar-tab ${tab === 'datos' ? 'is-active' : ''}`} onClick={() => setTab('datos')}><Icon name="link" size={14} /><span>Datos</span></button>
        <button type="button" role="tab" aria-selected={tab === 'capas'} className={`sidebar-tab ${tab === 'capas' ? 'is-active' : ''}`} onClick={() => setTab('capas')}><Icon name="layers" size={14} /><span>Capas</span><em className="layers-count">{capas.length}</em></button>
      </div>

      {tab === 'objetos' && (
        <>
          <div className="section-heading"><span>INSERTAR</span><span>01 — 05</span></div>
          <p className="section-description">Elige qué elemento agregar al lienzo.</p>
          <div className="insert-list">
            <InsertCard icon="text" title="Texto" description="Títulos o párrafos" onClick={onInsertText} label="Añadir texto" disabled={locked} />
            <InsertCard icon="square" title="Rectángulo" description="Caja o tarjeta" onClick={onInsertRect} label="Añadir rectángulo" disabled={locked} />
            <InsertCard icon="circle" title="Círculo" description="Sello o insignia" onClick={onInsertCircle} label="Añadir círculo" disabled={locked} />
            <InsertCard icon="line" title="Línea" description="Separador o trazo" onClick={onInsertLine} label="Añadir línea" disabled={locked} />
            <InsertCard icon="image" title="Imagen" description="Sube un archivo" onClick={onInsertImage} label="Subir imagen" disabled={locked} />
          </div>
          <button type="button" className="image-url-link" onClick={onImageUrl} aria-label="Pegar URL de imagen" title="Pegar URL de imagen" disabled={locked}><Icon name="link" size={14} /><span>O pega una URL de imagen</span><Icon name="arrowUpRight" size={13} /></button>
          <div className="sidebar-rule details-rule" />
          <div className="section-heading"><span>LIENZO ACTUAL</span><Icon name="sliders" size={14} /></div>
          <div className="document-details">
            <div className="document-icon"><Icon name="square" size={18} /></div>
            <div><strong>{canvas.width} × {canvas.height} px</strong><small>{esFillDegradado(canvas.background.fill) ? 'Fondo degradado' : 'Fondo sólido'} <i style={{ background: fillACss(canvas.background.fill) }} /></small></div>
          </div>
          <div className="sidebar-bottom">
            <div className="shortcut-card"><span className="shortcut-icon"><Icon name="sparkle" size={17} /></span><div><strong>Atajos útiles</strong><p><kbd>Ctrl+Z</kbd> deshacer · <kbd>Ctrl+[</kbd> / <kbd>Ctrl+]</kbd> orden</p></div></div>
            <div className="sidebar-footer"><span><i /> MODO DISEÑO</span><span>EN MEMORIA</span></div>
          </div>
        </>
      )}

      {tab === 'campos' && (
        <div className="fields-panel" data-testid="fields-panel">
          <div className="section-heading"><span>CAMPOS DINÁMICOS</span><span>04</span></div>
          <p className="section-description">Escribe <code>{'{{nombre}}'}</code> en un texto o usa un campo en una imagen para crearlo.</p>
          {camposDetectados.length === 0 ? (
            <div className="layers-empty"><Icon name="sparkle" size={22} /><strong>Sin campos todavía</strong><p>Añade tokens como <code>{'{{cliente}}'}</code> al contenido de un texto.</p></div>
          ) : (
            <ul className="layers-list" aria-label="Lista de campos dinámicos">
              {camposDetectados.map((campo) => (
                <FieldRow key={campo.nombre} campo={campo} valorDefecto={fields[campo.nombre]?.defaultValue ?? ''} onCambiarValor={(valor) => setFieldDefault(campo.nombre, valor)} onRenombrar={(nuevoNombre) => renameField(campo.nombre, nuevoNombre)} onEliminar={() => removeField(campo.nombre)} puedeAplicarAImagen={capaSeleccionada?.tipo === 'imagen' && !capaSeleccionada.bloqueada} puedeInsertarEnTexto={capaSeleccionada?.tipo === 'texto' && !capaSeleccionada.bloqueada} onAplicarAImagen={() => { if (!capaSeleccionada || capaSeleccionada.tipo !== 'imagen') return; updateObject(capaSeleccionada.id, { imagen: { ...capaSeleccionada.imagen, src: `{{${campo.nombre}}}` } }, { historyKey: `field:${campo.nombre}:aplicar-imagen` }); }} onInsertarEnTexto={() => { if (!capaSeleccionada || capaSeleccionada.tipo !== 'texto') return; const actual = capaSeleccionada.texto.texto || ''; updateObject(capaSeleccionada.id, { texto: { ...capaSeleccionada.texto, texto: actual ? `${actual} {{${campo.nombre}}}` : `{{${campo.nombre}}}` } }, { historyKey: `field:${campo.nombre}:insertar-texto` }); }} />
              ))}
            </ul>
          )}
          <div className="sidebar-bottom"><div className="shortcut-card"><span className="shortcut-icon"><Icon name="sparkle" size={17} /></span><div><strong>Campos</strong><p>El valor por defecto se usa solo como vista previa; el token permanece en la plantilla.</p></div></div></div>
        </div>
      )}

      {tab === 'datos' && (
        <div className="sheets-panel" data-testid="sheets-panel">
          <div className="section-heading"><span>GOOGLE SHEETS</span><span>05 — 09</span></div>
          <p className="section-description">Inicia sesión con Google, elige una hoja de tu Drive, mapea columnas y genera un lote.</p>
          <GoogleSheetsConnector locked={locked} />

          {sheets.status === 'ready' && (
            <>
              <div className="section-heading"><span>COLUMNAS</span><span>{sheets.rows.length} filas</span></div>
              {sheets.headers.length === 0 ? (
                <div className="layers-empty"><Icon name="link" size={20} /><strong>Sin columnas</strong><p>La hoja no tiene encabezados en el rango indicado.</p></div>
              ) : (
                <ul className="layers-list" aria-label="Mapeo de columnas a campos">
                  {sheets.headers.map((header) => (
                    <li key={header} className="layer-row" data-testid={`sheet-column-${header}`}>
                      <div className="layer-title-cell"><span className="layer-name">{header}</span></div>
                      <div className="field-controls">
                        <select className="layer-rename-input" aria-label={`Campo para la columna ${header}`} value={sheets.columnToField[header] ?? ''} disabled={locked} onChange={(event) => mapColumnToField(header, event.target.value || null)}>
                          <option value="">Sin mapear</option>
                          {camposDetectados.map((campo) => (<option key={campo.nombre} value={campo.nombre}>{`{{${campo.nombre}}}`}</option>))}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="section-heading"><span>VISTA PREVIA</span><span>06</span></div>
              <label className="prop-sub-label" htmlFor="sheets-preview-row">Fila activa</label>
              <select id="sheets-preview-row" className="layer-rename-input" data-testid="sheets-preview-row" value={sheets.activeRowIndex ?? ''} onChange={(event) => setActiveRowIndex(event.target.value === '' ? null : Number(event.target.value))}>
                <option value="">Sin vista previa</option>
                {sheets.rows.map((_, indice) => (<option key={indice} value={indice}>{`Fila ${indice + 1}`}</option>))}
              </select>
              <p className="section-description">La fila seleccionada reemplaza temporalmente los campos en el lienzo; no cambia la plantilla.</p>

              <div className="section-heading"><span>RENDER MASIVO</span><span>09</span></div>
              <button type="button" className="image-url-link" data-testid="generar-lote" disabled={!puedeGenerarLote || generando} onClick={onGenerarLote}><Icon name="layers" size={14} /><span>{generando ? `Generando ${loteEstado.actual}/${loteEstado.total}…` : `Generar ${sheets.rows.length} imágenes`}</span></button>
              {generando && (
                <>
                  <div className="layers-order-hint"><span>{loteEstado.actual} de {loteEstado.total}</span><button type="button" className="layer-icon-btn is-danger" onClick={onCancelarLote} aria-label="Cancelar generación del lote" title="Cancelar"><Icon name="close" size={14} /></button></div>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }} role="progressbar" aria-valuemin={0} aria-valuemax={loteEstado.total} aria-valuenow={loteEstado.actual}><div style={{ width: `${loteEstado.total ? Math.round((loteEstado.actual / loteEstado.total) * 100) : 0}%`, height: '100%', background: '#7c5cff' }} /></div>
                </>
              )}
              {loteEstado.estado === 'listo' && (<div className="layers-empty" role="status"><Icon name="check" size={20} /><strong>Lote descargado</strong><p>{loteEstado.exitosos} imagen(es) generadas.{loteEstado.fallidos.length > 0 && ` Fallaron: fila ${loteEstado.fallidos.join(', fila ')}.`}</p></div>)}
              {loteEstado.estado === 'error' && (<div className="layers-empty" role="alert"><Icon name="info" size={20} /><strong>No se pudo generar el lote</strong><p>{loteEstado.error}</p></div>)}

              <button type="button" className="image-url-link" onClick={disconnectSheet} disabled={locked}><Icon name="close" size={14} /><span>Desconectar hoja</span></button>
            </>
          )}
        </div>
      )}

      {tab === 'capas' && (
        <div className="layers-panel" data-testid="layers-panel">
          <div className="layers-toolbar" role="toolbar" aria-label="Acciones de capas">
            <button type="button" className="layer-tool-btn" aria-label="Enviar capa hacia el fondo" title="Enviar hacia el fondo (Ctrl+[)" disabled={!puedeBajar || locked} onClick={moveSelectedBackward}><Icon name="arrowUp" size={14} /></button>
            <button type="button" className="layer-tool-btn" aria-label="Traer capa hacia el frente" title="Traer hacia el frente (Ctrl+])" disabled={!puedeSubir || locked} onClick={moveSelectedForward}><Icon name="arrowDown" size={14} /></button>
            <div className="layers-toolbar-sep" />
            <button type="button" className="layer-tool-btn" aria-label="Duplicar capa" title="Duplicar (Ctrl+D)" disabled={!algunaDesbloqueada || locked} onClick={duplicateSelected}><Icon name="copy" size={14} /></button>
            <button type="button" className="layer-tool-btn is-danger" aria-label="Eliminar capa" title="Eliminar (Supr)" disabled={!algunaDesbloqueada || locked} onClick={deleteSelected}><Icon name="trash" size={14} /></button>
          </div>
          <div className="layers-order-hint"><span>1.ª = Fondo</span><span>Última = Frente</span></div>
          {capas.length === 0 ? (
            <div className="layers-empty"><Icon name="layers" size={22} /><strong>Sin capas todavía</strong><p>Añade formas, textos o imágenes desde la pestaña Elementos.</p></div>
          ) : (
            <ul className="layers-list" aria-label="Lista de capas">
              {capas.map((capa, index) => {
                const seleccionada = selectedIds.includes(capa.id);
                const editando = editingId === capa.id;
                const muestra = muestraCapaCss(capa);
                const esDestino = dropIndex === index && dragIndex !== null && dragIndex !== index;
                return (
                  <li key={capa.id} data-testid={`layer-item-${capa.id}`} draggable={!editando && !locked} className={['layer-row', seleccionada ? 'is-selected' : '', !capa.visible ? 'is-hidden' : '', capa.bloqueada ? 'is-locked' : '', esDestino ? 'is-drop-target' : ''].filter(Boolean).join(' ')} onClick={(event) => selectLayer(capa.id, event.shiftKey)} onDoubleClick={() => iniciarRenombrado(capa)} onDragStart={(event) => { setDragIndex(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (dropIndex !== index) setDropIndex(index); }} onDragLeave={() => { if (dropIndex === index) setDropIndex(null); }} onDrop={(event) => { event.preventDefault(); const origen = dragIndex ?? Number(event.dataTransfer.getData('text/plain')); if (Number.isInteger(origen) && origen !== index) reorderLayer(origen, index); setDragIndex(null); setDropIndex(null); }} onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}>
                    <span className="layer-grip" aria-hidden="true"><Icon name="grip" size={14} /></span>
                    <span className="layer-type-badge" aria-hidden="true"><Icon name={ICONO_POR_TIPO[capa.tipo] || 'square'} size={13} />{muestra && <i className="layer-color-dot" style={{ background: muestra }} />}</span>
                    <div className="layer-title-cell">
                      {editando ? (
                        <input ref={renameInputRef} type="text" className="layer-rename-input" aria-label="Nuevo nombre de la capa" value={editingName} onChange={(event) => setEditingName(event.target.value)} onBlur={confirmarRenombrado} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); confirmarRenombrado(); } else if (event.key === 'Escape') { event.preventDefault(); setEditingId(null); setEditingName(capa.nombre); } }} />
                      ) : (
                        <span className="layer-name" title={capa.nombre}>{capa.nombre}</span>
                      )}
                      <small className="layer-pos-tag">{capa.tipo}</small>
                    </div>
                    <div className="layer-actions">
                      <button type="button" className={`layer-icon-btn ${!capa.visible ? 'is-muted' : ''}`} aria-label={capa.visible ? `Ocultar capa ${capa.nombre}` : `Mostrar capa ${capa.nombre}`} title={capa.visible ? 'Ocultar' : 'Mostrar'} onClick={(event) => { event.stopPropagation(); toggleLayerVisible(capa.id); }}><Icon name={capa.visible ? 'eye' : 'eyeOff'} size={14} /></button>
                      <button type="button" className={`layer-icon-btn ${capa.bloqueada ? 'is-locked-btn' : ''}`} aria-label={capa.bloqueada ? `Desbloquear capa ${capa.nombre}` : `Bloquear capa ${capa.nombre}`} title={capa.bloqueada ? 'Desbloquear' : 'Bloquear'} onClick={(event) => { event.stopPropagation(); toggleLayerLocked(capa.id); }}><Icon name={capa.bloqueada ? 'lock' : 'unlock'} size={14} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
