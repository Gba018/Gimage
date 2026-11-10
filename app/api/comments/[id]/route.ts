import { deleteComment } from "@/lib/server/comments";
import { HttpError, json, requireApiUser, route } from "@/lib/server/http";

type Ctx = RouteContext<"/api/comments/[id]">;

export const DELETE = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  if (!(await deleteComment(user.id, id))) throw new HttpError(404, "Comment not found");
  return json({ ok: true });
});
