export function obtenerClientId() {
  return String(import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? '').trim();
}

export function iniciarSesionGoogle() {
  if (typeof window === 'undefined') throw new Error('Google Sign-In solo está disponible en el navegador.');
  window.location.href = '/api/google/oauth/start';
}

export async function obtenerTokenValido() {
  const respuesta = await fetch('/api/google/token', { credentials: 'same-origin' });
  if (!respuesta.ok) throw new Error('La sesión de Google expiró. Vuelve a conectar tu cuenta.');
  const datos = await respuesta.json();
  if (!datos.accessToken) throw new Error('La sesión de Google expiró. Vuelve a conectar tu cuenta.');
  return datos.accessToken;
}

export function obtenerTokenGoogle() {
  return '';
}

export async function cerrarSesionGoogle() {
  await fetch('/api/google/logout', { credentials: 'same-origin' });
}
