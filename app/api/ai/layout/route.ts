import { z } from "zod";
import { HttpError, json, readJson, requireApiUser, route } from "@/lib/server/http";
import { claimProviderQuota } from "@/lib/server/provider-quota";

const resultSchema = z.object({ headline: z.string().min(1).max(120), subtitle: z.string().min(1).max(240), background: z.string().regex(/^#[0-9a-fA-F]{6}$/), foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), layout: z.enum(["centered", "split"]) });

export const POST = route(async (request) => {
  const user = await requireApiUser();
  const { prompt } = await readJson(request, z.object({ prompt: z.string().trim().min(5).max(500) }));
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new HttpError(503, "AI tools need OPENAI_API_KEY on this server");
  if (!await claimProviderQuota(user.id, "ai-layout", 20)) throw new HttpError(429, "AI layout limit reached for this hour");
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "Create concise original marketing copy and an accessible two-color design palette for the user's brief. Return only the requested JSON. Ensure strong foreground/background contrast." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_schema", json_schema: { name: "design_layout", strict: true, schema: {
          type: "object", properties: { headline: { type: "string" }, subtitle: { type: "string" }, background: { type: "string" }, foreground: { type: "string" }, accent: { type: "string" }, layout: { type: "string", enum: ["centered", "split"] } },
          required: ["headline", "subtitle", "background", "foreground", "accent", "layout"], additionalProperties: false,
        } } },
        safety_identifier: user.id,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new HttpError(502, "AI service is unavailable");
  }
  if (!response.ok) throw new HttpError(502, "AI layout generation failed");
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  let content: unknown;
  try { content = JSON.parse(payload.choices?.[0]?.message?.content ?? ""); } catch { throw new HttpError(502, "AI returned an invalid layout"); }
  const layout = resultSchema.safeParse(content);
  if (!layout.success) throw new HttpError(502, "AI returned an invalid layout");
  return json({ layout: layout.data });
});
