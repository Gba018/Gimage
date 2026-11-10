import { z } from "zod";
import { clientIp, HttpError, json, rateLimit, readJson, requireApiUser, route } from "@/lib/server/http";
import { getOwnedUploadData, MAX_UPLOAD_BYTES, saveUpload, UploadError } from "@/lib/server/uploads";
import { claimProviderQuota } from "@/lib/server/provider-quota";

export const POST = route(async (request) => {
  const user = await requireApiUser();
  rateLimit(`remove-bg:${user.id}:${clientIp(request)}`, 20, 60 * 60 * 1000);
  const { uploadId } = await readJson(request, z.object({ uploadId: z.string().min(8).max(64) }));
  const source = await getOwnedUploadData(user.id, uploadId);
  if (!source) throw new HttpError(404, "Image not found");
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) throw new HttpError(503, "Background removal needs REMOVE_BG_API_KEY on this server");
  if (!await claimProviderQuota(user.id, "remove-bg", 10)) throw new HttpError(429, "Background removal limit reached for this hour");

  const form = new FormData();
  form.set("image_file", new Blob([Buffer.from(source.data)], { type: source.mime }), "source-image");
  form.set("size", "auto");
  let result: Response;
  try {
    result = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST", headers: { "X-Api-Key": key }, body: form, signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new HttpError(502, "Background removal service is unavailable");
  }
  if (!result.ok) throw new HttpError(502, result.status === 402 ? "Background removal credits are exhausted" : "Background removal failed");
  if (Number(result.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES) throw new HttpError(413, "Processed image is too large");
  const bytes = new Uint8Array(await result.arrayBuffer());
  try {
    return json({ upload: await saveUpload(user.id, "background-removed.png", bytes) }, 201);
  } catch (err) {
    if (err instanceof UploadError) throw new HttpError(400, err.message);
    throw err;
  }
});
