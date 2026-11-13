import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, assertMigrationRole, loadMigrations } from "../../scripts/db/migration-runner.js";
import { assertAuthorizationDatabaseReady } from "../../src/lib/database-health.js";
import { createPoolAdapterForTest, createTenantTestDatabase } from "../support/tenant-db.js";

const ALPHA_TENANT = "tenant_legacy_usr_alpha_contractor";

test("migration entrypoint accepts only the dedicated schema migration identity", async () => {
  const database = await createTenantTestDatabase({ withLegacyData: false });
  try {
    await database.exec("SET ROLE obraflow_migrator");
    await assertMigrationRole(database);
    await database.exec("RESET ROLE; SET ROLE obraflow_runtime");
    await assert.rejects(assertMigrationRole(database), /must connect as the dedicated 'obraflow_migrator'/i);
  } finally {
    await database.exec("RESET ROLE");
    await database.close();
  }
});

async function withRuntimeContext(database, userId, tenantId, callback) {
  await database.exec("SET ROLE obraflow_runtime; BEGIN;");
  let committed = false;
  try {
    await database.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    await database.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await callback(database);
    await database.exec("COMMIT");
    committed = true;
    return result;
  } finally {
    if (!committed) await database.exec("ROLLBACK");
    await database.exec("RESET ROLE");
  }
}

test("legacy project relationships are migrated to separate tenants and memberships", async () => {
  const database = await createTenantTestDatabase();
  try {
    const tenants = await database.query("SELECT id FROM tenants ORDER BY id");
    assert.deepEqual(tenants.rows.map((row) => row.id), [
      "tenant_legacy_usr_alpha_contractor",
      "tenant_legacy_usr_beta_contractor",
    ]);

    const projects = await database.query("SELECT id, tenant_id FROM projects ORDER BY id");
    assert.deepEqual(projects.rows, [
      { id: "proj_alpha", tenant_id: ALPHA_TENANT },
      { id: "proj_beta", tenant_id: "tenant_legacy_usr_beta_contractor" },
    ]);

    const childRows = await database.query(`
      SELECT tasks.id, tasks.project_id, tasks.tenant_id
      FROM tasks ORDER BY tasks.id
    `);
    assert.deepEqual(childRows.rows, [
      { id: "task_alpha", project_id: "proj_alpha", tenant_id: ALPHA_TENANT },
      { id: "task_beta", project_id: "proj_beta", tenant_id: "tenant_legacy_usr_beta_contractor" },
    ]);

    const unassociated = await database.query(`
      SELECT COUNT(*)::int AS count
      FROM tenant_memberships
      WHERE user_id = 'usr_orphan_designer'
    `);
    assert.equal(unassociated.rows[0].count, 0, "legacy global role must not create a tenant membership");

    const applied = await database.query("SELECT version, checksum FROM schema_migrations ORDER BY version");
    assert.deepEqual(applied.rows.map((row) => row.version), ["0001", "0002", "0003"]);
    assert.ok(applied.rows.every((row) => row.checksum.length === 64));
  } finally {
    await database.close();
  }
});

test("RLS returns only projects in the transaction's active tenant and project memberships", async () => {
  const database = await createTenantTestDatabase();
  try {
    const alphaRows = await withRuntimeContext(
      database,
      "usr_alpha_client",
      ALPHA_TENANT,
      (db) => db.query("SELECT id FROM projects ORDER BY id"),
    );
    assert.deepEqual(alphaRows.rows.map((row) => row.id), ["proj_alpha"]);

    const forgedTenantRows = await withRuntimeContext(
      database,
      "usr_alpha_client",
      "tenant_legacy_usr_beta_contractor",
      (db) => db.query("SELECT id FROM projects ORDER BY id"),
    );
    assert.deepEqual(forgedTenantRows.rows, []);

    const pendingProjectRows = await withRuntimeContext(
      database,
      "usr_alpha_engineer",
      ALPHA_TENANT,
      (db) => db.query("SELECT id FROM projects ORDER BY id"),
    );
    assert.deepEqual(pendingProjectRows.rows, []);
  } finally {
    await database.close();
  }
});

test("missing transaction context and revoked memberships fail closed", async () => {
  const database = await createTenantTestDatabase();
  try {
    await database.exec("SET ROLE obraflow_runtime");
    const withoutContext = await database.query("SELECT id FROM projects");
    await database.exec("RESET ROLE");
    assert.deepEqual(withoutContext.rows, []);

    await database.query(`
      UPDATE tenant_memberships SET status = 'SUSPENDED'
      WHERE user_id = 'usr_alpha_client' AND tenant_id = $1
    `, [ALPHA_TENANT]);
    const suspendedRows = await withRuntimeContext(
      database,
      "usr_alpha_client",
      ALPHA_TENANT,
      (db) => db.query("SELECT id FROM projects"),
    );
    assert.deepEqual(suspendedRows.rows, []);

    await database.query(`
      UPDATE tenant_memberships SET status = 'ACTIVE'
      WHERE user_id = 'usr_alpha_client' AND tenant_id = $1
    `, [ALPHA_TENANT]);
    await database.query("UPDATE users SET account_status = 'SUSPENDED' WHERE id = 'usr_alpha_client'");
    const suspendedAccountRows = await withRuntimeContext(
      database,
      "usr_alpha_client",
      ALPHA_TENANT,
      (db) => db.query("SELECT id FROM projects"),
    );
    assert.deepEqual(suspendedAccountRows.rows, []);

    await database.query("UPDATE users SET account_status = 'ACTIVE' WHERE id = 'usr_alpha_client'");
    await database.query("UPDATE tenants SET status = 'SUSPENDED' WHERE id = $1", [ALPHA_TENANT]);
    const suspendedTenantRows = await withRuntimeContext(
      database,
      "usr_alpha_client",
      ALPHA_TENANT,
      (db) => db.query("SELECT id FROM projects"),
    );
    assert.deepEqual(suspendedTenantRows.rows, []);
  } finally {
    await database.close();
  }
});

test("runtime cannot bypass RLS, write business rows, or read collaborator payment data", async () => {
  const database = await createTenantTestDatabase();
  try {
    const role = await database.query(`
      SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
      FROM pg_roles WHERE rolname = 'obraflow_runtime'
    `);
    assert.deepEqual(role.rows[0], {
      rolcanlogin: true,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolbypassrls: false,
    });

    const migrationRole = await database.query(`
      SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
      FROM pg_roles WHERE rolname = 'obraflow_migrator'
    `);
    assert.deepEqual(migrationRole.rows[0], {
      rolcanlogin: true,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolbypassrls: false,
    });

    await assert.rejects(
      withRuntimeContext(database, "usr_alpha_client", ALPHA_TENANT, (db) =>
        db.query("SELECT payment_info FROM collaborators")),
      /permission denied for table collaborators/i,
    );
    await assert.rejects(
      withRuntimeContext(database, "usr_alpha_client", ALPHA_TENANT, (db) =>
        db.query(`INSERT INTO projects (id, name, address, tenant_id, client_id, contractor_id)
          VALUES ('unauthorized', 'No', 'No', $1, 'usr_alpha_client', 'usr_alpha_contractor')`, [ALPHA_TENANT])),
      /permission denied for table projects/i,
    );
    await assert.rejects(
      withRuntimeContext(database, "usr_alpha_client", ALPHA_TENANT, (db) =>
        db.query("CREATE TABLE runtime_schema_escalation_probe (id INTEGER)")),
      /permission denied for schema public/i,
    );
  } finally {
    await database.close();
  }
});

test("database readiness checks runtime identity, forced RLS, and append-only audit without reading business rows", async () => {
  const database = await createTenantTestDatabase({ withLegacyData: false });
  const query = async (statement) => (await database.query(statement)).rows;

  try {
    await database.exec("SET ROLE obraflow_runtime");
    await assertAuthorizationDatabaseReady(query);

    await database.exec("RESET ROLE");
    await assert.rejects(assertAuthorizationDatabaseReady(query), /readiness check failed/i);

    await database.exec(`
      GRANT SELECT (payment_info) ON collaborators TO obraflow_runtime;
      SET ROLE obraflow_runtime;
    `);
    await assert.rejects(assertAuthorizationDatabaseReady(query), /readiness check failed/i);

    await database.exec(`
      RESET ROLE;
      REVOKE SELECT (payment_info) ON collaborators FROM obraflow_runtime;
      GRANT CREATE ON SCHEMA public TO obraflow_runtime;
      SET ROLE obraflow_runtime;
    `);
    await assert.rejects(assertAuthorizationDatabaseReady(query), /readiness check failed/i);

    await database.exec(`
      RESET ROLE;
      REVOKE CREATE ON SCHEMA public FROM obraflow_runtime;
      GRANT UPDATE ON audit_events TO obraflow_runtime;
      SET ROLE obraflow_runtime;
    `);
    await assert.rejects(assertAuthorizationDatabaseReady(query), /readiness check failed/i);

    await database.exec(`
      RESET ROLE;
      REVOKE UPDATE ON audit_events FROM obraflow_runtime;
      SET ROLE obraflow_runtime;
    `);
    await assertAuthorizationDatabaseReady(query);

    await database.exec(`
      RESET ROLE;
      SET ROLE obraflow_migrator;
      DROP POLICY tasks_active_project_member_select ON tasks;
      RESET ROLE;
      SET ROLE obraflow_runtime;
    `);
    await assert.rejects(assertAuthorizationDatabaseReady(query), /readiness check failed/i);
  } finally {
    await database.exec("RESET ROLE");
    await database.close();
  }
});

test("audit events are tenant-scoped, actor-bound, idempotent, and append-only", async () => {
  const database = await createTenantTestDatabase();
  try {
    await withRuntimeContext(database, "usr_alpha_client", ALPHA_TENANT, async (db) => {
      await db.query(`
        INSERT INTO audit_events (
          id, tenant_id, project_id, actor_user_id, actor_role, event_type,
          resource_type, resource_id, occurred_at, idempotency_key, metadata_redacted
        ) VALUES (
          'audit_alpha_1', $1, 'proj_alpha', 'usr_alpha_client', 'CLIENT',
          'budget.approved', 'budget', 'budget_alpha', NOW(), 'request-1', '{}'::jsonb
        )
      `, [ALPHA_TENANT]);
      const visible = await db.query("SELECT id FROM audit_events");
      assert.deepEqual(visible.rows.map((row) => row.id), ["audit_alpha_1"]);
    });

    await assert.rejects(
      withRuntimeContext(database, "usr_alpha_client", ALPHA_TENANT, (db) => db.query(`
        INSERT INTO audit_events (
          id, tenant_id, project_id, actor_user_id, actor_role, event_type,
          resource_type, resource_id, occurred_at, idempotency_key
        ) VALUES (
          'audit_alpha_duplicate', $1, 'proj_alpha', 'usr_alpha_client', 'CLIENT',
          'budget.approved', 'budget', 'budget_alpha', NOW(), 'request-1'
        )
      `, [ALPHA_TENANT])),
      /duplicate key|unique constraint/i,
    );

    const invisible = await withRuntimeContext(
      database,
      "usr_beta_client",
      "tenant_legacy_usr_beta_contractor",
      (db) => db.query("SELECT id FROM audit_events"),
    );
    assert.deepEqual(invisible.rows, []);

    await assert.rejects(database.query(`
      UPDATE audit_events SET event_type = 'tampered' WHERE id = 'audit_alpha_1'
    `), /append-only/i);
    await assert.rejects(database.query(`
      DELETE FROM audit_events WHERE id = 'audit_alpha_1'
    `), /append-only/i);

    await assert.rejects(
      withRuntimeContext(database, "usr_alpha_client", ALPHA_TENANT, (db) => db.query(`
        INSERT INTO audit_events (
          id, tenant_id, project_id, actor_user_id, actor_role, event_type,
          resource_type, resource_id, occurred_at
        ) VALUES (
          'audit_forged', $1, 'proj_alpha', 'usr_alpha_contractor', 'CONTRACTOR',
          'budget.approved', 'budget', 'budget_alpha', NOW()
        )
      `, [ALPHA_TENANT])),
      /row-level security policy/i,
    );
  } finally {
    await database.close();
  }
});

test("migration runner is idempotent, rejects checksum drift, and rolls back failed migrations", async () => {
  const database = new PGlite();
  const pool = createPoolAdapterForTest(database);
  const migrations = await loadMigrations(fileURLToPath(new URL("../../scripts/db/migrations", import.meta.url)));
  try {
    const first = await applyMigrations(pool, migrations.slice(0, 1));
    assert.deepEqual(first.applied, ["0001"]);
    const second = await applyMigrations(pool, migrations.slice(0, 1));
    assert.deepEqual(second.applied, []);

    const baseline = migrations[0];
    await assert.rejects(
      applyMigrations(pool, [{ ...baseline, checksum: "c".repeat(64) }]),
      /differs from the checked-in file/i,
    );

    const successful = {
      version: "0002",
      name: "probe_success",
      filename: "0002_probe_success.sql",
      checksum: "a".repeat(64),
      sql: "CREATE TABLE migration_probe (id INTEGER PRIMARY KEY)",
    };
    const failing = {
      version: "0003",
      name: "probe_failure",
      filename: "0003_probe_failure.sql",
      checksum: "b".repeat(64),
      sql: "CREATE TABLE rollback_probe (id INTEGER); SELECT * FROM table_that_does_not_exist",
    };
    await assert.rejects(applyMigrations(pool, [...migrations.slice(0, 1), successful, failing]), /rolled back/i);

    const rollbackCheck = await database.query(`
      SELECT to_regclass('public.rollback_probe') AS table_name,
        (SELECT COUNT(*)::int FROM schema_migrations WHERE version = '0003') AS recorded
    `);
    assert.deepEqual(rollbackCheck.rows[0], { table_name: null, recorded: 0 });
  } finally {
    await database.close();
  }
});

test("migration runner refuses an existing untracked legacy schema", async () => {
  const database = new PGlite();
  const pool = createPoolAdapterForTest(database);
  const migrations = await loadMigrations(fileURLToPath(new URL("../../scripts/db/migrations", import.meta.url)));
  try {
    await database.exec("CREATE TABLE users (id TEXT PRIMARY KEY)");
    await assert.rejects(applyMigrations(pool, migrations), /untracked public\.users table/i);
    const ledger = await database.query("SELECT to_regclass('public.schema_migrations') AS ledger");
    assert.equal(ledger.rows[0].ledger, null);
  } finally {
    await database.close();
  }
});
