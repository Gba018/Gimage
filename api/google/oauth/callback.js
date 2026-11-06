export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send('Falta configurar GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en Vercel.');
    return;
  }
  if (!code) {
    res.status(400).send('No se recibió el código de autorización de Google.');
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const redirectUri = `${proto}://${host}/api/google/oauth/callback`;

  try {
    const respuesta = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.refresh_token) {
      res.status(400).send('Google no devolvió un refresh token. Revisa la configuración de OAuth.');
      return;
    }

    res.setHeader('Set-Cookie', `gimg_refresh=${encodeURIComponent(datos.refresh_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=15552000`);
    res.redirect('/?google=conectado');
  } catch {
    res.status(500).send('No se pudo completar la autorización con Google.');
  }
}
