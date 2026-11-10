import { HttpError, json, requireApiUser, route } from "@/lib/server/http";
import { createDesign, getDesignByShareToken } from "@/lib/server/designs";

/** Copies a publicly shared design into the signed-in user's workspace. */
export const POST = route(async (_request, ctx: RouteContext<"/api/shared/[token]/copy">) => {
  const user = await requireApiUser();
  const { token } = await ctx.params;
  const source = await getDesignByShareToken(token);
  if (!source) throw new HttpError(404, "This link is no longer active");
  const copy = await createDesign(user.id, `${source.title} (copy)`.slice(0, 120), source.doc, source.thumbnail);
  return json({ design: { id: copy.id } }, 201);
});
