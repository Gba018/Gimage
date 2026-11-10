import { addComment, listComments } from "@/lib/server/comments";
import { clientIp, HttpError, json, rateLimit, readJson, route } from "@/lib/server/http";
import { commentSchema } from "@/lib/server/schemas";

type Ctx = RouteContext<"/api/shared/[token]/comments">;

export const GET = route(async (_request, ctx: Ctx) => {
  const { token } = await ctx.params;
  const comments = await listComments(token);
  if (!comments) throw new HttpError(404, "Share link not found");
  return json({ comments });
});

export const POST = route(async (request, ctx: Ctx) => {
  const { token } = await ctx.params;
  rateLimit(`comment:${token}:${clientIp(request)}`, 10, 60 * 60 * 1000);
  const body = await readJson(request, commentSchema, 10_000);
  const comment = await addComment(token, body.authorName, body.body, body.pageIndex);
  if (!comment) throw new HttpError(404, "Share link not found or comment limit reached");
  return json({ comment }, 201);
});
