import React, { useRef, useState } from 'react';
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
  const setSelectedIds = useTemplateStore((state) => state.setSelectedIds);
  const clearSelection = useTemplateStore((state) => state.clearSelection);
  const renameLayer = useTemplateStore((state) => state.renameLayer);
  const toggleLayerVisible = useTemplateStore((state) => state.toggleLayerVisible);
  const toggleLayerLocked = useTemplateStore((state) => state.toggleLayerLocked);
  const reorderLayer = useTemplateStore((state) => state.reorderLayer);

  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreDraft, setNombreDraft] = useState('');
  const anclaSeleccion = useRef(null);

  const capas = template.capas;

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

  function seleccionarRango(desde, hasta) {
    const inicio = Math.min(desde, hasta);
    const fin = Math.max(desde, hasta);
    const ids = capas.slice(inicio, fin + 1).map((capa) => capa.id);
    setSelectedIds(ids);
  }

  function manejarClicCapa(event, capa, index) {
    if (locked) return;

    if (event.metaKey || event.ctrlKey) {
      selectLayer(capa.id, true);
      anclaSeleccion.current = index;
      return;
    }

    if (event.shiftKey && anclaSeleccion.current != null) {
      seleccionarRango(anclaSeleccion.current, index);
      return;
    }

    selectLayer(capa.id);
    anclaSeleccion.current = index;
  }

  function moverSeleccion(delta, extender) {
    const total = capas.length;
    if (!total) return;

    const ancla = anclaSeleccion.current ?? 0;
    const destino = Math.min(total - 1, Math.max(0, ancla + delta));

    if (extender) {
      seleccionarRango(ancla, destino);
      return;
    }

    selectLayer(capas[destino].id);
    anclaSeleccion.current = destino;
  }

  function manejarTeclado(event) {
    if (locked) return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setSelectedIds(capas.map((capa) => capa.id));
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clearSelection();
      anclaSeleccion.current = null;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moverSeleccion(-1, event.shiftKey);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moverSeleccion(1, event.shiftKey);
    }
  }

  return (
    <section>
      <h2>Capas</h2>
      <p className="gp-hint">Orden de apilado · arriba = delante. Arrastra para reordenar.</p>
      <div
        className="gp-layers"
        role="list"
        aria-label="Pila de capas"
        tabIndex={0}
        onKeyDown={manejarTeclado}
      >
        {dropIndex != null && (
          <div className="gp-drop-line" style={{ top: dropIndex * 32 - 1 }} aria-hidden="true" />
        )}
        {capas.map((capa, index) => {
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
              onClick={(event) => manejarClicCapa(event, capa, index)}
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
                  onClick={(event) => manejarClicCapa(event, capa, index)}
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
