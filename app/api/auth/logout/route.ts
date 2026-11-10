import { json, route } from "@/lib/server/http";
import { clearSessionCookie } from "@/lib/server/session";
import { deleteSession } from "@/lib/server/users";

export const POST = route(async () => {
  const token = await clearSessionCookie();
  if (token) await deleteSession(token);
  return json({ ok: true });
});
