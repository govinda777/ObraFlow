#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { applyMigrations, assertMigrationRole, loadMigrations } from "./migration-runner.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "../..");
const migrationDirectory = path.join(scriptDirectory, "migrations");

dotenv.config({ path: path.join(rootDirectory, ".env") });

function parseArguments(argumentsList) {
  const allowed = new Set(["--dry-run", "--help"]);
  const unexpected = argumentsList.filter((argument) => !allowed.has(argument));
  if (unexpected.length > 0) {
    if (unexpected.includes("--reset")) {
      throw new Error("--reset was removed because it dropped application tables. Use a disposable database branch or a reviewed backup/restore procedure.");
    }
    throw new Error(`Unknown argument: ${unexpected[0]}`);
  }
  return {
    dryRun: argumentsList.includes("--dry-run"),
    help: argumentsList.includes("--help"),
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: npm run db:migrate [--dry-run]");
    console.log("--dry-run validates ordered SQL migration files and performs no database connection or write.");
    return;
  }

  const migrations = await loadMigrations(migrationDirectory);
  if (options.dryRun) {
    console.log(`Validated ${migrations.length} immutable migration files:`);
    for (const migration of migrations) {
      console.log(`- ${migration.filename} sha256:${migration.checksum}`);
    }
    console.log("Dry-run completed without connecting to a database.");
    return;
  }

  const databaseUrl = process.env.MIGRATION_DATABASE_URL
    || process.env.DATABASE_URL_UNPOOLED
    || (process.env.NODE_ENV === "production" ? undefined : process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error(
      "Set MIGRATION_DATABASE_URL or DATABASE_URL_UNPOOLED to a direct Neon connection. DATABASE_URL fallback is allowed only outside production.",
    );
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 1_000,
  });

  try {
    const client = await pool.connect();
    try {
      await assertMigrationRole(client);
    } finally {
      client.release();
    }

    const result = await applyMigrations(pool, migrations);
    if (result.applied.length === 0) {
      console.log(`Database schema is up to date at version ${result.currentVersion}.`);
    } else {
      console.log(`Applied migrations: ${result.applied.join(", ")}. Current version: ${result.currentVersion}.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Database migration failed:", error.message);
  if (error.cause) console.error("Cause:", error.cause.message);
  process.exitCode = 1;
});
