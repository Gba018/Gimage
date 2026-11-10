import { HttpError, json, requireApiUser, route } from "@/lib/server/http";
import { deleteUpload, getUploadData } from "@/lib/server/uploads";

type Ctx = RouteContext<"/api/uploads/[id]">;

export const GET = route(async (_request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const upload = await getUploadData(id);
  if (!upload) throw new HttpError(404, "Not found");
  return new Response(new Uint8Array(upload.data), {
    headers: {
      "Content-Type": upload.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
});

export const DELETE = route(async (_request, ctx: Ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  if (!(await deleteUpload(user.id, id))) throw new HttpError(404, "Not found");
  return json({ ok: true });
});
