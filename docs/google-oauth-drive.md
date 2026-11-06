# Google Drive + OAuth en Gimage

## Configuración en Vercel

1. Entra a **Settings → Environment Variables**.
2. Agrega:

```env
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

3. Guarda y haz **Redeploy**.

No agregues el Client Secret: la app usa Google Identity Services en el navegador y solo necesita el Client ID.

## Google Cloud

Habilita **Google Sheets API** y **Google Drive API**. En el OAuth Client ID tipo *Web application*, agrega el dominio exacto de Vercel en **Authorized JavaScript origins**.

## Permisos

- `https://www.googleapis.com/auth/spreadsheets.readonly`
- `https://www.googleapis.com/auth/drive.readonly`

## Uso

1. Abre la pestaña **Datos**.
2. Pulsa **Conectar con Google**.
3. Autoriza el acceso de solo lectura.
4. Elige una hoja de cálculo de tu Drive.
5. Define pestaña y rango.
6. Pulsa **Conectar y leer**.
7. Mapea columnas y genera el lote.
