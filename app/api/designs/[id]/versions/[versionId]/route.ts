import { HttpError, json, requireApiUser, route } from "@/lib/server/http";
import { getVersionDoc } from "@/lib/server/designs";

export const GET = route(async (_request, ctx: RouteContext<"/api/designs/[id]/versions/[versionId]">) => {
  const user = await requireApiUser();
  const { id, versionId } = await ctx.params;
  const doc = await getVersionDoc(user.id, id, versionId);
  if (!doc) throw new HttpError(404, "Version not found");
  return json({ doc });
});
