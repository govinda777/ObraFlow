#!/usr/bin/env node
/**
 * Script de Seed de Demonstração de Alta Fidelidade para Neon DB (PostgreSQL)
 * Lê os dados de mock_data/*.json e insere em ordem topológica no banco.
 * Uso:
 *   node scripts/db/seed-demo.js            (Popula o banco com os dados da demo)
 *   node scripts/db/seed-demo.js --dry-run  (Valida formatação e integridade sem gravar)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const MOCK_DIR = path.join(ROOT_DIR, 'mock_data');

const { Pool } = pg;

function loadJson(name) {
  const filePath = path.join(MOCK_DIR, name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadDemoDatasets() {
  return new Map(datasets.map((item) => [item.table, loadJson(item.file)]));
}

// Ordem topológica estrita para satisfazer Foreign Keys:
// 1. users
// 2. collaborators
// 3. projects
// 4. epics
// 5. tasks
// 6. materials
// 7. evidences
// 8. financial_transactions
// 9. payrolls
// 10. ai_room_simulations

const datasets = [
  { table: 'users', file: 'users.json' },
  { table: 'collaborators', file: 'collaborators.json' },
  { table: 'projects', file: 'projects.json' },
  { table: 'epics', file: 'epics.json' },
  { table: 'tasks', file: 'tasks.json' },
  { table: 'materials', file: 'materials.json' },
  { table: 'evidences', file: 'evidences.json' },
  { table: 'financial_transactions', file: 'financial_transactions.json' },
  { table: 'payrolls', file: 'payrolls.json' },
  { table: 'ai_room_simulations', file: 'ai_room_simulations.json' }
];

// These memberships are explicit synthetic-demo fixtures. A global user role
// from mock_data/users.json never creates a business membership by itself.
const demoTenants = [
  { id: 'tenant_demo_alpha', name: 'Construtora Alpha (demo)', slug: 'demo-alpha', ownerUserId: 'usr_2' }
];
const demoStaffMemberships = [
  { userId: 'usr_3', tenantId: 'tenant_demo_alpha', role: 'ENGINEER' },
  { userId: 'usr_4', tenantId: 'tenant_demo_alpha', role: 'FOREMAN' },
  { userId: 'usr_6', tenantId: 'tenant_demo_alpha', role: 'DESIGNER' }
];

function createTenantScope(rowsByTable) {
  const users = rowsByTable.get('users');
  const projects = rowsByTable.get('projects');
  const usersById = new Map(users.map((user) => [user.id, user]));
  const tenantByOwnerId = new Map(demoTenants.map((tenant) => [tenant.ownerUserId, tenant.id]));
  const tenantByProjectId = new Map(projects.map((project) => {
    const tenantId = tenantByOwnerId.get(project.contractor_id);
    const contractor = usersById.get(project.contractor_id);
    const client = usersById.get(project.client_id);
    if (!tenantId || !contractor || contractor.role !== 'CONTRACTOR') {
      throw new Error(`Project ${project.id} has no explicit contractor-to-tenant fixture`);
    }
    if (!client || client.role !== 'CLIENT') {
      throw new Error(`Project ${project.id} has no explicit client user fixture`);
    }
    return [project.id, tenantId];
  }));
  const projectByEpicId = new Map(rowsByTable.get('epics').map((epic) => [epic.id, epic.project_id]));
  const projectByTaskId = new Map(rowsByTable.get('tasks').map((task) => [task.id, projectByEpicId.get(task.epic_id)]));
  const projectMembers = new Map(projects.map((project) => {
    const tenantId = tenantByProjectId.get(project.id);
    const staff = demoStaffMemberships
      .filter((membership) => membership.tenantId === tenantId)
      .map((membership) => membership.userId);
    return [project.id, new Set([project.client_id, project.contractor_id, ...staff])];
  }));

  for (const evidence of rowsByTable.get('evidences')) {
    const projectId = projectByTaskId.get(evidence.task_id);
    const user = usersById.get(evidence.uploaded_by);
    if (!user) {
      throw new Error(
        `Evidence ${evidence.id} uploader '${evidence.uploaded_by}' is not a users.id. Reconcile the source identity explicitly; collaborator IDs are not converted to user IDs.`,
      );
    }
    if (!projectMembers.get(projectId)?.has(user.id)) {
      throw new Error(`Evidence ${evidence.id} uploader '${user.id}' has no explicit membership in project '${projectId}'`);
    }
  }

  for (const material of rowsByTable.get('materials')) {
    const projectId = projectByTaskId.get(material.task_id);
    if (!projectMembers.get(projectId)?.has(material.created_by_id)) {
      throw new Error(`Material ${material.id} creator '${material.created_by_id}' has no explicit membership in project '${projectId}'`);
    }
  }

  for (const simulation of rowsByTable.get('ai_room_simulations')) {
    const projectId = simulation.project_id;
    if (!projectMembers.get(projectId)?.has(simulation.requested_by_id)) {
      throw new Error(`Simulation ${simulation.id} requester '${simulation.requested_by_id}' has no explicit membership in project '${projectId}'`);
    }
  }

  return (table, row) => {
    if (table === 'users') return row;
    if (table === 'collaborators') {
      const tenantId = tenantByOwnerId.get(row.contractor_id);
      if (!tenantId) throw new Error(`No explicit demo tenant is configured for collaborator owner ${row.contractor_id}`);
      return { ...row, tenant_id: tenantId };
    }

    const projectId = table === 'projects'
      ? row.id
      : table === 'epics'
        ? row.project_id
        : table === 'tasks'
          ? projectByEpicId.get(row.epic_id)
          : table === 'materials' || table === 'evidences'
            ? projectByTaskId.get(row.task_id)
            : row.project_id;
    const tenantId = tenantByProjectId.get(projectId);
    if (!projectId || !tenantId) {
      throw new Error(`Could not resolve tenant/project for ${table} record ${row.id}`);
    }
    return { ...row, tenant_id: tenantId, ...(table === 'tasks' || table === 'materials' || table === 'evidences' ? { project_id: projectId } : {}) };
  };
}

async function seedDemoMemberships(client, users, projects) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  for (const tenant of demoTenants) {
    const owner = usersById.get(tenant.ownerUserId);
    if (!owner || owner.role !== 'CONTRACTOR') {
      throw new Error(`Demo tenant ${tenant.id} must reference an explicit contractor fixture`);
    }
    await client.query(
      `INSERT INTO tenants (id, name, slug, owner_user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [tenant.id, tenant.name, tenant.slug, tenant.ownerUserId],
    );
    const storedOwner = await client.query('SELECT owner_user_id FROM tenants WHERE id = $1', [tenant.id]);
    if (storedOwner.rows[0]?.owner_user_id !== tenant.ownerUserId) {
      throw new Error(`Demo tenant ${tenant.id} is already owned by a different user`);
    }

    await client.query(
      `INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status)
       VALUES ($1, $2, $3, 'CONTRACTOR', 'ACTIVE')
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE'`,
      [`demo_membership_${tenant.ownerUserId}`, tenant.id, tenant.ownerUserId],
    );
  }

  for (const project of projects) {
    const tenantId = demoTenants.find((tenant) => tenant.ownerUserId === project.contractor_id)?.id;
    if (!tenantId) throw new Error(`Project ${project.id} has no explicit demo tenant`);
    await client.query(
      `INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status)
       VALUES ($1, $2, $3, 'CLIENT', 'ACTIVE')
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'CLIENT', status = 'ACTIVE'`,
      [`demo_membership_${tenantId}_${project.client_id}`, tenantId, project.client_id],
    );
  }

  for (const membership of demoStaffMemberships) {
    const user = usersById.get(membership.userId);
    if (!user || user.role !== membership.role) {
      throw new Error(`Demo staff membership for ${membership.userId} does not match its explicit fixture role`);
    }
    await client.query(
      `INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE'`,
      [`demo_membership_${membership.tenantId}_${membership.userId}`, membership.tenantId, membership.userId, membership.role],
    );
  }
}

async function seedDemoProjectMemberships(client, projects) {
  for (const project of projects) {
    const tenantId = demoTenants.find((tenant) => tenant.ownerUserId === project.contractor_id)?.id;
    const teamUserIds = demoStaffMemberships
      .filter((membership) => membership.tenantId === tenantId)
      .map((membership) => membership.userId);
    const memberIds = new Set([project.client_id, project.contractor_id, ...teamUserIds]);
    for (const userId of memberIds) {
      await client.query(
        `INSERT INTO project_memberships (id, tenant_id, project_id, user_id, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         ON CONFLICT (project_id, user_id, tenant_id) DO UPDATE SET status = 'ACTIVE'`,
        [`demo_project_membership_${project.id}_${userId}`, tenantId, project.id, userId],
      );
    }
  }
}

function prepareDemoRows(rowsByTable) {
  if (!(rowsByTable instanceof Map)) {
    throw new TypeError('Demo seed data must be provided as a Map keyed by table name.');
  }

  for (const { table } of datasets) {
    if (!Array.isArray(rowsByTable.get(table))) {
      throw new Error(`Demo seed dataset '${table}' is missing or is not an array.`);
    }
  }

  const addTenantScope = createTenantScope(rowsByTable);
  return new Map(datasets.map(({ table }) => [
    table,
    rowsByTable.get(table).map((row) => addTenantScope(table, row)),
  ]));
}

export async function seedDemoDatabase(client, { rowsByTable = loadDemoDatasets() } = {}) {
  const scopedRowsByTable = prepareDemoRows(rowsByTable);
  const counts = Object.fromEntries(
    datasets.map(({ table }) => [table, scopedRowsByTable.get(table).length]),
  );
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    for (const item of datasets) {
      const rows = scopedRowsByTable.get(item.table);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colsSql = columns.map((column) => `"${column}"`).join(', ');
      const updateSet = columns
        .filter((column) => column !== 'id')
        .map((column) => `"${column}" = EXCLUDED."${column}"`)
        .join(', ');

      for (const row of rows) {
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = columns.map((column) => row[column] ?? null);
        const upsertSql = `
          INSERT INTO "${item.table}" (${colsSql})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET ${updateSet};
        `;
        await client.query(upsertSql, values);
      }

      if (item.table === 'users') {
        await seedDemoMemberships(client, rowsByTable.get('users'), rowsByTable.get('projects'));
      }
      if (item.table === 'projects') {
        await seedDemoProjectMemberships(client, rowsByTable.get('projects'));
      }
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return counts;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Demo seed failed and its database transaction could not be rolled back cleanly.',
          { cause: error },
        );
      }
    }
    throw error;
  }
}

export async function runSeed({
  rowsByTable = loadDemoDatasets(),
  seedDatabaseUrl = process.env.SEED_DATABASE_URL,
  allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true',
  nodeEnv = process.env.NODE_ENV,
  dryRun = process.argv.includes('--dry-run'),
  logger = console,
} = {}) {
  const scopedRowsByTable = prepareDemoRows(rowsByTable);
  const counts = Object.fromEntries(
    datasets.map(({ table }) => [table, scopedRowsByTable.get(table).length]),
  );

  logger.log('📦 Arquivos lidos de mock_data/:');
  for (const [table, count] of Object.entries(counts)) {
    logger.log(`   - ${table.padEnd(24)}: ${count} registros`);
  }

  if (dryRun || !seedDatabaseUrl) {
    if (!seedDatabaseUrl && !dryRun) {
      logger.warn('⚠️  SEED_DATABASE_URL não configurada. Executando em modo --dry-run (validação local)...');
    }
    logger.log('✅ [Dry-run] Estrutura, escopos e relações dos datasets foram validados sem conexão ao banco.');
    return { dryRun: true, counts };
  }

  if (nodeEnv === 'production' || !allowDemoSeed) {
    throw new Error('Database writes require a non-production environment, SEED_DATABASE_URL, and ALLOW_DEMO_SEED=true.');
  }

  const pool = new Pool({
    connectionString: seedDatabaseUrl,
    ssl: seedDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: true },
  });

  try {
    const client = await pool.connect();
    try {
      const seededCounts = await seedDemoDatabase(client, { rowsByTable });
      logger.log('🎉 [ObraFlow Seed Demo] Banco de demonstração populado com sucesso.');
      return { dryRun: false, counts: seededCounts };
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  dotenv.config({ path: path.join(ROOT_DIR, '.env') });
  await runSeed();
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error('❌ Falha ao aplicar Seed de Demonstração:', error);
    process.exitCode = 1;
  });
}
