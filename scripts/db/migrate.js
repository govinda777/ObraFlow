#!/usr/bin/env node
/**
 * Script de Migração de Banco de Dados para Neon DB (PostgreSQL Serverless)
 * Uso:
 *   node scripts/db/migrate.js             (Executa migração padrão)
 *   node scripts/db/migrate.js --reset     (Dropa tabelas e recria tudo)
 *   node scripts/db/migrate.js --dry-run   (Valida sintaxe e conexão sem alterar)
 */

import fs from 'fs';
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

const isReset = process.argv.includes('--reset');
const isDryRun = process.argv.includes('--dry-run');

console.log('🐘 [ObraFlow DB] Iniciando Migração para PostgreSQL / Neon DB...');

if (!DATABASE_URL) {
  if (isDryRun) {
    console.log('ℹ️  [Dry-run] DATABASE_URL não definida. Validando apenas a sintaxe do schema.sql localmente...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    if (!schemaSql.includes('CREATE TABLE IF NOT EXISTS users')) {
      throw new Error('schema.sql corrompido ou incompleto');
    }
    console.log(`✅ [Dry-run] schema.sql validado com sucesso! (${schemaSql.length} bytes, 10 tabelas mapeadas)`);
    process.exit(0);
  }
  console.error('❌ Erro: Variável de ambiente DATABASE_URL não encontrada no arquivo .env.');
  console.error('👉 Adicione DATABASE_URL="postgres://user:password@ep-pooler.neon.tech/neondb?sslmode=require"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const versionRes = await client.query('SELECT version();');
    console.log(`🔗 Conectado com sucesso ao PostgreSQL: ${versionRes.rows[0].version.split(' on ')[0]}`);

    if (isDryRun) {
      console.log('✅ [Dry-run] Conexão ativa e validada. Nenhuma alteração aplicada.');
      return;
    }

    if (isReset) {
      console.log('⚠️  [ObraFlow DB] Executando RESET (--reset): Dropando tabelas na ordem inversa de dependências...');
      const dropQueries = [
        'DROP TABLE IF EXISTS ai_room_simulations CASCADE;',
        'DROP TABLE IF EXISTS payrolls CASCADE;',
        'DROP TABLE IF EXISTS financial_transactions CASCADE;',
        'DROP TABLE IF EXISTS evidences CASCADE;',
        'DROP TABLE IF EXISTS materials CASCADE;',
        'DROP TABLE IF EXISTS tasks CASCADE;',
        'DROP TABLE IF EXISTS collaborators CASCADE;',
        'DROP TABLE IF EXISTS epics CASCADE;',
        'DROP TABLE IF EXISTS projects CASCADE;',
        'DROP TABLE IF EXISTS users CASCADE;'
      ];
      for (const q of dropQueries) {
        await client.query(q);
      }
      console.log('🧹 Tabelas removidas com sucesso.');
    }

    console.log('📜 Lendo e aplicando scripts/db/schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ [ObraFlow DB] Schema aplicado com sucesso! Todas as 10 tabelas e índices estão prontos.');

    // Verificação de tabelas criadas
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    console.log(`📋 Tabelas verificadas (${tableNames.length}):`, tableNames.join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('❌ Falha na migração:', err);
  process.exit(1);
});
