import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const uploadSubdirs = ['docs', 'evidences', 'simulations'];

for (const sub of uploadSubdirs) {
  fs.mkdirSync(path.join(rootDir, 'uploads', sub), { recursive: true });
}

console.log('🏗️  [ObraFlow Local] Preparando tabelas analíticas do DuckDB (evidence sources)...');
try {
  execSync('npx evidence sources', { stdio: 'inherit', cwd: rootDir });
} catch (err) {
  console.error('⚠️  [ObraFlow Local] Aviso ao compilar sources iniciais:', err.message);
}

console.log('⚡ [ObraFlow Local] Iniciando Servidor Transacional Local (:3001) + Interface Evidence (:3000)...');

const apiProc = spawn(process.execPath, ['--watch', 'scripts/mock-data-server.js'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env }
});

const uiProc = spawn('npx', ['evidence', 'dev'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
  env: { ...process.env }
});

function prefixStream(stream, prefix, isError = false) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) {
        const out = isError ? process.stderr : process.stdout;
        out.write(`${prefix} ${line}\n`);
      }
    }
  });
}

prefixStream(apiProc.stdout, '\x1b[36m[API :3001]\x1b[0m');
prefixStream(apiProc.stderr, '\x1b[31m[API :3001]\x1b[0m', true);
prefixStream(uiProc.stdout, '\x1b[35m[UI  :3000]\x1b[0m');
prefixStream(uiProc.stderr, '\x1b[33m[UI  :3000]\x1b[0m', true);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n🛑 [ObraFlow Local] Encerrando processos locais...');
  try { apiProc.kill('SIGTERM'); } catch {}
  try { uiProc.kill('SIGTERM'); } catch {}
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

apiProc.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    console.error(`❌ [API :3001] Encerrou inesperadamente (código ${code})`);
  }
});

uiProc.on('exit', (code) => {
  if (!shuttingDown) {
    shutdown(code ?? 0);
  }
});
