import React from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { obtenerClientId, iniciarSesionGoogle, obtenerTokenValido } from '../sheets/google-auth.js';
import { listarHojasDrive, leerHojaConToken } from '../sheets/drive-client.js';
import { normalizarRespuestaValues } from '../sheets/mapper.js';

function traducirError(error) {
  const mensaje = String(error?.message ?? '');
  if (/La sesión de Google expiró/i.test(mensaje)) return mensaje;
  if (/access_denied|popup_closed/i.test(mensaje)) return 'No se completó la autorización con Google.';
  if (/redirect_uri_mismatch|origin_mismatch/i.test(mensaje)) return 'El dominio de la app no está autorizado en Google Cloud.';
  if (/PERMISSION_DENIED|403/i.test(mensaje)) return 'No tienes permiso para acceder a esta hoja o listar archivos de Drive.';
  if (/404|not found/i.test(mensaje)) return 'No se encontró la hoja seleccionada.';
  if (/400|Unable to parse range/i.test(mensaje)) return 'Rango o pestaña inválidos.';
  return mensaje || 'No se pudo conectar con Google.';
}

export default function GoogleSheetsConnector({ locked = false }) {
  const sheets = useTemplateStore((state) => state.sheets);
  const setSheetsConfig = useTemplateStore((state) => state.setSheetsConfig);
  const clientId = obtenerClientId();
  const authMode = sheets.authMode ?? 'idle';
  const driveFiles = sheets.driveFiles ?? [];
  const cargando = sheets.status === 'loading';

  async function conectar() {
    setSheetsConfig({ status: 'loading', error: '' });
    try {
      const token = await iniciarSesionGoogle();
      const archivos = await listarHojasDrive(token);
      setSheetsConfig({
        authMode: 'google',
        accessToken: token,
        driveFiles: archivos,
        status: archivos.length ? 'idle' : 'error',
        error: archivos.length ? '' : 'No se encontraron hojas de cálculo en tu Google Drive.',
      });
    } catch (error) {
      setSheetsConfig({ status: 'error', error: traducirError(error) });
    }
  }

  function seleccionarArchivo(id) {
    const archivo = driveFiles.find((item) => item.id === id);
    if (!archivo) return;
    setSheetsConfig({
      selectedDriveFileId: archivo.id,
      selectedDriveFileName: archivo.name,
      spreadsheetId: archivo.id,
      headers: [],
      rows: [],
      columnToField: {},
      activeRowIndex: null,
      status: 'idle',
      error: '',
    });
  }

  async function leerHoja() {
    if (!sheets.selectedDriveFileId) {
      setSheetsConfig({ status: 'error', error: 'Selecciona una hoja de Google Drive.' });
      return;
    }
    setSheetsConfig({ status: 'loading', error: '', activeRowIndex: null });
    try {
      const token = await obtenerTokenValido();
      const datos = await leerHojaConToken({
        accessToken: token,
        spreadsheetId: sheets.selectedDriveFileId,
        sheetName: sheets.sheetName,
        range: sheets.range,
      });
      const { headers, rows } = normalizarRespuestaValues(datos.values);
      setSheetsConfig({
        accessToken: token,
        headers,
        rows,
        columnToField: {},
        activeRowIndex: null,
        status: 'ready',
        error: '',
      });
    } catch (error) {
      setSheetsConfig({ status: 'error', error: traducirError(error) });
    }
  }

  return (
    <>
      {!clientId && (
        <div className="layers-empty" role="alert">
          <Icon name="info" size={20} />
          <strong>Falta configuración</strong>
          <p>Define <code>VITE_GOOGLE_CLIENT_ID</code> en Vercel y vuelve a desplegar la app.</p>
        </div>
      )}

      <button type="button" className="image-url-link" data-testid="google-connect" disabled={!clientId || cargando || locked} onClick={conectar}>
        <Icon name="link" size={14} />
        <span>{authMode === 'google' ? 'Recargar mis hojas de Drive' : 'Conectar con Google'}</span>
      </button>

      {authMode === 'google' && (
        <>
          <label className="prop-sub-label" htmlFor="drive-file">Hoja de cálculo</label>
          <select id="drive-file" className="layer-rename-input" data-testid="drive-file" value={sheets.selectedDriveFileId ?? ''} disabled={locked || cargando} onChange={(event) => seleccionarArchivo(event.target.value)}>
            <option value="">Elegí una hoja…</option>
            {driveFiles.map((archivo) => (<option key={archivo.id} value={archivo.id}>{archivo.name}</option>))}
          </select>

          <div className="prop-grid-2">
            <div>
              <label className="prop-sub-label" htmlFor="sheets-tab">Pestaña</label>
              <input id="sheets-tab" type="text" className="layer-rename-input" placeholder="Hoja 1" value={sheets.sheetName} disabled={locked} onChange={(event) => setSheetsConfig({ sheetName: event.target.value })} />
            </div>
            <div>
              <label className="prop-sub-label" htmlFor="sheets-range">Rango</label>
              <input id="sheets-range" type="text" className="layer-rename-input" value={sheets.range} disabled={locked} onChange={(event) => setSheetsConfig({ range: event.target.value })} />
            </div>
          </div>

          <button type="button" className="image-url-link" disabled={!sheets.selectedDriveFileId || cargando || locked} onClick={leerHoja}>
            <Icon name="link" size={14} />
            <span>{cargando ? 'Conectando…' : 'Conectar y leer'}</span>
          </button>
        </>
      )}

      {sheets.status === 'error' && (
        <div className="layers-empty" role="alert">
          <Icon name="info" size={20} />
          <strong>No se pudo conectar</strong>
          <p>{sheets.error}</p>
        </div>
      )}

      <div className="sidebar-bottom">
        <div className="shortcut-card">
          <span className="shortcut-icon"><Icon name="link" size={17} /></span>
          <div>
            <strong>Permisos</strong>
            <p>La app solicita acceso de solo lectura a Sheets y Drive. El token permanece en esta sesión del navegador.</p>
          </div>
        </div>
      </div>
    </>
  );
}
