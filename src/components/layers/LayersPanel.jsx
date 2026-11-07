import React, { useMemo, useRef, useState } from 'react';
import { Icon } from '../Icons.jsx';
import { useTemplateStore } from '../../state/template-store.js';
import { getLayerById } from '../../state/layers-selectors.js';

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
  if (capa.tipo === 'grupo') return <span className="gp-mini-forma" style={{ background: '#64748b' }} />;
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
  const createGroup = useTemplateStore((state) => state.createGroup);
  const groupSelected = useTemplateStore((state) => state.groupSelected);
  const ungroupSelected = useTemplateStore((state) => state.ungroupSelected);
  const toggleGroupCollapsed = useTemplateStore((state) => state.toggleGroupCollapsed);
  const moveLayerRelative = useTemplateStore((state) => state.moveLayerRelative);
  const historial = useTemplateStore((state) => state.past.length);
  const undoTo = useTemplateStore((state) => state.undoTo);

  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreDraft, setNombreDraft] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroVisibilidad, setFiltroVisibilidad] = useState('todos');
  const [filtroBloqueo, setFiltroBloqueo] = useState('todos');
  const anclaSeleccion = useRef(null);

  const capas = template.capas;

  const hijosPorPadre = useMemo(() => {
    const mapa = new Map();
    capas.forEach((capa) => {
      const padre = capa.parentId ?? null;
      const lista = mapa.get(padre) ?? [];
      lista.push(capa);
      mapa.set(padre, lista);
    });
    return mapa;
  }, [capas]);

  const profundidades = useMemo(() => {
    const mapa = new Map();
    function recorrer(padreId, nivel) {
      (hijosPorPadre.get(padreId) ?? []).forEach((capa) => {
        mapa.set(capa.id, nivel);
        if (capa.tipo === 'grupo') recorrer(capa.id, nivel + 1);
      });
    }
    recorrer(null, 0);
    return mapa;
  }, [hijosPorPadre]);

  const ordenPlano = useMemo(() => {
    const resultado = [];
    function recorrer(padreId) {
      (hijosPorPadre.get(padreId) ?? []).forEach((capa) => {
        resultado.push(capa);
        if (capa.tipo === 'grupo' && !capa.collapsed) recorrer(capa.id);
      });
    }
    recorrer(null);
    return resultado;
  }, [hijosPorPadre]);

  const ordenFiltrado = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return ordenPlano.filter((capa) => {
      if (texto && !String(capa.nombre ?? '').toLowerCase().includes(texto)) return false;
      if (filtroTipo !== 'todos' && capa.tipo !== filtroTipo) return false;
      if (filtroVisibilidad === 'visibles' && !capa.visible) return false;
      if (filtroVisibilidad === 'ocultos' && capa.visible) return false;
      if (filtroBloqueo === 'bloqueadas' && !capa.bloqueada) return false;
      if (filtroBloqueo === 'libres' && capa.bloqueada) return false;
      return true;
    });
  }, [ordenPlano, busqueda, filtroTipo, filtroVisibilidad, filtroBloqueo]);

  function esVisibleEfectiva(capa) {
    let actual = capa;
    while (actual) {
      if (!actual.visible) return false;
      if (!actual.parentId) break;
      actual = getLayerById(capas, actual.parentId);
      if (!actual) break;
    }
    return true;
  }

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
    const ids = ordenFiltrado.slice(inicio, fin + 1).map((capa) => capa.id);
    setSelectedIds(ids);
  }

  function manejarClicCapa(event, capa) {
    if (locked) return;
    const index = ordenFiltrado.findIndex((item) => item.id === capa.id);

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
    const total = ordenFiltrado.length;
    if (!total) return;

    const ancla = anclaSeleccion.current ?? 0;
    const destino = Math.min(total - 1, Math.max(0, ancla + delta));

    if (extender) {
      seleccionarRango(ancla, destino);
      return;
    }

    selectLayer(ordenFiltrado[destino].id);
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

  function manejarDragOver(event, capa) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const altura = rect.height;
    let posicion;

    if (capa.tipo === 'grupo' && y > altura * 0.33 && y < altura * 0.67) {
      posicion = 'inside';
    } else if (y < altura * 0.5) {
      posicion = 'before';
    } else {
      posicion = 'after';
    }

    setDropTarget({ id: capa.id, posicion });
  }

  function limpiarDrag() {
    setDragId(null);
    setDropTarget(null);
  }

  function manejarDrop(event, capa) {
    event.preventDefault();
    const origenId = dragId;
    if (!origenId || origenId === capa.id) {
      limpiarDrag();
      return;
    }
    const posicion = dropTarget?.posicion ?? 'before';
    moveLayerRelative(origenId, capa.id, posicion);
    limpiarDrag();
  }

  const hayGrupoSeleccionado = capas.some(
    (capa) => capa.tipo === 'grupo' && selectedIds.includes(capa.id),
  );

  return (
    <section>
      <h2>Capas</h2>
      <p className="gp-hint">Orden de apilado · arriba = delante. Arrastra para reordenar o anidar.</p>

      <div className="gp-row" style={{ gap: 8 }}>
        <button type="button" disabled={locked} onClick={createGroup}>+ Grupo</button>
        <button type="button" disabled={locked || !selectedIds.length} onClick={groupSelected}>Agrupar</button>
        <button type="button" disabled={locked || !hayGrupoSeleccionado} onClick={ungroupSelected}>Desagrupar</button>
      </div>

      <div className="gp-row" style={{ gap: 8, alignItems:'center' }}>
        <select value={0} onChange={(event) => undoTo(Number(event.target.value))} aria-label="Volver a un punto del historial" style={{ maxWidth: 180 }}>
          <option value={0}>Historial: ahora</option>
          {Array.from({ length: historial }, (_, i) => (
            <option key={i} value={i + 1}>{`${i + 1} cambio${i ? 's' : ''} atrás`}</option>
          ))}
        </select>
      </div>

      <div className="gp-row" style={{ gap: 8, flexWrap:'wrap' }}>
        <input type="search" placeholder="Buscar capa" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} aria-label="Buscar capa" style={{ flex:'1 1 140px' }} />
        <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)} aria-label="Filtrar por tipo">
          <option value="todos">Tipo: todos</option>
          <option value="texto">Texto</option>
          <option value="imagen">Imagen</option>
          <option value="rect">Rectángulo</option>
          <option value="circulo">Círculo</option>
          <option value="linea">Línea</option>
          <option value="grupo">Grupo</option>
        </select>
        <select value={filtroVisibilidad} onChange={(event) => setFiltroVisibilidad(event.target.value)} aria-label="Filtrar por visibilidad">
          <option value="todos">Visibilidad: todas</option>
          <option value="visibles">Visibles</option>
          <option value="ocultos">Ocultas</option>
        </select>
        <select value={filtroBloqueo} onChange={(event) => setFiltroBloqueo(event.target.value)} aria-label="Filtrar por bloqueo">
          <option value="todos">Bloqueo: todos</option>
          <option value="bloqueadas">Bloqueadas</option>
          <option value="libres">Libres</option>
        </select>
      </div>

      <div
        className="gp-layers"
        role="list"
        aria-label="Pila de capas"
        tabIndex={0}
        onKeyDown={manejarTeclado}
      >
        {ordenFiltrado.map((capa) => {
          const profundidad = profundidades.get(capa.id) ?? 0;
          const esGrupo = capa.tipo === 'grupo';
          const hijos = hijosPorPadre.get(capa.id) ?? [];
          const seleccionada = selectedIds.includes(capa.id);
          const editando = editandoId === capa.id;
          const visibleEfectiva = esVisibleEfectiva(capa);
          const drop = dropTarget?.id === capa.id ? dropTarget.posicion : null;

          const estiloDrop =
            drop === 'before'
              ? { boxShadow: 'inset 0 2px 0 #1473e6' }
              : drop === 'after'
                ? { boxShadow: 'inset 0 -2px 0 #1473e6' }
                : drop === 'inside'
                  ? { background: '#1e3a5f' }
                  : {};

          return (
            <div
              key={capa.id}
              role="listitem"
              aria-level={profundidad + 1}
              aria-expanded={esGrupo ? !capa.collapsed : undefined}
              aria-selected={seleccionada}
              aria-label={`Capa: ${capa.nombre}`}
              className={`gp-layer ${seleccionada ? 'gp-selected' : ''} ${visibleEfectiva ? '' : 'gp-hidden'} ${dragId === capa.id ? 'gp-dragging' : ''}`}
              style={{ paddingLeft: 6 + profundidad * 18, ...estiloDrop }}
              draggable={!locked && !editando}
              onClick={(event) => manejarClicCapa(event, capa)}
              onDragStart={(event) => {
                setDragId(capa.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', capa.id);
              }}
              onDragEnd={limpiarDrag}
              onDragOver={(event) => manejarDragOver(event, capa)}
              onDrop={(event) => manejarDrop(event, capa)}
            >
              {esGrupo ? (
                <button
                  type="button"
                  className="gp-icon-btn"
                  aria-label={capa.collapsed ? 'Expandir grupo' : 'Colapsar grupo'}
                  aria-expanded={!capa.collapsed}
                  onClick={() => toggleGroupCollapsed(capa.id)}
                >
                  <span aria-hidden="true">{capa.collapsed ? '▸' : '▾'}</span>
                </button>
              ) : (
                <span className="gp-icon-btn" aria-hidden="true" style={{ opacity: 0 }}>{'•'}</span>
              )}

              <span className="gp-mini" aria-hidden="true">
                <MiniaturaCapa capa={capa} />
              </span>

              {esGrupo && <span aria-hidden="true">{capa.collapsed ? '📂' : '📁'}</span>}

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
                  onClick={(event) => manejarClicCapa(event, capa)}
                  onDoubleClick={() => iniciarRenombre(capa)}
                >
                  {capa.nombre}
                </button>
              )}

              {esGrupo && <span style={{ fontSize: 10, color: '#94a3b8' }}>{hijos.length}</span>}

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
