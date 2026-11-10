import { getDesignStatus } from "@/lib/server/designs";
import { execute, query } from "@/lib/server/db";
import { HttpError, json, requireApiUser, route } from "@/lib/server/http";

type Ctx = RouteContext<"/api/designs/[id]/presence">;

export const POST = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const status = await getDesignStatus(user.id, id);
  if (!status) throw new HttpError(404, "Design not found");
  const now = Date.now();
  await execute("INSERT INTO design_presence (design_id, user_id, last_seen) VALUES ($1, $2, $3) ON CONFLICT (design_id, user_id) DO UPDATE SET last_seen = EXCLUDED.last_seen", [id, user.id, now]);
  const participants = await query<{ id: string; name: string }>("SELECT u.id, u.name FROM design_presence p JOIN users u ON u.id = p.user_id WHERE p.design_id = $1 AND p.last_seen > $2 AND p.user_id <> $3 ORDER BY p.last_seen DESC LIMIT 10", [id, now - 20_000, user.id]);
  return json({ ...status, participants });
});
