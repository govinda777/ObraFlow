---
title: Novo Orçamento de Obra - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<script>
    let projectName = "Reforma Loft Jardins";
    let projectAddress = "Alameda dos Anapurus, 780 - Apto 82";
    let projectArea = 72;
    let projectBudget = "R$ 45.000,00";
    let projectScope = "Reforma completa de loft: integração da cozinha com a sala, demolição pontual de mureta divisória, piso porcelanato 120x120, forro de gesso e iluminação linear.";
    let docPdf = "planta_executiva_loft.pdf";
    let docSpreadsheet = "orcamento_materiais_loft.xlsx";
    let docTxt = "especificacoes_tecnicas_loft.txt";
    let isSaving = false;

    async function submitToAI() {
        isSaving = true;
        const newProject = {
            id: "proj_2",
            name: projectName,
            address: projectAddress,
            client_id: "usr_5",
            contractor_id: "usr_2",
            status: "QUOTE_REQUESTED",
            area_m2: Number(projectArea) || 72,
            budget_estimated: 45000.0,
            scope_description: projectScope,
            doc_pdf_name: docPdf,
            doc_spreadsheet_name: docSpreadsheet,
            doc_txt_name: docTxt,
            created_at: new Date().toISOString(),
            ai_analysis_summary: "Aguardando processamento técnico pelo Agente de Engenharia Gemini...",
            ai_confidence_score: 0.0,
            contract_accepted_by_client: false,
            eap_approved_by_contractor: false
        };

        // 1. Grava no mock_data/ via serviço local
        try {
            await fetch('http://localhost:3001/api/save-full-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: newProject })
            });
        } catch (e) {
            console.warn('Servidor de persistência local offline, mantendo em memória', e);
        }

        // 2. Redireciona com basePath garantido
        const base = (typeof window !== 'undefined' && window.__sveltekit_dev && window.__sveltekit_dev.base) || '/ObraFlow';
        window.location.href = `${base}/processamento/`;
    }
</script>

<div class="max-w-4xl mx-auto py-6 px-4">
  <!-- BARRA DE CABEÇALHO FIEL AO WIREFRAME 3.2 (Sub-Etapa 1) -->
  <div class="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
    <div class="flex items-center gap-3">
      <a href="/onboarding/" class="text-xs text-gray-400 hover:text-indigo-600 font-bold no-underline">← Voltar</a>
      <span class="text-gray-300">|</span>
      <div>
        <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">🏗️ ObraFlow • Esteira Comercial</span>
        <h1 class="text-xl md:text-2xl font-black text-gray-900 m-0">Novo Orçamento de Obra / Reforma</h1>
      </div>
    </div>
    <div class="text-right">
      <span class="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
        Etapa: [ 1 de 5: Dados ]
      </span>
      <div class="text-[11px] text-gray-500 font-mono mt-0.5">Status: QUOTE_REQUESTED</div>
    </div>
  </div>

  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-8">
    
    <!-- 1. DADOS BÁSICOS DO IMÓVEL -->
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">1</span>
        Dados Básicos do Imóvel & Canteiro
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label class="block font-bold text-gray-700 mb-1">Nome da Obra:</label>
          <input 
            type="text" 
            bind:value={projectName} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
        <div>
          <label class="block font-bold text-gray-700 mb-1">Endereço Completo do Canteiro:</label>
          <input 
            type="text" 
            bind:value={projectAddress} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
        <div>
          <label class="block font-bold text-gray-700 mb-1">Área Estimada (m²):</label>
          <input 
            type="number" 
            bind:value={projectArea} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
        <div>
          <label class="block font-bold text-gray-700 mb-1">Teto Orçamentário Máximo do Cliente:</label>
          <input 
            type="text" 
            bind:value={projectBudget} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
      </div>

      <div class="mt-4 text-xs">
        <label class="block font-bold text-gray-700 mb-1">Escopo Preliminar da Intervenção:</label>
        <textarea rows="2" bind:value={projectScope} class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"></textarea>
      </div>
    </div>

    <hr class="border-gray-100 m-0" />

    <!-- 2. DOCUMENTAÇÃO TÉCNICA DA OBRA (ARQUIVOS OBRIGATÓRIOS) -->
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">2</span>
        Documentação Técnica da Obra (Arquivos Obrigatórios)
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <!-- Arquivo 1: PDF -->
        <div class="border-2 border-dashed border-blue-200 bg-blue-50/20 rounded-2xl p-4 text-center">
          <div class="text-3xl mb-2">📄</div>
          <div class="text-xs font-bold text-gray-900 mb-1">PLANTA EXECUTIVA (PDF)</div>
          <div class="text-[11px] text-gray-500 mb-3">[ Arraste ou Selecione ]</div>
          <div class="bg-white border border-blue-200 rounded-xl p-2 text-left text-[11px] text-blue-900 font-mono flex items-center gap-1.5">
            <span class="text-emerald-500 font-bold">✔️</span>
            <span class="truncate">{docPdf} (2.4MB)</span>
          </div>
        </div>

        <!-- Arquivo 2: XLSX/CSV -->
        <div class="border-2 border-dashed border-emerald-200 bg-emerald-50/20 rounded-2xl p-4 text-center">
          <div class="text-3xl mb-2">📊</div>
          <div class="text-xs font-bold text-gray-900 mb-1">PLANILHA CUSTOS (XLSX)</div>
          <div class="text-[11px] text-gray-500 mb-3">[ Arraste ou Selecione ]</div>
          <div class="bg-white border border-emerald-200 rounded-xl p-2 text-left text-[11px] text-emerald-900 font-mono flex items-center gap-1.5">
            <span class="text-emerald-500 font-bold">✔️</span>
            <span class="truncate">{docSpreadsheet} (840KB)</span>
          </div>
        </div>

        <!-- Arquivo 3: TXT -->
        <div class="border-2 border-dashed border-purple-200 bg-purple-50/20 rounded-2xl p-4 text-center">
          <div class="text-3xl mb-2">📝</div>
          <div class="text-xs font-bold text-gray-900 mb-1">MEMORIAL (TXT)</div>
          <div class="text-[11px] text-gray-500 mb-3">[ Arraste ou Selecione ]</div>
          <div class="bg-white border border-purple-200 rounded-xl p-2 text-left text-[11px] text-purple-900 font-mono flex items-center gap-1.5">
            <span class="text-emerald-500 font-bold">✔️</span>
            <span class="truncate">{docTxt} (45KB)</span>
          </div>
        </div>

      </div>
    </div>

    <!-- BOTÕES DE RODAPÉ -->
    <div class="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
      <div class="text-xs font-semibold text-gray-500">
        Status Inicial: <span class="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">QUOTE_REQUESTED</span>
      </div>

      <div class="flex items-center gap-3">
        <a href="/onboarding/" class="text-xs text-gray-500 hover:text-gray-700 font-bold px-4 py-2 no-underline">
          Cancelar
        </a>
        <button 
          on:click={submitToAI}
          disabled={isSaving}
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md shadow-indigo-600/20 no-underline transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>⚡</span> {isSaving ? 'Gravando em Disco...' : 'Enviar para Processamento IA →'}
        </button>
      </div>
    </div>

  </div>
</div>
