import assert from "node:assert/strict";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { createTenantTestDatabase } from "../../support/tenant-db.js";

Before({ tags: "@tenant-isolation" }, async function () {
  this.database = await createTenantTestDatabase();
});

After({ tags: "@tenant-isolation" }, async function () {
  await this.database?.close();
});

Given("the tenant authorization database is migrated", function () {
  assert.ok(this.database, "the isolated PostgreSQL fixture should be ready");
});

Given("the request is for user {string} in tenant {string}", function (userId, tenantId) {
  this.requestUserId = userId;
  this.requestTenantId = tenantId;
});

When("the backend queries projects", async function () {
  await this.database.exec("SET ROLE obraflow_runtime; BEGIN;");
  try {
    await this.database.query("SELECT set_config('app.user_id', $1, true)", [this.requestUserId]);
    await this.database.query("SELECT set_config('app.tenant_id', $1, true)", [this.requestTenantId]);
    const result = await this.database.query("SELECT id FROM projects ORDER BY id");
    this.visibleProjectIds = result.rows.map((row) => row.id);
    await this.database.exec("COMMIT");
  } catch (error) {
    await this.database.exec("ROLLBACK");
    throw error;
  } finally {
    await this.database.exec("RESET ROLE");
  }
});

When("the runtime role queries projects without request context", async function () {
  await this.database.exec("SET ROLE obraflow_runtime");
  try {
    const result = await this.database.query("SELECT id FROM projects ORDER BY id");
    this.visibleProjectIds = result.rows.map((row) => row.id);
  } finally {
    await this.database.exec("RESET ROLE");
  }
});

Then("the visible project identifiers are {string}", function (projectId) {
  assert.deepEqual(this.visibleProjectIds, [projectId]);
});

Then("no project is visible", function () {
  assert.deepEqual(this.visibleProjectIds, []);
});
