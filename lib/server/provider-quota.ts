import "server-only";
import { randomUUID } from "node:crypto";
import { transaction } from "./db";

/** Database-backed hourly cap so serverless instances share the same budget. */
export async function claimProviderQuota(userId: string, service: string, limit: number): Promise<boolean> {
  return transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${userId}:${service}`]);
    const now = Date.now();
    await db.query("DELETE FROM provider_requests WHERE user_id = $1 AND service = $2 AND created_at < $3", [userId, service, now - 7 * 24 * 60 * 60 * 1000]);
    const count = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM provider_requests WHERE user_id = $1 AND service = $2 AND created_at > $3", [userId, service, now - 60 * 60 * 1000]);
    if (count.rows[0].count >= limit) return false;
    await db.query("INSERT INTO provider_requests (id, user_id, service, created_at) VALUES ($1, $2, $3, $4)", [randomUUID(), userId, service, now]);
    return true;
  });
}
