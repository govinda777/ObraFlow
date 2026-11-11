#!/usr/bin/env node
/**
 * Gerador determinístico do Kit de Documentos Técnicos de Demonstração do ObraFlow.
 * Produz em ./docs/exemplos-orcamento/:
 *   1. 01_planta_executiva_cobertura_pinheiros.pdf (PDF 1.4 vetorial válido - A4 Paisagem)
 *   2. 02_planilha_custos_sinapi_pinheiros.csv     (Planilha orçamentária estruturada UTF-8)
 *   3. 03_memorial_descritivo_abnt_pinheiros.md    (Memorial descritivo executivo ABNT NBR 16280)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'docs', 'exemplos-orcamento');

function escapePdfText(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Constrói um arquivo PDF 1.4 vetorial 100% válido (com tabela xref exata em bytes)
 * representando a Planta Executiva de Reforma — Cobertura Duplex Pinheiros (94,00 m²).
 */
function buildArchitecturalBlueprintPdf() {
  const cmds = [];
  const txt = (x, y, size, font, r, g, b, content) => {
    cmds.push('BT');
    cmds.push(`/${font} ${size} Tf`);
    cmds.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    cmds.push(`${x.toFixed(1)} ${y.toFixed(1)} Td`);
    cmds.push(`(${escapePdfText(content)}) Tj`);
    cmds.push('ET');
  };
  const rectFillStroke = (x, y, w, h, fr, fg, fb, sr, sg, sb, lw = 1) => {
    cmds.push(`${lw.toFixed(2)} w`);
    cmds.push(`${fr.toFixed(3)} ${fg.toFixed(3)} ${fb.toFixed(3)} rg`);
    cmds.push(`${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG`);
    cmds.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re B`);
  };
  const rectStroke = (x, y, w, h, sr, sg, sb, lw = 1) => {
    cmds.push(`${lw.toFixed(2)} w`);
    cmds.push(`${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG`);
    cmds.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
  };
  const line = (x1, y1, x2, y2, sr, sg, sb, lw = 1, dash = '') => {
    cmds.push('q');
    cmds.push(`${lw.toFixed(2)} w`);
    cmds.push(`${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG`);
    if (dash) cmds.push(`${dash} 0 d`);
    cmds.push(`${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
    cmds.push('Q');
  };

  // Página A4 Paisagem: 842 x 595 pt
  // Fundo técnico branco gelo
  rectFillStroke(0, 0, 842, 595, 0.988, 0.992, 0.996, 0.988, 0.992, 0.996, 0.5);

  // Margem externa ABNT NBR 6492
  rectStroke(22, 22, 798, 551, 0.12, 0.16, 0.23, 1.6);
  rectStroke(26, 26, 790, 543, 0.70, 0.75, 0.82, 0.5);

  // Faixa de cabeçalho superior
  rectFillStroke(26, 528, 790, 41, 0.06, 0.09, 0.17, 0.06, 0.09, 0.17, 1);
  txt(40, 551, 12, 'F2', 1, 1, 1, 'OBRAFLOW ENGENHARIA & ARQUITETURA - PLANTA EXECUTIVA DE REFORMA');
  txt(40, 536, 8.5, 'F1', 0.65, 0.78, 0.98, 'OBRA: REFORMA COBERTURA DUPLEX PINHEIROS   |   AREA PRIVATIVA: 94,00 m2   |   NORMA: ABNT NBR 16280 / NBR 5410');
  txt(646, 545, 9, 'F2', 0.30, 0.85, 0.62, 'ESCALA 1:50  |  PRANCHA 01/01');

  // =========================================================================
  // ÁREA DE DESENHO DA PLANTA BAIXA (x: 55..565, y: 115..485)
  // Dimensão real representada: 11,80 m x 7,95 m = ~94,00 m²
  // =========================================================================
  // Malha sutil de fundo (piso porcelanato 120x120)
  for (let gx = 65; gx <= 555; gx += 35) {
    line(gx, 125, gx, 475, 0.91, 0.93, 0.96, 0.35);
  }
  for (let gy = 125; gy <= 475; gy += 35) {
    line(65, gy, 555, gy, 0.91, 0.93, 0.96, 0.35);
  }

  // Ambientes coloridos suaves
  // 1. Terraço Gourmet Nivelado (esquerda: x=65..175, y=125..475)
  rectFillStroke(65, 125, 110, 350, 0.93, 0.97, 0.95, 0.20, 0.55, 0.42, 0.8);
  // 2. Living & Jantar Integrado (centro-baixo: x=175..395, y=125..325)
  rectFillStroke(175, 125, 220, 200, 0.97, 0.98, 1.00, 0.30, 0.38, 0.52, 0.8);
  // 3. Cozinha Gourmet Integrada (centro-topo: x=175..395, y=325..475)
  rectFillStroke(175, 325, 220, 150, 0.96, 0.95, 1.00, 0.42, 0.32, 0.68, 0.8);
  // 4. Suíte Master (direita-baixo: x=395..555, y=125..335)
  rectFillStroke(395, 125, 160, 210, 0.99, 0.98, 0.95, 0.45, 0.40, 0.32, 0.8);
  // 5. Banho Master (direita-topo: x=395..555, y=335..475)
  rectFillStroke(395, 335, 160, 140, 0.93, 0.96, 0.99, 0.25, 0.45, 0.68, 0.8);

  // Paredes estruturais externas (alvenaria dupla espessa)
  rectStroke(65, 125, 490, 350, 0.08, 0.12, 0.18, 4.2);
  rectStroke(69, 129, 482, 342, 0.20, 0.26, 0.34, 0.9);

  // Divisórias internas existentes mantidas
  // Entre Living/Cozinha e Suíte/Banho (x=395)
  line(395, 125, 395, 235, 0.12, 0.16, 0.24, 3.2);
  line(395, 275, 395, 475, 0.12, 0.16, 0.24, 3.2); // vão de porta 235..275
  // Entre Suíte Master e Banho Master (y=335)
  line(395, 335, 465, 335, 0.12, 0.16, 0.24, 2.8);
  line(500, 335, 555, 335, 0.12, 0.16, 0.24, 2.8); // vão porta banho 465..500

  // Esquadria de correr Terraço <-> Living (nivelamento de piso)
  line(175, 145, 175, 455, 0.15, 0.55, 0.45, 2.0, '[6 4]');

  // PAREDE A DEMOLIR (Vermelho tracejado em destaque - NBR 16280)
  rectFillStroke(195, 321, 165, 8, 1.0, 0.88, 0.88, 0.85, 0.12, 0.15, 1.5);
  line(195, 325, 360, 325, 0.85, 0.10, 0.12, 2.4, '[5 3]');
  txt(186, 311, 6.6, 'F2', 0.80, 0.08, 0.10, 'ALVENARIA A DEMOLIR (L=3,20m | e=15cm - NBR 16280)');

  // NOVA ILHA GOURMET EM QUARTZO BRANCO PARANÁ + COOKTOP 220V
  rectFillStroke(220, 355, 130, 38, 0.85, 0.92, 1.00, 0.15, 0.38, 0.78, 1.6);
  rectStroke(240, 363, 32, 22, 0.15, 0.38, 0.78, 1.0); // Cuba Inox Franke
  rectStroke(295, 363, 38, 22, 0.85, 0.25, 0.15, 1.0); // Cooktop Indução 220V
  txt(206, 400, 6.8, 'F2', 0.12, 0.30, 0.68, 'NOVA ILHA QUARTZO (2,60x0,95m) + 220V 32A + PPR');

  // Bancada fundo cozinha
  rectFillStroke(182, 448, 206, 20, 0.88, 0.93, 0.98, 0.25, 0.42, 0.68, 1.1);
  txt(205, 455, 6.8, 'F1', 0.15, 0.25, 0.40, 'BANCADA APOIO QUARTZO + CALHA UMIDA INOX');

  // Box e Bancada Banho Master
  rectFillStroke(402, 430, 146, 38, 0.86, 0.93, 0.98, 0.20, 0.45, 0.70, 1.0);
  txt(412, 446, 6.5, 'F2', 0.12, 0.32, 0.55, 'BOX RIPADO + TESTE ESTANQUEIDADE 72H');

  // TRILHOS E PERFIS LINEARES DE LED NO FORRO DRYWALL (Âmbar/Dourado)
  line(205, 175, 365, 175, 0.85, 0.55, 0.05, 2.2, '[10 3]');
  line(205, 265, 365, 265, 0.85, 0.55, 0.05, 2.2, '[10 3]');
  line(425, 175, 525, 175, 0.85, 0.55, 0.05, 2.2, '[10 3]');
  txt(198, 273, 6.5, 'F2', 0.72, 0.42, 0.02, 'PERFIL MAGNETICO LED 3000K NO FORRO DRYWALL');

  // Rótulos e metragens dos ambientes
  txt(76, 305, 9, 'F2', 0.08, 0.38, 0.28, 'TERRACO NIVELADO');
  txt(76, 293, 8, 'F1', 0.15, 0.42, 0.32, 'Area: 14,80 m2');
  txt(76, 282, 7, 'F1', 0.20, 0.45, 0.35, 'Porcelanato 120x120');

  txt(232, 222, 10.5, 'F2', 0.10, 0.16, 0.28, 'LIVING & JANTAR INTEGRADO');
  txt(252, 209, 8.5, 'F1', 0.22, 0.30, 0.42, 'Area: 36,40 m2  |  PD: 2,75m');
  txt(232, 197, 7.5, 'F1', 0.28, 0.36, 0.48, 'Piso Portinari Calacata 120x120 Retificado');

  txt(228, 428, 9.5, 'F2', 0.26, 0.16, 0.48, 'COZINHA GOURMET');
  txt(252, 417, 8, 'F1', 0.32, 0.22, 0.55, 'Area: 18,20 m2');

  txt(432, 240, 10, 'F2', 0.28, 0.22, 0.14, 'SUITE MASTER');
  txt(442, 227, 8.5, 'F1', 0.36, 0.30, 0.22, 'Area: 16,60 m2');
  txt(420, 215, 7, 'F1', 0.40, 0.34, 0.26, 'Forro Drywall Acustico + Cortineiro');

  txt(436, 392, 9.5, 'F2', 0.12, 0.30, 0.52, 'BANHO MASTER');
  txt(446, 380, 8, 'F1', 0.20, 0.38, 0.58, 'Area: 8,00 m2');
  txt(418, 368, 7, 'F1', 0.22, 0.40, 0.60, 'Metais Monocomando Matte Black');

  // LINHAS DE COTA ( Externas )
  // Cota Horizontal Superior (11,80 m)
  line(65, 495, 555, 495, 0.20, 0.25, 0.35, 0.8);
  line(65, 488, 65, 502, 0.20, 0.25, 0.35, 1.0);
  line(175, 488, 175, 502, 0.20, 0.25, 0.35, 0.8);
  line(395, 488, 395, 502, 0.20, 0.25, 0.35, 0.8);
  line(555, 488, 555, 502, 0.20, 0.25, 0.35, 1.0);
  txt(105, 500, 7.5, 'F3', 0.15, 0.20, 0.30, '2,65 m');
  txt(270, 500, 7.5, 'F3', 0.15, 0.20, 0.30, '5,30 m');
  txt(460, 500, 7.5, 'F3', 0.15, 0.20, 0.30, '3,85 m');
  txt(272, 512, 8.5, 'F2', 0.08, 0.12, 0.22, 'COTA TOTAL: 11,80 m');

  // Cota Vertical Esquerda (7,95 m)
  line(46, 125, 46, 475, 0.20, 0.25, 0.35, 0.8);
  line(40, 125, 52, 125, 0.20, 0.25, 0.35, 1.0);
  line(40, 475, 52, 475, 0.20, 0.25, 0.35, 1.0);
  txt(32, 298, 8, 'F2', 0.08, 0.12, 0.22, '7,95m');

  // =========================================================================
  // COLUNA DIREITA: LEGENDA EXECUTIVA + QUADRO DE ÁREAS + CARIMBO ABNT
  // (x: 580..806, y: 36..518)
  // =========================================================================
  // 1. Quadro de Legenda Executiva
  rectFillStroke(580, 375, 226, 142, 0.98, 0.99, 1.00, 0.72, 0.77, 0.84, 1.0);
  txt(592, 500, 9, 'F2', 0.08, 0.12, 0.22, 'LEGENDA DE INTERVENCAO');
  line(592, 493, 794, 493, 0.80, 0.84, 0.90, 0.6);

  line(592, 477, 622, 477, 0.85, 0.10, 0.12, 2.4, '[5 3]');
  txt(630, 474, 7.5, 'F1', 0.15, 0.20, 0.28, 'Alvenaria a Demolir (NBR 16280)');

  rectFillStroke(592, 454, 30, 10, 0.85, 0.92, 1.00, 0.15, 0.38, 0.78, 1.2);
  txt(630, 456, 7.5, 'F1', 0.15, 0.20, 0.28, 'Marmoraria Quartzo Branco Parana');

  line(592, 440, 622, 440, 0.85, 0.55, 0.05, 2.2, '[8 3]');
  txt(630, 437, 7.5, 'F1', 0.15, 0.20, 0.28, 'Perfil Linear LED 3000K / Trilho 24V');

  line(592, 421, 622, 421, 0.15, 0.55, 0.45, 2.0, '[6 4]');
  txt(630, 418, 7.5, 'F1', 0.15, 0.20, 0.28, 'Nivelamento Terraco c/ Porcelanato');

  txt(592, 398, 7.2, 'F2', 0.06, 0.45, 0.30, 'CLAUSULA PETREA OBRAFLOW:');
  txt(592, 386, 6.8, 'F1', 0.20, 0.25, 0.32, 'Medicao financeira condicionada a foto em campo.');

  // 2. Quadro Resumo Quantitativo de Projeto
  rectFillStroke(580, 225, 226, 140, 0.98, 0.99, 1.00, 0.72, 0.77, 0.84, 1.0);
  txt(592, 348, 9, 'F2', 0.08, 0.12, 0.22, 'QUADRO DE QUANTITATIVOS BASE');
  line(592, 341, 794, 341, 0.80, 0.84, 0.90, 0.6);
  txt(592, 326, 7.5, 'F3', 0.15, 0.20, 0.30, 'Demolicao Alvenaria:     3,20 m (8,8 m2)');
  txt(592, 312, 7.5, 'F3', 0.15, 0.20, 0.30, 'Porcelanato 120x120:   104,00 m2 (+10%)');
  txt(592, 298, 7.5, 'F3', 0.15, 0.20, 0.30, 'Forro Drywall ST/RU:    88,00 m2');
  txt(592, 284, 7.5, 'F3', 0.15, 0.20, 0.30, 'Ilha + Bancadas Quartzo: 1,00 cj');
  txt(592, 270, 7.5, 'F3', 0.15, 0.20, 0.30, 'Quadro DIN + Rede PPR:   1,00 vb');
  txt(592, 256, 7.5, 'F3', 0.15, 0.20, 0.30, 'Prazo Executivo Total:  45 dias corridos');
  txt(592, 238, 8, 'F2', 0.15, 0.35, 0.75, 'Teto Estimado Cliente: R$ 98.000,00');

  // 3. Carimbo Técnico Oficial ABNT NBR 6492
  rectFillStroke(580, 36, 226, 178, 0.95, 0.97, 1.00, 0.12, 0.16, 0.24, 1.4);
  rectFillStroke(580, 186, 226, 28, 0.10, 0.15, 0.28, 0.10, 0.15, 0.28, 1.0);
  txt(592, 196, 8.5, 'F2', 1, 1, 1, 'CARIMBO TECNICO EXECUTIVO - NBR 6492');

  txt(590, 170, 7, 'F2', 0.35, 0.42, 0.52, 'EMPREENDIMENTO / OBRA:');
  txt(590, 159, 8.5, 'F2', 0.06, 0.10, 0.18, 'Reforma Cobertura Duplex Pinheiros');
  txt(590, 148, 7.2, 'F1', 0.20, 0.25, 0.35, 'Rua dos Pinheiros, 840 - Cob. 141 - Sao Paulo/SP');

  line(580, 140, 806, 140, 0.72, 0.77, 0.84, 0.7);
  txt(590, 128, 7, 'F2', 0.35, 0.42, 0.52, 'PROPRIETARIO / SOLICITANTE:');
  txt(590, 117, 8, 'F1', 0.08, 0.12, 0.20, 'Marina Costa (Cliente ObraFlow)');

  line(580, 109, 806, 109, 0.72, 0.77, 0.84, 0.7);
  txt(590, 97, 7, 'F2', 0.35, 0.42, 0.52, 'RESPONSAVEIS TECNICOS:');
  txt(590, 86, 7.3, 'F1', 0.08, 0.12, 0.20, 'Eng. Roberto Almeida - CREA-SP 5069812340');
  txt(590, 75, 7.3, 'F1', 0.08, 0.12, 0.20, 'Arq. Beatriz Nogueira - CAU A148920-3');

  line(580, 67, 806, 67, 0.72, 0.77, 0.84, 0.7);
  txt(590, 52, 7.5, 'F2', 0.12, 0.28, 0.65, 'AREA: 94,00 m2   |   REV: R02   |   NOV/2026');
  txt(590, 41, 6.8, 'F3', 0.35, 0.42, 0.52, 'DOC: 01_planta_executiva_cobertura_pinheiros.pdf');

  // Rodapé inferior abaixo da planta
  rectFillStroke(55, 36, 510, 62, 0.96, 0.98, 1.00, 0.78, 0.82, 0.88, 0.8);
  txt(68, 82, 8, 'F2', 0.10, 0.15, 0.26, 'NOTAS GERAIS DE EXECUCAO EM CANTEIRO:');
  txt(68, 69, 7.2, 'F1', 0.20, 0.26, 0.34, '1. Conferir medidas em loco antes do corte de marmoraria (Quartzo Branco Parana) e paginacao 120x120.');
  txt(68, 57, 7.2, 'F1', 0.20, 0.26, 0.34, '2. Descarte de entulho ensacado em horario comercial (08h30 as 17h00) conforme regimento condominial.');
  txt(68, 45, 7.2, 'F1', 0.20, 0.26, 0.34, '3. Toda etapa concluida exige registro fotografico geolocalizado no ObraFlow para liberacao de medicao.');

  const streamContent = cmds.join('\n') + '\n';
  const streamBuf = Buffer.from(streamContent, 'latin1');

  // Montagem de objetos PDF 1.4 com offsets precisos
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n',
    `7 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n${streamContent}endstream\nendobj\n`
  ];

  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const chunks = [header];
  const offsets = [0]; // índice 0 livre
  let pos = header.length;

  for (const objStr of objects) {
    offsets.push(pos);
    const b = Buffer.from(objStr, 'latin1');
    chunks.push(b);
    pos += b.length;
  }

  const xrefStart = pos;
  const xrefLines = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n'];
  for (let i = 1; i <= objects.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  const trailer =
    xrefLines.join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer, 'latin1'));

  return Buffer.concat(chunks);
}

function buildCostSpreadsheetCsv() {
  const rows = [
    'item;etapa;tarefa;categoria;especificacao_material;grupo_material;unidade;quantidade;preco_unitario_brl;mao_de_obra_brl;frete_brl;recebedor;prazo_dias',
    '1;1. Preliminares, Demolicao NBR 16280 e Infraestrutura;1. Protecao de Piso, Demolicao Seletiva (3,20m) e Retirada de Entulho;EXECUTION;Bobina Salva-Piso Kraft + 2 Cacambas Estacionarias 4m3 + EPIs;STRUCTURAL;un;2;680.00;2600.00;280.00;CONTRACTOR;4',
    '2;1. Preliminares, Demolicao NBR 16280 e Infraestrutura;2. Infraestrutura Eletrica 220V (Inducao 32A/Climatizacao) e Rede PPR Ilha;EXECUTION;Quadro DIN 24 Disjuntores + Cabos Antichama 6mm + Tubulacao PPR Termofusao;PLUMBING;vb;1;4850.00;4200.00;220.00;CONTRACTOR;10',
    '3;2. Nivelamento de Terraco e Revestimentos Grande Formato;3. Recebimento e Conferencia de Lote/Calibre do Porcelanato 120x120 em Canteiro;MATERIAL_RECEIVING;;FINISHINGS;un;1;0.00;450.00;0.00;CONTRACTOR;14',
    '4;2. Nivelamento de Terraco e Revestimentos Grande Formato;4. Nivelamento de Contrapiso e Assentamento Porcelanato Calacata 120x120 (104m2 c/ perda);EXECUTION;Porcelanato Retificado Portinari Calacata 120x120 + Argamassa AC-III + Niveladores;FINISHINGS;m2;104;185.00;8320.00;690.00;CONTRACTOR;24',
    '5;3. Marmoraria Gourmet, Loucas e Metais;5. Instalacao de Ilha Gourmet e Bancadas em Quartzo Branco Parana;EXECUTION;Bancadas Esculpidas Quartzo Branco Parana + Cuba Inox Franke + Calha Umida;FINISHINGS;un;1;14800.00;2400.00;480.00;CLIENT;30',
    '6;3. Marmoraria Gourmet, Loucas e Metais;6. Revestimento Box Suite Master, Nicho Esculpido e Metais Monocomando;EXECUTION;Revestimento Ceramico Ripado + Kit Metais Docol Monocomando Matte Black;FINISHINGS;vb;1;6900.00;3100.00;210.00;CLIENT;34',
    '7;4. Forro Drywall, Iluminacao Linear LED e Entrega Vistoriada;7. Forro Drywall Tabicado ST/RU (88m2), Pintura Acrilica e Perfis Magneticos LED;EXECUTION;Chapas Drywall Knauf ST/RU + Perfis + Trilhos Magneticos LED 3000K + Tinta Suvinil;LIGHTING;m2;88;145.00;7480.00;340.00;CONTRACTOR;41',
    '8;4. Forro Drywall, Iluminacao Linear LED e Entrega Vistoriada;8. Teste Hidrostatico de Estanqueidade 72h, Limpeza Fina e Entrega de Chaves;INSPECTION;Insumos Neutros Pos-Obra + Dossie Fotografico Auditado;FINISHINGS;un;1;550.00;1400.00;0.00;CONTRACTOR;45'
  ];
  return rows.join('\n') + '\n';
}

function buildExecutiveMemorialMd() {
  return `# MEMORIAL DESCRITIVO EXECUTIVO E CADERNO DE ENCARGOS

- **Empreendimento / Obra:** Reforma Cobertura Duplex Pinheiros
- **Endereço do Canteiro:** Rua dos Pinheiros, 840 — Cobertura 141 — Pinheiros, São Paulo/SP
- **Área Privativa Objeto da Intervenção:** 94,00 m²
- **Teto Orçamentário Estipulado pelo Cliente:** R$ 98.000,00
- **Prazo Executivo Previsto:** 45 dias corridos
- **Normas Técnicas Aplicáveis:** ABNT NBR 16280 (Reformas em Edificações), NBR 5410 (Instalações Elétricas BT), NBR 13753 (Revestimentos de Piso), NBR 15758 (Sistemas Drywall)

---

## 1. ESCOPO TÉCNICO RESUMIDO

Reforma integral de cobertura duplex de 94,00 m² visando integração total entre Cozinha Gourmet, Living/Jantar e Terraço Coberto, contemplando:

1. **Serviços Preliminares e Demolição Seletiva (NBR 16280):**
   - Forração integral de áreas comuns, elevador de serviço e hall com papel Kraft plastificado (*Salva-Piso* de alta gramatura).
   - Demolição manual controlada de alvenaria de vedação não estrutural (\`L = 3,20 m\`, \`e = 15 cm\`, \`8,80 m²\`) entre Cozinha e Living, com ensacamento imediato e retirada em 2 caçambas estacionárias credenciadas pela PMSP.
   - Emissão prévia de RRT/ART junto ao condomínio antes do início de qualquer intervenção ruidosa.

2. **Infraestrutura Elétrica 220V e Hidrossanitária (NBR 5410):**
   - Substituição do QDC por Quadro DIN para 24 disjuntores com proteção IDR e DPS.
   - Novo circuito exclusivo em cabo flexível antichama \`6,0 mm²\` (\`32 A\`) dedicado ao cooktop de indução na nova ilha gourmet e espera para ar-condicionado multi-split.
   - Remanejamento de alimentação de água fria/quente em tubulação **PPR Termofusão** e esgoto \`DN 50\` sob contrapiso até o eixo da ilha central.

3. **Nivelamento de Terraço e Revestimentos Grande Formato (NBR 13753):**
   - Regularização e nivelamento de cota entre Living e Terraço com argamassa estrutural desempenada.
   - Assentamento de **104,00 m²** (já considerada perda técnica de paginação de \`10%\`) de **Porcelanato Retificado Portinari Calacata Gold 120x120 cm** com dupla colagem em argamassa colante **AC-III** e espaçadores niveladores \`1,5 mm\`.
   - Conferência obrigatória de lote, tonalidade e calibre no ato da descarga em canteiro.

4. **Marmoraria Gourmet, Banho Master, Louças e Metais:**
   - Fornecimento e montagem de Ilha Gourmet (\`2,60 x 0,95 m\`) com cascata lateral e bancada de apoio em **Quartzo Branco Paraná**, incluindo cuba dupla inox *Franke* e calha úmida embutida (recebimento acompanhado pela proprietária — \`CLIENT\`).
   - Reforma completa do box da Suíte Master com revestimento cerâmico ripado, nicho esculpido iluminado e metais monocomando *Docol Matte Black*.

5. **Forro Drywall Acústico, Iluminação Linear LED e Pintura:**
   - Execução de **88,00 m²** de forro **Drywall Knauf** tabicado (\`chapas ST\` nas áreas secas e \`chapas RU\` resistentes à umidade no Banho Master e Cozinha), com cortineiro iluminado na Suíte Master.
   - Embutimento de **Perfis Lineares e Trilhos Magnéticos LED 24V (3000K, IRC > 90)** integrados ao gesso.
   - Emassamento PVA/Acrílico fino e pintura em 3 demãos de tinta acrílica premium *Suvinil Toque de Seda* cor *Crômio*.

6. **Comissionamento, Estanqueidade e Limpeza Fina Pós-Obra:**
   - Teste hidrostático de estanqueidade por **72 horas** na área impermeabilizada do box e terraço nivelado.
   - Limpeza fina pós-obra com detergentes neutros homologados pelo fabricante do porcelanato e quartzo.

---

## 2. LOGÍSTICA DE CONDOMÍNIO E RECEBIMENTO DE INSUMOS

- **Horário permitido para carga/descarga e ruído:** Segunda a sexta-feira, das \`08h30\` às \`17h00\`.
- **Responsabilidade de conferência:** Insumos estruturais, argamassas, porcelanatos e drywall sob custódia do **Empreiteiro / Mestre de Obras (\`CONTRACTOR\`)**; peças especiais de marmoraria e metais nobres com validação presencial ou delegada do **Cliente (\`CLIENT\`)**.

---

## 3. CLÁUSULA PÉTREA DE GOVERNANÇA FÍSICO-FINANCEIRA (OBRAFLOW)

> **Regra Contratual Inegociável:** Nenhuma tarefa executiva, conferência de material ou vistoria poderá ser dada como concluída (\`DONE\`) ou ter sua medição financeira liberada sem o upload prévio de **evidência fotográfica nítida do canteiro** auditada na plataforma **ObraFlow**.
>
> **Cronograma de Desembolso:**
> - **40% Entrada / Mobilização** na assinatura digital do contrato;
> - **35% Medição Intermediária** após conclusão auditada da etapa de revestimentos;
> - **25% Quitação Final** somente após 100% das vistorias fotográficas aprovadas e entrega das chaves.
`;
}

function generateAllDemoDocs() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pdfPath = path.join(OUT_DIR, '01_planta_executiva_cobertura_pinheiros.pdf');
  const csvPath = path.join(OUT_DIR, '02_planilha_custos_sinapi_pinheiros.csv');
  const mdPath = path.join(OUT_DIR, '03_memorial_descritivo_abnt_pinheiros.md');

  const pdfBuf = buildArchitecturalBlueprintPdf();
  const csvStr = buildCostSpreadsheetCsv();
  const mdStr = buildExecutiveMemorialMd();

  fs.writeFileSync(pdfPath, pdfBuf);
  fs.writeFileSync(csvPath, csvStr, 'utf8');
  fs.writeFileSync(mdPath, mdStr, 'utf8');

  return {
    outDir: OUT_DIR,
    files: {
      pdf: { name: path.basename(pdfPath), path: pdfPath, size: pdfBuf.length },
      csv: { name: path.basename(csvPath), path: csvPath, size: Buffer.byteLength(csvStr, 'utf8') },
      md: { name: path.basename(mdPath), path: mdPath, size: Buffer.byteLength(mdStr, 'utf8') }
    }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = generateAllDemoDocs();
  console.log('✅ Kit de documentos de demonstração gerado em:', result.outDir);
  for (const [k, info] of Object.entries(result.files)) {
    console.log(`   - [${k.toUpperCase()}] ${info.name} (${info.size} bytes)`);
  }
}

export { generateAllDemoDocs, buildArchitecturalBlueprintPdf, buildCostSpreadsheetCsv, buildExecutiveMemorialMd };
