import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, loadMigrations } from "../../scripts/db/migration-runner.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsPath = path.join(repositoryRoot, "scripts/db/migrations");

export const LEGACY_FIXTURE_SQL = `
  INSERT INTO users (id, thirdweb_id, name, email, role) VALUES
    ('usr_alpha_contractor', 'fixture:alpha-contractor', 'Alpha Contractor', 'alpha-contractor@example.test', 'CONTRACTOR'),
    ('usr_alpha_client', 'fixture:alpha-client', 'Alpha Client', 'alpha-client@example.test', 'CLIENT'),
    ('usr_beta_contractor', 'fixture:beta-contractor', 'Beta Contractor', 'beta-contractor@example.test', 'CONTRACTOR'),
    ('usr_beta_client', 'fixture:beta-client', 'Beta Client', 'beta-client@example.test', 'CLIENT'),
    ('usr_alpha_engineer', 'fixture:alpha-engineer', 'Invited Engineer', 'engineer@example.test', 'ENGINEER'),
    ('usr_orphan_designer', 'fixture:orphan-designer', 'Unassociated Designer', 'orphan@example.test', 'DESIGNER');

  INSERT INTO projects (id, name, address, client_id, contractor_id, status) VALUES
    ('proj_alpha', 'Alpha Project', 'Address A', 'usr_alpha_client', 'usr_alpha_contractor', 'IN_PROGRESS'),
    ('proj_beta', 'Beta Project', 'Address B', 'usr_beta_client', 'usr_beta_contractor', 'IN_PROGRESS');

  INSERT INTO epics (id, project_id, title) VALUES
    ('epic_alpha', 'proj_alpha', 'Alpha Epic'),
    ('epic_beta', 'proj_beta', 'Beta Epic');

  INSERT INTO collaborators (id, contractor_id, name, role_function, payment_info) VALUES
    ('collab_alpha', 'usr_alpha_contractor', 'Alpha Collaborator', 'FOREMAN', 'synthetic-payment-data');

  INSERT INTO tasks (id, epic_id, title, due_date) VALUES
    ('task_alpha', 'epic_alpha', 'Alpha Task', '2026-12-01T00:00:00Z'),
    ('task_beta', 'epic_beta', 'Beta Task', '2026-12-01T00:00:00Z');

  INSERT INTO materials (id, task_id, created_by_id, name) VALUES
    ('material_alpha', 'task_alpha', 'usr_alpha_client', 'Alpha Material');

  INSERT INTO evidences (id, task_id, uploaded_by, photo_url) VALUES
    ('evidence_alpha', 'task_alpha', 'usr_alpha_client', 'https://example.test/alpha-photo');

  INSERT INTO financial_transactions (
    id, project_id, contractor_id, type, category, description, amount, due_date
  ) VALUES (
    'transaction_alpha', 'proj_alpha', 'usr_alpha_contractor', 'PAYABLE', 'MATERIAL',
    'Synthetic transaction', 10, '2026-12-01T00:00:00Z'
  );

  INSERT INTO payrolls (
    id, collaborator_id, project_id, reference_period, amount, due_date
  ) VALUES (
    'payroll_alpha', 'collab_alpha', 'proj_alpha', '2026-11', 10, '2026-12-01T00:00:00Z'
  );

  INSERT INTO ai_room_simulations (
    id, project_id, requested_by_id, room_name, target_element,
    original_photo_url, generated_photo_url
  ) VALUES (
    'simulation_alpha', 'proj_alpha', 'usr_alpha_client', 'Kitchen', 'LIGHTING',
    'https://example.test/original', 'https://example.test/generated'
  );
`;

function createPoolAdapter(database) {
  return {
    async connect() {
      return {
        async query(sql, parameters) {
          if (parameters?.length) return database.query(sql, parameters);
          const results = await database.exec(sql);
          return Array.isArray(results) ? results.at(-1) : results;
        },
        release() {},
      };
    },
  };
}

export async function createTenantTestDatabase({ withLegacyData = true } = {}) {
  const database = new PGlite();
  const pool = createPoolAdapter(database);
  const migrations = await loadMigrations(migrationsPath);

  try {
    await database.exec(`
      CREATE ROLE obraflow_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
        NOREPLICATION NOBYPASSRLS;
      CREATE ROLE obraflow_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
        NOREPLICATION NOBYPASSRLS;
    `);
    const databaseName = (await database.query("SELECT current_database() AS name")).rows[0].name;
    await database.exec(`
      GRANT CONNECT, CREATE ON DATABASE "${databaseName}" TO obraflow_migrator;
      GRANT USAGE, CREATE ON SCHEMA public TO obraflow_migrator;
      SET ROLE obraflow_migrator;
    `);
    await applyMigrations(pool, migrations.slice(0, 1));
    await database.exec("RESET ROLE");
    if (withLegacyData) await database.exec(LEGACY_FIXTURE_SQL);
    await database.exec("SET ROLE obraflow_migrator");
    await applyMigrations(pool, migrations);
    await database.exec("RESET ROLE");
    if (withLegacyData) await addProjectMembershipFixture(database);
    return database;
  } catch (error) {
    await database.close();
    throw error;
  }
}

async function addProjectMembershipFixture(database) {
  await database.exec(`
    INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status)
    VALUES (
      'mem_engineer_alpha', 'tenant_legacy_usr_alpha_contractor',
      'usr_alpha_engineer', 'ENGINEER', 'ACTIVE'
    );
    INSERT INTO project_memberships (id, tenant_id, project_id, user_id, status)
    VALUES (
      'pm_engineer_alpha', 'tenant_legacy_usr_alpha_contractor',
      'proj_alpha', 'usr_alpha_engineer', 'PENDING'
    );
  `);
}

export function createPoolAdapterForTest(database) {
  return createPoolAdapter(database);
}
