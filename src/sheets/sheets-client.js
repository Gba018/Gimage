export function extraerSpreadsheetId(entrada) {
  const valor = String(entrada ?? '').trim();
  if (!valor) return '';
  const porUrl = valor.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (porUrl) return porUrl[1];
  return /^[a-zA-Z0-9-_]+$/.test(valor) ? valor : '';
}

export function construirRango(sheetName, range) {
  const rango = String(range ?? '').trim() || 'A1:Z1000';
  const hoja = String(sheetName ?? '').trim();
  if (!hoja || rango.includes('!')) return rango;
  return `'${hoja.replace(/'/g, "''")}'!${rango}`;
}

export async function leerHoja({ apiKey, spreadsheetId, sheetName, range }) {
  const id = extraerSpreadsheetId(spreadsheetId);
  if (!apiKey) throw new Error('Ingresa una API key de Google Sheets.');
  if (!id) throw new Error('Ingresa un ID o URL válida de Google Sheets.');

  const rango = construirRango(sheetName, range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(rango)}?key=${encodeURIComponent(apiKey)}`;

  let respuesta;
  try {
    respuesta = await fetch(url);
  } catch {
    throw new Error('No se pudo conectar con Google Sheets. Revisa tu conexión.');
  }

  if (!respuesta.ok) {
    if (respuesta.status === 403) throw new Error('Acceso denegado: comparte la hoja como “Cualquier persona con el enlace puede ver” y verifica la API key.');
    if (respuesta.status === 404) throw new Error('No se encontró la hoja. Revisa el ID o URL.');
    if (respuesta.status === 400) throw new Error('Rango o pestaña inválidos. Revisa los datos ingresados.');
    throw new Error(`Google Sheets respondió con error ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  if (!datos.values) throw new Error('La hoja no devolvió valores. Revisa el rango.');
  return datos;
}
