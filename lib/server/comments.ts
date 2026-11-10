import "server-only";
import { randomUUID } from "node:crypto";
import { execute, query, queryOne, transaction } from "./db";

export type DesignComment = { id: string; authorName: string; body: string; pageIndex: number; createdAt: number };
type CommentRow = { id: string; author_name: string; body: string; page_index: number; created_at: number };

const toComment = (row: CommentRow): DesignComment => ({ id: row.id, authorName: row.author_name, body: row.body, pageIndex: row.page_index, createdAt: row.created_at });

export async function listComments(token: string): Promise<DesignComment[] | null> {
  const design = await queryOne<{ id: string }>("SELECT id FROM designs WHERE share_token = $1 AND deleted_at IS NULL", [token]);
  if (!design) return null;
  const rows = await query<CommentRow>("SELECT id, author_name, body, page_index, created_at FROM design_comments WHERE design_id = $1 ORDER BY created_at DESC LIMIT 200", [design.id]);
  return rows.reverse().map(toComment);
}

export async function addComment(token: string, authorName: string, body: string, pageIndex: number): Promise<DesignComment | null> {
  return transaction(async (db) => {
    const result = await db.query<{ id: string; pages: number }>(
      "SELECT id, jsonb_array_length(doc->'pages') AS pages FROM designs WHERE share_token = $1 AND deleted_at IS NULL FOR UPDATE", [token],
    );
    const design = result.rows[0];
    if (!design || pageIndex >= design.pages) return null;
    const count = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM design_comments WHERE design_id = $1", [design.id]);
    if ((count.rows[0]?.count ?? 0) >= 500) return null;
    const comment = { id: randomUUID(), authorName, body, pageIndex, createdAt: Date.now() };
    await db.query("INSERT INTO design_comments (id, design_id, author_name, body, page_index, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [comment.id, design.id, authorName, body, pageIndex, comment.createdAt]);
    return comment;
  });
}

export async function deleteComment(ownerId: string, commentId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(commentId)) return false;
  return (await execute("DELETE FROM design_comments c USING designs d WHERE c.id = $1 AND c.design_id = d.id AND ((d.workspace_id IS NULL AND d.owner_id = $2) OR d.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $2 AND role IN ('admin', 'editor')))", [commentId, ownerId])) > 0;
}
