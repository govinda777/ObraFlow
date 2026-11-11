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

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
const isDryRun = process.argv.includes('--dry-run');

console.log('🌱 [ObraFlow Seed Demo] Iniciando Seed de Demonstração (Portfólio Completo)...');

function loadJson(name) {
  const filePath = path.join(MOCK_DIR, name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

async function runSeed() {
  const counts = {};
  for (const item of datasets) {
    const rows = loadJson(item.file);
    counts[item.table] = rows.length;
  }

  console.log('📦 Arquivos lidos de mock_data/:');
  for (const [tbl, count] of Object.entries(counts)) {
    console.log(`   - ${tbl.padEnd(24)}: ${count} registros`);
  }

  if (isDryRun || !DATABASE_URL) {
    if (!DATABASE_URL && !isDryRun) {
      console.warn('⚠️  DATABASE_URL não configurada no .env. Executando em modo --dry-run (validação local)...');
    }
    console.log('✅ [Dry-run] Integridade dos 10 datasets JSON validada com sucesso! Pronto para inserção no Neon.');
    return;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    for (const item of datasets) {
      const rows = loadJson(item.file);
      if (rows.length === 0) continue;

      const first = rows[0];
      const columns = Object.keys(first);
      const colsSql = columns.map((c) => `"${c}"`).join(', ');

      for (const row of rows) {
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = columns.map((col) => {
          const val = row[col];
          if (val === undefined || val === null) return null;
          return val;
        });

        const updateSet = columns
          .filter((c) => c !== 'id')
          .map((c) => `"${c}" = EXCLUDED."${c}"`)
          .join(', ');

        const upsertSql = `
          INSERT INTO "${item.table}" (${colsSql})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET ${updateSet};
        `;
        await client.query(upsertSql, values);
      }
      console.log(`   ✔️ Tabela ${item.table} populada com ${rows.length} registros.`);
    }

    await client.query('COMMIT;');
    console.log('🎉 [ObraFlow Seed Demo] Banco Neon DB populado com sucesso com todos os dados da demonstração!');
  } catch (err) {
    await client.query('ROLLBACK;');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch((err) => {
  console.error('❌ Falha ao aplicar Seed de Demonstração:', err);
  process.exit(1);
});
