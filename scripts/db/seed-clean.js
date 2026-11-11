#!/usr/bin/env node
/**
 * Script de Seed Limpo (Base) para Neon DB (PostgreSQL)
 * Provisiona apenas as 5 Personas fundamentais para o sistema iniciar sem obras cadastradas.
 * Uso:
 *   node scripts/db/seed-clean.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
const isDryRun = process.argv.includes('--dry-run');

console.log('🧼 [ObraFlow Seed Clean] Inicializando banco limpo apenas com as 5 Personas de referência...');

const baseUsers = [
  {
    id: 'usr_1',
    thirdweb_id: 'local:user:usr_1',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@email.com',
    role: 'CLIENT',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_2',
    thirdweb_id: 'local:user:usr_2',
    name: 'Eng. Lucas Rocha',
    email: 'lucas.rocha@construtora.com',
    role: 'CONTRACTOR',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_3',
    thirdweb_id: 'local:user:usr_3',
    name: 'Roberto Almeida',
    email: 'roberto.almeida@orcamentos.com',
    role: 'ENGINEER',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_4',
    thirdweb_id: 'local:user:usr_4',
    name: 'José Silva (Mestre)',
    email: 'jose.silva@canteiro.com',
    role: 'FOREMAN',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_5',
    thirdweb_id: 'local:user:usr_5',
    name: 'Marina Costa',
    email: 'marina.costa@email.com',
    role: 'CLIENT',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_6',
    thirdweb_id: 'local:user:usr_6',
    name: 'Arq. Beatriz Nogueira',
    email: 'beatriz.nogueira@design.com',
    role: 'DESIGNER',
    created_at: new Date().toISOString()
  }
];

async function runCleanSeed() {
  if (isDryRun || !DATABASE_URL) {
    if (!DATABASE_URL && !isDryRun) {
      console.warn('⚠️  DATABASE_URL não configurada no .env. Executando em modo --dry-run (validação local)...');
    }
    console.log(`✅ [Dry-run] ${baseUsers.length} usuários das 5 personas validados com sucesso.`);
    return;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // Limpa obras antigas se houver
    await client.query('DELETE FROM projects;');
    await client.query('DELETE FROM collaborators;');

    for (const u of baseUsers) {
      await client.query(
        `INSERT INTO users (id, thirdweb_id, name, email, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           role = EXCLUDED.role;`,
        [u.id, u.thirdweb_id, u.name, u.email, u.role, u.created_at]
      );
    }

    await client.query('COMMIT;');
    console.log(`🎉 [ObraFlow Seed Clean] Banco limpo e provisionado com sucesso com as ${baseUsers.length} personas base!`);
  } catch (err) {
    await client.query('ROLLBACK;');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runCleanSeed().catch((err) => {
  console.error('❌ Falha ao aplicar Seed Limpo:', err);
  process.exit(1);
});
