import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser } from "./session";
import type { User } from "./users";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Rejects cross-site state-changing requests. Session cookies are SameSite=Lax,
 * this adds a second, explicit check on the Origin header.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Browsers always send Origin on cross-origin POST/PUT/PATCH/DELETE; a missing
    // header means same-origin navigation or a non-browser client.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
      throw new HttpError(403, "Cross-site request rejected");
    }
    return;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Invalid origin");
  }
  if (!host || originHost !== host) throw new HttpError(403, "Cross-site request rejected");
}

export async function requireApiUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

export async function readJson<S extends z.ZodType>(request: Request, schema: S, maxBytes = 1_000_000): Promise<z.infer<S>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new HttpError(413, "Request body too large");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request body too large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, `${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  return parsed.data;
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Wraps a route handler with origin checks (for mutations) and uniform error responses. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) assertSameOrigin(request);
      return await handler(request, context);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.status, err.message);
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, err);
      return jsonError(500, "Something went wrong");
    }
  };
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Fixed-window in-memory limiter; adequate for a single-process deployment. */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
    }
    return;
  }
  bucket.count++;
  if (bucket.count > limit) throw new HttpError(429, "Too many attempts. Please wait a moment and try again.");
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}
