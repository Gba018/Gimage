import { clientIp, HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";
import { emailConsumeSchema, emailRequestSchema } from "@/lib/server/schemas";
import { emailConfigured, sendAccountEmail } from "@/lib/server/email";
import { consumeEmailToken, issueEmailToken } from "@/lib/server/users";

export const POST = route(async (request) => {
  if (!emailConfigured()) throw new HttpError(503, "Account email is not configured on this server");
  const body = await readJson(request, emailRequestSchema, 10_000);
  rateLimit(`email-request-ip:${clientIp(request)}`, 5, 60 * 60 * 1000);
  rateLimit(`email-request:${body.email}`, 3, 60 * 60 * 1000);
  const issued = await issueEmailToken(body.email, body.purpose);
  if (issued) {
    try { await sendAccountEmail(issued.email, body.purpose, issued.token); }
    catch { throw new HttpError(502, "Could not send account email. Try again later."); }
  }
  return json({ ok: true });
});

export const PATCH = route(async (request) => {
  rateLimit(`email-consume:${clientIp(request)}`, 20, 60 * 60 * 1000);
  const body = await readJson(request, emailConsumeSchema, 10_000);
  const ok = await consumeEmailToken(body.token, body.purpose, body.purpose === "reset" ? body.password : undefined);
  if (!ok) throw new HttpError(400, "This link is invalid or has expired");
  return json({ ok: true });
});
