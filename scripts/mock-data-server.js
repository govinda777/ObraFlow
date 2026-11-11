import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { generateAllDemoDocs } from './generate-demo-docs.js';

const PORT = Number(process.env.MOCK_PORT || 3001);
const ROOT_DIR = process.cwd();
const MOCK_DIR = path.join(ROOT_DIR, 'mock_data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

for (const sub of ['docs', 'evidences', 'simulations']) {
  fs.mkdirSync(path.join(UPLOADS_DIR, sub), { recursive: true });
}

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readJsonTable(filename) {
  const filePath = path.join(MOCK_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonTable(filename, rows) {
  const filePath = path.join(MOCK_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
}

function nextEntityId(rows, prefix) {
  let max = 0;
  for (const r of rows) {
    const m = String(r.id || '').match(new RegExp(`^${prefix}_(\\d+)$`));
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return `${prefix}_${max + 1}`;
}

function readBody(req, maxBytes = 35 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload excede o limite local de 35MB.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks);
        let raw = buf.toString('utf8');
        // Fallback para payloads Latin-1 (ex.: "Copy as cURL" do Firefox com escapes \xe7\xe3o)
        if (raw.includes('\uFFFD')) {
          raw = buf.toString('latin1');
        }
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('JSON inválido no corpo da requisição: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

// Fila serializada para rodar `npx evidence sources` sem condição de corrida
let sourcesQueue = Promise.resolve();
function rebuildDuckDBSources() {
  if (process.env.SKIP_EVIDENCE_SOURCES === '1') {
    return Promise.resolve({ skipped: true });
  }
  sourcesQueue = sourcesQueue.then(
    () =>
      new Promise((resolve) => {
        const start = Date.now();
        exec('npx evidence sources', { cwd: ROOT_DIR }, (err, stdout, stderr) => {
          const elapsed = Date.now() - start;
          if (err) {
            console.warn(`[mock-data-server] ⚠️ Aviso em evidence sources (${elapsed}ms):`, stderr || err.message);
            resolve({ ok: false, elapsed, error: err.message });
          } else {
            console.log(`[mock-data-server] 🔄 DuckDB Parquet sincronizado em ${elapsed}ms`);
            resolve({ ok: true, elapsed });
          }
        });
      })
  );
  return sourcesQueue;
}

function parseBrDateToIso(str, fallbackDaysOffset = 7) {
  if (!str) {
    return new Date(Date.now() + fallbackDaysOffset * 86400000).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.includes('T') ? str : `${str}T00:00:00Z`;
  }
  const br = String(str).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}T00:00:00Z`;
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date(Date.now() + fallbackDaysOffset * 86400000).toISOString();
}

function sanitizeFilename(name) {
  return String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90) || 'arquivo';
}

// Parser de Planilha Orçamentária CSV/TSV enviada no upload (suporta delimitador ';' ou ',')
function parseCostSpreadsheetFromText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return null;
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const headerIdx = lines.findIndex(
    (l) => /etapa|tarefa/i.test(l) && /quantidade|mao_de_obra|preco/i.test(l) && (l.includes(';') || l.includes(','))
  );
  if (headerIdx === -1) return null;

  const delimiter = lines[headerIdx].split(';').length >= lines[headerIdx].split(',').length ? ';' : ',';
  const headers = lines[headerIdx].split(delimiter).map((h) => h.trim().toLowerCase());
  const col = (nameRegex) => headers.findIndex((h) => nameRegex.test(h));

  const idxEpic = col(/^etapa|epico|macroetapa/);
  const idxTask = col(/^tarefa|servico|descricao/);
  const idxCat = col(/^categoria|cat/);
  const idxMat = col(/especificacao|material_name|^material|insumo$/);
  const idxGrp = col(/grupo/);
  const idxUnit = col(/^unid|^unit/);
  const idxQty = col(/^quant|^qtd/);
  const idxUnitPrice = col(/preco_unit|unit_price|preco_ref/);
  const idxMatsTotal = col(/^insumos_brl|^mats$/);
  const idxLabor = col(/mao_de_obra|labor/);
  const idxFreight = col(/frete|freight/);
  const idxReceiver = col(/recebedor|receiver/);
  const idxDays = col(/prazo|dias/);

  if (idxTask === -1) return null;

  const now = Date.now();
  const isoPlus = (days) => new Date(now + days * 86400000).toISOString();
  const brPlus = (days) => {
    const d = new Date(now + days * 86400000);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  const toNum = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    const s = String(v).trim();
    const cleaned = s.includes(',') && s.includes('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const epicMap = new Map();
  const epics = [];
  const tasks = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#') || line.startsWith('---')) break;
    const cols = line.split(delimiter).map((c) => c.trim());
    if (cols.length < 4 || !cols[idxTask]) continue;

    const epicTitle = (idxEpic !== -1 && cols[idxEpic]) ? cols[idxEpic] : '1. Execução Técnica Prevista';
    let tempEpicId = epicMap.get(epicTitle);
    const daysOffset = Math.max(2, idxDays !== -1 ? Math.round(toNum(cols[idxDays])) || (tasks.length + 1) * 5 : (tasks.length + 1) * 5);

    if (!tempEpicId) {
      tempEpicId = `ep_${epics.length + 1}`;
      epicMap.set(epicTitle, tempEpicId);
      epics.push({
        temp_id: tempEpicId,
        title: epicTitle,
        order_index: epics.length + 1,
        start_date: isoPlus(Math.max(1, daysOffset - 6)),
        end_date: isoPlus(daysOffset)
      });
    } else {
      const epObj = epics.find((e) => e.temp_id === tempEpicId);
      if (epObj) epObj.end_date = isoPlus(daysOffset);
    }

    const qty = Math.max(0, idxQty !== -1 ? toNum(cols[idxQty]) : 1);
    const unitPrice = idxUnitPrice !== -1 ? toNum(cols[idxUnitPrice]) : 0;
    const matsTotal = idxMatsTotal !== -1 ? toNum(cols[idxMatsTotal]) : Math.round(qty * unitPrice);
    const labor = idxLabor !== -1 ? Math.round(toNum(cols[idxLabor])) : 0;
    const freight = idxFreight !== -1 ? Math.round(toNum(cols[idxFreight])) : 0;

    tasks.push({
      temp_epic: tempEpicId,
      title: cols[idxTask],
      cat: (idxCat !== -1 && cols[idxCat]) ? cols[idxCat] : 'EXECUTION',
      due_date: brPlus(daysOffset),
      labor,
      mats: matsTotal,
      material_name: idxMat !== -1 ? cols[idxMat] : '',
      material_group: (idxGrp !== -1 && cols[idxGrp]) ? cols[idxGrp] : 'FINISHINGS',
      unit: (idxUnit !== -1 && cols[idxUnit]) ? cols[idxUnit] : 'un',
      quantity: qty || 1,
      freight_cost: freight,
      receiver_responsible: (idxReceiver !== -1 && cols[idxReceiver] === 'CLIENT') ? 'CLIENT' : 'CONTRACTOR'
    });
  }

  if (tasks.length === 0) return null;
  return { epics, tasks };
}

// Motor Heurístico Local de Engenharia Orçamentista (funciona 100% offline sem chave de API)
function generateLocalEngineeringEAP(project, extraText = '') {
  const area = Math.max(15, Number(project.area_m2) || 72);
  const rawBudget = Number(project.budget_estimated) || Math.round(area * 850);
  const text = `${project.name || ''} ${project.scope_description || ''} ${extraText || ''}`.toLowerCase();

  // 1. Se o usuário enviou uma planilha CSV orçamentária estruturada, importa fielmente os itens, quantidades e custos
  const parsedCsv = parseCostSpreadsheetFromText(extraText);
  if (parsedCsv && parsedCsv.tasks.length > 0) {
    const csvTotal = parsedCsv.tasks.reduce(
      (sum, t) => sum + Number(t.labor || 0) + Number(t.mats || 0) + Number(t.freight_cost || 0),
      0
    );
    const detectedNorms = [];
    if (/nbr\s*16280/i.test(extraText)) detectedNorms.push('ABNT NBR 16280');
    if (/nbr\s*5410/i.test(extraText)) detectedNorms.push('NBR 5410');
    if (/nbr\s*13753/i.test(extraText)) detectedNorms.push('NBR 13753');
    if (/nbr\s*15758/i.test(extraText)) detectedNorms.push('NBR 15758');

    const docsCited = [project.doc_pdf_name, project.doc_spreadsheet_name, project.doc_txt_name]
      .filter(Boolean)
      .join(', ');
    const marginDiff = rawBudget - csvTotal;
    const budgetVerdict =
      marginDiff >= 0
        ? `dentro do teto estipulado pelo cliente (folga técnica de R$ ${marginDiff.toLocaleString('pt-BR')},00)`
        : `acima do teto inicial em R$ ${Math.abs(marginDiff).toLocaleString('pt-BR')},00 (recomenda-se revisão de escopo/acabamentos)`;

    const diagnostico =
      `[Motor Local ObraFlow • Extração Estruturada] Foram importadas ${parsedCsv.tasks.length} tarefas técnicas distribuídas em ${parsedCsv.epics.length} macroetapas diretamente da planilha de custos anexada (${docsCited || 'documentação técnica'}). ` +
      (detectedNorms.length > 0
        ? `Conformidade cruzada com o Memorial Descritivo validada para as normas ${detectedNorms.join(', ')}. `
        : '') +
      `Custo global consolidado (mão de obra + insumos + logística de frete) apurado em R$ ${csvTotal.toLocaleString('pt-BR')},00 — ${budgetVerdict}.`;

    return {
      engine: 'local-heuristic',
      diagnostico,
      orcamento_base: csvTotal,
      confianca_pct: 98,
      epicos: parsedCsv.epics,
      tarefas: parsedCsv.tasks
    };
  }

  const hasDemolicao = /demoli|mureta|parede|remocao|entulho|integrac/.test(text);
  const hasFundacao = /fundac|sapata|estaca|estrutur|concret|alvenaria|construcao|terrea|sobrado/.test(text);
  const hasHidraulica = /hidraul|banheiro|cozinha|agua|esgoto|tubulac|ppr|ilha/.test(text);
  const hasEletrica = /eletric|220v|110v|quadro|circuito|tomada|disjuntor/.test(text);
  const hasPiso = /piso|porcelanat|revestiment|ceram|vinilic|assentament|calacata/.test(text);
  const hasBancada = /bancada|quartzo|marmore|granito|cuba|pia|ilha/.test(text);
  const hasForro = /forro|gesso|drywall|sanca|teto|pintura/.test(text);
  const hasLuz = /iluminac|led|trilho|pendente|spot|luminaria/.test(text);

  const now = Date.now();
  const isoPlus = (days) => new Date(now + days * 86400000).toISOString();
  const brPlus = (days) => {
    const d = new Date(now + days * 86400000);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const epics = [];
  const tasks = [];

  // Épico 1: Preliminares / Demolição ou Estrutura
  const ep1Title = hasFundacao && !hasDemolicao
    ? '1. Infraestrutura, Fundação e Alvenaria'
    : '1. Serviços Preliminares, Demolição e Infraestrutura';
  epics.push({
    temp_id: 'ep_1',
    title: ep1Title,
    order_index: 1,
    start_date: isoPlus(1),
    end_date: isoPlus(12)
  });

  if (hasFundacao && !hasDemolicao) {
    tasks.push({
      temp_epic: 'ep_1',
      title: '1. Execução de Fundação e Levantamento de Alvenaria',
      cat: 'EXECUTION',
      due_date: brPlus(8),
      labor: Math.round(area * 65),
      mats: Math.round(area * 85),
      material_name: 'Concreto FCK 30MPa, Aço CA-50 e Blocos Cerâmicos',
      material_group: 'STRUCTURAL',
      unit: 'm2',
      quantity: Math.round(area * 0.6),
      freight_cost: 550,
      receiver_responsible: 'CONTRACTOR'
    });
  } else {
    tasks.push({
      temp_epic: 'ep_1',
      title: '1. Proteção de Piso, Demolição Seletiva e Caçamba de Entulho',
      cat: 'EXECUTION',
      due_date: brPlus(4),
      labor: Math.round(Math.max(1400, area * 28)),
      mats: Math.round(Math.max(450, area * 8)),
      material_name: 'Salva-Piso + Locação de Caçamba Estacionária + EPIs',
      material_group: 'STRUCTURAL',
      unit: 'un',
      quantity: Math.max(1, Math.ceil(area / 45)),
      freight_cost: 220,
      receiver_responsible: 'CONTRACTOR'
    });
  }

  if (hasEletrica || hasHidraulica || true) {
    tasks.push({
      temp_epic: 'ep_1',
      title: hasHidraulica
        ? '2. Readequação Elétrica 220V e Rede Hidrossanitária PPR'
        : '2. Readequação de Circuitos Elétricos e Pontos de Força',
      cat: 'EXECUTION',
      due_date: brPlus(10),
      labor: Math.round(Math.max(1800, area * 32)),
      mats: Math.round(Math.max(1200, area * 24)),
      material_name: hasHidraulica
        ? 'Cabos Antichama 4mm + Disjuntores DIN + Tubos PPR'
        : 'Cabos Flexíveis 2.5/4mm + Quadro DIN + Caixas 4x2',
      material_group: 'PLUMBING',
      unit: 'un',
      quantity: 1,
      freight_cost: 180,
      receiver_responsible: 'CONTRACTOR'
    });
  }

  // Épico 2: Revestimentos, Pisos e Bancadas
  epics.push({
    temp_id: 'ep_2',
    title: '2. Logística de Revestimentos, Pisos e Bancadas',
    order_index: 2,
    start_date: isoPlus(13),
    end_date: isoPlus(28)
  });

  const pisoArea = Math.round(area * 1.1); // +10% perda técnica
  tasks.push({
    temp_epic: 'ep_2',
    title: '3. Recebimento e Conferência Técnica de Porcelanatos em Obra',
    cat: 'MATERIAL_RECEIVING',
    due_date: brPlus(14),
    labor: 350,
    mats: 0,
    material_name: '',
    material_group: 'FINISHINGS',
    unit: 'un',
    quantity: 0,
    freight_cost: 0,
    receiver_responsible: 'CONTRACTOR'
  });

  tasks.push({
    temp_epic: 'ep_2',
    title: hasPiso
      ? `4. Regularização e Assentamento de Porcelanato (${pisoArea}m² c/ perda)`
      : `4. Regularização de Contrapiso e Revestimento Geral (${pisoArea}m²)`,
    cat: 'EXECUTION',
    due_date: brPlus(24),
    labor: Math.round(pisoArea * 58),
    mats: Math.round(pisoArea * 128),
    material_name: `Porcelanato Retificado 90x90 + Argamassa AC-III + Niveladores`,
    material_group: 'FINISHINGS',
    unit: 'm2',
    quantity: pisoArea,
    freight_cost: 480,
    receiver_responsible: 'CONTRACTOR'
  });

  if (hasBancada) {
    tasks.push({
      temp_epic: 'ep_2',
      title: '5. Instalação de Bancada em Quartzo e Cuba Gourmet',
      cat: 'EXECUTION',
      due_date: brPlus(28),
      labor: 950,
      mats: 4600,
      material_name: 'Bancada Esculpida em Quartzo + Cuba Inox Gourmet',
      material_group: 'FINISHINGS',
      unit: 'un',
      quantity: 1,
      freight_cost: 320,
      receiver_responsible: 'CLIENT'
    });
  }

  // Épico 3: Forro, Iluminação e Acabamento Fino
  epics.push({
    temp_id: 'ep_3',
    title: '3. Forro, Iluminação Técnica e Entrega Vistoriada',
    order_index: 3,
    start_date: isoPlus(29),
    end_date: isoPlus(42)
  });

  const idxNext = tasks.length + 1;
  tasks.push({
    temp_epic: 'ep_3',
    title: `${idxNext}. Execução de Forro ${hasForro ? 'Drywall tabicado' : 'de Gesso'}, Pintura Acrílica e ${hasLuz ? 'Perfis LED' : 'Iluminação'}`,
    cat: 'EXECUTION',
    due_date: brPlus(38),
    labor: Math.round(Math.max(2400, area * 42)),
    mats: Math.round(Math.max(2800, area * 48)),
    material_name: 'Chapas Drywall ST/RU + Perfis Galvanizados + Kit Trilhos/Perfis LED 3000K',
    material_group: hasLuz ? 'LIGHTING' : 'DRYWALL',
    unit: 'm2',
    quantity: Math.round(area * 0.85),
    freight_cost: 290,
    receiver_responsible: 'CONTRACTOR'
  });

  tasks.push({
    temp_epic: 'ep_3',
    title: `${idxNext + 1}. Vistoria Final de Estanqueidade, Limpeza Fina e Entrega de Chaves`,
    cat: 'INSPECTION',
    due_date: brPlus(42),
    labor: 850,
    mats: 320,
    material_name: 'Insumos de Limpeza Pós-Obra Neutros',
    material_group: 'FINISHINGS',
    unit: 'un',
    quantity: 1,
    freight_cost: 0,
    receiver_responsible: 'CONTRACTOR'
  });

  // Calibra suavemente para respeitar a ordem de grandeza do teto do cliente (se razoável)
  const rawTotal = tasks.reduce((s, t) => s + t.labor + t.mats + (t.freight_cost || 0), 0);
  if (rawBudget > 8000 && rawTotal > 0) {
    const target = rawBudget * 0.96;
    const ratio = Math.min(1.8, Math.max(0.55, target / rawTotal));
    for (const t of tasks) {
      t.labor = Math.round((t.labor * ratio) / 50) * 50;
      t.mats = Math.round((t.mats * ratio) / 50) * 50;
    }
  }

  const finalTotal = tasks.reduce((s, t) => s + t.labor + t.mats + (t.freight_cost || 0), 0);
  const docsCited = [project.doc_pdf_name, project.doc_spreadsheet_name, project.doc_txt_name]
    .filter(Boolean)
    .join(', ');

  const diagnostico =
    `[Motor Local ObraFlow] Análise técnica concluída para "${project.name}" (${area} m²). ` +
    `Documentos processados localmente: ${docsCited || 'escopo descritivo'}. ` +
    `Dimensionamento inclui reserva técnica de 10% para revestimentos (${pisoArea} m²), ` +
    `${epics.length} macroetapas sequenciais e ${tasks.length} tarefas auditáveis por evidência fotográfica. ` +
    `Estimativa calibrada em R$ ${finalTotal.toLocaleString('pt-BR')},00 frente ao teto informado de R$ ${rawBudget.toLocaleString('pt-BR')},00.`;

  return {
    engine: 'local-heuristic',
    diagnostico,
    orcamento_base: finalTotal,
    confianca_pct: 93,
    epicos: epics,
    tarefas: tasks
  };
}

function generateLocalSimulationSvg({ roomName, materialName, targetElement }) {
  const safeRoom = String(roomName || 'Ambiente Reformado').replace(/[<>&"]/g, '');
  const safeMat = String(materialName || 'Acabamento Especificado').replace(/[<>&"]/g, '');
  const safeElem = String(targetElement || 'FINISHINGS').replace(/[<>&"]/g, '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="55%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fde68a" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#fffbeb" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fde68a" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <rect width="900" height="560" fill="url(#bg)"/>
  <!-- Teto / Sanca Iluminada -->
  <polygon points="0,0 900,0 740,110 160,110" fill="#f8fafc"/>
  <rect x="200" y="52" width="500" height="8" rx="4" fill="url(#glow)"/>
  <!-- Parede de Fundo -->
  <rect x="160" y="110" width="580" height="270" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
  <!-- Piso em Perspectiva -->
  <polygon points="160,380 740,380 900,560 0,560" fill="url(#floor)"/>
  <line x1="305" y1="380" x2="210" y2="560" stroke="#94a3b8" stroke-width="1.5" opacity="0.5"/>
  <line x1="450" y1="380" x2="450" y2="560" stroke="#94a3b8" stroke-width="1.5" opacity="0.5"/>
  <line x1="595" y1="380" x2="690" y2="560" stroke="#94a3b8" stroke-width="1.5" opacity="0.5"/>
  <line x1="95" y1="450" x2="805" y2="450" stroke="#94a3b8" stroke-width="1.5" opacity="0.5"/>
  <!-- Bancada / Elemento Arquitetônico -->
  <rect x="250" y="275" width="400" height="105" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <rect x="242" y="265" width="416" height="16" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <!-- Luminária Linear -->
  <line x1="380" y1="60" x2="380" y2="165" stroke="#d97706" stroke-width="2"/>
  <line x1="520" y1="60" x2="520" y2="165" stroke="#d97706" stroke-width="2"/>
  <rect x="330" y="165" width="240" height="10" rx="5" fill="#f59e0b"/>
  <!-- Selo ObraFlow Estúdio IA Local -->
  <rect x="28" y="24" width="350" height="72" rx="14" fill="#0f172a" opacity="0.88"/>
  <text x="48" y="52" fill="#c084fc" font-family="system-ui, sans-serif" font-size="13" font-weight="800">✨ OBRAFLOW ESTÚDIO IA • RENDER LOCAL</text>
  <text x="48" y="76" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700">${safeRoom}</text>
  <rect x="28" y="476" width="844" height="60" rx="14" fill="#0f172a" opacity="0.9"/>
  <text x="48" y="502" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">MATERIAL APLICADO (${safeElem}):</text>
  <text x="48" y="523" fill="#34d399" font-family="system-ui, sans-serif" font-size="15" font-weight="700">${safeMat}</text>
</svg>`;
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:' + PORT}`);
  const pathname = parsedUrl.pathname;

  try {
    // 1. Healthcheck
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'ok', port: PORT, time: new Date().toISOString() });
    }

    // 2. Servir arquivos físicos de ./uploads/
    if (pathname.startsWith('/uploads/') && req.method === 'GET') {
      const rel = decodeURIComponent(pathname.replace(/^\/uploads\//, ''));
      const abs = path.resolve(UPLOADS_DIR, rel);
      if (!abs.startsWith(UPLOADS_DIR) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return sendJson(res, 404, { error: 'Arquivo local não encontrado' });
      }
      const ext = path.extname(abs).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(abs).pipe(res);
      return;
    }

    // 3. Estado consolidado das 10 tabelas locais
    if (pathname === '/api/state' && req.method === 'GET') {
      return sendJson(res, 200, {
        users: readJsonTable('users.json'),
        projects: readJsonTable('projects.json'),
        collaborators: readJsonTable('collaborators.json'),
        payrolls: readJsonTable('payrolls.json'),
        financial_transactions: readJsonTable('financial_transactions.json'),
        epics: readJsonTable('epics.json'),
        tasks: readJsonTable('tasks.json'),
        materials: readJsonTable('materials.json'),
        evidences: readJsonTable('evidences.json'),
        ai_room_simulations: readJsonTable('ai_room_simulations.json')
      });
    }

    // 4. Compatibilidade legada GET /api/get-mock
    if (pathname === '/api/get-mock' && req.method === 'GET') {
      const file = parsedUrl.searchParams.get('file');
      if (!file || !file.endsWith('.json')) {
        return sendJson(res, 400, { error: 'Arquivo inválido' });
      }
      const targetPath = path.resolve(MOCK_DIR, path.basename(file));
      if (!fs.existsSync(targetPath)) {
        return sendJson(res, 404, { error: 'Arquivo não encontrado' });
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(fs.readFileSync(targetPath, 'utf8'));
      return;
    }

    // 5. Upload real para ./uploads/<folder>/
    if (pathname === '/api/upload' && req.method === 'POST') {
      const { filename, mimeType, folder = 'docs', base64Data } = await readBody(req);
      if (!base64Data) {
        return sendJson(res, 400, { error: 'Conteúdo base64Data é obrigatório.' });
      }
      const allowedFolders = new Set(['docs', 'evidences', 'simulations']);
      const safeFolder = allowedFolders.has(folder) ? folder : 'docs';
      const safeName = `${Date.now()}-${sanitizeFilename(filename)}`;
      const destPath = path.join(UPLOADS_DIR, safeFolder, safeName);

      const cleanBase64 = String(base64Data).includes(',')
        ? String(base64Data).split(',').pop()
        : String(base64Data);
      const buffer = Buffer.from(cleanBase64, 'base64');
      fs.writeFileSync(destPath, buffer);

      let textContent = '';
      const ext = path.extname(safeName).toLowerCase();
      if (['.txt', '.md', '.csv', '.tsv', '.json'].includes(ext)) {
        textContent = buffer.toString('utf8').slice(0, 15000);
      }

      const fileUrl = `http://localhost:${PORT}/uploads/${safeFolder}/${safeName}`;
      console.log(`[mock-data-server] 📁 Upload salvo em disco: uploads/${safeFolder}/${safeName} (${buffer.length} bytes)`);
      return sendJson(res, 200, {
        success: true,
        filename: filename || safeName,
        storedName: safeName,
        mimeType: mimeType || MIME_MAP[ext] || 'application/octet-stream',
        size: buffer.length,
        url: fileUrl,
        localRelPath: `${safeFolder}/${safeName}`,
        textContent
      });
    }

    // 6. Login / Criação de sessão de usuário local
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, name, role } = await readBody(req);
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return sendJson(res, 400, { error: 'E-mail obrigatório.' });
      }
      const users = readJsonTable('users.json');
      let user = users.find((u) => String(u.email).toLowerCase() === cleanEmail);
      let created = false;
      if (!user) {
        const defaultName =
          name ||
          cleanEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        user = {
          id: nextEntityId(users, 'usr'),
          thirdweb_id: `local:user:${Date.now()}`,
          name: defaultName,
          email: cleanEmail,
          role: role || 'CLIENT',
          created_at: new Date().toISOString()
        };
        users.push(user);
        writeJsonTable('users.json', users);
        await rebuildDuckDBSources();
        created = true;
      }
      return sendJson(res, 200, { success: true, user, created });
    }

    // 6b. Carregar Kit Oficial de Documentos de Demonstração (docs/exemplos-orcamento/)
    if (pathname === '/api/demo-docs' && req.method === 'POST') {
      const generated = generateAllDemoDocs();
      const stamp = Date.now();
      const copyToUploads = (info, mime) => {
        const storedName = `${stamp}-${info.name}`;
        const dest = path.join(UPLOADS_DIR, 'docs', storedName);
        const buf = fs.readFileSync(info.path);
        fs.writeFileSync(dest, buf);
        const ext = path.extname(info.name).toLowerCase();
        const textContent = ['.txt', '.md', '.csv', '.tsv'].includes(ext)
          ? buf.toString('utf8').slice(0, 15000)
          : '';
        return {
          filename: info.name,
          storedName,
          mimeType: mime,
          size: buf.length,
          url: `http://localhost:${PORT}/uploads/docs/${storedName}`,
          textContent
        };
      };

      return sendJson(res, 200, {
        success: true,
        presetProject: {
          name: 'Reforma Cobertura Duplex Pinheiros',
          address: 'Rua dos Pinheiros, 840 - Cobertura 141',
          area_m2: 94,
          budget_estimated: 98000,
          scope_description:
            'Reforma integral de cobertura duplex (94 m²): demolição seletiva NBR 16280 para integração da cozinha ao living/terraço, circuito 220V 32A e rede PPR para ilha em Quartzo Branco Paraná, porcelanato Portinari Calacata 120x120, forro drywall acústico e perfis magnéticos LED 3000K.'
        },
        pdf: copyToUploads(generated.files.pdf, 'application/pdf'),
        sheet: copyToUploads(generated.files.csv, 'text/csv; charset=utf-8'),
        txt: copyToUploads(generated.files.md, 'text/plain; charset=utf-8')
      });
    }

    // 7. Motor de IA Híbrido (Motor Local Offline + Gemini Multimodal Opcional)
    if (pathname === '/api/ai/analyze-project' && req.method === 'POST') {
      const {
        project = {},
        extraText = '',
        apiKey = '',
        aiModel = 'gemini-2.5-flash',
        strictGemini = false
      } = await readBody(req);

      let effectiveExtraText = String(extraText || '');
      if (!effectiveExtraText.trim()) {
        const diskTexts = [];
        for (const u of [project.doc_spreadsheet_url, project.doc_txt_url]) {
          if (u && String(u).includes('/uploads/')) {
            const rel = decodeURIComponent(String(u).split('/uploads/')[1] || '');
            const abs = path.resolve(UPLOADS_DIR, rel);
            if (abs.startsWith(UPLOADS_DIR) && fs.existsSync(abs)) {
              diskTexts.push(fs.readFileSync(abs, 'utf8').slice(0, 15000));
            }
          }
        }
        effectiveExtraText = diskTexts.join('\n\n');
      }

      if (!apiKey || !String(apiKey).trim()) {
        const localResult = generateLocalEngineeringEAP(project, effectiveExtraText);
        return sendJson(res, 200, { success: true, ...localResult });
      }

      // Com API Key: monta payload multimodal com PDF local se disponível
      const parts = [];
      const prompt = `Você é o Agente Técnico de Engenharia Orçamentista do ObraFlow.
Analise os seguintes insumos fornecidos pelo cliente para elaboração da EAP e orçamento:
- Obra: ${project.name}
- Endereço: ${project.address}
- Área: ${project.area_m2} m²
- Teto Orçamentário Máximo: R$ ${project.budget_estimated}
- Escopo Informado: "${project.scope_description}"
- Conteúdo extraído de Memorial/Planilha: "${String(effectiveExtraText || '').slice(0, 8000)}"

Retorne ESTRITAMENTE um JSON válido com a estrutura:
{
  "diagnostico": "Parecer técnico detalhado sobre viabilidade, quantitativos e riscos.",
  "orcamento_base": 44000,
  "confianca_pct": 95,
  "epicos": [
    { "temp_id": "ep_1", "title": "1. Serviços Preliminares e Infraestrutura", "order_index": 1 }
  ],
  "tarefas": [
    {
      "temp_epic": "ep_1",
      "title": "1. Demolição e Proteção",
      "cat": "EXECUTION",
      "due_date": "15/11/2026",
      "labor": 2200,
      "mats": 600,
      "material_name": "Insumos de proteção e caçamba",
      "material_group": "STRUCTURAL",
      "unit": "un",
      "quantity": 1,
      "freight_cost": 200,
      "receiver_responsible": "CONTRACTOR"
    }
  ]
}`;
      parts.push({ text: prompt });

      if (project.scope_pdf_url && String(project.scope_pdf_url).includes('/uploads/')) {
        const rel = decodeURIComponent(String(project.scope_pdf_url).split('/uploads/')[1] || '');
        const abs = path.resolve(UPLOADS_DIR, rel);
        if (abs.startsWith(UPLOADS_DIR) && fs.existsSync(abs)) {
          const stat = fs.statSync(abs);
          if (stat.size < 12 * 1024 * 1024) {
            const ext = path.extname(abs).toLowerCase();
            const mime = MIME_MAP[ext] || 'application/pdf';
            if (mime === 'application/pdf' || mime.startsWith('image/')) {
              parts.push({
                inlineData: {
                  mimeType: mime,
                  data: fs.readFileSync(abs).toString('base64')
                }
              });
            }
          }
        }
      }

      const candidateModels = [
        aiModel,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-2.5-pro'
      ].filter((v, idx, arr) => v && arr.indexOf(v) === idx);

      let parsedData = null;
      let usedModel = '';
      let lastErr = null;
      let keyRejected = false;

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(String(apiKey).trim())}`;
          const gRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
            })
          });
          const gData = await gRes.json();
          if (!gRes.ok || gData.error) {
            lastErr = new Error(gData.error?.message || `HTTP ${gRes.status}`);
            const reason = gData.error?.details?.find((d) => d.reason)?.reason || '';
            // Chave inválida/expirada ou sem permissão: não adianta tentar outros modelos
            if (reason === 'API_KEY_INVALID' || gRes.status === 401 || gRes.status === 403) {
              keyRejected = true;
              break;
            }
            continue;
          }
          const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleaned);
          usedModel = model;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!parsedData) {
        let availableModels = [];
        if (!keyRejected) {
          try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(String(apiKey).trim())}`);
            const listData = await listRes.json();
            if (Array.isArray(listData.models)) {
              availableModels = listData.models
                .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m) => m.name.replace('models/', ''));
            }
          } catch (listErr) {
            console.warn('[mock-data-server] Não foi possível listar modelos Gemini:', listErr.message);
          }
        }

        const geminiWarning = keyRejected
          ? `O Google recusou a chave Gemini informada (${lastErr?.message || 'API_KEY_INVALID'}). Gere uma nova chave em https://aistudio.google.com/apikey ou limpe a chave salva. A EAP abaixo foi gerada pelo Motor Local.`
          : `Gemini indisponível (${lastErr?.message || 'erro desconhecido'}). A EAP abaixo foi gerada pelo Motor Local.`;

        console.warn(`[mock-data-server] ⚠️ Gemini falhou — fallback para Motor Local: ${lastErr?.message}`);

        if (strictGemini) {
          return sendJson(res, 400, { error: geminiWarning, keyRejected, availableModels });
        }

        const localResult = generateLocalEngineeringEAP(project, effectiveExtraText);
        return sendJson(res, 200, {
          success: true,
          ...localResult,
          fallbackFromGemini: true,
          keyRejected,
          geminiWarning,
          availableModels
        });
      }

      return sendJson(res, 200, {
        success: true,
        engine: `gemini (${usedModel})`,
        ...parsedData
      });
    }

    // 8. Salvar ou finalizar Obra completa (projects + epics + tasks + materials + financial_transactions)
    if (pathname === '/api/save-full-project' && req.method === 'POST') {
      const { project = {}, epics = [], tasks = [], isFinal = false } = await readBody(req);

      const projects = readJsonTable('projects.json');
      const allEpics = readJsonTable('epics.json');
      const allTasks = readJsonTable('tasks.json');
      const allMaterials = readJsonTable('materials.json');
      const allTransactions = readJsonTable('financial_transactions.json');

      const projId =
        !project.id || project.id === 'NEW' ? nextEntityId(projects, 'proj') : String(project.id);

      const existingIdx = projects.findIndex((p) => p.id === projId);
      const baseExisting = existingIdx >= 0 ? projects[existingIdx] : {};

      const mergedProject = {
        id: projId,
        name: project.name || baseExisting.name || 'Nova Obra ObraFlow',
        address: project.address || baseExisting.address || 'Endereço em definição',
        client_id: project.client_id || baseExisting.client_id || 'usr_5',
        contractor_id: project.contractor_id || baseExisting.contractor_id || 'usr_2',
        status: isFinal ? 'IN_PROGRESS' : project.status || baseExisting.status || 'QUOTE_REQUESTED',
        scope_pdf_url:
          project.scope_pdf_url ||
          baseExisting.scope_pdf_url ||
          `http://localhost:${PORT}/uploads/docs/escopo_${projId}.pdf`,
        contract_pdf_url:
          project.contract_pdf_url ||
          baseExisting.contract_pdf_url ||
          `http://localhost:${PORT}/uploads/docs/contrato_${projId}.html`,
        contract_signed_at: isFinal
          ? new Date().toISOString()
          : project.contract_signed_at ?? baseExisting.contract_signed_at ?? null,
        created_at: baseExisting.created_at || project.created_at || new Date().toISOString(),
        area_m2: Number(project.area_m2 ?? baseExisting.area_m2 ?? 70),
        budget_estimated: Number(project.budget_estimated ?? baseExisting.budget_estimated ?? 45000),
        scope_description: project.scope_description ?? baseExisting.scope_description ?? '',
        doc_pdf_name: project.doc_pdf_name ?? baseExisting.doc_pdf_name ?? 'planta_executiva.pdf',
        doc_spreadsheet_name:
          project.doc_spreadsheet_name ?? baseExisting.doc_spreadsheet_name ?? 'planilha_custos.csv',
        doc_txt_name: project.doc_txt_name ?? baseExisting.doc_txt_name ?? 'memorial_descritivo.txt',
        ai_analysis_summary:
          project.ai_analysis_summary ??
          baseExisting.ai_analysis_summary ??
          'Aguardando análise técnica de engenharia...',
        ai_confidence_score: Number(
          project.ai_confidence_score ?? baseExisting.ai_confidence_score ?? 0.93
        ),
        contract_accepted_by_client: isFinal
          ? true
          : Boolean(project.contract_accepted_by_client ?? baseExisting.contract_accepted_by_client),
        eap_approved_by_contractor: isFinal
          ? true
          : Boolean(project.eap_approved_by_contractor ?? baseExisting.eap_approved_by_contractor)
      };

      // Se houver épicos/tarefas enviados, substitui a árvore EAP desta obra de forma limpa
      let savedEpicsCount = 0;
      let savedTasksCount = 0;
      let savedMaterialsCount = 0;

      if (Array.isArray(epics) && epics.length > 0) {
        const oldEpicIds = new Set(allEpics.filter((e) => e.project_id === projId).map((e) => e.id));
        const oldTaskIds = new Set(allTasks.filter((t) => oldEpicIds.has(t.epic_id)).map((t) => t.id));

        const keptEpics = allEpics.filter((e) => e.project_id !== projId);
        const keptTasks = allTasks.filter((t) => !oldEpicIds.has(t.epic_id));
        const keptMaterials = allMaterials.filter((m) => !oldTaskIds.has(m.task_id));

        const tempEpicMap = new Map();
        const nowMs = Date.now();

        epics.forEach((e, idx) => {
          const newEpicId = nextEntityId(keptEpics, 'epic');
          const key = e.temp_id || e.id || `ep_${idx + 1}`;
          tempEpicMap.set(key, newEpicId);
          keptEpics.push({
            id: newEpicId,
            project_id: projId,
            title: e.title || `${idx + 1}. Etapa ${idx + 1}`,
            order_index: Number(e.order_index || idx + 1),
            status: idx === 0 ? 'IN_PROGRESS' : 'LOCKED',
            requires_materials_purchase: e.requires_materials_purchase ?? true,
            start_date: parseBrDateToIso(e.start_date, idx * 12 + 1),
            end_date: parseBrDateToIso(e.end_date, (idx + 1) * 12),
            ai_generated: true,
            contractor_approved: Boolean(isFinal || mergedProject.eap_approved_by_contractor)
          });
          savedEpicsCount++;
        });

        const fallbackFirstEpicId = Array.from(tempEpicMap.values())[0];

        if (Array.isArray(tasks) && tasks.length > 0) {
          tasks.forEach((t, idx) => {
            const newTaskId = nextEntityId(keptTasks, 'task');
            const mappedEpicId =
              tempEpicMap.get(t.temp_epic || t.epic_id) || fallbackFirstEpicId;
            const cat = t.cat || t.category || 'EXECUTION';
            const collabByCat =
              cat === 'MATERIAL_RECEIVING' || cat === 'MATERIAL_PURCHASE'
                ? 'collab_4'
                : cat === 'INSPECTION'
                  ? 'collab_1'
                  : idx % 2 === 0
                    ? 'collab_2'
                    : 'collab_3';

            keptTasks.push({
              id: newTaskId,
              epic_id: mappedEpicId,
              assigned_collaborator_id: t.assigned_collaborator_id || collabByCat,
              title: t.title || `Tarefa ${idx + 1}`,
              description:
                t.description ||
                `Tarefa estruturada e homologada na EAP da obra ${mergedProject.name}.`,
              category: cat,
              kanban_status: isFinal && idx === 0 ? 'IN_PROGRESS' : t.kanban_status || 'TODO',
              cost_labor: Number(t.labor ?? t.cost_labor ?? 0),
              due_date: parseBrDateToIso(t.due_date, (idx + 1) * 5),
              ai_generated: true,
              contractor_approved: Boolean(isFinal || mergedProject.eap_approved_by_contractor)
            });
            savedTasksCount++;

            // Grava insumo correspondente em materials.json quando mats > 0 ou material_name informado
            const matsValue = Number(t.mats ?? 0);
            const freightCost = Number(t.freight_cost ?? 0);
            if (matsValue > 0 || (t.material_name && String(t.material_name).trim())) {
              const qty = Math.max(1, Number(t.quantity || 1));
              const unitPrice =
                t.unit_price !== undefined && Number(t.unit_price) > 0
                  ? Number(t.unit_price)
                  : Number((matsValue / qty).toFixed(2));
              const receiver = t.receiver_responsible === 'CLIENT' ? 'CLIENT' : 'CONTRACTOR';
              const receivingFee =
                t.receiving_fee !== undefined
                  ? Number(t.receiving_fee)
                  : receiver === 'CONTRACTOR'
                    ? 180
                    : 0;
              const totalPrice = Number((qty * unitPrice + freightCost + receivingFee).toFixed(2));
              const dueIso = parseBrDateToIso(t.due_date, (idx + 1) * 5);
              const dueMs = new Date(dueIso).getTime() || nowMs + 7 * 86400000;
              const purchaseDeadlineIso = new Date(dueMs - 4 * 86400000).toISOString();

              keptMaterials.push({
                id: nextEntityId(keptMaterials, 'mat'),
                task_id: newTaskId,
                created_by_id: mergedProject.client_id,
                name: t.material_name || `Insumos para ${t.title}`,
                material_group: t.material_group || 'FINISHINGS',
                unit: t.unit || 'un',
                quantity: qty,
                unit_price: unitPrice,
                freight_cost: freightCost,
                receiving_fee: receivingFee,
                total_price: totalPrice,
                receiver_responsible: receiver,
                received_by_user_id: null,
                purchased: false,
                delivery_status: 'PENDING_PURCHASE',
                purchase_deadline: purchaseDeadlineIso,
                estimated_delivery: dueIso
              });
              savedMaterialsCount++;
            }
          });
        }

        writeJsonTable('epics.json', keptEpics);
        writeJsonTable('tasks.json', keptTasks);
        writeJsonTable('materials.json', keptMaterials);
      }

      // Gera arquivo local do contrato assinado e parcelas financeiras na ativação final
      if (isFinal) {
        const contractFile = `contrato_${projId}.html`;
        const contractPath = path.join(UPLOADS_DIR, 'docs', contractFile);
        const totalVal = Number(mergedProject.budget_estimated || 0);
        const p1 = Math.round(totalVal * 0.4);
        const p2 = Math.round(totalVal * 0.35);
        const p3 = Math.max(0, totalVal - p1 - p2);

        const contractHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/><title>Contrato ${mergedProject.name}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:24px;line-height:1.6;color:#1e293b;border:1px solid #cbd5e1;border-radius:16px}h1{color:#312e81;margin-top:0}.badge{background:#dcfce7;color:#166534;padding:4px 12px;border-radius:999px;font-weight:700;font-size:12px}</style>
</head><body>
<span class="badge">✓ ASSINADO DIGITALMENTE EM ${new Date(mergedProject.contract_signed_at).toLocaleString('pt-BR')}</span>
<h1>Contrato de Empreitada — ${mergedProject.name}</h1>
<p><strong>Endereço do Canteiro:</strong> ${mergedProject.address} (${mergedProject.area_m2} m²)</p>
<p><strong>Valor Homologado da EAP:</strong> R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
<h3>Cronograma Físico-Financeiro (Cláusula Pétrea de Evidência)</h3>
<ul>
  <li><strong>Parcela 1 — Mobilização (40%):</strong> R$ ${p1.toLocaleString('pt-BR')},00 (Quitada na assinatura)</li>
  <li><strong>Parcela 2 — Medição Intermediária c/ Foto (35%):</strong> R$ ${p2.toLocaleString('pt-BR')},00</li>
  <li><strong>Parcela 3 — Vistoria Final c/ Foto (25%):</strong> R$ ${p3.toLocaleString('pt-BR')},00</li>
</ul>
<p><em>Gerado e custodiado localmente pelo ObraFlow em ${contractFile}.</em></p>
</body></html>`;
        fs.writeFileSync(contractPath, contractHtml, 'utf8');
        mergedProject.contract_pdf_url = `http://localhost:${PORT}/uploads/docs/${contractFile}`;

        const hasInstallments = allTransactions.some(
          (tx) => tx.project_id === projId && tx.category === 'CLIENT_INSTALLMENT'
        );
        if (!hasInstallments && totalVal > 0) {
          const nowIso = new Date().toISOString();
          const plus15 = new Date(Date.now() + 15 * 86400000).toISOString();
          const plus35 = new Date(Date.now() + 35 * 86400000).toISOString();
          allTransactions.push({
            id: nextEntityId(allTransactions, 'tx'),
            project_id: projId,
            contractor_id: mergedProject.contractor_id,
            type: 'RECEIVABLE',
            category: 'CLIENT_INSTALLMENT',
            description: `Sinal de Mobilização (40%) — ${mergedProject.name}`,
            amount: p1,
            status: 'PAID',
            due_date: nowIso,
            paid_at: nowIso
          });
          allTransactions.push({
            id: nextEntityId(allTransactions, 'tx'),
            project_id: projId,
            contractor_id: mergedProject.contractor_id,
            type: 'RECEIVABLE',
            category: 'CLIENT_INSTALLMENT',
            description: `Parcela 2 (Medição Intermediária c/ Foto) — ${mergedProject.name}`,
            amount: p2,
            status: 'PENDING',
            due_date: plus15,
            paid_at: null
          });
          allTransactions.push({
            id: nextEntityId(allTransactions, 'tx'),
            project_id: projId,
            contractor_id: mergedProject.contractor_id,
            type: 'RECEIVABLE',
            category: 'CLIENT_INSTALLMENT',
            description: `Parcela 3 (Entrega Final c/ Foto) — ${mergedProject.name}`,
            amount: p3,
            status: 'PENDING',
            due_date: plus35,
            paid_at: null
          });
          writeJsonTable('financial_transactions.json', allTransactions);
        }
      }

      if (existingIdx >= 0) {
        projects[existingIdx] = mergedProject;
      } else {
        projects.push(mergedProject);
      }
      writeJsonTable('projects.json', projects);

      await rebuildDuckDBSources();
      console.log(
        `[mock-data-server] 🚀 Obra ${projId} salva (${savedEpicsCount} épicos, ${savedTasksCount} tarefas, ${savedMaterialsCount} materiais)`
      );
      return sendJson(res, 200, {
        success: true,
        projectId: projId,
        project: mergedProject,
        savedEpicsCount,
        savedTasksCount,
        savedMaterialsCount
      });
    }

    // 9. Atualizar status no Kanban (com trava da Cláusula Pétrea para DONE)
    if (pathname === '/api/tasks/status' && req.method === 'POST') {
      const { taskId, newStatus } = await readBody(req);
      const valid = new Set(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']);
      if (!taskId || !valid.has(newStatus)) {
        return sendJson(res, 400, { error: 'Parâmetros taskId ou newStatus inválidos.' });
      }
      const tasks = readJsonTable('tasks.json');
      const evidences = readJsonTable('evidences.json');
      const epics = readJsonTable('epics.json');

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return sendJson(res, 404, { error: 'Tarefa não encontrada.' });

      if (newStatus === 'DONE') {
        const hasPhoto = evidences.some((ev) => ev.task_id === taskId);
        if (!hasPhoto) {
          return sendJson(res, 400, {
            error:
              'Cláusula Pétrea: Nenhuma tarefa pode ser marcada como CONCLUÍDA (DONE) sem foto de evidência anexada.'
          });
        }
      }

      task.kanban_status = newStatus;
      writeJsonTable('tasks.json', tasks);

      // Recalcula status do épico pai
      const epic = epics.find((e) => e.id === task.epic_id);
      if (epic) {
        const siblingTasks = tasks.filter((t) => t.epic_id === epic.id);
        if (siblingTasks.every((t) => t.kanban_status === 'DONE')) {
          epic.status = 'COMPLETED';
          // Destrava próximo épico do mesmo projeto
          const nextEpic = epics
            .filter((e) => e.project_id === epic.project_id && e.status === 'LOCKED')
            .sort((a, b) => a.order_index - b.order_index)[0];
          if (nextEpic) nextEpic.status = 'IN_PROGRESS';
        } else if (siblingTasks.some((t) => t.kanban_status !== 'TODO')) {
          epic.status = 'IN_PROGRESS';
        }
        writeJsonTable('epics.json', epics);
      }

      await rebuildDuckDBSources();
      return sendJson(res, 200, { success: true, task });
    }

    // 10. Concluir tarefa ou conferência de carga com foto obrigatória
    if (pathname === '/api/tasks/complete-with-evidence' && req.method === 'POST') {
      const {
        taskId,
        uploadedBy = 'collab_1',
        evidenceType = 'TASK_EXECUTION',
        photoUrl,
        notes = '',
        hasIssue = false
      } = await readBody(req);

      if (!taskId || !photoUrl) {
        return sendJson(res, 400, {
          error: 'É obrigatório enviar a foto de evidência (photoUrl) e o identificador da tarefa.'
        });
      }

      const tasks = readJsonTable('tasks.json');
      const evidences = readJsonTable('evidences.json');
      const materials = readJsonTable('materials.json');
      const epics = readJsonTable('epics.json');

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return sendJson(res, 404, { error: 'Tarefa não encontrada.' });

      const newEvidence = {
        id: nextEntityId(evidences, 'evid'),
        task_id: taskId,
        uploaded_by: uploadedBy,
        evidence_type:
          task.category === 'MATERIAL_RECEIVING' ? 'MATERIAL_INSPECTION' : evidenceType,
        photo_url: photoUrl,
        notes:
          notes ||
          (hasIssue
            ? 'Ressalva registrada na conferência em canteiro.'
            : `Etapa "${task.title}" concluída e auditada no canteiro.`),
        created_at: new Date().toISOString()
      };
      evidences.push(newEvidence);
      writeJsonTable('evidences.json', evidences);

      task.kanban_status = hasIssue ? 'REVIEW' : 'DONE';
      writeJsonTable('tasks.json', tasks);

      // Atualiza materiais vinculados (ou materiais em trânsito da mesma obra se for tarefa de recebimento)
      const epic = epics.find((e) => e.id === task.epic_id);
      let updatedMaterials = 0;
      for (const m of materials) {
        if (m.task_id === taskId) {
          m.delivery_status = hasIssue ? 'REJECTED' : 'DELIVERED_INSPECTED';
          m.received_by_user_id = uploadedBy;
          updatedMaterials++;
        }
      }
      if (updatedMaterials === 0 && task.category === 'MATERIAL_RECEIVING' && epic) {
        const projectEpicIds = new Set(
          epics.filter((e) => e.project_id === epic.project_id).map((e) => e.id)
        );
        const projectTaskIds = new Set(
          tasks.filter((t) => projectEpicIds.has(t.epic_id)).map((t) => t.id)
        );
        const transitMat = materials.find(
          (m) => projectTaskIds.has(m.task_id) && m.delivery_status === 'IN_TRANSIT'
        );
        if (transitMat) {
          transitMat.delivery_status = hasIssue ? 'REJECTED' : 'DELIVERED_INSPECTED';
          transitMat.received_by_user_id = uploadedBy;
        }
      }
      writeJsonTable('materials.json', materials);

      if (epic) {
        const siblingTasks = tasks.filter((t) => t.epic_id === epic.id);
        if (siblingTasks.every((t) => t.kanban_status === 'DONE')) {
          epic.status = 'COMPLETED';
          const nextEpic = epics
            .filter((e) => e.project_id === epic.project_id && e.status === 'LOCKED')
            .sort((a, b) => a.order_index - b.order_index)[0];
          if (nextEpic) nextEpic.status = 'IN_PROGRESS';
        } else {
          epic.status = 'IN_PROGRESS';
        }
        writeJsonTable('epics.json', epics);
      }

      await rebuildDuckDBSources();
      return sendJson(res, 200, { success: true, evidence: newEvidence, task });
    }

    // 11. Comprar material crítico (Supply Chain -> Financeiro)
    if (pathname === '/api/materials/purchase' && req.method === 'POST') {
      const { materialId } = await readBody(req);
      const materials = readJsonTable('materials.json');
      const tasks = readJsonTable('tasks.json');
      const epics = readJsonTable('epics.json');
      const txs = readJsonTable('financial_transactions.json');

      const mat = materials.find((m) => m.id === materialId);
      if (!mat) return sendJson(res, 404, { error: 'Material não encontrado.' });

      if (!mat.purchased) {
        mat.purchased = true;
        mat.delivery_status = 'IN_TRANSIT';
        writeJsonTable('materials.json', materials);

        const task = tasks.find((t) => t.id === mat.task_id);
        const epic = task ? epics.find((e) => e.id === task.epic_id) : null;
        if (task && task.category === 'MATERIAL_PURCHASE' && task.kanban_status === 'TODO') {
          task.kanban_status = 'IN_PROGRESS';
          writeJsonTable('tasks.json', tasks);
        }

        const nowIso = new Date().toISOString();
        txs.push({
          id: nextEntityId(txs, 'tx'),
          project_id: epic?.project_id || 'proj_1',
          contractor_id: 'usr_2',
          type: 'PAYABLE',
          category: 'MATERIAL',
          description: `Compra de Insumo: ${mat.name} (c/ frete)`,
          amount: Number(mat.total_price || 0),
          status: 'PAID',
          due_date: nowIso,
          paid_at: nowIso
        });
        writeJsonTable('financial_transactions.json', txs);
        await rebuildDuckDBSources();
      }

      return sendJson(res, 200, { success: true, material: mat });
    }

    // 12. ERP: Quitar Folha de Pagamento pendente
    if (pathname === '/api/erp/pay-payroll' && req.method === 'POST') {
      const { payrollId } = await readBody(req);
      const payrolls = readJsonTable('payrolls.json');
      const collaborators = readJsonTable('collaborators.json');
      const txs = readJsonTable('financial_transactions.json');

      const pay = payrolls.find((p) => p.id === payrollId);
      if (!pay) return sendJson(res, 404, { error: 'Folha não encontrada.' });

      if (pay.status !== 'PAID') {
        const nowIso = new Date().toISOString();
        pay.status = 'PAID';
        pay.paid_at = nowIso;
        writeJsonTable('payrolls.json', payrolls);

        const collab = collaborators.find((c) => c.id === pay.collaborator_id);
        txs.push({
          id: nextEntityId(txs, 'tx'),
          project_id: pay.project_id,
          contractor_id: 'usr_2',
          type: 'PAYABLE',
          category: 'PAYROLL',
          description: `Quitação Folha (${pay.reference_period}) — ${collab?.name || pay.collaborator_id}`,
          amount: Number(pay.amount || 0),
          status: 'PAID',
          due_date: pay.due_date || nowIso,
          paid_at: nowIso
        });
        writeJsonTable('financial_transactions.json', txs);
        await rebuildDuckDBSources();
      }

      return sendJson(res, 200, { success: true, payroll: pay });
    }

    // 13. ERP: Lançar nova Quinzena/Diárias na Folha
    if (pathname === '/api/erp/create-payroll' && req.method === 'POST') {
      const { collaboratorId, projectId, referencePeriod, daysWorked = 5 } = await readBody(req);
      const collaborators = readJsonTable('collaborators.json');
      const payrolls = readJsonTable('payrolls.json');

      const collab = collaborators.find((c) => c.id === collaboratorId);
      if (!collab) return sendJson(res, 404, { error: 'Colaborador não encontrado.' });

      const amount = Number((Number(collab.remuneration_rate || 200) * Number(daysWorked)).toFixed(2));
      const newPayroll = {
        id: nextEntityId(payrolls, 'pay'),
        collaborator_id: collab.id,
        project_id: projectId || 'proj_1',
        reference_period: referencePeriod || `Diárias (${daysWorked}d) - ${new Date().toLocaleDateString('pt-BR')}`,
        amount,
        status: 'PENDING',
        due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
        paid_at: null
      };
      payrolls.push(newPayroll);
      writeJsonTable('payrolls.json', payrolls);
      await rebuildDuckDBSources();
      return sendJson(res, 200, { success: true, payroll: newPayroll });
    }

    // 14. Estúdio IA: Criar nova simulação Antes x Depois em disco local
    if (pathname === '/api/simulations/create' && req.method === 'POST') {
      const {
        projectId = 'proj_1',
        materialId,
        requestedById = 'usr_6',
        roomName = 'Ambiente Principal',
        targetElement = 'FINISHINGS',
        originalPhotoUrl,
        consultingFee = 350
      } = await readBody(req);

      const materials = readJsonTable('materials.json');
      const sims = readJsonTable('ai_room_simulations.json');
      const mat = materials.find((m) => m.id === materialId) || materials[0];

      const renderName = `render_${Date.now()}.svg`;
      const svgContent = generateLocalSimulationSvg({
        roomName,
        materialName: mat?.name || 'Acabamento Especificado',
        targetElement
      });
      fs.writeFileSync(path.join(UPLOADS_DIR, 'simulations', renderName), svgContent, 'utf8');
      const generatedUrl = `http://localhost:${PORT}/uploads/simulations/${renderName}`;

      const newSim = {
        id: nextEntityId(sims, 'ai'),
        project_id: projectId,
        material_id: mat?.id || 'mat_5',
        requested_by_id: requestedById,
        room_name: roomName,
        target_element: targetElement,
        original_photo_url:
          originalPhotoUrl ||
          'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
        generated_photo_url: generatedUrl,
        consulting_fee: Number(consultingFee || 350),
        status: 'READY',
        created_at: new Date().toISOString()
      };
      sims.push(newSim);
      writeJsonTable('ai_room_simulations.json', sims);
      await rebuildDuckDBSources();

      return sendJson(res, 200, { success: true, simulation: newSim });
    }

    // 15. Estúdio IA: Aprovar simulação pelo Cliente e gerar receita de consultoria
    if (pathname === '/api/simulations/approve' && req.method === 'POST') {
      const { simulationId } = await readBody(req);
      const sims = readJsonTable('ai_room_simulations.json');
      const txs = readJsonTable('financial_transactions.json');

      const sim = sims.find((s) => s.id === simulationId);
      if (!sim) return sendJson(res, 404, { error: 'Simulação não encontrada.' });

      if (sim.status !== 'APPROVED_BY_CLIENT') {
        sim.status = 'APPROVED_BY_CLIENT';
        writeJsonTable('ai_room_simulations.json', sims);

        const nowIso = new Date().toISOString();
        txs.push({
          id: nextEntityId(txs, 'tx'),
          project_id: sim.project_id,
          contractor_id: 'usr_2',
          type: 'RECEIVABLE',
          category: 'AI_PROTOTYPING',
          description: `Consultoria IA Aprovada: ${sim.room_name}`,
          amount: Number(sim.consulting_fee || 350),
          status: 'PAID',
          due_date: nowIso,
          paid_at: nowIso
        });
        writeJsonTable('financial_transactions.json', txs);
        await rebuildDuckDBSources();
      }

      return sendJson(res, 200, { success: true, simulation: sim });
    }

    // 16. Compatibilidade legada POST /api/save-mock
    if (pathname === '/api/save-mock' && req.method === 'POST') {
      const { target, data } = await readBody(req);
      if (!target || !target.endsWith('.json')) {
        return sendJson(res, 400, { error: 'Parâmetro target obrigatório e deve ser .json' });
      }
      writeJsonTable(path.basename(target), data);
      await rebuildDuckDBSources();
      return sendJson(res, 200, { success: true, target, count: data.length });
    }

    return sendJson(res, 404, { error: `Endpoint não encontrado: ${pathname}` });
  } catch (err) {
    console.error('[mock-data-server] ❌ Erro:', err);
    return sendJson(res, 500, { error: err.message || 'Erro interno no servidor local' });
  }
});

server.listen(PORT, () => {
  console.log(`[mock-data-server] ⚡ Servidor Transacional Local ativo em http://localhost:${PORT}`);
  console.log(`[mock-data-server] 📁 Banco JSON: ${MOCK_DIR} | Uploads: ${UPLOADS_DIR}`);
});
