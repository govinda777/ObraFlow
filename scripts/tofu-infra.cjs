#!/usr/bin/env node

/**
 * Script mestre para gerenciar a infraestrutura completa (Neon + Vercel) com OpenTofu.
 * Ciclo:
 * 1. Recupera as sessões OAuth ativas locais da Neon e da Vercel (zero tokens manuais).
 * 2. Executa o OpenTofu para o Neon.
 * 3. Executa o OpenTofu para a Vercel.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const action = process.argv[2] || 'plan'; // plan, apply, destroy
const target = process.argv[3] || 'both'; // neon, vercel, both
const envName = process.argv[4] || 'staging'; // staging, production

const validActions = ['plan', 'apply', 'destroy'];
if (!validActions.includes(action)) {
  console.error(`Ação inválida: "${action}". Use: plan, apply, ou destroy.`);
  process.exit(1);
}

const validEnvs = ['staging', 'production'];
if (!validEnvs.includes(envName)) {
  console.error(`Ambiente inválido: "${envName}". Use: staging ou production.`);
  process.exit(1);
}

// 1. Obter credencial Neon
const neonCredPath = path.join(os.homedir(), '.config/neon/credentials.json');
let neonToken = null;
if (target === 'neon' || target === 'both') {
  if (!fs.existsSync(neonCredPath)) {
    console.error('❌ Nenhuma sessão Neon encontrada. Faça login com: npx neonctl login');
    process.exit(1);
  }
  const cred = JSON.parse(fs.readFileSync(neonCredPath, 'utf8'));
  neonToken = cred.access_token;
  if (!neonToken) {
    console.error('❌ Token Neon não encontrado. Renove com: npx neonctl login');
    process.exit(1);
  }
  console.log('🐘 Sessão Neon ativa detectada.');
}

// 2. Obter credencial Vercel
const vercelAuthPath = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
let vercelToken = null;
if (target === 'vercel' || target === 'both') {
  if (!fs.existsSync(vercelAuthPath)) {
    console.error('❌ Nenhuma sessão Vercel encontrada. Faça login com: npx vercel login');
    process.exit(1);
  }
  const auth = JSON.parse(fs.readFileSync(vercelAuthPath, 'utf8'));
  vercelToken = auth.token;
  if (!vercelToken) {
    console.error('❌ Token Vercel não encontrado. Renove com: npx vercel login');
    process.exit(1);
  }
  console.log('▲ Sessão Vercel ativa detectada.');
}

function runTofu(dir, args, envVars, name) {
  console.log(`\n========================================`);
  console.log(`🚀 Executando OpenTofu [${name}]: tofu ${args.join(' ')}`);
  console.log(`========================================\n`);

  const res = spawnSync('tofu', args, {
    cwd: dir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...envVars
    }
  });

  if (res.error) {
    console.error(`❌ Erro ao executar ${name}:`, res.error);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(`❌ Falha na execução de ${name} (código ${res.status}).`);
    process.exit(res.status);
  }
}

// URL de estado compartilhada (ADR 0007)
const stateDbUrl = process.env.STATE_DATABASE_URL || "postgresql://neondb_owner:npg_Dm2HOeo8LCjN@ep-divine-boat-bc94p1ba.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require";

// NEON
if (target === 'neon' || target === 'both') {
  const neonDir = path.resolve(__dirname, '../infra/terraform/neon');
  const varFile = path.resolve(neonDir, `environments/${envName}.tfvars`);
  
  // Garantir init com o backend pg do Neon
  runTofu(neonDir, [
    'init',
    `-backend-config=conn_str=${stateDbUrl}`,
    `-backend-config=schema_name=tofu_state_neon_${envName}`,
    '-reconfigure'
  ], { NEON_API_KEY: neonToken }, `Neon Init [${envName}]`);

  const neonVars = [
    action,
    `-var-file=${varFile}`
  ];
  if (action === 'apply' || action === 'destroy') neonVars.push('-auto-approve');
  runTofu(neonDir, neonVars, { NEON_API_KEY: neonToken }, `Neon Database (${envName})`);
}

// VERCEL
if (target === 'vercel' || target === 'both') {
  const vercelDir = path.resolve(__dirname, '../infra/terraform/vercel');
  const varFile = path.resolve(vercelDir, `environments/${envName}.tfvars`);

  // Garantir init com o backend pg da Vercel
  runTofu(vercelDir, [
    'init',
    `-backend-config=conn_str=${stateDbUrl}`,
    `-backend-config=schema_name=tofu_state_vercel_${envName}`,
    '-reconfigure'
  ], { VERCEL_API_TOKEN: vercelToken }, `Vercel Init [${envName}]`);

  const vercelVars = [
    action,
    `-var-file=${varFile}`
  ];
  if (action === 'apply' || action === 'destroy') vercelVars.push('-auto-approve');
  runTofu(vercelDir, vercelVars, { VERCEL_API_TOKEN: vercelToken }, `Vercel App (${envName})`);
}

console.log(`\n🎉 Operação "${action}" concluída com sucesso para toda a infraestrutura!`);
