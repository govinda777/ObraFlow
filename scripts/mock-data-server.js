import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3001;
const MOCK_DIR = path.join(process.cwd(), 'mock_data');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Healthcheck
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // Obter conteúdo de um mock
  if (req.url?.startsWith('/api/get-mock') && req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const file = url.searchParams.get('file');
    if (!file || !file.endsWith('.json')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Arquivo inválido' }));
      return;
    }
    const targetPath = path.join(MOCK_DIR, file);
    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Arquivo não encontrado' }));
      return;
    }
    const content = fs.readFileSync(targetPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(content);
    return;
  }

  // Gravar em mock_data
  if (req.url === '/api/save-mock' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { target, data } = payload;
        if (!target || !target.endsWith('.json')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parâmetro target obrigatório e deve ser .json' }));
          return;
        }

        const filePath = path.join(MOCK_DIR, target);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[mock-data-server] ✅ Atualizado ${target} com ${data.length} registros`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, target, count: data.length }));
      } catch (err) {
        console.error('[mock-data-server] ❌ Erro ao salvar:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Criação ou atualização completa de projeto com épicos e tarefas
  if (req.url === '/api/save-full-project' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { project, epics, tasks } = JSON.parse(body);

        // 1. Atualiza projects.json
        const projPath = path.join(MOCK_DIR, 'projects.json');
        let currentProjects = JSON.parse(fs.readFileSync(projPath, 'utf8'));
        const pIndex = currentProjects.findIndex(p => p.id === project.id);
        if (pIndex >= 0) {
          currentProjects[pIndex] = { ...currentProjects[pIndex], ...project };
        } else {
          currentProjects.push(project);
        }
        fs.writeFileSync(projPath, JSON.stringify(currentProjects, null, 2), 'utf8');

        // 2. Se houver épicos, atualiza epics.json
        if (Array.isArray(epics) && epics.length > 0) {
          const epicsPath = path.join(MOCK_DIR, 'epics.json');
          let currentEpics = JSON.parse(fs.readFileSync(epicsPath, 'utf8'));
          // remove épicos prévios deste projeto para não duplicar caso seja reexecução
          currentEpics = currentEpics.filter(e => e.project_id !== project.id);
          currentEpics.push(...epics);
          fs.writeFileSync(epicsPath, JSON.stringify(currentEpics, null, 2), 'utf8');
        }

        // 3. Se houver tarefas, atualiza tasks.json
        if (Array.isArray(tasks) && tasks.length > 0) {
          const tasksPath = path.join(MOCK_DIR, 'tasks.json');
          let currentTasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
          const epicIds = (epics || []).map(e => e.id);
          currentTasks = currentTasks.filter(t => !epicIds.includes(t.epic_id));
          currentTasks.push(...tasks);
          fs.writeFileSync(tasksPath, JSON.stringify(currentTasks, null, 2), 'utf8');
        }

        console.log(`[mock-data-server] 🚀 Projeto ${project.id} gravado fisicamente com sucesso!`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          projectId: project.id,
          totalProjects: currentProjects.length 
        }));
      } catch (err) {
        console.error('[mock-data-server] ❌ Erro ao salvar projeto completo:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
});

server.listen(PORT, () => {
  console.log(`[mock-data-server] ⚡ Servidor de Persistência Local ativo em http://localhost:${PORT}`);
  console.log(`[mock-data-server] 📁 Diretório alvo: ${MOCK_DIR}`);
});
