#!/usr/bin/env bash
# Creates (or updates) the PostgreSQL role and databases named in .env.
# Runs psql as the `postgres` superuser via sudo, so it asks for your password.
set -euo pipefail

cd "$(dirname "$0")/.."
if [[ ! -f .env ]]; then
  echo "No .env found. Copy .env.example to .env and set DATABASE_URL first." >&2
  exit 1
fi

# Parse a postgres URL into "user pass host port db" using Node's URL parser.
parse() {
  node -e '
    const u = new URL(process.argv[1]);
    const safe = /^[A-Za-z0-9_.-]+$/;
    const parts = [decodeURIComponent(u.username), decodeURIComponent(u.password), u.hostname, u.port || "5432", u.pathname.slice(1)];
    if (!parts.every((p) => safe.test(p))) { console.error("Unsupported characters in database URL"); process.exit(1); }
    console.log(parts.join(" "));
  ' "$1"
}

read_env() {
  grep -E "^$1=" .env | tail -n1 | cut -d= -f2- || true
}

setup() {
  local url="$1"
  read -r user pass host port db <<<"$(parse "$url")"
  if [[ "$host" != "localhost" && "$host" != "127.0.0.1" ]]; then
    echo "Refusing to run against non-local host $host" >&2
    exit 1
  fi
  echo "Ensuring role '$user' and database '$db' on $host:$port"
  # The password is passed as a psql variable and quoted by format(%L), never spliced into SQL text.
  (cd /tmp && sudo -u postgres psql -p "$port" -v ON_ERROR_STOP=1 -q -v user="$user" -v pass="$pass" -v db="$db" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'user', :'pass')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'user') \gexec
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'user', :'pass') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'user')
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db') \gexec
SQL
  )
}

setup "$(read_env DATABASE_URL)"
test_url="$(read_env TEST_DATABASE_URL)"
if [[ -n "$test_url" ]]; then setup "$test_url"; fi
echo "Done. Tables are created automatically on first run."
