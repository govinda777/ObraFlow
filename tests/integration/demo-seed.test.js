import assert from "node:assert/strict";
import test from "node:test";
import { loadDemoDatasets, runSeed, seedDemoDatabase } from "../../scripts/db/seed-demo.js";
import { createTenantTestDatabase } from "../support/tenant-db.js";

const DEMO_TENANT = "tenant_demo_alpha";

function makeConsistentSyntheticDemoRows() {
  const rowsByTable = loadDemoDatasets();

  // This synthetic test fixture chooses an existing project member as uploader.
  // The checked-in mock data is intentionally not rewritten: its collab_* actor
  // IDs are invalid users.id values and must be reconciled by the data owner.
  rowsByTable.set(
    "evidences",
    rowsByTable.get("evidences").map((evidence) => ({ ...evidence, uploaded_by: "usr_2" })),
  );
  rowsByTable.set("users", [
    ...rowsByTable.get("users"),
    {
      id: "usr_orphan_seed",
      thirdweb_id: "fixture:orphan-seed",
      name: "Unassociated Designer",
      email: "orphan-seed@example.test",
      role: "DESIGNER",
      created_at: "2026-11-01T00:00:00Z",
    },
  ]);

  return rowsByTable;
}

async function count(database, table) {
  const result = await database.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
  return result.rows[0].count;
}

test("demo seed refuses collaborator IDs as evidence user identities before writing", async () => {
  const database = await createTenantTestDatabase({ withLegacyData: false });
  try {
    const rowsByTable = loadDemoDatasets();
    await assert.rejects(
      seedDemoDatabase(database, { rowsByTable }),
      /Evidence evid_1 uploader 'collab_1' is not a users\.id/i,
    );

    assert.equal(await count(database, "users"), 0);
    assert.equal(await count(database, "tenants"), 0);
    assert.equal(await count(database, "projects"), 0);
  } finally {
    await database.close();
  }
});

test("CLI seed requires explicit non-production opt-in before opening a database connection", async () => {
  const rowsByTable = makeConsistentSyntheticDemoRows();
  const logger = { log() {}, warn() {} };

  await assert.rejects(
    runSeed({
      rowsByTable,
      seedDatabaseUrl: "postgres://example.invalid/obraflow",
      allowDemoSeed: false,
      nodeEnv: "development",
      dryRun: false,
      logger,
    }),
    /Database writes require a non-production environment/i,
  );

  await assert.rejects(
    runSeed({
      rowsByTable,
      seedDatabaseUrl: "postgres://example.invalid/obraflow",
      allowDemoSeed: true,
      nodeEnv: "production",
      dryRun: false,
      logger,
    }),
    /Database writes require a non-production environment/i,
  );
});

test("consistent synthetic demo seed is scoped, idempotent, and grants no role-only access", async () => {
  const database = await createTenantTestDatabase({ withLegacyData: false });
  const rowsByTable = makeConsistentSyntheticDemoRows();
  try {
    const firstCounts = await seedDemoDatabase(database, { rowsByTable });
    const secondCounts = await seedDemoDatabase(database, { rowsByTable });
    assert.deepEqual(secondCounts, firstCounts);

    for (const table of [
      "projects",
      "epics",
      "tasks",
      "materials",
      "evidences",
      "financial_transactions",
      "payrolls",
      "ai_room_simulations",
    ]) {
      assert.equal(await count(database, table), firstCounts[table]);
      const outOfTenant = await database.query(
        `SELECT COUNT(*)::int AS count FROM "${table}" WHERE tenant_id <> $1`,
        [DEMO_TENANT],
      );
      assert.equal(outOfTenant.rows[0].count, 0, `${table} rows must remain in the explicit demo tenant`);
    }

    assert.equal(await count(database, "tenant_memberships"), 6);
    assert.equal(await count(database, "project_memberships"), 20);
    assert.equal(await count(database, "tenants"), 1);
    assert.equal(await count(database, "users"), 7);

    const orphanMemberships = await database.query(
      "SELECT id FROM tenant_memberships WHERE user_id = 'usr_orphan_seed'",
    );
    assert.deepEqual(orphanMemberships.rows, []);

    await database.exec("SET ROLE obraflow_runtime; BEGIN;");
    try {
      await database.query("SELECT set_config('app.user_id', $1, true)", ["usr_orphan_seed"]);
      await database.query("SELECT set_config('app.tenant_id', $1, true)", [DEMO_TENANT]);
      const unauthorized = await database.query("SELECT id FROM projects");
      assert.deepEqual(unauthorized.rows, []);
      await database.exec("COMMIT");
    } catch (error) {
      await database.exec("ROLLBACK");
      throw error;
    } finally {
      await database.exec("RESET ROLE");
    }
  } finally {
    await database.close();
  }
});

test("demo seed rolls back all earlier writes when a later row violates schema constraints", async () => {
  const database = await createTenantTestDatabase({ withLegacyData: false });
  const rowsByTable = makeConsistentSyntheticDemoRows();
  rowsByTable.set("projects", rowsByTable.get("projects").map((project, index) => (
    index === 0 ? { ...project, status: "NOT_A_PROJECT_STATUS" } : project
  )));

  try {
    await assert.rejects(
      seedDemoDatabase(database, { rowsByTable }),
      /invalid input value for enum|violates check constraint/i,
    );
    assert.equal(await count(database, "users"), 0);
    assert.equal(await count(database, "tenants"), 0);
    assert.equal(await count(database, "collaborators"), 0);
  } finally {
    await database.close();
  }
});
