import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icons.jsx';
import { useTemplateStore } from '../state/template-store.js';
import { iniciarSesionGoogle, obtenerTokenValido } from '../sheets/google-auth.js';
import { listarHojasDrive, listarPestanas, leerHojaConToken } from '../sheets/drive-client.js';
import { normalizarRespuestaValues } from '../sheets/mapper.js';

const CLAVE_CONEXION = 'gimage:sheets:conexion:v1';

function traducirError(error) {
  const mensaje = String(error?.message ?? '');
  if (/La sesión de Google expiró/i.test(mensaje)) return mensaje;
  if (/PERMISSION_DENIED|403/i.test(mensaje)) return 'No tienes permiso para acceder a esta hoja o listar archivos de Drive.';
  if (/404|not found/i.test(mensaje)) return 'No se encontró la hoja seleccionada.';
  if (/400|Unable to parse range/i.test(mensaje)) return 'Rango o pestaña inválidos.';
  return mensaje || 'No se pudo conectar con Google.';
}

function cargarConexionGuardada() {
  try {
    const crudo = localStorage.getItem(CLAVE_CONEXION);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function guardarConexion(conexion) {
  try { localStorage.setItem(CLAVE_CONEXION, JSON.stringify(conexion)); } catch { /* almacenamiento no disponible */ }
}

function borrarConexion() {
  try { localStorage.removeItem(CLAVE_CONEXION); } catch { /* almacenamiento no disponible */ }
}

export default function GoogleSheetsConnector({ locked = false }) {
  const sheets = useTemplateStore((state) => state.sheets);
  const setSheetsConfig = useTemplateStore((state) => state.setSheetsConfig);
  const [pestanas, setPestanas] = useState(Array.isArray(sheets.sheetTabs) ? sheets.sheetTabs : []);
  const autoconectandoRef = useRef(false);
  const authMode = sheets.authMode ?? 'idle';
  const driveFiles = sheets.driveFiles ?? [];
  const cargando = sheets.status === 'loading';

  async function cargarHoja({ token = '', spreadsheetId, sheetName, range }) {
    setSheetsConfig({ status: 'loading', error: '', activeRowIndex: null });
    try {
      const tokenValido = token || await obtenerTokenValido();
      const datos = await leerHojaConToken({ accessToken: tokenValido, spreadsheetId, sheetName, range });
      const { headers, rows } = normalizarRespuestaValues(datos.values);
      setSheetsConfig({
        accessToken: tokenValido,
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

  useEffect(() => {
    if (autoconectandoRef.current) return;
    const guardada = cargarConexionGuardada();
    if (!guardada?.spreadsheetId) return;
    autoconectandoRef.current = true;
    (async () => {
      setSheetsConfig({ ...guardada, status: 'loading', error: '' });
      try {
        const token = await obtenerTokenValido();
        const archivos = await listarHojasDrive(token);
        setSheetsConfig({ authMode: 'google', accessToken: token, driveFiles: archivos, status: 'idle', error: '' });
        try {
          const titulos = await listarPestanas({ accessToken: token, spreadsheetId: guardada.spreadsheetId });
          setPestanas(titulos);
          setSheetsConfig({ sheetTabs: titulos });
        } catch { /* si falla, se muestra el selector manual */ }
        await cargarHoja({ token, spreadsheetId: guardada.spreadsheetId, sheetName: guardada.sheetName, range: guardada.range });
      } catch (error) {
        setSheetsConfig({ status: 'error', error: traducirError(error) });
      }
      autoconectandoRef.current = false;
    })();
  }, []);

  useEffect(() => {
    if (sheets.authMode === 'google' && sheets.spreadsheetId) {
      guardarConexion({
        spreadsheetId: sheets.spreadsheetId,
        selectedDriveFileId: sheets.selectedDriveFileId,
        selectedDriveFileName: sheets.selectedDriveFileName,
        sheetName: sheets.sheetName,
        range: sheets.range,
      });
    }
    if (sheets.authMode === 'google' && !sheets.spreadsheetId) borrarConexion();
  }, [sheets.authMode, sheets.spreadsheetId, sheets.selectedDriveFileId, sheets.selectedDriveFileName, sheets.sheetName, sheets.range]);

  async function seleccionarArchivo(id) {
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
      status: 'loading',
      error: '',
    });
    try {
      const token = await obtenerTokenValido();
      const titulos = await listarPestanas({ accessToken: token, spreadsheetId: archivo.id });
      setPestanas(titulos);
      const primera = titulos[0] ?? '';
      setSheetsConfig({ sheetTabs: titulos, sheetName: primera, status: 'idle' });
      if (primera) {
        await cargarHoja({ token, spreadsheetId: archivo.id, sheetName: primera, range: useTemplateStore.getState().sheets.range });
      }
    } catch (error) {
      setSheetsConfig({ status: 'error', error: traducirError(error) });
    }
  }

  async function cambiarPestana(nombre) {
    setSheetsConfig({ sheetName: nombre, status: 'loading', error: '' });
    await cargarHoja({
      spreadsheetId: sheets.spreadsheetId,
      sheetName: nombre,
      range: useTemplateStore.getState().sheets.range,
    });
  }

  return (
    <>
      <button type="button" className="image-url-link" data-testid="google-connect" disabled={cargando || locked} onClick={() => iniciarSesionGoogle()}>
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
              {pestanas.length > 0 ? (
                <select id="sheets-tab" className="layer-rename-input" data-testid="sheets-tab" value={sheets.sheetName} disabled={locked || cargando} onChange={(event) => cambiarPestana(event.target.value)}>
                  <option value="">Elegí una pestaña…</option>
                  {pestanas.map((titulo) => (<option key={titulo} value={titulo}>{titulo}</option>))}
                </select>
              ) : (
                <input id="sheets-tab" type="text" className="layer-rename-input" placeholder="Hoja 1" value={sheets.sheetName} disabled={locked} onChange={(event) => setSheetsConfig({ sheetName: event.target.value })} />
              )}
            </div>
            <div>
              <label className="prop-sub-label" htmlFor="sheets-range">Rango</label>
              <input id="sheets-range" type="text" className="layer-rename-input" value={sheets.range} disabled={locked} onChange={(event) => setSheetsConfig({ range: event.target.value })} />
            </div>
          </div>

          <button type="button" className="image-url-link" disabled={!sheets.selectedDriveFileId || cargando || locked} onClick={() => cargarHoja({ spreadsheetId: sheets.spreadsheetId, sheetName: sheets.sheetName, range: sheets.range })}>
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
            <strong>Sesión persistente</strong>
            <p>El refresh token se guarda en una cookie httpOnly y la app renueva el acceso automáticamente.</p>
          </div>
        </div>
      </div>
    </>
  );
}
