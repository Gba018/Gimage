import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getUserBySessionToken, type User } from "./users";

export const SESSION_COOKIE = "gimage_session";

export async function getCurrentUser(): Promise<User | null> {
  // Session validity depends on the current time, so this always runs at request time.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await getUserBySessionToken(token);
}

/** For Server Components: redirects to login when there is no valid session. */
export async function requirePageUser(next: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function setSessionCookie(token: string, expiresAt: number): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  return token;
}
