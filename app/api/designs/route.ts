import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { createDesign, listDesigns } from "@/lib/server/designs";
import { createDesignSchema, MAX_DOC_BYTES } from "@/lib/server/schemas";
import { parseDesignDoc } from "@/lib/design/types";
import { getWorkspaceRole } from "@/lib/server/workspaces";
import { z } from "zod";

export const GET = route(async (request) => {
  const user = await requireApiUser();
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || undefined;
  const params = new URL(request.url).searchParams;
  const view = params.get("view") === "trash" ? "trash" : params.get("view") === "favourites" ? "favourites" : "active";
  const workspaceId = params.get("workspace") || undefined;
  if (workspaceId && !z.uuid().safeParse(workspaceId).success) throw new HttpError(400, "Invalid workspace");
  return json({ designs: await listDesigns(user.id, q, view, params.get("folder") || undefined, workspaceId) });
});

export const POST = route(async (request) => {
  const user = await requireApiUser();
  const body = await readJson(request, createDesignSchema, MAX_DOC_BYTES);
  const doc = parseDesignDoc(body.doc);
  if (!doc.ok) throw new HttpError(400, doc.error);
  if (body.workspaceId && !["admin", "editor"].includes(await getWorkspaceRole(user.id, body.workspaceId) ?? "")) throw new HttpError(403, "Workspace does not allow editing");
  const design = await createDesign(user.id, body.title ?? "Untitled design", doc.value, null, body.workspaceId);
  return json({ design: { id: design.id } }, 201);
});
