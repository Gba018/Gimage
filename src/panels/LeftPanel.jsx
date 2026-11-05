import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { esFillDegradado, fillACss } from '../template/schema.js';

function InsertCard({ icon, title, description, onClick, label }) {
  return (
    <button type="button" className="insert-card" onClick={onClick} aria-label={label} title={label}>
      <span className={`insert-icon insert-icon-${icon}`}><Icon name={icon} size={18} /></span>
      <span className="insert-copy"><strong>{title}</strong><small>{description}</small></span>
      <span className="insert-plus"><Icon name="plus" size={15} /></span>
    </button>
  );
}

const ICONO_POR_TIPO = {
  rect: 'square',
  circulo: 'circle',
  linea: 'line',
  texto: 'text',
  imagen: 'image',
};

function muestraCapaCss(capa) {
  if (capa.tipo === 'rect') return fillACss(capa.rect.fill);
  if (capa.tipo === 'circulo') return fillACss(capa.circulo.fill);
  if (capa.tipo === 'texto') return fillACss(capa.texto.fill);
  if (capa.tipo === 'linea') return capa.linea.stroke?.color || '#1f2b23';
  return null;
}

export default function LeftPanel({
  onInsertText,
  onInsertRect,
  onInsertCircle,
  onInsertLine,
  onInsertImage,
  onImageUrl,
}) {
  const canvas = useTemplateStore((state) => state.template.canvas);
  const capas = useTemplateStore((state) => state.template.capas);
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

  const [tab, setTab] = useState('objetos');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const renameInputRef = useRef(null);

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
    <aside className="sidebar" aria-label="Herramientas y capas">
      <div className="sidebar-tabs" role="tablist" aria-label="Secciones del panel izquierdo">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'objetos'}
          className={`sidebar-tab ${tab === 'objetos' ? 'is-active' : ''}`}
          onClick={() => setTab('objetos')}
        >
          <Icon name="plus" size={14} />
          <span>Elementos</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'capas'}
          className={`sidebar-tab ${tab === 'capas' ? 'is-active' : ''}`}
          onClick={() => setTab('capas')}
        >
          <Icon name="layers" size={14} />
          <span>Capas</span>
          <em className="layers-count">{capas.length}</em>
        </button>
      </div>

      {tab === 'objetos' ? (
        <>
          <div className="section-heading"><span>INSERTAR</span><span>01 — 05</span></div>
          <p className="section-description">Elige qué elemento agregar al lienzo.</p>
          <div className="insert-list">
            <InsertCard icon="text" title="Texto" description="Títulos o párrafos" onClick={onInsertText} label="Añadir texto" />
            <InsertCard icon="square" title="Rectángulo" description="Caja o tarjeta" onClick={onInsertRect} label="Añadir rectángulo" />
            <InsertCard icon="circle" title="Círculo" description="Sello o insignia" onClick={onInsertCircle} label="Añadir círculo" />
            <InsertCard icon="line" title="Línea" description="Separador o trazo" onClick={onInsertLine} label="Añadir línea" />
            <InsertCard icon="image" title="Imagen" description="Sube un archivo" onClick={onInsertImage} label="Subir imagen" />
          </div>
          <button
            type="button"
            className="image-url-link"
            onClick={onImageUrl}
            aria-label="Pegar URL de imagen"
            title="Pegar URL de imagen"
          >
            <Icon name="link" size={14} />
            <span>O pega una URL de imagen</span>
            <Icon name="arrowUpRight" size={13} />
          </button>

          <div className="sidebar-rule details-rule" />
          <div className="section-heading"><span>LIENZO ACTUAL</span><Icon name="sliders" size={14} /></div>
          <div className="document-details">
            <div className="document-icon"><Icon name="square" size={18} /></div>
            <div>
              <strong>{canvas.width} × {canvas.height} px</strong>
              <small>
                {esFillDegradado(canvas.background.fill) ? 'Fondo degradado' : 'Fondo sólido'}{' '}
                <i style={{ background: fillACss(canvas.background.fill) }} />
              </small>
            </div>
          </div>

          <div className="sidebar-bottom">
            <div className="shortcut-card">
              <span className="shortcut-icon"><Icon name="sparkle" size={17} /></span>
              <div>
                <strong>Atajos útiles</strong>
                <p><kbd>Ctrl+Z</kbd> deshacer · <kbd>Ctrl+[</kbd> / <kbd>Ctrl+]</kbd> orden</p>
              </div>
            </div>
            <div className="sidebar-footer"><span><i /> MODO DISEÑO</span><span>EN MEMORIA</span></div>
          </div>
        </>
      ) : (
        // DECISION: no se añade agrupación persistente porque 02-esquema-plantilla.md v2 no define tipo grupo ni groupId; Shift+clic permite operar varias capas juntas.
        <div className="layers-panel" data-testid="layers-panel">
          <div className="layers-toolbar" role="toolbar" aria-label="Acciones de capas">
            <button
              type="button"
              className="layer-tool-btn"
              aria-label="Enviar capa hacia el fondo"
              title="Enviar hacia el fondo (Ctrl+[)"
              disabled={!puedeBajar}
              onClick={moveSelectedBackward}
            >
              <Icon name="arrowUp" size={14} />
            </button>
            <button
              type="button"
              className="layer-tool-btn"
              aria-label="Traer capa hacia el frente"
              title="Traer hacia el frente (Ctrl+])"
              disabled={!puedeSubir}
              onClick={moveSelectedForward}
            >
              <Icon name="arrowDown" size={14} />
            </button>
            <div className="layers-toolbar-sep" />
            <button
              type="button"
              className="layer-tool-btn"
              aria-label="Duplicar capa"
              title="Duplicar (Ctrl+D)"
              disabled={!algunaDesbloqueada}
              onClick={duplicateSelected}
            >
              <Icon name="copy" size={14} />
            </button>
            <button
              type="button"
              className="layer-tool-btn is-danger"
              aria-label="Eliminar capa"
              title="Eliminar (Supr)"
              disabled={!algunaDesbloqueada}
              onClick={deleteSelected}
            >
              <Icon name="trash" size={14} />
            </button>
          </div>

          <div className="layers-order-hint">
            <span>1.ª = Fondo</span>
            <span>Última = Frente</span>
          </div>

          {capas.length === 0 ? (
            <div className="layers-empty">
              <Icon name="layers" size={22} />
              <strong>Sin capas todavía</strong>
              <p>Añade formas, textos o imágenes desde la pestaña Elementos.</p>
            </div>
          ) : (
            <ul className="layers-list" aria-label="Lista de capas">
              {capas.map((capa, index) => {
                const seleccionada = selectedIds.includes(capa.id);
                const editando = editingId === capa.id;
                const muestra = muestraCapaCss(capa);
                const esDestino = dropIndex === index && dragIndex !== null && dragIndex !== index;

                return (
                  <li
                    key={capa.id}
                    data-testid={`layer-item-${capa.id}`}
                    draggable={!editando}
                    className={[
                      'layer-row',
                      seleccionada ? 'is-selected' : '',
                      !capa.visible ? 'is-hidden' : '',
                      capa.bloqueada ? 'is-locked' : '',
                      esDestino ? 'is-drop-target' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={(event) => selectLayer(capa.id, event.shiftKey)}
                    onDoubleClick={() => iniciarRenombrado(capa)}
                    onDragStart={(event) => {
                      setDragIndex(index);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (dropIndex !== index) setDropIndex(index);
                    }}
                    onDragLeave={() => {
                      if (dropIndex === index) setDropIndex(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const origen = dragIndex ?? Number(event.dataTransfer.getData('text/plain'));
                      if (Number.isInteger(origen) && origen !== index) {
                        reorderLayer(origen, index);
                      }
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                  >
                    <span className="layer-grip" title="Arrastra para reordenar" aria-hidden="true">
                      <Icon name="grip" size={13} />
                    </span>
                    <span className="layer-type-badge" aria-hidden="true">
                      <Icon name={ICONO_POR_TIPO[capa.tipo] || 'square'} size={13} />
                      {muestra && <i className="layer-color-dot" style={{ background: muestra }} />}
                    </span>

                    <div className="layer-title-cell">
                      {editando ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          className="layer-rename-input"
                          aria-label="Nuevo nombre de capa"
                          value={editingName}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => setEditingName(event.target.value)}
                          onBlur={confirmarRenombrado}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              confirmarRenombrado();
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
                              setEditingId(null);
                            }
                          }}
                        />
                      ) : (
                        <span className="layer-name" title="Doble clic para renombrar">{capa.nombre}</span>
                      )}
                      {capas.length > 1 && (index === 0 || index === capas.length - 1) && !editando && (
                        <small className="layer-pos-tag">{index === 0 ? 'Fondo' : 'Frente'}</small>
                      )}
                    </div>

                    <div className="layer-actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`layer-icon-btn ${!capa.visible ? 'is-muted' : ''}`}
                        aria-label={capa.visible ? `Ocultar ${capa.nombre}` : `Mostrar ${capa.nombre}`}
                        title={capa.visible ? 'Ocultar capa' : 'Mostrar capa'}
                        onClick={() => toggleLayerVisible(capa.id)}
                      >
                        <Icon name={capa.visible ? 'eye' : 'eyeOff'} size={14} />
                      </button>
                      <button
                        type="button"
                        className={`layer-icon-btn ${capa.bloqueada ? 'is-locked-btn' : ''}`}
                        aria-label={capa.bloqueada ? `Desbloquear ${capa.nombre}` : `Bloquear ${capa.nombre}`}
                        title={capa.bloqueada ? 'Desbloquear capa' : 'Bloquear capa'}
                        onClick={() => toggleLayerLocked(capa.id)}
                      >
                        <Icon name={capa.bloqueada ? 'lock' : 'unlock'} size={14} />
                      </button>
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
