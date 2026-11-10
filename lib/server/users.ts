import "server-only";
import { randomUUID } from "node:crypto";
import { execute, queryOne, transaction } from "./db";
import { generateToken, hashPassword, sha256, verifyPassword } from "./passwords";
import { emailConfigured } from "./email";

export type User = { id: string; email: string; name: string };

type UserRow = User & { password_hash: string | null; email_verified_at: number | null };

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class EmailTakenError extends Error {}
export class GoogleAccountConflictError extends Error {}
export class EmailNotVerifiedError extends Error {}

const UNIQUE_VIOLATION = "23505";

export async function createUser(email: string, name: string, password: string): Promise<User> {
  const user: User = { id: randomUUID(), email, name };
  const hash = await hashPassword(password);
  try {
    await execute("INSERT INTO users (id, email, name, password_hash, created_at, email_verified_at) VALUES ($1, $2, $3, $4, $5, $6)", [
      user.id,
      email,
      name,
      hash,
      Date.now(),
      emailConfigured() ? null : Date.now(),
    ]);
  } catch (err) {
    // The unique index on lower(email) also covers two signups racing each other.
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) throw new EmailTakenError("An account with this email already exists");
    throw err;
  }
  return user;
}

// Hash compared against when the email is unknown, so response time does not reveal account existence.
let dummyHash: Promise<string> | null = null;

export async function authenticate(email: string, password: string): Promise<User | null> {
  const row = await queryOne<UserRow>("SELECT id, email, name, password_hash, email_verified_at FROM users WHERE lower(email) = lower($1)", [email]);
  if (!row) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  if (!row.password_hash) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  const ok = await verifyPassword(password, row.password_hash);
  if (ok && row.email_verified_at === null) throw new EmailNotVerifiedError("Verify your email before signing in");
  return ok ? { id: row.id, email: row.email, name: row.name } : null;
}

export async function issueEmailToken(email: string, purpose: "verify" | "reset"): Promise<{ token: string; email: string } | null> {
  const user = await queryOne<{ id: string; email: string; password_hash: string | null; email_verified_at: number | null }>(
    "SELECT id, email, password_hash, email_verified_at FROM users WHERE lower(email) = lower($1)", [email],
  );
  if (!user || (purpose === "verify" && user.email_verified_at !== null) || (purpose === "reset" && !user.password_hash)) return null;
  const token = generateToken();
  const now = Date.now();
  await transaction(async (db) => {
    await db.query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2", [user.id, purpose]);
    await db.query("INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)", [
      sha256(token), user.id, purpose, now + (purpose === "verify" ? 24 : 1) * 60 * 60 * 1000, now,
    ]);
  });
  return { token, email: user.email };
}

export async function consumeEmailToken(token: string, purpose: "verify" | "reset", password?: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  if (purpose === "reset" && !password) return false;
  const hash = purpose === "reset" && password ? await hashPassword(password) : null;
  return transaction(async (db) => {
    const result = await db.query<{ user_id: string }>(
      "DELETE FROM email_tokens WHERE token_hash = $1 AND purpose = $2 AND expires_at > $3 RETURNING user_id",
      [sha256(token), purpose, Date.now()],
    );
    const userId = result.rows[0]?.user_id;
    if (!userId) return false;
    if (purpose === "verify") {
      await db.query("UPDATE users SET email_verified_at = $1 WHERE id = $2", [Date.now(), userId]);
    } else if (hash) {
      await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
      await db.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    }
    await db.query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2", [userId, purpose]);
    return true;
  });
}

/** Google subject is the durable identity; email is used only for a trusted first-time link. */
export async function getOrCreateGoogleUser(identity: { sub: string; email: string; name: string; hostedDomain?: string }): Promise<User> {
  const email = identity.email.toLowerCase();
  return transaction(async (client) => {
    // Serialize first-time sign-ins for the same email across server processes.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
    const linked = await client.query<User>(
      "SELECT u.id, u.email, u.name FROM google_accounts g JOIN users u ON u.id = g.user_id WHERE g.google_sub = $1",
      [identity.sub],
    );
    if (linked.rows[0]) return linked.rows[0];

    const existing = await client.query<User>("SELECT id, email, name FROM users WHERE lower(email) = $1 FOR UPDATE", [email]);
    let user = existing.rows[0];
    if (user) {
      const domain = email.split("@")[1];
      if (domain !== "gmail.com" && identity.hostedDomain?.toLowerCase() !== domain) {
        throw new GoogleAccountConflictError("Sign in with your password for this existing account");
      }
    } else {
      user = { id: randomUUID(), email, name: identity.name };
      await client.query("INSERT INTO users (id, email, name, password_hash, created_at, email_verified_at) VALUES ($1, $2, $3, NULL, $4, $4)", [
        user.id,
        user.email,
        user.name,
        Date.now(),
      ]);
    }
    await client.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, $1) WHERE id = $2", [Date.now(), user.id]);
    await client.query("INSERT INTO google_accounts (google_sub, user_id, created_at) VALUES ($1, $2, $3)", [
      identity.sub,
      user.id,
      Date.now(),
    ]);
    return user;
  });
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = generateToken();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await execute("DELETE FROM sessions WHERE expires_at < $1", [now]);
  await execute("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)", [
    sha256(token),
    userId,
    expiresAt,
    now,
  ]);
  return { token, expiresAt };
}

export async function getUserBySessionToken(token: string): Promise<User | null> {
  const row = await queryOne<User>(
    `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > $2`,
    [sha256(token), Date.now()],
  );
  return row ? { id: row.id, email: row.email, name: row.name } : null;
}

export async function deleteSession(token: string): Promise<void> {
  await execute("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
}
