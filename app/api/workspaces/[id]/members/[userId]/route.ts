import { HttpError, json, requireApiUser, route } from "@/lib/server/http";
import { removeMember } from "@/lib/server/workspaces";

type Ctx = RouteContext<"/api/workspaces/[id]/members/[userId]">;

export const DELETE = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id, userId } = await ctx.params;
  if (!await removeMember(user.id, id, userId)) throw new HttpError(403, "Cannot remove this member");
  return json({ ok: true });
});
