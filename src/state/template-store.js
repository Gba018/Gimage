import { create } from 'zustand';
import {
  actualizarVersionPlantilla,
  calcularFontSizeAutoFit,
  crearCapa,
  crearIdCapa,
  crearPlantillaVacia,
  hidratarPlantilla,
  normalizarCajaTexto,
  normalizarFill,
  sincronizarCambioCajaTexto,
} from '../template/schema.js';

// DECISION: conservar hasta 100 pasos de historial para equilibrar undo/redo profundo y consumo de memoria.
const MAX_HISTORIAL = 100;
const VENTANA_COALESCENCIA_MS = 350;

function clonar(valor) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(valor);
  }
  return JSON.parse(JSON.stringify(valor));
}

export function obtenerCajaTexto(capa) {
  if (!capa || capa.tipo !== 'texto') return null;
  return normalizarCajaTexto(capa.texto?.caja, capa.texto);
}

function normalizarCapaTextoConCaja(capa, cambioCaja = null) {
  if (!capa || capa.tipo !== 'texto' || !capa.texto) return capa;
  const cajaBase = obtenerCajaTexto(capa);
  const caja = cambioCaja ? sincronizarCambioCajaTexto(cajaBase, cambioCaja) : cajaBase;
  const fontSizeCalculado = caja.autoFit
    ? calcularFontSizeAutoFit(capa.texto, caja.width, caja.height)
    : capa.texto.fontSize;

  return {
    ...capa,
    texto: {
      ...capa.texto,
      fontSize: fontSizeCalculado,
      caja,
    },
  };
}

function crearSnapshot(state) {
  return {
    template: clonar(state.template),
    selectedIds: [...state.selectedIds],
  };
}

function filtrarSeleccionValida(capas, selectedIds) {
  const idsExistentes = new Set(capas.map((capa) => capa.id));
  return selectedIds.filter((id) => idsExistentes.has(id));
}

// La plantilla cumple 02-esquema-plantilla.md v3 (con capa.texto.caja como fuente de verdad); selección, guías e historial viven fuera del JSON.
export const useTemplateStore = create((set, get) => {
  function aplicarCambio(mutador, opciones = {}) {
    set((state) => {
      const resultado = mutador(state);
      if (!resultado) return {};

      const nextTemplateRaw = resultado.template ?? state.template;
      const nextTemplate = actualizarVersionPlantilla(nextTemplateRaw);
      const nextSelectedIds = filtrarSeleccionValida(
        nextTemplate.capas,
        resultado.selectedIds ?? state.selectedIds,
      );

      const sinCambiosTemplate = JSON.stringify(nextTemplate) === JSON.stringify(state.template);
      const sinCambiosSeleccion = JSON.stringify(nextSelectedIds) === JSON.stringify(state.selectedIds);
      if (sinCambiosTemplate && sinCambiosSeleccion) return {};

      const ahora = Date.now();
      const historyKey = opciones.historyKey || null;
      const enBatch = state._batchDepth > 0 && state._batchPushed;
      const coalescePorTiempo = Boolean(
        historyKey
        && state._lastHistoryKey === historyKey
        && ahora - state._lastHistoryTime < VENTANA_COALESCENCIA_MS
        && state.past.length > 0,
      );

      const nextPast = enBatch || coalescePorTiempo
        ? state.past
        : [...state.past.slice(-(MAX_HISTORIAL - 1)), crearSnapshot(state)];

      return {
        template: nextTemplate,
        selectedIds: nextSelectedIds,
        past: nextPast,
        future: [],
        _batchPushed: state._batchDepth > 0 ? true : false,
        _lastHistoryKey: historyKey,
        _lastHistoryTime: ahora,
      };
    });
  }

  return {
    // DECISION: abrir de inmediato un proyecto vacío de 1080 × 1080 en memoria.
    template: crearPlantillaVacia(),
    selectedIds: [],
    guides: [],
    projectRevision: 0,
    past: [],
    future: [],
    _batchDepth: 0,
    _batchPushed: false,
    _lastHistoryKey: null,
    _lastHistoryTime: 0,

    beginHistoryBatch: () => set((state) => ({
      _batchDepth: state._batchDepth + 1,
      _batchPushed: state._batchDepth > 0 ? state._batchPushed : false,
      _lastHistoryKey: null,
    })),

    endHistoryBatch: () => set({
      _batchDepth: 0,
      _batchPushed: false,
      _lastHistoryKey: null,
    }),

    undo: () => set((state) => {
      if (state.past.length === 0) return {};
      const anterior = state.past[state.past.length - 1];
      const tpl = clonar(anterior.template);
      return {
        template: tpl,
        selectedIds: filtrarSeleccionValida(tpl.capas, anterior.selectedIds),
        past: state.past.slice(0, -1),
        future: [...state.future, crearSnapshot(state)],
        _batchDepth: 0,
        _batchPushed: false,
        _lastHistoryKey: null,
      };
    }),

    redo: () => set((state) => {
      if (state.future.length === 0) return {};
      const siguiente = state.future[state.future.length - 1];
      const tpl = clonar(siguiente.template);
      return {
        template: tpl,
        selectedIds: filtrarSeleccionValida(tpl.capas, siguiente.selectedIds),
        past: [...state.past.slice(-(MAX_HISTORIAL - 1)), crearSnapshot(state)],
        future: state.future.slice(0, -1),
        _batchDepth: 0,
        _batchPushed: false,
        _lastHistoryKey: null,
      };
    }),

    newProject: ({ name, nombre, width, height, background }) => set((state) => ({
      template: crearPlantillaVacia((nombre ?? name ?? '').trim() || 'Proyecto sin título', width, height, background),
      selectedIds: [],
      guides: [],
      past: [],
      future: [],
      _batchDepth: 0,
      _batchPushed: false,
      _lastHistoryKey: null,
      projectRevision: state.projectRevision + 1,
    })),

    loadTemplate: (plantillaEntrada) => set((state) => ({
      template: hidratarPlantilla(clonar(plantillaEntrada)),
      selectedIds: [],
      guides: [],
      past: [],
      future: [],
      _batchDepth: 0,
      _batchPushed: false,
      _lastHistoryKey: null,
      projectRevision: state.projectRevision + 1,
    })),

    setName: (nombre) => aplicarCambio(
      (state) => ({ template: { ...state.template, nombre } }),
      { historyKey: 'template.nombre' },
    ),

    setCanvasBackground: (fill, opciones = {}) => aplicarCambio(
      (state) => ({
        template: {
          ...state.template,
          canvas: {
            ...state.template.canvas,
            background: { fill: normalizarFill(fill, '#ffffff') },
          },
        },
      }),
      { historyKey: opciones.historyKey ?? null },
    ),

    insertObject: (tipo, opciones) => {
      const capa = crearCapa(tipo, get().template, opciones);
      aplicarCambio((state) => ({
        template: { ...state.template, capas: [...state.template.capas, capa] },
        selectedIds: [capa.id],
      }));
      return capa.id;
    },

    selectObject: (id, agregar = false) => set((state) => {
      const capa = state.template.capas.find((item) => item.id === id);
      if (!capa || capa.bloqueada || !capa.visible) return {};
      if (agregar) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((actual) => actual !== id)
            : [...state.selectedIds, id],
        };
      }
      return state.selectedIds.includes(id)
        ? {}
        : { selectedIds: [id] };
    }),

    selectLayer: (id, agregar = false) => set((state) => {
      const capa = state.template.capas.find((item) => item.id === id);
      if (!capa) return {};
      if (agregar) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((actual) => actual !== id)
            : [...state.selectedIds, id],
        };
      }
      return state.selectedIds.length === 1 && state.selectedIds[0] === id
        ? {}
        : { selectedIds: [id] };
    }),

    clearSelection: () => set((state) => (state.selectedIds.length ? { selectedIds: [] } : {})),

    updateObject: (id, cambios, opciones = {}) => aplicarCambio(
      (state) => {
        let huboCambio = false;
        const capas = state.template.capas.map((capa) => {
          if (capa.id !== id) return capa;
          huboCambio = true;
          let actualizada = { ...capa, ...cambios };
          if (capa.tipo && cambios[capa.tipo]) {
            actualizada[capa.tipo] = { ...capa[capa.tipo], ...cambios[capa.tipo] };
          }
          if (actualizada.tipo === 'texto') {
            actualizada = normalizarCapaTextoConCaja(actualizada, cambios.texto?.caja || null);
          }
          return actualizada;
        });
        if (!huboCambio) return null;
        const siguienteSeleccion = cambios.bloqueada === true
          ? state.selectedIds.filter((selId) => selId !== id)
          : state.selectedIds;
        return {
          template: { ...state.template, capas },
          selectedIds: siguienteSeleccion,
        };
      },
      { historyKey: opciones.historyKey ?? null },
    ),

    updateTextBox: (id, parcial, opciones = {}) => aplicarCambio(
      (state) => {
        const existe = state.template.capas.some((capa) => capa.id === id && capa.tipo === 'texto');
        if (!existe) return null;
        const capas = state.template.capas.map((capa) => (
          capa.id === id ? normalizarCapaTextoConCaja(capa, parcial) : capa
        ));
        return { template: { ...state.template, capas } };
      },
      { historyKey: opciones.historyKey ?? null },
    ),

    reapplyAutoFitForFont: (familia, opciones = {}) => aplicarCambio(
      (state) => {
        const objetivoFamilia = String(familia ?? '').trim().toLowerCase();
        if (!objetivoFamilia) return null;
        let huboAjuste = false;
        const capas = state.template.capas.map((capa) => {
          if (capa.tipo !== 'texto') return capa;
          if (String(capa.texto?.fontFamily ?? '').trim().toLowerCase() !== objetivoFamilia) return capa;
          const caja = obtenerCajaTexto(capa);
          if (!caja?.autoFit) return capa;
          const ajustada = normalizarCapaTextoConCaja(capa);
          if (ajustada.texto.fontSize !== capa.texto.fontSize) huboAjuste = true;
          return ajustada.texto.fontSize !== capa.texto.fontSize ? ajustada : capa;
        });
        return huboAjuste ? { template: { ...state.template, capas } } : null;
      },
      { historyKey: opciones.historyKey ?? null },
    ),

    updateObjects: (cambiosPorId, opciones = {}) => aplicarCambio(
      (state) => {
        const capas = state.template.capas.map((capa) => {
          const cambio = cambiosPorId[capa.id];
          if (!cambio) return capa;
          const { textBox: cambioCaja, ...cambioCapa } = cambio;
          let actualizada = { ...capa, ...cambioCapa };
          if (capa.tipo && cambioCapa[capa.tipo]) {
            actualizada[capa.tipo] = { ...capa[capa.tipo], ...cambioCapa[capa.tipo] };
          }
          if (actualizada.tipo === 'texto') {
            actualizada = normalizarCapaTextoConCaja(actualizada, cambioCaja || cambioCapa.texto?.caja || null);
          }
          return actualizada;
        });
        return { template: { ...state.template, capas } };
      },
      { historyKey: opciones.historyKey ?? null },
    ),

    renameLayer: (id, nombre) => {
      const limpio = String(nombre ?? '').trim();
      if (!limpio) return;
      aplicarCambio((state) => ({
        template: {
          ...state.template,
          capas: state.template.capas.map((capa) => (capa.id === id ? { ...capa, nombre: limpio } : capa)),
        },
      }));
    },

    toggleLayerVisible: (id) => aplicarCambio((state) => {
      const objetivo = state.template.capas.find((capa) => capa.id === id);
      if (!objetivo) return null;
      const nuevaVisibilidad = !objetivo.visible;
      return {
        template: {
          ...state.template,
          capas: state.template.capas.map((capa) => (capa.id === id ? { ...capa, visible: nuevaVisibilidad } : capa)),
        },
        selectedIds: nuevaVisibilidad ? state.selectedIds : state.selectedIds.filter((selId) => selId !== id),
      };
    }),

    toggleLayerLocked: (id) => aplicarCambio((state) => {
      const objetivo = state.template.capas.find((capa) => capa.id === id);
      if (!objetivo) return null;
      const nuevoBloqueo = !objetivo.bloqueada;
      return {
        template: {
          ...state.template,
          capas: state.template.capas.map((capa) => (capa.id === id ? { ...capa, bloqueada: nuevoBloqueo } : capa)),
        },
        selectedIds: nuevoBloqueo ? state.selectedIds.filter((selId) => selId !== id) : state.selectedIds,
      };
    }),

    reorderLayer: (fromIndex, toIndex) => aplicarCambio((state) => {
      const total = state.template.capas.length;
      if (fromIndex < 0 || fromIndex >= total || toIndex < 0 || toIndex >= total || fromIndex === toIndex) {
        return null;
      }
      const capas = [...state.template.capas];
      const [movida] = capas.splice(fromIndex, 1);
      capas.splice(toIndex, 0, movida);
      return { template: { ...state.template, capas } };
    }),

    moveSelectedForward: () => aplicarCambio((state) => {
      if (!state.selectedIds.length) return null;
      const seleccion = new Set(state.selectedIds);
      const capas = [...state.template.capas];
      let movio = false;
      for (let i = capas.length - 2; i >= 0; i -= 1) {
        if (seleccion.has(capas[i].id) && !seleccion.has(capas[i + 1].id)) {
          [capas[i], capas[i + 1]] = [capas[i + 1], capas[i]];
          movio = true;
        }
      }
      return movio ? { template: { ...state.template, capas } } : null;
    }),

    moveSelectedBackward: () => aplicarCambio((state) => {
      if (!state.selectedIds.length) return null;
      const seleccion = new Set(state.selectedIds);
      const capas = [...state.template.capas];
      let movio = false;
      for (let i = 1; i < capas.length; i += 1) {
        if (seleccion.has(capas[i].id) && !seleccion.has(capas[i - 1].id)) {
          [capas[i - 1], capas[i]] = [capas[i], capas[i - 1]];
          movio = true;
        }
      }
      return movio ? { template: { ...state.template, capas } } : null;
    }),

    moveSelected: (dx, dy) => aplicarCambio(
      (state) => {
        if (!state.selectedIds.length) return null;
        let movio = false;
        const capas = state.template.capas.map((capa) => {
          if (!state.selectedIds.includes(capa.id) || capa.bloqueada) return capa;
          movio = true;
          return { ...capa, x: Math.round(capa.x + dx), y: Math.round(capa.y + dy) };
        });
        return movio ? { template: { ...state.template, capas } } : null;
      },
      { historyKey: 'keyboard-move' },
    ),

    deleteSelected: () => aplicarCambio((state) => {
      const restantes = state.template.capas.filter(
        (capa) => !state.selectedIds.includes(capa.id) || capa.bloqueada,
      );
      if (restantes.length === state.template.capas.length) return null;
      return {
        template: { ...state.template, capas: restantes },
        selectedIds: [],
      };
    }),

    duplicateSelected: () => aplicarCambio((state) => {
      const seleccionadas = state.template.capas.filter(
        (capa) => state.selectedIds.includes(capa.id) && !capa.bloqueada,
      );
      if (!seleccionadas.length) return null;
      const ids = state.template.capas.map((capa) => capa.id);
      const copias = seleccionadas.map((capa) => {
        const copia = clonar(capa);
        copia.id = crearIdCapa(ids);
        ids.push(copia.id);
        copia.nombre = `${capa.nombre} copia`;
        // DECISION: desplazar las copias 24 px para que no queden ocultas bajo el original.
        copia.x = Math.round(capa.x + 24);
        copia.y = Math.round(capa.y + 24);
        if (copia.tipo === 'texto') {
          return normalizarCapaTextoConCaja(copia);
        }
        return copia;
      });
      return {
        template: { ...state.template, capas: [...state.template.capas, ...copias] },
        selectedIds: copias.map((copia) => copia.id),
      };
    }),

    addGuide: (orientation, position) => set((state) => ({
      guides: [...state.guides, { id: `guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, orientation, position }],
    })),
    updateGuide: (id, position) => set((state) => ({
      guides: state.guides.map((guia) => (guia.id === id ? { ...guia, position } : guia)),
    })),
    removeGuide: (id) => set((state) => ({
      guides: state.guides.filter((guia) => guia.id !== id),
    })),
  };
});
