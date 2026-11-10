import { getBrandKit, saveBrandKit } from "@/lib/server/brand-kit";
import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { brandKitSchema } from "@/lib/server/schemas";

export const GET = route(async () => {
  const user = await requireApiUser();
  return json({ brandKit: await getBrandKit(user.id) });
});

export const PUT = route(async (request) => {
  const user = await requireApiUser();
  const body = await readJson(request, brandKitSchema, 10_000);
  const brandKit = await saveBrandKit(user.id, body);
  if (!brandKit) throw new HttpError(400, "Logo upload not found");
  return json({ brandKit });
});
