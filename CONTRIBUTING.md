# Contributing to Lumio

Thanks for helping improve Lumio. Small, focused changes are easiest to review.

## Before you start

- Read the [README](README.md) to understand the current features and self-hosting setup.
- Search existing issues and pull requests before opening a duplicate.
- For a bug, describe what happened, what you expected, and the shortest steps to reproduce it. Include the browser, OS, and relevant logs; remove passwords, tokens, database URLs, and personal data.
- For a larger feature or a change to saved design data, open an issue first so the behavior and migration can be discussed.

## Local setup

1. Fork and clone the repository.
2. Install Bun, Node.js 20.9 or newer, and PostgreSQL. The project is tested with PostgreSQL 16.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your own development database. The optional `scripts/setup-local-db.sh` can create the example role/database on a local PostgreSQL server; it will not create a remote database.
4. Run `bun install --frozen-lockfile` and `bun dev`.
5. Open `http://localhost:3000` and create a development account.

For data-layer tests, set `TEST_DATABASE_URL` to a **separate disposable database**. Each test creates and drops a temporary schema. Never point it at a production database. Tests that need PostgreSQL are skipped when the variable is absent.

## Make a change

- Follow the existing TypeScript, React, and Next.js structure. Keep changes limited to the issue being fixed.
- Preserve existing editor behavior and saved design compatibility. If a database change is needed, add a migration in `lib/server/db.ts` rather than editing an already-applied migration.
- Keep the UI responsive and keyboard accessible. Include desktop and mobile screenshots for visual changes.
- Update the README or `.env.example` when setup, configuration, or user-facing behavior changes.
- Do not commit `.env`, credentials, generated build output, or real user data.
- Add a dependency only when the existing stack cannot reasonably solve the problem, and explain why in the pull request.

## Verify

Run the checks relevant to your change before opening a pull request:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

The database tests require `TEST_DATABASE_URL`; check the test output to confirm whether they ran or were skipped. For a UI change, also inspect the affected page at desktop and mobile widths. For a server change, test the success and error paths locally.

## Pull requests

Use the pull request template. Explain the problem, the smallest fix, how you verified it, and any deployment or data migration impact. Link the related issue when there is one. A maintainer may ask for changes before merging; please keep follow-up commits focused.

## Contributor credit

After a pull request into `main` is merged, the Credit contributors workflow opens a separate README-only pull request from `automation/credit-<login>`. Maintainers review and merge that pull request normally; the workflow never pushes directly to `main` or bypasses branch protection. Existing credits are matched without regard to case, and bot authors are skipped. Each contributor has a separate branch so pending credits for different people stay independent.

For automatic credit pull requests, a repository administrator must enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**. The workflow uses the repository's `GITHUB_TOKEN` with `contents: write` and `pull-requests: write`; it does not approve or automatically merge pull requests. If repository policy disables automated pull request creation, maintainers can add credit manually through a normal README pull request instead.
