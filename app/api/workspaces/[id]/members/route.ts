import { z } from "zod";
import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { addMember, getWorkspaceRole, listMembers } from "@/lib/server/workspaces";

type Ctx = RouteContext<"/api/workspaces/[id]/members">;

export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const members = await listMembers(user.id, id);
  if (!members) throw new HttpError(404, "Workspace not found");
  return json({ members });
});

export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  if (await getWorkspaceRole(user.id, id) !== "admin") throw new HttpError(403, "Only workspace admins can add members");
  const { email, role } = await readJson(request, z.object({ email: z.email().max(320), role: z.enum(["editor", "viewer"]) }));
  const member = await addMember(user.id, id, email, role);
  if (!member) throw new HttpError(404, "Create an account for this email before adding it");
  return json({ member }, 201);
});
