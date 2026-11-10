import "server-only";
import { randomUUID } from "node:crypto";
import { execute, query, queryOne, transaction } from "./db";

export type Workspace = { id: string; name: string; role: "admin" | "editor" | "viewer" };
export type WorkspaceMember = { userId: string; name: string; email: string; role: Workspace["role"] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  return query<Workspace>("SELECT w.id, w.name, m.role FROM workspaces w JOIN workspace_members m ON m.workspace_id = w.id WHERE m.user_id = $1 ORDER BY w.created_at DESC", [userId]);
}

export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<Workspace["role"] | null> {
  if (!UUID.test(workspaceId)) return null;
  const row = await queryOne<{ role: Workspace["role"] }>("SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", [workspaceId, userId]);
  return row?.role ?? null;
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  const workspace: Workspace = { id: randomUUID(), name, role: "admin" };
  await transaction(async (db) => {
    await db.query("INSERT INTO workspaces (id, name, created_by, created_at) VALUES ($1, $2, $3, $4)", [workspace.id, name, userId, Date.now()]);
    await db.query("INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES ($1, $2, 'admin', $3)", [workspace.id, userId, Date.now()]);
  });
  return workspace;
}

export async function listMembers(userId: string, workspaceId: string): Promise<WorkspaceMember[] | null> {
  if (!await getWorkspaceRole(userId, workspaceId)) return null;
  return query<WorkspaceMember>("SELECT u.id AS \"userId\", u.name, u.email, m.role FROM workspace_members m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = $1 ORDER BY m.joined_at", [workspaceId]);
}

export async function addMember(adminId: string, workspaceId: string, email: string, role: "editor" | "viewer"): Promise<WorkspaceMember | null> {
  if (await getWorkspaceRole(adminId, workspaceId) !== "admin") return null;
  const member = await queryOne<{ id: string; name: string; email: string }>("SELECT id, name, email FROM users WHERE lower(email) = lower($1)", [email]);
  if (!member) return null;
  const creator = await queryOne<{ created_by: string }>("SELECT created_by FROM workspaces WHERE id = $1", [workspaceId]);
  if (creator?.created_by === member.id) return null;
  await execute("INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role", [workspaceId, member.id, role, Date.now()]);
  return { userId: member.id, name: member.name, email: member.email, role };
}

export async function removeMember(adminId: string, workspaceId: string, memberId: string): Promise<boolean> {
  if (await getWorkspaceRole(adminId, workspaceId) !== "admin") return false;
  if (!UUID.test(memberId)) return false;
  return (await execute("DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND user_id <> (SELECT created_by FROM workspaces WHERE id = $1)", [workspaceId, memberId])) > 0;
}
