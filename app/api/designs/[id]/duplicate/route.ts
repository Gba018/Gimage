import { HttpError, json, requireApiUser, route } from "@/lib/server/http";
import { duplicateDesign } from "@/lib/server/designs";

export const POST = route(async (_request, ctx: RouteContext<"/api/designs/[id]/duplicate">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const copy = await duplicateDesign(user.id, id);
  if (!copy) throw new HttpError(404, "Design not found");
  return json({ design: { id: copy.id } }, 201);
});
