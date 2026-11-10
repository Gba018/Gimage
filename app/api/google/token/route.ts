import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { json, requireApiUser, route } from "@/lib/server/http";
import { googleOAuthConfig, GOOGLE_REFRESH_COOKIE } from "@/lib/server/google-oauth";

export const GET = route(async () => {
  await requireApiUser();
  const config = googleOAuthConfig("/api/google/oauth/callback");
  const refreshToken = (await cookies()).get(GOOGLE_REFRESH_COOKIE)?.value;
  if (!config || !refreshToken) return NextResponse.json({ error: "Google Sheets is not connected" }, { status: 401 });
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.id, client_secret: config.secret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    });
    const tokens = await tokenResponse.json() as { access_token?: string; expires_in?: number };
    if (!tokenResponse.ok || !tokens.access_token) throw new Error("Google did not return an access token");
    return json({ accessToken: tokens.access_token, expiresIn: tokens.expires_in ?? 3600 });
  } catch {
    const response = NextResponse.json({ error: "Google Sheets authorization expired" }, { status: 401 });
    response.cookies.set(GOOGLE_REFRESH_COOKIE, "", { ...{ path: "/" }, maxAge: 0 });
    return response;
  }
});
