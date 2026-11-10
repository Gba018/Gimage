import "server-only";
import { OAuth2Client } from "google-auth-library";

export const GOOGLE_REFRESH_COOKIE = "gimage_google_refresh";
export const GOOGLE_OAUTH_STATE_COOKIE = "gimage_google_oauth";
export const GOOGLE_SHEETS_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

export function googleOAuthConfig(callbackPath: string) {
  const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret, APP_ORIGIN: origin } = process.env;
  if (!id || !secret || !origin) return null;
  const appUrl = new URL(origin);
  if (appUrl.pathname !== "/" || appUrl.search || appUrl.hash || appUrl.username || appUrl.password || (appUrl.protocol !== "https:" && !(appUrl.protocol === "http:" && appUrl.hostname === "localhost"))) {
    throw new Error("APP_ORIGIN must be an HTTPS origin (or localhost for development)");
  }
  const callback = new URL(callbackPath, appUrl).toString();
  return { client: new OAuth2Client(id, secret, callback), callback, origin: appUrl.origin, id, secret };
}

export const googleCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
};
