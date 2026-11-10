import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Timestamps are stored as BIGINT epoch milliseconds, well within Number's safe range.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

/**
 * PostgreSQL access through a single connection pool per process (reused across
 * hot reloads in development). Configured by DATABASE_URL; see .env.example.
 */

const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE UNIQUE INDEX users_email_lower ON users (lower(email));
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);
  CREATE TABLE designs (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    doc JSONB NOT NULL,
    thumbnail TEXT,
    share_token TEXT UNIQUE,
    revision INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );
  CREATE INDEX designs_owner ON designs(owner_id, updated_at DESC);
  CREATE TABLE design_versions (
    id UUID PRIMARY KEY,
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    doc JSONB NOT NULL,
    thumbnail TEXT,
    label TEXT,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX versions_design ON design_versions(design_id, created_at DESC);
  CREATE TABLE uploads (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    data BYTEA NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX uploads_owner ON uploads(owner_id, created_at DESC);
  `,
  `
  ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  CREATE TABLE google_accounts (
    google_sub TEXT PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL
  );
  `,
  `
  ALTER TABLE users ADD COLUMN email_verified_at BIGINT;
  UPDATE users SET email_verified_at = created_at;
  CREATE TABLE email_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX email_tokens_user_purpose ON email_tokens(user_id, purpose);
  `,
  `
  CREATE TABLE folders (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX folders_owner ON folders(owner_id, name);
  ALTER TABLE designs ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
  ALTER TABLE designs ADD COLUMN favourite BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE designs ADD COLUMN deleted_at BIGINT;
  CREATE INDEX designs_trash ON designs(owner_id, deleted_at) WHERE deleted_at IS NOT NULL;
  `,
  `
  CREATE TABLE brand_kits (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    font_family TEXT,
    logo_upload_id TEXT REFERENCES uploads(id) ON DELETE SET NULL,
    updated_at BIGINT NOT NULL
  );
  `,
  `
  CREATE TABLE design_comments (
    id UUID PRIMARY KEY,
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    page_index INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX comments_design ON design_comments(design_id, created_at DESC);
  `,
  `
  CREATE TABLE workspaces (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL
  );
  CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    joined_at BIGINT NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
  );
  CREATE INDEX workspace_members_user ON workspace_members(user_id);
  ALTER TABLE designs ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
  CREATE INDEX designs_workspace ON designs(workspace_id, updated_at DESC);
  `,
  `
  CREATE TABLE design_presence (
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_seen BIGINT NOT NULL,
    PRIMARY KEY (design_id, user_id)
  );
  CREATE INDEX design_presence_recent ON design_presence(design_id, last_seen DESC);
  `,
  `
  CREATE TABLE provider_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX provider_requests_limit ON provider_requests(user_id, service, created_at DESC);
  `,
];

// Arbitrary constant so concurrent processes don't run migrations at the same time.
const MIGRATION_LOCK_ID = 7_315_042;

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at BIGINT NOT NULL)");
    const { rows } = await client.query<{ v: number | null }>("SELECT max(version) AS v FROM schema_migrations");
    for (let v = rows[0].v ?? 0; v < MIGRATIONS.length; v++) {
      await client.query("BEGIN");
      try {
        await client.query(MIGRATIONS[v]);
        await client.query("INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)", [v + 1, Date.now()]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }
}

export function createPool(connectionString: string, options: { schema?: string } = {}): Pool {
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Tests isolate themselves in a throwaway schema.
    ...(options.schema ? { options: `-c search_path=${options.schema}` } : {}),
  });
}

type DbState = { pool: Pool; ready: Promise<void> };

const globalForDb = globalThis as unknown as { __lumioDb?: DbState };

function state(): DbState {
  if (!globalForDb.__lumioDb) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) {
      throw new Error("DATABASE_URL or POSTGRES_URL is not set. Configure the Gimage database connection before starting the server.");
    }
    const pool = createPool(url);
    pool.on("error", (err) => console.error("[db] idle client error", err));
    const ready = migrate(pool);
    // Allow a later request to retry if the database was unreachable.
    ready.catch(() => {
      if (globalForDb.__lumioDb?.pool === pool) globalForDb.__lumioDb = undefined;
      void pool.end().catch(() => undefined);
    });
    globalForDb.__lumioDb = { pool, ready };
  }
  return globalForDb.__lumioDb;
}

async function pool(): Promise<Pool> {
  const s = state();
  await s.ready;
  return s.pool;
}

/** Anything that can run a query: the pool or a client inside a transaction. */
export type Queryable = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await (await pool()).query<T>(text, params);
  return rows;
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(text, params))[0];
}

/** Returns the number of affected rows. */
export async function execute(text: string, params: unknown[] = []): Promise<number> {
  const result = await (await pool()).query(text, params);
  return result.rowCount ?? 0;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await (await pool()).connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** For tests: use an already-migrated pool instead of DATABASE_URL. */
export function setPoolForTesting(p: Pool): void {
  globalForDb.__lumioDb = { pool: p, ready: Promise.resolve() };
}
