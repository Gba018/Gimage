const STORAGE_KEY = 'gimage_plantilla_actual';
const VERSION_ARCHIVO = 3;

function clonar(valor) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(valor);
  }
  return JSON.parse(JSON.stringify(valor));
}

export function serializarPlantilla(template, fields) {
  return {
    app: 'gimage',
    version: template?.version ?? VERSION_ARCHIVO,
    guardadoEn: new Date().toISOString(),
    template: clonar(template),
    fields: clonar(fields ?? {}),
  };
}

export function guardarPlantillaLocal(template, fields) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializarPlantilla(template, fields)));
    return true;
  } catch {
    return false;
  }
}

export function leerPlantillaLocal() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const texto = localStorage.getItem(STORAGE_KEY);
    if (!texto) return null;
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export function limpiarPlantillaLocal() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function descargarPlantilla(template, fields, nombreProyecto) {
  const datos = serializarPlantilla(template, fields);
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  const base = String(nombreProyecto || 'plantilla').trim().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'plantilla';
  enlace.href = url;
  enlace.download = `${base}.gimage.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export function parsearPlantilla(texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!datos || datos.app !== 'gimage' || !datos.template || !Array.isArray(datos.template.capas)) {
    throw new Error('El archivo no parece una plantilla de Gimage.');
  }
  return datos;
}
