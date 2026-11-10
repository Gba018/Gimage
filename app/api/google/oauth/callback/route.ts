import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/session";
import { googleCookieOptions, googleOAuthConfig, GOOGLE_OAUTH_STATE_COOKIE, GOOGLE_REFRESH_COOKIE } from "@/lib/server/google-oauth";
import { safeNext } from "@/lib/safe-redirect";

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function statusRedirect(origin: string, next: string, status: string): URL {
  const target = new URL(safeNext(next), origin);
  target.searchParams.set("google", status);
  return target;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const config = googleOAuthConfig("/api/google/oauth/callback");
  if (!config) return NextResponse.json({ error: "Google Sheets is not configured" }, { status: 503 });
  const store = await cookies();
  const raw = store.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  store.delete(GOOGLE_OAUTH_STATE_COOKIE);
  let state: { state: string; verifier: string; next: string } | null = null;
  try {
    const parsed = JSON.parse(Buffer.from(raw ?? "", "base64url").toString("utf8"));
    if (parsed && typeof parsed.state === "string" && typeof parsed.verifier === "string" && typeof parsed.next === "string") state = parsed;
  } catch {
    state = null;
  }
  const code = url.searchParams.get("code");
  if (!state || !url.searchParams.get("state") || !sameSecret(state.state, url.searchParams.get("state")!)) {
    return NextResponse.redirect(new URL("/dashboard?google=sheets-auth-failed", config.origin));
  }
  if (!code || code.length > 4096) return NextResponse.redirect(new URL("/dashboard?google=sheets-auth-failed", config.origin));
  if (!await getCurrentUser()) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(safeNext(state.next))}`, config.origin));

  try {
    const { tokens } = await config.client.getToken({ code, codeVerifier: state.verifier });
    if (!tokens.refresh_token) throw new Error("Google did not return a refresh token");
    const response = NextResponse.redirect(statusRedirect(config.origin, state.next, "sheets-connected"));
    response.cookies.set(GOOGLE_REFRESH_COOKIE, tokens.refresh_token, googleCookieOptions);
    return response;
  } catch (error) {
    console.error("[google] Sheets authorization failed", error);
    return NextResponse.redirect(statusRedirect(config.origin, state.next, "sheets-auth-failed"));
  }
}
