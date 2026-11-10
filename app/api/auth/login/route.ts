import { randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clientIp, HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";
import { loginSchema } from "@/lib/server/schemas";
import { setSessionCookie } from "@/lib/server/session";
import { authenticate, createSession, getOrCreateGoogleUser, GoogleAccountConflictError, EmailNotVerifiedError } from "@/lib/server/users";
import { safeNext } from "@/lib/safe-redirect";

const GOOGLE_STATE_COOKIE = "gimage_google_oauth";
const GOOGLE_STATE_PATH = "/api/auth/login";

type GoogleState = { state: string; nonce: string; verifier: string; next: string; from: "login" | "signup" };

function googleClient() {
  const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret, APP_ORIGIN: origin } = process.env;
  if (!id || !secret || !origin) return null;
  const appUrl = new URL(origin);
  if (appUrl.pathname !== "/" || appUrl.search || appUrl.hash || appUrl.username || appUrl.password || (appUrl.protocol !== "https:" && !(appUrl.protocol === "http:" && appUrl.hostname === "localhost"))) {
    throw new Error("APP_ORIGIN must be an HTTPS origin (or localhost for development)");
  }
  const callback = new URL(GOOGLE_STATE_PATH, appUrl).toString();
  return { client: new OAuth2Client(id, secret, callback), callback, origin: appUrl.origin, id };
}

function errorRedirect(origin: string, from: "login" | "signup", error: string): NextResponse {
  const url = new URL(`/${from}`, origin);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readGoogleState(raw: string | undefined): GoogleState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") return null;
    const state = value as Partial<GoogleState>;
    if (typeof state.state !== "string" || typeof state.nonce !== "string" || typeof state.verifier !== "string" || typeof state.next !== "string" || (state.from !== "login" && state.from !== "signup")) return null;
    return state as GoogleState;
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") === "signup" ? "signup" : "login";
  const config = googleClient();
  if (!config) return errorRedirect(url.origin, from, "google_not_configured");
  if (url.origin !== config.origin) return errorRedirect(config.origin, from, "google_auth_failed");

  if (!url.searchParams.has("code") && !url.searchParams.has("error")) {
    try {
      rateLimit(`google-start:${clientIp(request)}`, 30, 15 * 60 * 1000);
    } catch (error) {
      if (error instanceof HttpError) return new Response("Too many sign-in attempts. Try again later.", { status: error.status });
      throw error;
    }
    const state: GoogleState = {
      state: randomBytes(32).toString("base64url"),
      nonce: randomBytes(32).toString("base64url"),
      verifier: "",
      next: safeNext(url.searchParams.get("next")),
      from,
    };
    const { codeVerifier, codeChallenge } = await config.client.generateCodeVerifierAsync();
    state.verifier = codeVerifier;
    const authUrl = config.client.generateAuthUrl({
      scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"],
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      state: state.state,
      nonce: state.nonce,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_STATE_COOKIE, Buffer.from(JSON.stringify(state)).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: GOOGLE_STATE_PATH,
      maxAge: 600,
    });
    return response;
  }

  const store = await cookies();
  const state = readGoogleState(store.get(GOOGLE_STATE_COOKIE)?.value);
  store.set(GOOGLE_STATE_COOKIE, "", { path: GOOGLE_STATE_PATH, maxAge: 0 });
  if (!state || !url.searchParams.get("state") || !equalSecret(state.state, url.searchParams.get("state")!)) {
    return errorRedirect(config.origin, state?.from ?? from, "google_auth_failed");
  }
  if (url.searchParams.has("error")) return errorRedirect(config.origin, state.from, "google_cancelled");
  const code = url.searchParams.get("code");
  if (!code || code.length > 4096) return errorRedirect(config.origin, state.from, "google_auth_failed");

  try {
    const { tokens } = await config.client.getToken({ code, codeVerifier: state.verifier });
    if (!tokens.id_token) throw new Error("Missing Google ID token");
    const ticket = await config.client.verifyIdToken({ idToken: tokens.id_token, audience: config.id });
    const identity = ticket.getPayload();
    if (!identity || !identity.sub || !identity.email || identity.email_verified !== true || identity.nonce !== state.nonce) {
      throw new Error("Invalid Google identity");
    }
    const user = await getOrCreateGoogleUser({
      sub: identity.sub,
      email: identity.email,
      name: (identity.name?.trim() || identity.email.split("@")[0]).slice(0, 80),
      hostedDomain: identity.hd,
    });
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    const response = NextResponse.redirect(new URL(safeNext(state.next), config.origin), { status: 303 });
    if (tokens.refresh_token) {
      response.cookies.set("gimage_google_refresh", tokens.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      });
    }
    return response;
  } catch (error) {
    if (error instanceof GoogleAccountConflictError) return errorRedirect(config.origin, state.from, "google_existing_account");
    console.error("[auth] Google sign-in failed", error);
    return errorRedirect(config.origin, state.from, "google_auth_failed");
  }
}

export const POST = route(async (request) => {
  const body = await readJson(request, loginSchema, 10_000);
  rateLimit(`login:${clientIp(request)}`, 30, 15 * 60 * 1000);
  rateLimit(`login:${body.email}`, 10, 15 * 60 * 1000);
  let user;
  try {
    user = await authenticate(body.email, body.password);
  } catch (error) {
    if (error instanceof EmailNotVerifiedError) throw new HttpError(403, error.message);
    throw error;
  }
  if (!user) throw new HttpError(401, "Incorrect email or password");
  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return json({ user });
});
