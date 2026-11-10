import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { DesignConflictError, deleteDesign, getDesign, purgeDesign, restoreDesign, updateDesign } from "@/lib/server/designs";
import { MAX_DOC_BYTES, patchDesignSchema } from "@/lib/server/schemas";
import { parseDesignDoc, type DesignDoc } from "@/lib/design/types";

type Ctx = RouteContext<"/api/designs/[id]">;

export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const design = await getDesign(user.id, id);
  if (!design) throw new HttpError(404, "Design not found");
  return json({ design });
});

export const PATCH = route(async (request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const body = await readJson(request, patchDesignSchema, MAX_DOC_BYTES);
  let doc: DesignDoc | undefined;
  if (body.doc) {
    const parsed = parseDesignDoc(body.doc);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    doc = parsed.value;
  }
  try {
    const result = await updateDesign(user.id, id, { title: body.title, doc, thumbnail: body.thumbnail, favourite: body.favourite, folderId: body.folderId }, body.baseRevision);
    if (result === null) throw new HttpError(404, "Design not found");
    return json(result);
  } catch (err) {
    if (err instanceof DesignConflictError) {
      return json({ error: "This design was changed in another tab or window.", revision: err.currentRevision }, 409);
    }
    throw err;
  }
});

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "1";
  if (!(await (permanent ? purgeDesign(user.id, id) : deleteDesign(user.id, id)))) throw new HttpError(404, "Design not found");
  return json({ ok: true });
});

export const POST = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  if (!(await restoreDesign(user.id, id))) throw new HttpError(404, "Design not found in trash");
  return json({ ok: true });
});
