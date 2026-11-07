import React, { useState } from 'react';
import { Icon } from '../Icons.jsx';
import { useTemplateStore } from '../../state/template-store.js';

function MiniaturaCapa({ capa }) {
  if (capa.tipo === 'imagen') {
    const src = capa.imagen?.src;
    if (src && !/^\[.+\]$/.test(String(src).trim())) return <img src={String(src)} alt="" />;
    return <Icon name="image" size={12} />;
  }
  if (capa.tipo === 'texto') return <span className="gp-mini-texto">{(capa.texto?.texto || 'Aa').replace(/\[.*?\]/g, '').trim().slice(0, 3) || 'Aa'}</span>;
  if (capa.tipo === 'rect') return <span className="gp-mini-forma" style={{ background: capa.rect?.fill || '#94a3b8' }} />;
  if (capa.tipo === 'circulo') return <span className="gp-mini-forma gp-redonda" style={{ background: capa.circulo?.fill || '#94a3b8' }} />;
  if (capa.tipo === 'linea') return <span className="gp-mini-linea" style={{ background: capa.linea?.stroke?.color || '#94a3b8' }} />;
  return <Icon name="square" size={12} />;
}

export default function LayersPanel({ locked }) {
  const template = useTemplateStore((state) => state.template);
  const selectedIds = useTemplateStore((state) => state.selectedIds);
  const selectLayer = useTemplateStore((state) => state.selectLayer);
  const renameLayer = useTemplateStore((state) => state.renameLayer);
  const toggleLayerVisible = useTemplateStore((state) => state.toggleLayerVisible);
  const toggleLayerLocked = useTemplateStore((state) => state.toggleLayerLocked);
  const reorderLayer = useTemplateStore((state) => state.reorderLayer);

  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreDraft, setNombreDraft] = useState('');

  function iniciarRenombre(capa) {
    setEditandoId(capa.id);
    setNombreDraft(capa.nombre);
  }

  function confirmarRenombre(capa) {
    const limpio = nombreDraft.trim();
    if (limpio && limpio !== capa.nombre) renameLayer(capa.id, limpio);
    setEditandoId(null);
  }

  function cancelarRenombre() {
    setEditandoId(null);
  }

  return (
    <section>
      <h2>Capas</h2>
      <p className="gp-hint">Orden de apilado · arriba = delante. Arrastra para reordenar.</p>
      <div className="gp-layers" role="list" aria-label="Pila de capas">
        {dropIndex != null && (
          <div className="gp-drop-line" style={{ top: dropIndex * 32 - 1 }} aria-hidden="true" />
        )}
        {template.capas.map((capa, index) => {
          const seleccionada = selectedIds.includes(capa.id);
          const editando = editandoId === capa.id;
          return (
            <div
              key={capa.id}
              role="listitem"
              aria-selected={seleccionada}
              aria-label={`Capa: ${capa.nombre}`}
              className={`gp-layer ${seleccionada ? 'gp-selected' : ''} ${capa.visible ? '' : 'gp-hidden'} ${dragIndex === index ? 'gp-dragging' : ''}`}
              draggable={!locked && !editando}
              onDragStart={(event) => {
                setDragIndex(index);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDropIndex(index);
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
            >
              <span className="gp-mini" aria-hidden="true">
                <MiniaturaCapa capa={capa} />
              </span>
              {editando ? (
                <input
                  type="text"
                  className="gp-layer-name"
                  value={nombreDraft}
                  autoFocus
                  aria-label={`Renombrar ${capa.nombre}`}
                  onChange={(event) => setNombreDraft(event.target.value)}
                  onBlur={() => confirmarRenombre(capa)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') confirmarRenombre(capa);
                    if (event.key === 'Escape') cancelarRenombre();
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="gp-layer-name"
                  disabled={locked}
                  onClick={() => selectLayer(capa.id)}
                  onDoubleClick={() => iniciarRenombre(capa)}
                >
                  {capa.nombre}
                </button>
              )}
              <button
                type="button"
                className="gp-icon-btn"
                disabled={locked}
                aria-label={capa.visible ? 'Ocultar capa' : 'Mostrar capa'}
                title={capa.visible ? 'Ocultar capa' : 'Mostrar capa'}
                onClick={() => toggleLayerVisible(capa.id)}
              >
                <Icon name={capa.visible ? 'eye' : 'eyeOff'} size={14} />
              </button>
              <button
                type="button"
                className="gp-icon-btn"
                disabled={locked}
                aria-label={capa.bloqueada ? 'Desbloquear capa' : 'Bloquear capa'}
                title={capa.bloqueada ? 'Desbloquear capa' : 'Bloquear capa'}
                onClick={() => toggleLayerLocked(capa.id)}
              >
                <Icon name={capa.bloqueada ? 'lock' : 'unlock'} size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
