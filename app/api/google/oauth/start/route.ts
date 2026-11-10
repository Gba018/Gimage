import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/session";
import { googleCookieOptions, googleOAuthConfig, GOOGLE_OAUTH_STATE_COOKIE, GOOGLE_SHEETS_SCOPES } from "@/lib/server/google-oauth";
import { safeNext } from "@/lib/safe-redirect";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(safeNext(url.searchParams.get("next")))}`, url.origin));
  const config = googleOAuthConfig("/api/google/oauth/callback");
  if (!config) return NextResponse.json({ error: "Google Sheets is not configured" }, { status: 503 });

  const state = randomBytes(32).toString("base64url");
  const { codeVerifier, codeChallenge } = await config.client.generateCodeVerifierAsync();
  const authUrl = config.client.generateAuthUrl({
    scope: GOOGLE_SHEETS_SCOPES,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });
  const stateData = { state, verifier: codeVerifier, next: safeNext(url.searchParams.get("next")) };
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, Buffer.from(JSON.stringify(stateData)).toString("base64url"), {
    ...googleCookieOptions,
    path: "/api/google/oauth",
    maxAge: 600,
  });
  return response;
}
