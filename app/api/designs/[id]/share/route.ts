import { HttpError, json, requireApiUser, route } from "@/lib/server/http";
import { disableSharing, enableSharing } from "@/lib/server/designs";

type Ctx = RouteContext<"/api/designs/[id]/share">;

export const POST = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const token = await enableSharing(user.id, id);
  if (!token) throw new HttpError(404, "Design not found");
  return json({ token, path: `/s/${token}` });
});

export const DELETE = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  if (!(await disableSharing(user.id, id))) throw new HttpError(404, "Design not found");
  return json({ ok: true });
});
