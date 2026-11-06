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

const estilos = `
.gs-conn{display:flex;flex-direction:column;gap:10px}
.gs-conn-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8}
.gs-conn-field,.gs-conn-button{width:100%;font:inherit;font-size:13px;border:1px solid #334155;border-radius:10px;padding:10px 12px;background:#1e293b;color:#e2e8f0;box-sizing:border-box}
.gs-conn-button{cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}
.gs-conn-button:disabled{opacity:.45;cursor:not-allowed}
.gs-conn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gs-conn-grid>div{display:flex;flex-direction:column;gap:6px}
.gs-conn-error{display:flex;gap:8px;align-items:flex-start;padding:10px;border:1px solid #7f1d1d;border-radius:10px;background:#2a1215;color:#fca5a5;font-size:12px}
.gs-conn-error strong{display:block;font-size:12px;color:#fecaca}
.gs-conn-note{display:flex;gap:8px;align-items:flex-start;padding:10px;border:1px solid #1e293b;border-radius:10px;background:#0b1220}
.gs-conn-note strong{display:block;font-size:12px;color:#e2e8f0}
.gs-conn-note p{margin:2px 0 0;font-size:11px;line-height:1.45;color:#94a3b8}
`;

export default function GoogleSheetsConnector({ locked = false }) {
  const sheets = useTemplateStore((state) => state.sheets);
  const setSheetsConfig = useTemplateStore((state) => state.setSheetsConfig);
  const [pestanas, setPestanas] = useState(Array.isArray(sheets.sheetTabs) ? sheets.sheetTabs : []);
  const autoconectandoRef = useRef(false);
  const authMode = sheets.authMode ?? 'idle';
  const driveFiles = sheets.driveFiles ?? [];
  const cargando = sheets.status === 'loading';

  async function cargarHoja({ token = '', spreadsheetId, sheetName, range, preservarMapeo = false }) {
    setSheetsConfig({ status: 'loading', error: '', activeRowIndex: preservarMapeo ? useTemplateStore.getState().sheets.activeRowIndex : null });
    try {
      const tokenValido = token || await obtenerTokenValido();
      const datos = await leerHojaConToken({ accessToken: tokenValido, spreadsheetId, sheetName, range });
      const { headers, rows } = normalizarRespuestaValues(datos.values);
      setSheetsConfig({
        accessToken: tokenValido,
        headers,
        rows,
        columnToField: preservarMapeo ? useTemplateStore.getState().sheets.columnToField : {},
        activeRowIndex: preservarMapeo ? useTemplateStore.getState().sheets.activeRowIndex : null,
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

  useEffect(() => {
    function actualizar() {
      if (!sheets.spreadsheetId) return;
      cargarHoja({ spreadsheetId: sheets.spreadsheetId, sheetName: sheets.sheetName, range: sheets.range, preservarMapeo: true });
    }
    window.addEventListener('gimage:actualizar-sheets', actualizar);
    return () => window.removeEventListener('gimage:actualizar-sheets', actualizar);
  }, [sheets.spreadsheetId, sheets.sheetName, sheets.range]);

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
      <style>{estilos}</style>
      <div className="gs-conn">
        <button type="button" className="gs-conn-button" data-testid="google-connect" disabled={cargando || locked} onClick={() => iniciarSesionGoogle()}>
          <Icon name="link" size={14} />
          <span>{authMode === 'google' ? 'Recargar mis hojas de Drive' : 'Conectar con Google'}</span>
        </button>

        {authMode === 'google' && (
          <>
            <label className="gs-conn-label" htmlFor="drive-file">Hoja de cálculo</label>
            <select id="drive-file" className="gs-conn-field" data-testid="drive-file" value={sheets.selectedDriveFileId ?? ''} disabled={locked || cargando} onChange={(event) => seleccionarArchivo(event.target.value)}>
              <option value="">Elegí una hoja…</option>
              {driveFiles.map((archivo) => (<option key={archivo.id} value={archivo.id}>{archivo.name}</option>))}
            </select>

            <div className="gs-conn-grid">
              <div>
                <label className="gs-conn-label" htmlFor="sheets-tab">Pestaña</label>
                {pestanas.length > 0 ? (
                  <select id="sheets-tab" className="gs-conn-field" data-testid="sheets-tab" value={sheets.sheetName} disabled={locked || cargando} onChange={(event) => cambiarPestana(event.target.value)}>
                    <option value="">Elegí una pestaña…</option>
                    {pestanas.map((titulo) => (<option key={titulo} value={titulo}>{titulo}</option>))}
                  </select>
                ) : (
                  <input id="sheets-tab" type="text" className="gs-conn-field" placeholder="Hoja 1" value={sheets.sheetName} disabled={locked} onChange={(event) => setSheetsConfig({ sheetName: event.target.value })} />
                )}
              </div>
              <div>
                <label className="gs-conn-label" htmlFor="sheets-range">Rango</label>
                <input id="sheets-range" type="text" className="gs-conn-field" value={sheets.range} disabled={locked} onChange={(event) => setSheetsConfig({ range: event.target.value })} />
              </div>
            </div>

            <button type="button" className="gs-conn-button" disabled={!sheets.selectedDriveFileId || cargando || locked} onClick={() => cargarHoja({ spreadsheetId: sheets.spreadsheetId, sheetName: sheets.sheetName, range: sheets.range })}>
              <Icon name="link" size={14} />
              <span>{cargando ? 'Conectando…' : 'Conectar y leer'}</span>
            </button>
          </>
        )}

        {sheets.status === 'error' && (
          <div className="gs-conn-error" role="alert">
            <Icon name="info" size={16} />
            <div>
              <strong>No se pudo conectar</strong>
              <p>{sheets.error}</p>
            </div>
          </div>
        )}

        <div className="gs-conn-note">
          <Icon name="link" size={16} />
          <div>
            <strong>Sesión persistente</strong>
            <p>El acceso se renueva automáticamente.</p>
          </div>
        </div>
      </div>
    </>
  );
}
