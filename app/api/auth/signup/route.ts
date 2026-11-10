import { clientIp, HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";
import { signupSchema } from "@/lib/server/schemas";
import { setSessionCookie } from "@/lib/server/session";
import { createSession, createUser, EmailTakenError } from "@/lib/server/users";
import { issueEmailToken } from "@/lib/server/users";
import { emailConfigured, sendAccountEmail } from "@/lib/server/email";

export const POST = route(async (request) => {
  rateLimit(`signup:${clientIp(request)}`, 10, 60 * 60 * 1000);
  const body = await readJson(request, signupSchema, 10_000);
  try {
    const user = await createUser(body.email, body.name, body.password);
    if (emailConfigured()) {
      const token = await issueEmailToken(user.email, "verify");
      if (token) {
        try { await sendAccountEmail(token.email, "verify", token.token); }
        catch { throw new HttpError(503, "Account created, but verification email could not be sent. Try Resend verification."); }
      }
      return json({ needsVerification: true }, 201);
    }
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return json({ user }, 201);
  } catch (err) {
    if (err instanceof EmailTakenError) throw new HttpError(409, err.message);
    throw err;
  }
});
