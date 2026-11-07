export function getLayerById(capas, id) {
  if (!Array.isArray(capas) || typeof id !== 'string') return null;
  return capas.find((capa) => capa?.id === id) ?? null;
}

export function getLayerDepth(capas, id) {
  const capa = getLayerById(capas, id);
  if (!capa) return 0;

  let profundidad = 0;
  let parentId = capa.parentId;
  const visitados = new Set([capa.id]);

  while (parentId) {
    if (visitados.has(parentId)) return profundidad;
    visitados.add(parentId);
    const padre = getLayerById(capas, parentId);
    if (!padre) break;
    profundidad += 1;
    parentId = padre.parentId;
  }

  return profundidad;
}

export function getVisibleLayers(capas) {
  if (!Array.isArray(capas)) return [];
  return capas.filter((capa) => capa?.visible);
}

export function getRenderOrder(capas) {
  if (!Array.isArray(capas)) return [];
  return [...capas];
}

export function getDescendantIds(capas, id) {
  if (!Array.isArray(capas) || typeof id !== 'string') return [];
  const hijosPorPadre = new Map();

  for (const capa of capas) {
    if (!capa?.parentId) continue;
    const hijos = hijosPorPadre.get(capa.parentId) ?? [];
    hijos.push(capa.id);
    hijosPorPadre.set(capa.parentId, hijos);
  }

  const descendientes = [];
  const pendientes = [...(hijosPorPadre.get(id) ?? [])];
  const visitados = new Set();

  while (pendientes.length) {
    const actual = pendientes.shift();
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    descendientes.push(actual);
    pendientes.push(...(hijosPorPadre.get(actual) ?? []));
  }

  return descendientes;
}

export function esDescendiente(capas, ancestroId, id) {
  if (!ancestroId || !id || ancestroId === id) return false;
  return getDescendantIds(capas, ancestroId).includes(id);
}

export function puedeMoverCapa(capas, origenId, targetId, posicion) {
  if (!Array.isArray(capas)) return false;
  const origen = getLayerById(capas, origenId);
  const target = getLayerById(capas, targetId);
  if (!origen || !target || origenId === targetId) return false;

  if (posicion === 'inside') {
    if (target.tipo !== 'grupo') return false;
    if (esDescendiente(capas, origenId, targetId)) return false;
    return true;
  }

  if ((origen.parentId ?? null) !== (target.parentId ?? null)) return false;
  return posicion === 'before' || posicion === 'after';
}
