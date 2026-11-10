import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { createVersion, listVersions } from "@/lib/server/designs";
import { createVersionSchema } from "@/lib/server/schemas";

type Ctx = RouteContext<"/api/designs/[id]/versions">;

export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const versions = await listVersions(user.id, id);
  if (!versions) throw new HttpError(404, "Design not found");
  return json({ versions });
});

export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const body = await readJson(request, createVersionSchema, 2_000);
  const version = await createVersion(user.id, id, body.label || null);
  if (!version) throw new HttpError(404, "Design not found");
  return json({ version }, 201);
});
