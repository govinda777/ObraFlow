import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const MIGRATION_FILE = /^(\d{4})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;
const LOCK_CLASS_ID = 1464150348;
const LOCK_OBJECT_ID = 415;

export async function assertMigrationRole(client, expectedRole = "obraflow_migrator") {
  const result = await client.query("SELECT current_user AS role_name");
  const roleName = result.rows[0]?.role_name;
  if (roleName !== expectedRole) {
    throw new Error(
      `Migrations must connect as the dedicated '${expectedRole}' role; received '${roleName ?? "unknown"}'.`,
    );
  }
}

export async function loadMigrations(directory) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const migrations = [];
  const seenVersions = new Set();

  for (const name of names) {
    const match = MIGRATION_FILE.exec(name);
    if (!match) {
      throw new Error(`Invalid migration filename: ${name}`);
    }

    const [, version, migrationName] = match;
    if (seenVersions.has(version)) {
      throw new Error(`Duplicate migration version: ${version}`);
    }
    seenVersions.add(version);

    const sql = await readFile(path.join(directory, name), "utf8");
    if (sql.trim().length === 0) {
      throw new Error(`Migration ${name} is empty`);
    }

    migrations.push({
      version,
      name: migrationName,
      filename: name,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    });
  }

  if (migrations.length === 0) {
    throw new Error(`No SQL migrations found in ${directory}`);
  }

  return migrations;
}

export async function applyMigrations(pool, migrations) {
  const client = await pool.connect();
  let lockAcquired = false;
  let primaryError;

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", [LOCK_CLASS_ID, LOCK_OBJECT_ID]);
    lockAcquired = true;

    const state = await client.query(`
      SELECT
        to_regclass('public.schema_migrations') AS ledger_table,
        to_regclass('public.users') AS legacy_users_table
    `);
    const ledgerExists = state.rows[0]?.ledger_table !== null;
    if (!ledgerExists && state.rows[0]?.legacy_users_table !== null) {
      throw new Error(
        "Untracked public.users table found. Refusing to baseline or alter a legacy database automatically; create a reviewed backup and explicit adoption plan first.",
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(4) PRIMARY KEY,
        name TEXT NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("REVOKE ALL ON public.schema_migrations FROM PUBLIC");

    const appliedResult = await client.query(
      "SELECT version, name, checksum FROM public.schema_migrations ORDER BY version",
    );
    const migrationByVersion = new Map(migrations.map((migration) => [migration.version, migration]));
    const appliedByVersion = new Map(appliedResult.rows.map((row) => [row.version, row]));

    if (appliedByVersion.size === 0 && state.rows[0]?.legacy_users_table !== null) {
      throw new Error(
        "An unversioned legacy schema exists. Refusing to apply the initial migration over existing tables.",
      );
    }

    for (const applied of appliedResult.rows) {
      const source = migrationByVersion.get(applied.version);
      if (!source) {
        throw new Error(`Database migration ${applied.version} is missing from this checkout`);
      }
      if (source.name !== applied.name || source.checksum !== applied.checksum.trim()) {
        throw new Error(
          `Applied migration ${applied.version} differs from the checked-in file. Restore the original migration and add a new forward migration instead.`,
        );
      }
    }

    const newlyApplied = [];
    for (const migration of migrations) {
      if (appliedByVersion.has(migration.version)) continue;

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO public.schema_migrations (version, name, checksum)
           VALUES ($1, $2, $3)`,
          [migration.version, migration.name, migration.checksum],
        );
        await client.query("COMMIT");
        newlyApplied.push(migration.version);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${migration.filename} failed and was rolled back`, { cause: error });
      }
    }

    return { applied: newlyApplied, currentVersion: migrations.at(-1)?.version };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (lockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock($1, $2)", [LOCK_CLASS_ID, LOCK_OBJECT_ID]);
      } catch (unlockError) {
        if (!primaryError) throw unlockError;
      }
    }
    client.release();
  }
}
