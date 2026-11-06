import { construirRango } from './sheets-client.js';

export async function listarHojasDrive(accessToken) {
  const archivos = [];
  let pageToken = '';

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    url.searchParams.set('fields', 'nextPageToken,files(id,name,modifiedTime)');
    url.searchParams.set('orderBy', 'name');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const respuesta = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!respuesta.ok) {
      if (respuesta.status === 401) throw new Error('La sesión de Google expiró. Vuelve a conectar tu cuenta.');
      if (respuesta.status === 403) throw new Error('No tienes permiso para listar archivos de Google Drive.');
      throw new Error(`Google Drive respondió con error ${respuesta.status}.`);
    }

    const datos = await respuesta.json();
    if (Array.isArray(datos.files)) archivos.push(...datos.files);
    pageToken = datos.nextPageToken || '';
  } while (pageToken);

  return archivos.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', { sensitivity: 'base' }));
}

export async function listarPestanas({ accessToken, spreadsheetId }) {
  if (!accessToken) throw new Error('Inicia sesión con Google para leer las pestañas.');
  const id = String(spreadsheetId ?? '').trim();
  if (!id) throw new Error('Selecciona una hoja de Google Drive.');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=sheets.properties.title`;
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!respuesta.ok) {
    if (respuesta.status === 401) throw new Error('La sesión de Google expiró. Vuelve a conectar tu cuenta.');
    if (respuesta.status === 403) throw new Error('No tienes permiso para leer las pestañas de esta hoja.');
    if (respuesta.status === 404) throw new Error('No se encontró la hoja seleccionada.');
    throw new Error(`Google Sheets respondió con error ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  return (datos.sheets ?? [])
    .map((hoja) => hoja.properties?.title)
    .filter(Boolean);
}

export async function leerHojaConToken({ accessToken, spreadsheetId, sheetName, range }) {
  if (!accessToken) throw new Error('Inicia sesión con Google para leer la hoja.');
  const id = String(spreadsheetId ?? '').trim();
  if (!id) throw new Error('Selecciona una hoja de Google Drive.');

  const rango = construirRango(sheetName, range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(rango)}`;
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!respuesta.ok) {
    if (respuesta.status === 401) throw new Error('La sesión de Google expiró. Vuelve a conectar tu cuenta.');
    if (respuesta.status === 403) throw new Error('No tienes permiso para leer esta hoja.');
    if (respuesta.status === 404) throw new Error('No se encontró la hoja seleccionada.');
    if (respuesta.status === 400) throw new Error('Rango o pestaña inválidos.');
    throw new Error(`Google Sheets respondió con error ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  if (!datos.values) throw new Error('La hoja no devolvió valores. Revisa el rango.');
  return datos;
}
