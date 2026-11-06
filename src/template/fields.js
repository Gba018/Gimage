export const FIELD_REGEX = /(?:\[\s*|\{\{\s*)([a-z0-9_-]+)(?:\s*\]|\s*\}\})/g;

export function normalizarNombreCampo(valor) {
  const limpio = String(valor ?? '').trim()
    .replace(/^\[\s*/, '')
    .replace(/\s*\]$/, '')
    .replace(/^\{\{\s*/, '')
    .replace(/\s*\}\}$/, '')
    .trim()
    .toLowerCase();
  return /^[a-z0-9_-]+$/.test(limpio) ? limpio : '';
}

export function extraerCamposDeTexto(texto) {
  const resultados = [];
  const regex = /(?:\[\s*|\{\{\s*)([a-z0-9_-]+)(?:\s*\]|\s*\}\})/g;
  let coincidencia;
  while ((coincidencia = regex.exec(String(texto ?? ''))) !== null) {
    resultados.push(coincidencia[1]);
  }
  return resultados;
}

export function extraerCamposPlantilla(template) {
  const mapa = new Map();
  const registrar = (nombre, tipo, capaId) => {
    if (!mapa.has(nombre)) mapa.set(nombre, { nombre, tipo, usos: [] });
    const campo = mapa.get(nombre);
    if (tipo === 'imagen') campo.tipo = 'imagen';
    if (!campo.usos.includes(capaId)) campo.usos.push(capaId);
  };
  (template?.capas ?? []).forEach((capa) => {
    if (capa.tipo === 'texto') {
      extraerCamposDeTexto(capa.texto?.texto).forEach((nombre) => registrar(nombre, 'texto', capa.id));
    }
    if (capa.tipo === 'imagen') {
      extraerCamposDeTexto(capa.imagen?.src).forEach((nombre) => registrar(nombre, 'imagen', capa.id));
    }
  });
  return Array.from(mapa.values());
}

function obtenerValorCampo(fields = {}, nombre) {
  const valor = fields?.[nombre];
  if (valor && typeof valor === 'object') return valor.defaultValue;
  return valor;
}

export function resolverTexto(texto, fields = {}) {
  return String(texto ?? '').replace(/(?:\[\s*|\{\{\s*)([a-z0-9_-]+)(?:\s*\]|\s*\}\})/g, (match, nombre) => {
    const valor = obtenerValorCampo(fields, nombre);
    return valor == null || valor === '' ? `[${nombre}]` : String(valor);
  });
}

export function resolverImagenSrc(src, fields = {}) {
  const coincidencia = String(src ?? '').trim().match(/^(?:\[\s*|\{\{\s*)([a-z0-9_-]+)(?:\s*\]|\s*\}\})$/);
  if (!coincidencia) return String(src ?? '');
  const valor = obtenerValorCampo(fields, coincidencia[1]);
  return valor == null ? '' : String(valor);
}

export function esCampoImagen(src) {
  return /^(?:\[\s*|\{\{\s*)([a-z0-9_-]+)(?:\s*\]|\s*\}\})$/.test(String(src ?? '').trim());
}

function nombreDesdeToken(src) {
  const coincidencia = String(src ?? '').trim().match(/^(?:\[\s*|\{\{\s*)([a-z0-9_-]+)(?:\s*\]|\s*\}\})$/);
  return coincidencia ? coincidencia[1] : null;
}

function reemplazarToken(texto, nombre, reemplazo) {
  return String(texto ?? '').replace(new RegExp(`(?:\\[\\s*|\\{\\{\\s*)${nombre}(?:\\s*\\]|\\s*\\}\\})`, 'g'), reemplazo);
}

export function reemplazarCampoEnCapas(capas, nombre, { valorTexto = '', valorImagen = '' } = {}) {
  return (capas ?? []).map((capa) => {
    if (capa.tipo === 'texto') {
      return { ...capa, texto: { ...capa.texto, texto: reemplazarToken(capa.texto?.texto, nombre, valorTexto) } };
    }
    if (capa.tipo === 'imagen' && nombreDesdeToken(capa.imagen?.src) === nombre) {
      return { ...capa, imagen: { ...capa.imagen, src: valorImagen } };
    }
    return capa;
  });
}

export function renombrarCampoEnCapas(capas, nombreAnterior, nombreNuevo) {
  return (capas ?? []).map((capa) => {
    if (capa.tipo === 'texto') {
      return { ...capa, texto: { ...capa.texto, texto: reemplazarToken(capa.texto?.texto, nombreAnterior, `[${nombreNuevo}]`) } };
    }
    if (capa.tipo === 'imagen' && nombreDesdeToken(capa.imagen?.src) === nombreAnterior) {
      return { ...capa, imagen: { ...capa.imagen, src: `[${nombreNuevo}]` } };
    }
    return capa;
  });
}
