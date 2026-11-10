import { z } from "zod";
import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { claimProviderQuota } from "@/lib/server/provider-quota";
import { saveUpload, UploadError } from "@/lib/server/uploads";

export const POST = route(async (request) => {
  const user = await requireApiUser();
  const { prompt } = await readJson(request, z.object({ prompt: z.string().trim().min(5).max(500) }));
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new HttpError(503, "AI tools need OPENAI_API_KEY on this server");
  if (!await claimProviderQuota(user.id, "ai-image", 5)) throw new HttpError(429, "AI image limit reached for this hour");
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini", prompt, n: 1, size: "1024x1024", quality: "low", output_format: "webp", safety_identifier: user.id }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new HttpError(502, "AI image service is unavailable");
  }
  if (!response.ok) throw new HttpError(502, "AI image generation failed");
  const payload = await response.json() as { data?: { b64_json?: string }[] };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded || encoded.length > 14_000_000) throw new HttpError(502, "AI returned an invalid or oversized image");
  try {
    return json({ upload: await saveUpload(user.id, "ai-generated.webp", Buffer.from(encoded, "base64")) }, 201);
  } catch (err) {
    if (err instanceof UploadError) throw new HttpError(413, err.message);
    throw err;
  }
});
