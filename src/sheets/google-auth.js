const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly';
let tokenClient = null;
let accessToken = '';
let expiracion = 0;
let cargaGis = null;

export function obtenerClientId() {
  return String(import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? '').trim();
}

function cargarGis() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Sign-In solo está disponible en el navegador.'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (cargaGis) return cargaGis;
  cargaGis = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Sign-In.'));
    document.head.appendChild(script);
  });
  return cargaGis;
}

export async function iniciarSesionGoogle() {
  const clientId = obtenerClientId();
  if (!clientId) throw new Error('Falta configurar VITE_GOOGLE_CLIENT_ID para iniciar sesión con Google.');
  await cargarGis();
  if (!window.google?.accounts?.oauth2) throw new Error('Google Sign-In no está disponible.');
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (respuesta) => {
        if (respuesta.error) {
          reject(new Error(respuesta.error_description || 'No se pudo autorizar el acceso a Google.'));
          return;
        }
        accessToken = respuesta.access_token;
        expiracion = Date.now() + Math.max(60, Number(respuesta.expires_in || 3600) - 60) * 1000;
        resolve(accessToken);
      },
      error_callback: (error) => reject(new Error(error?.message || 'No se pudo autorizar el acceso a Google.')),
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function obtenerTokenGoogle() {
  return accessToken && Date.now() < expiracion ? accessToken : '';
}

export async function obtenerTokenValido() {
  return obtenerTokenGoogle() || iniciarSesionGoogle();
}
