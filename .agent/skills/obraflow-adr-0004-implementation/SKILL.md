---
name: obraflow-adr-0004-implementation
description: Plan and implement ADR-0004 for ObraFlow, including Neon PostgreSQL infrastructure as code, Vercel deployment/security controls, server-side AI jobs, and thirdweb team configuration. Use when turning the ADR into an executable production plan or implementation.
metadata:
  short-description: Implement ObraFlow ADR-0004 safely
---

# ObraFlow ADR-0004 Implementation

Use this skill to convert `rfcs/0004-adr-migracao-neon-db-infra-vercel.md` into a verifiable implementation plan and, when authorized, implement it incrementally.

## Non-negotiable decisions

- Neon configuration must be 100% infrastructure as code. Do not require manual dashboard configuration for projects, branches, roles, databases, compute settings, connection strings, or environment relationships.
- Never commit credentials, connection strings, API keys, private keys, or provider tokens. Secrets are provisioned through the chosen secret manager/CI integration and referenced by name.
- Keep Neon infrastructure state separate from application migrations. IaC provisions the Neon project/branches/roles; versioned SQL or Drizzle migrations provision application schema.
- Production AI calls are server-side only. Remove or isolate the prototype browser-to-Gemini flow; never persist a Gemini key in `localStorage` in a production path.
- Treat DDoS mitigation, WAF, rate limiting, quotas, idempotency, and cost controls as separate layers. Vercel DDoS protection alone does not prevent authenticated AI abuse.
- Do not infer thirdweb project IDs, client IDs, chains, deployed contracts, wallet configuration, or team permissions from the URL. Inspect the `govinda-systems` team and record only verified values.

## First evaluate the repository

Read the ADR and inspect the current implementation before changing it:

- `docs/rfcs/0004-adr-migracao-neon-db-infra-vercel.md`
- `scripts/db/schema.sql`, `scripts/db/migrate.js`, `scripts/db/seed-clean.js`, `scripts/db/seed-demo.js`
- `scripts/mock-data-server.js`, `pages/processamento.md`, `package.json`, `.env.example`
- `MER.md`, `ACTORS.md`, and related RFCs

Produce a gap matrix with `Implemented`, `Partial`, `Missing`, or `Blocked`. At minimum check: Next.js App Router, Drizzle integration, Neon IaC, branch lifecycle, migrations, CI checks, Vercel project configuration, Blob upload security, Thirdweb authentication, AI gateway/jobs, rate limiting, observability, and thirdweb integration.

## Neon as code

Select an IaC provider based on repository constraints and document the choice. Prefer Terraform/OpenTofu or Pulumi when provider support and team workflow justify it. The selected implementation must define, without manual drift:

- Neon organization/project and region;
- production, staging, preview/ephemeral branch strategy;
- databases, roles, role grants, and least-privilege separation between runtime and migration roles;
- pooled and direct connection references, with SSL required;
- branch creation/deletion policy for previews;
- protected production branch and retention/recovery settings where supported;
- outputs containing secret references or redacted connection metadata, never plaintext credentials in git;
- state backend, locking, drift detection, and environment approvals.

Use a dedicated migration role for schema changes. Validate that the runtime role cannot create roles, alter schemas, or perform destructive administrative actions. Keep `DATABASE_URL` pooled for serverless runtime and a separate unpooled/direct URL for migrations where required.

Do not claim 100% IaC if a required Neon feature is unavailable in the selected provider. Record the limitation and add an automated post-apply validation instead of silently depending on a dashboard click.

## Application rollout

Implement and test in the following phases. Do not move to the next phase while a required health check is failing.

### Phase 0 — Baseline and migration contract

1. Record the current prototype behavior, environment variables, routes, data entities, and seed counts.
2. Define the target environments: local, preview, staging, and production.
3. Define the rollback point: the current prototype remains runnable until production smoke tests pass.
4. Create a component matrix mapping each component to its owner, dependency, deployment target, health endpoint, test command, and rollback action.

Required baseline checks:

- `npm ci` succeeds from a clean checkout;
- `npm run build` succeeds;
- local UI and transaction server start as documented;
- clean and demo seeds are reproducible;
- the JSON prototype remains available as a development fallback only.

### Phase 1 — Provision Neon through IaC

1. Initialize the IaC backend and locking without storing secrets in the repository.
2. Provision the Neon project, region, production branch, staging branch, and preview branch policy.
3. Provision databases, runtime role, migration role, grants, SSL requirements, and pooled/direct connection references.
4. Export only secret references or redacted outputs to the Vercel environment configuration.
5. Run a second plan/apply and require an empty or expected diff.
6. Run schema migrations using the migration role.
7. Run clean and demo seeds only against non-production environments.

Neon health checks:

- pooled runtime connection succeeds;
- direct migration connection succeeds only with the migration credential;
- PostgreSQL version and required extensions are available;
- all expected tables, constraints, indexes, and foreign keys exist;
- runtime role can execute application queries but cannot create roles, alter schema, or drop tables;
- migration role can apply migrations but is not exposed to application runtime;
- a preview branch can be created, migrated, seeded, tested, and destroyed by automation.

### Phase 2 — Prepare the Vercel application

1. Introduce the production application boundary using Next.js App Router, API Routes/Route Handlers or Server Actions, and TypeScript.
2. Configure Vercel project settings as code where supported: framework, build command, install command, function regions, duration, Fluid Compute, and environment mapping.
3. Configure environment variables by environment. Keep public variables explicitly prefixed and keep all database, AI, Blob, rate-limit, auth, and Thirdweb secrets server-only.
4. Implement authenticated request handling and tenant authorization before exposing data or jobs.
5. Implement Vercel Blob signed upload/download flow with content-type, size, ownership, and expiration validation.
6. Configure preview deployments to use preview Neon branches and non-production credentials.

Vercel application health checks:

- deployment completes from a clean commit;
- `/api/health` returns `200` with application version, environment, and dependency statuses;
- `/api/ready` returns `200` only when required dependencies are usable;
- frontend loads without exposing server-only environment variables;
- a protected endpoint rejects anonymous requests with `401`;
- a user from tenant A cannot read or mutate tenant B data;
- Blob upload rejects unauthorized, oversized, expired, and unsupported files;
- preview deployment never points to production Neon, Blob, AI, or Thirdweb resources.

### Phase 3 — Implement AI gateway and jobs

1. Replace direct browser-to-Gemini requests and `localStorage` API keys with a server-side AI gateway.
2. Create the job lifecycle (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) in Neon.
3. Add idempotency keys, bounded retries, exponential backoff, circuit breaker, timeouts, and quota checks.
4. Add distributed rate limiting by IP, user, and tenant using an external store; never use Function memory as the source of truth.
5. Add token, payload, file-count, duration, and cost limits before invoking Gemini.
6. Persist redacted audit metadata and avoid logging prompts, documents, API keys, or sensitive personal data unnecessarily.

AI health and resilience checks:

- a valid authenticated job is created exactly once;
- duplicate idempotency requests return the existing job and do not duplicate provider calls;
- an anonymous request is rejected;
- a cross-tenant project reference is rejected;
- burst traffic receives `429` without invoking Gemini after quota exhaustion;
- oversized or invalid files are rejected before provider invocation;
- a provider timeout, `429`, and `5xx` result in bounded retries and a terminal status;
- a permanently failed job does not remain stuck in `PROCESSING`;
- fallback behavior is explicit and auditable;
- no Gemini key appears in browser bundles, HTML, logs, or client storage.

### Phase 4 — Configure security, observability, and Thirdweb

1. Configure Vercel Firewall/WAF rules for login, upload, and AI job routes.
2. Configure IP blocking/challenge procedures, rate-limit rules, spend alerts, and usage alerts.
3. Configure structured logs, request IDs, job IDs, tenant IDs, latency, status, and redacted error classification.
4. Inspect the authenticated Thirdweb `govinda-systems` team and map verified project/application, environment, chain, contract, domain, origin, webhook, and role settings.
5. Configure testnet and mainnet separately and validate webhook signatures, replay protection, chain IDs, contract addresses, and deployment ownership.

Security and integration health checks:

- WAF rules are present in the expected environment;
- security headers and HTTPS are active;
- logs contain correlation IDs but no secrets;
- Thirdweb testnet connectivity works with test credentials;
- Thirdweb mainnet configuration is not reachable from preview/staging;
- invalid webhook signatures and replayed events are rejected;
- Thirdweb configuration is reproducible from code or documented provider API calls.

### Phase 5 — CI/CD, smoke test, and promotion

1. Add CI checks for IaC format/validate/plan, migration drift, dependency/security scanning, type checking, build, unit tests, integration tests, and health checks.
2. Deploy a preview and run the complete health-check suite against its isolated Neon branch.
3. Promote to staging only after preview checks pass.
4. Run staging migration, seed, API, upload, AI failure-mode, security, and observability tests.
5. Promote to production with an approval gate and a recorded IaC plan.
6. Run production read-only smoke tests, then one controlled end-to-end transaction using production-safe test data.
7. Monitor error rate, latency, database connections, AI quota/cost, Blob failures, and job backlog before closing the migration.

Promotion is blocked if any required health check fails, if preview uses a production secret, or if any production-critical setting exists only as an undocumented dashboard change.

## Thirdweb team handling

The canonical team reference is `https://thirdweb.com/team/govinda-systems`.

During implementation:

- inspect the team using available thirdweb/provider tooling or authenticated dashboard/API;
- identify the exact project/application, environments, chains, contracts, domains, allowed origins, webhook endpoints, and team members/roles in use;
- map each verified value to an environment-specific configuration variable or IaC resource;
- prefer thirdweb CLI/API/configuration files over dashboard-only changes;
- store deployer/admin credentials in a secret manager and use least privilege;
- separate testnet and mainnet accounts, contracts, RPC/API keys, and webhook signing secrets;
- validate webhook signatures, replay protection, allowed origins, chain IDs, contract addresses, and deployment ownership;
- never create, deploy, upgrade, or fund a contract without explicit user authorization for that specific external mutation.

If the team page is inaccessible, stop at discovery for external configuration and report the exact missing permission or artifact. Continue with local scaffolding and a checklist using placeholders marked `TBD`, never guessed identifiers.

## Verification gates

Before declaring the ADR implemented, verify:

- a clean environment can provision the required Neon resources from code;
- a second apply is idempotent and produces no unintended changes;
- preview branches can be created and cleaned up by automation;
- migrations run against a branch and production with the intended roles;
- runtime cannot use migration/admin credentials;
- AI keys are absent from browser bundles and storage;
- unauthenticated, cross-tenant, over-quota, duplicate, oversized, and burst requests are rejected safely;
- a Gemini timeout/rate-limit/provider outage reaches a bounded terminal state without duplicate writes;
- Vercel and thirdweb configuration is environment-scoped and secrets are not logged;
- build, tests, IaC validation, migration checks, and security scans pass.

## Required health-check contract

The implementation must expose machine-readable checks, not only dashboard screenshots or manual confirmation:

- `GET /api/health`: process-level liveness and version;
- `GET /api/ready`: readiness for Neon, rate-limit store, Blob, authentication configuration, and required provider configuration;
- `GET /api/health/neon`: authenticated internal check for pooled query, schema version, and migration status;
- `GET /api/health/blob`: authenticated internal signed-upload/read/delete-safe check in a disposable test namespace;
- `GET /api/health/ai`: authenticated provider configuration check that does not spend tokens unless explicitly running an integration test;
- `GET /api/health/thirdweb`: authenticated non-mutating connectivity and configuration check;
- `npm run test:health`: runs local/preview health checks with environment-safe assertions;
- CI smoke tests: exercise authentication, tenant isolation, migrations, Blob authorization, AI job idempotency, rate limits, provider failures, and Thirdweb webhook verification.

Health endpoints must not reveal credentials, raw connection strings, internal topology, provider responses, or tenant data. External dependencies should report `ok`, `degraded`, or `blocked` with a redacted reason and correlation ID.

Report remaining manual or externally blocked steps explicitly. Do not mark the ADR complete while any production-critical control is only described in documentation.
