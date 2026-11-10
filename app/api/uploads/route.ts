import { clientIp, HttpError, json, rateLimit, requireApiUser, route } from "@/lib/server/http";
import { listUploads, MAX_UPLOAD_BYTES, saveUpload, UploadError } from "@/lib/server/uploads";

export const GET = route(async () => {
  const user = await requireApiUser();
  return json({ uploads: await listUploads(user.id) });
});

export const POST = route(async (request) => {
  const user = await requireApiUser();
  rateLimit(`upload:${user.id}:${clientIp(request)}`, 60, 10 * 60 * 1000);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    throw new HttpError(413, "File is larger than 10 MB");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, "Expected multipart form data");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Missing file");
  try {
    const upload = await saveUpload(user.id, file.name, new Uint8Array(await file.arrayBuffer()));
    return json({ upload }, 201);
  } catch (err) {
    if (err instanceof UploadError) throw new HttpError(400, err.message);
    throw err;
  }
});
