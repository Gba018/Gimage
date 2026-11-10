import { deleteFolder } from "@/lib/server/designs";
import { HttpError, json, requireApiUser, route } from "@/lib/server/http";

type Ctx = RouteContext<"/api/folders/[id]">;

export const DELETE = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  if (!(await deleteFolder(user.id, id))) throw new HttpError(404, "Folder not found");
  return json({ ok: true });
});
