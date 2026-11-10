import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { createWorkspace, listWorkspaces } from "@/lib/server/workspaces";
import { z } from "zod";

export const GET = route(async () => {
  const user = await requireApiUser();
  return json({ workspaces: await listWorkspaces(user.id) });
});

export const POST = route(async (request) => {
  const user = await requireApiUser();
  const { name } = await readJson(request, z.object({ name: z.string().trim().min(1).max(80) }));
  if (!name) throw new HttpError(400, "Workspace name is required");
  return json({ workspace: await createWorkspace(user.id, name) }, 201);
});
