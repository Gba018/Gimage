export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((parte) => {
    const indice = parte.indexOf('=');
    return indice === -1 ? ['', ''] : [parte.slice(0, indice).trim(), decodeURIComponent(parte.slice(indice + 1).trim())];
  }));
  const refreshToken = cookies.gimg_refresh;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Falta configurar GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en Vercel.' });
    return;
  }
  if (!refreshToken) {
    res.status(401).json({ error: 'No hay una sesión de Google activa.' });
    return;
  }

  try {
    const respuesta = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.access_token) {
      res.setHeader('Set-Cookie', 'gimg_refresh=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      res.status(401).json({ error: 'La sesión de Google expiró. Vuelve a conectar tu cuenta.' });
      return;
    }

    res.status(200).json({ accessToken: datos.access_token, expiresIn: datos.expires_in ?? 3600 });
  } catch {
    res.status(500).json({ error: 'No se pudo renovar el token de Google.' });
  }
}
