export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Falta configurar GOOGLE_CLIENT_ID en Vercel.');
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const redirectUri = `${proto}://${host}/api/google/oauth/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');

  res.redirect(url.toString());
}
