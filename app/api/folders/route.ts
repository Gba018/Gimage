import { createFolder, listFolders } from "@/lib/server/designs";
import { json, readJson, requireApiUser, route } from "@/lib/server/http";
import { folderSchema } from "@/lib/server/schemas";

export const GET = route(async () => {
  const user = await requireApiUser();
  return json({ folders: await listFolders(user.id) });
});

export const POST = route(async (request) => {
  const user = await requireApiUser();
  const body = await readJson(request, folderSchema, 10_000);
  return json({ folder: await createFolder(user.id, body.name) }, 201);
});
