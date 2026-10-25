---
title: Processamento IA, Avaliação e Contrato - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<script>
    // Sub-etapas da Esteira (2 a 5)
    let currentStep = 2; // 2: IA, 3: EAP Orçamentista, 4: Proposta/Minuta, 5: Aceite Cliente
    let apiKey = '';
    let isAiLoading = false;
    let aiError = '';
    let isSavingDisk = false;

    // Dados da Obra Ativa (Carregados de mock_data/projects.json)
    let activeProject = {
        id: "proj_2",
        name: "Reforma Loft Jardins",
        address: "Alameda dos Anapurus, 780 - Apto 82",
        area_m2: 72.0,
        budget_estimated: 45000.0,
        scope_description: "Reforma completa de loft: integração da cozinha com a sala, demolição pontual de mureta divisória, piso porcelanato 120x120, forro de gesso e iluminação linear.",
        doc_pdf_name: "planta_executiva_loft.pdf",
        doc_spreadsheet_name: "orcamento_materiais_loft.xlsx",
        doc_txt_name: "especificacoes_tecnicas_loft.txt",
        ai_analysis_summary: "Reforma de 72m² em ambiente residencial. Não foram identificadas intervenções estruturais em pilares ou vigas portantes. Demolição de mureta divisória com geração de 3m³ de entulho. Necessidade de 65m² de piso porcelanato retificado 120x120 e novo circuito elétrico 220V para ilha da cozinha.",
        ai_confidence_score: 0.94,
        status: "BUDGET_READY"
    };

    // Épicos da Obra
    let eapEpics = [
        { id: "epic_5", project_id: "proj_2", title: "1. Demolição e Adequação Elétrica", order_index: 1, status: "IN_PROGRESS", requires_materials_purchase: true, start_date: "2026-10-26T00:00:00Z", end_date: "2026-11-05T00:00:00Z", ai_generated: true, contractor_approved: true },
        { id: "epic_6", project_id: "proj_2", title: "2. Revestimentos e Porcelanatos", order_index: 2, status: "LOCKED", requires_materials_purchase: true, start_date: "2026-11-06T00:00:00Z", end_date: "2026-11-20T00:00:00Z", ai_generated: true, contractor_approved: true },
        { id: "epic_7", project_id: "proj_2", title: "3. Forro Drywall e Iluminação Linear", order_index: 3, status: "LOCKED", requires_materials_purchase: true, start_date: "2026-11-21T00:00:00Z", end_date: "2026-12-05T00:00:00Z", ai_generated: true, contractor_approved: true }
    ];

    // EAP Auditada pelo Orçamentista (Sub-Etapa 3)
    let eapTasks = [
        { id: 1, epic_id: "epic_5", title: '1. Demolição de Alvenaria e Remoção de Entulho', cat: 'EXECUTION', due_date: '28/10/2026', labor: 2200, mats: 400 },
        { id: 2, epic_id: "epic_5", title: '2. Readequação de Circuitos Elétricos e Ilha', cat: 'EXECUTION', due_date: '30/10/2026', labor: 1800, mats: 1200 },
        { id: 3, epic_id: "epic_6", title: '3. Recebimento de Porcelanato 120x120', cat: 'MATERIAL_RECEIVING', due_date: '03/11/2026', labor: 300, mats: 0 },
        { id: 4, epic_id: "epic_6", title: '4. Assentamento Porcelanato Social', cat: 'EXECUTION', due_date: '12/11/2026', labor: 4200, mats: 9800 },
        { id: 5, epic_id: "epic_7", title: '5. Instalação Drywall e Trilhos LED', cat: 'EXECUTION', due_date: '24/11/2026', labor: 2600, mats: 3500 }
    ];

    $: totalMaoObra = eapTasks.reduce((acc, t) => acc + Number(t.labor || 0), 0);
    $: totalMateriais = eapTasks.reduce((acc, t) => acc + Number(t.mats || 0), 0);
    let custoFrete = 850;
    $: valorFinalHomologado = totalMaoObra + totalMateriais + custoFrete;

    let aiModel = 'gemini-1.5-flash-latest';
    let availableModels = [];

    onMount(async () => {
        try {
            // Tenta carregar os dados mais recentes do mock_data via servidor local
            const res = await fetch('http://localhost:3001/api/get-mock?file=projects.json');
            if (res.ok) {
                const projects = await res.json();
                const found = projects.find(p => p.id === 'proj_2');
                if (found) {
                    activeProject = { ...activeProject, ...found };
                }
            }
        } catch (e) {
            // Fallback transparente se o servidor estiver carregando
        }
    });

    async function saveToMockData(newStatus = null, isFinal = false) {
        isSavingDisk = true;
        try {
            const projectToSave = {
                ...activeProject,
                status: newStatus || activeProject.status,
                budget_estimated: valorFinalHomologado
            };

            if (isFinal) {
                projectToSave.status = "IN_PROGRESS";
                projectToSave.contract_signed_at = new Date().toISOString();
                projectToSave.contract_accepted_by_client = true;
                projectToSave.eap_approved_by_contractor = true;
            }

            const tasksToSave = eapTasks.map((t, idx) => ({
                id: `task_${idx + 12}`,
                epic_id: t.epic_id || 'epic_5',
                assigned_collaborator_id: t.cat === 'MATERIAL_RECEIVING' ? 'collab_4' : 'collab_2',
                title: t.title,
                description: `Execução validada pela IA e homologada pelo Engenheiro Orçamentista.`,
                category: t.cat,
                kanban_status: isFinal && idx === 0 ? 'IN_PROGRESS' : 'TODO',
                cost_labor: Number(t.labor || 0),
                due_date: "2026-11-15T00:00:00Z",
                ai_generated: true,
                contractor_approved: true
            }));

            const res = await fetch('http://localhost:3001/api/save-full-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project: projectToSave,
                    epics: eapEpics,
                    tasks: tasksToSave
                })
            });

            if (res.ok) {
                console.log('✅ Dados gravados com sucesso em /Users/govinda/projetos/ObraFlow/mock_data/');
            }
        } catch (err) {
            console.warn('⚠️ Não foi possível comunicar com o mock-data-server local:', err);
        } finally {
            isSavingDisk = false;
        }
    }

    async function runRealGemini() {
        if (!apiKey) {
            aiError = 'Por favor, insira uma API Key válida do Google Gemini.';
            return;
        }
        isAiLoading = true;
        aiError = '';
        try {
            // PROMPT TÉCNICO ENRIQUECIDO COM TODOS OS INSUMOS DO CLIENTE
            const prompt = `Você é o Agente Técnico de Engenharia Orçamentista do ObraFlow.
Analise os seguintes insumos fornecidos pelo cliente para elaboração da EAP e orçamento:
- Obra: ${activeProject.name}
- Endereço: ${activeProject.address}
- Área: ${activeProject.area_m2} m²
- Teto Orçamentário Máximo do Cliente: R$ ${activeProject.budget_estimated}
- Escopo Informado: "${activeProject.scope_description}"
- Arquivos Anexados: Planta (${activeProject.doc_pdf_name}), Planilha de Custos (${activeProject.doc_spreadsheet_name}), Memorial Descritivo (${activeProject.doc_txt_name}).

Retorne ESTRITAMENTE um objeto JSON válido (sem tags markdown, sem crases extras) com a seguinte estrutura:
{
  "diagnostico": "Parecer técnico detalhado sobre viabilidade, intervenções de demolição, instalações e acabamentos.",
  "orcamento_base": 43500,
  "confianca_pct": 95,
  "epicos": [
    { "id": "epic_5", "title": "1. Demolição e Adequação Elétrica", "order_index": 1, "start_date": "2026-10-25T00:00:00Z", "end_date": "2026-10-31T00:00:00Z" },
    { "id": "epic_6", "title": "2. Revestimentos e Porcelanatos", "order_index": 2, "start_date": "2026-11-01T00:00:00Z", "end_date": "2026-11-14T00:00:00Z" },
    { "id": "epic_7", "title": "3. Forro Drywall e Iluminação Linear", "order_index": 3, "start_date": "2026-11-15T00:00:00Z", "end_date": "2026-11-26T00:00:00Z" }
  ],
  "tarefas": [
    { "id": 1, "epic_id": "epic_5", "title": "1. Demolição de Alvenaria e Remoção de Entulho", "cat": "EXECUTION", "due_date": "28/10/2026", "labor": 2200, "mats": 400 },
    { "id": 2, "epic_id": "epic_5", "title": "2. Readequação de Circuitos Elétricos e Ilha", "cat": "EXECUTION", "due_date": "30/10/2026", "labor": 1800, "mats": 1200 },
    { "id": 3, "epic_id": "epic_6", "title": "3. Recebimento de Porcelanato 120x120", "cat": "MATERIAL_RECEIVING", "due_date": "03/11/2026", "labor": 300, "mats": 0 },
    { "id": 4, "epic_id": "epic_6", "title": "4. Assentamento Porcelanato Social", "cat": "EXECUTION", "due_date": "12/11/2026", "labor": 4200, "mats": 9800 },
    { "id": 5, "epic_id": "epic_7", "title": "5. Instalação Drywall e Trilhos LED", "cat": "EXECUTION", "due_date": "24/11/2026", "labor": 2600, "mats": 3500 }
  ]
}`;

            const candidateModels = [
                aiModel,
                'gemini-1.5-flash-latest',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-2.0-flash',
                'gemini-2.5-flash'
            ].filter((v, idx, arr) => arr.indexOf(v) === idx);

            let success = false;
            let lastErr = null;
            let usedModel = '';
            let parsedData = null;

            for (const model of candidateModels) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.2
                            }
                        })
                    });
                    const data = await res.json();
                    if (!res.ok || data.error) {
                        lastErr = new Error(data.error?.message || `Erro HTTP ${res.status}`);
                        continue;
                    }
                    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                        const rawText = data.candidates[0].content.parts[0].text;
                        // Limpa possíveis blocos ```json ... ```
                        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                        parsedData = JSON.parse(cleaned);
                        usedModel = model;
                        success = true;
                        break;
                    }
                } catch (e) {
                    lastErr = e;
                }
            }

            if (!success) {
                try {
                    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    const listData = await listRes.json();
                    if (listData.models) {
                        availableModels = listData.models
                            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                            .map(m => m.name.replace('models/', ''));
                    }
                } catch (lErr) {}
                throw lastErr || new Error('Não foi possível gerar conteúdo com a chave informada.');
            }

            // Atualiza o estado reativo com a resposta estruturada da IA
            if (parsedData) {
                if (parsedData.diagnostico) activeProject.ai_analysis_summary = parsedData.diagnostico;
                if (parsedData.confianca_pct) activeProject.ai_confidence_score = parsedData.confianca_pct / 100;
                if (Array.isArray(parsedData.tarefas) && parsedData.tarefas.length > 0) {
                    eapTasks = parsedData.tarefas;
                }
                if (Array.isArray(parsedData.epicos) && parsedData.epicos.length > 0) {
                    const now = new Date();
                    eapEpics = parsedData.epicos.map((e, i) => {
                        // Garante start_date e end_date válidos mesmo se o LLM omitir
                        const sDate = e.start_date || new Date(now.getTime() + i * 10 * 86400000).toISOString();
                        const eDate = e.end_date || new Date(now.getTime() + (i * 10 + 9) * 86400000).toISOString();
                        return {
                            ...e,
                            project_id: activeProject.id,
                            status: i === 0 ? "IN_PROGRESS" : "LOCKED",
                            requires_materials_purchase: true,
                            start_date: sDate,
                            end_date: eDate,
                            ai_generated: true,
                            contractor_approved: true
                        };
                    });
                }
                activeProject.status = "BUDGET_READY";

                // GRAVA IMEDIATAMENTE NO MOCK_DATA FÍSICO
                await saveToMockData("BUDGET_READY");

                alert(`⚡ Gemini (${usedModel}) processou os insumos e organizou a obra em ${eapTasks.length} tarefas e ${eapEpics.length} épicos!\n\nDados gravados com sucesso em /mock_data/projects.json, epics.json e tasks.json.`);
            }
        } catch (err) {
            aiError = err.message;
        } finally {
            isAiLoading = false;
        }
    }

    async function finalizeProjectAndRedirect() {
        await saveToMockData("IN_PROGRESS", true);
        const base = (typeof window !== 'undefined' && window.__sveltekit_dev && window.__sveltekit_dev.base) || '/ObraFlow';
        window.location.href = `${base}/dashboard/`;
    }
</script>

<div class="max-w-4xl mx-auto py-6 px-4">
  <!-- BARRA DE PROGRESSO SUPERIOR DAS SUB-ETAPAS 2 A 5 -->
  <div class="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
    <div class="flex items-center gap-2">
      <span class="text-xs font-black text-indigo-700 tracking-wider">🏗️⚡ OBRAFLOW</span>
      <span class="text-gray-300">|</span>
      <span class="text-xs font-bold text-gray-700">Esteira de Contratação</span>
    </div>
    <div class="flex items-center gap-1.5 text-xs">
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 2 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 2}
      >
        2. IA
      </button>
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 3 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 3}
      >
        3. EAP
      </button>
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 4 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 4}
      >
        4. Proposta
      </button>
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 5 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 5}
      >
        5. Aceite
      </button>
    </div>
  </div>

  <!-- ==================== SUB-ETAPA 2: PROCESSAMENTO IA ==================== -->
  {#if currentStep === 2}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">Sub-Etapa 2 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">🤖 Agente Técnico de Engenharia (Google Gemini API)</h2>
        </div>
        <div class="text-right">
          <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            ⚡ {activeProject.status === 'BUDGET_READY' ? 'Processamento Concluído' : 'Aguardando Extração'} (Confiança: {Math.round(activeProject.ai_confidence_score * 100)}%)
          </span>
        </div>
      </div>

      <!-- RESUMO DOS INSUMOS ENVIADOS PELO CLIENTE (Sub-Etapa 1) -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
        <div class="font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
          <span>📋 Insumos Submetidos pelo Cliente (Base para a IA):</span>
          <span class="text-[11px] text-gray-500 font-normal">Obra ID: <strong>{activeProject.id}</strong></span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-gray-700">
          <div>• <strong>Nome:</strong> {activeProject.name}</div>
          <div>• <strong>Área:</strong> {activeProject.area_m2} m²</div>
          <div>• <strong>Teto Orçamentário:</strong> R$ {activeProject.budget_estimated?.toLocaleString('pt-BR')}</div>
        </div>
        <div class="text-gray-600">
          • <strong>Endereço:</strong> {activeProject.address}
        </div>
        <div class="text-gray-600 italic bg-white p-2.5 rounded-xl border border-gray-200">
          "{activeProject.scope_description}"
        </div>
        <div class="flex flex-wrap gap-2 pt-1 text-[11px] text-gray-500">
          <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200">📄 {activeProject.doc_pdf_name}</span>
          <span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-200">📊 {activeProject.doc_spreadsheet_name}</span>
          <span class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200">📝 {activeProject.doc_txt_name}</span>
        </div>
      </div>

      <!-- BOX DE DIAGNÓSTICO EXTRAÍDO -->
      <div class="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-5">
        <div class="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2">
          Diagnóstico Técnico & Viabilidade Extraído pela IA:
        </div>
        <p class="text-xs text-gray-700 leading-relaxed font-mono bg-white p-3 rounded-xl border border-indigo-100 m-0">
          "{activeProject.ai_analysis_summary}"
        </p>
      </div>

      <!-- VALORES SUGERIDOS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div class="text-xs text-gray-500 font-semibold mb-1">Orçamento Base Homologado pela IA:</div>
          <div class="text-2xl font-black text-indigo-700">R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</div>
          <div class="text-[11px] {valorFinalHomologado <= activeProject.budget_estimated ? 'text-emerald-600' : 'text-amber-600'} font-bold mt-1">
            {valorFinalHomologado <= activeProject.budget_estimated ? '✓ Dentro do teto do cliente' : '⚠️ Supera teto estipulado'} (R$ {activeProject.budget_estimated?.toLocaleString('pt-BR')},00)
          </div>
        </div>
        <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div class="text-xs text-gray-500 font-semibold mb-1">Status da Obra em Disco:</div>
          <div class="text-2xl font-black text-blue-700">{activeProject.status}</div>
          <div class="text-[11px] text-gray-500 mt-1">Sincronizado fisicamente em mock_data/projects.json</div>
        </div>
      </div>

      <!-- CHAVE REAL GEMINI OPCIONAL -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
        <div class="flex items-center justify-between mb-2">
          <div class="font-bold text-gray-800">Testar Chamada Real com Chave do Google Gemini:</div>
          <span class="text-[11px] text-gray-500 font-mono">Modelo Selecionado: {aiModel}</span>
        </div>
        <div class="flex flex-wrap md:flex-nowrap gap-2">
          <input 
            type="password" 
            placeholder="Cole sua Gemini API Key (ex: AIzaSy...)" 
            bind:value={apiKey} 
            class="flex-1 min-w-[240px] border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none" 
          />
          <select 
            bind:value={aiModel} 
            class="border border-gray-300 rounded-xl p-2.5 text-xs bg-white text-gray-800 outline-none"
          >
            <option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          </select>
          <button 
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 whitespace-nowrap"
            on:click={runRealGemini}
            disabled={isAiLoading}
          >
            {isAiLoading ? 'Extraindo...' : '⚡ Reexecutar IA'}
          </button>
        </div>
        {#if aiError}
          <div class="text-rose-600 font-semibold mt-2 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            ⚠️ {aiError}
          </div>
        {/if}
        {#if availableModels.length > 0}
          <div class="mt-2 text-[11px] text-gray-600">
            <strong>Modelos detectados na sua conta:</strong>
            <div class="flex flex-wrap gap-1 mt-1">
              {#each availableModels as m}
                <button 
                  class="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2 py-0.5 hover:bg-indigo-100 font-mono text-[10px]"
                  on:click={() => { aiModel = m; }}
                >
                  {m}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- BOTÕES DE NAVEGAÇÃO -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <a href="/novo-projeto/" class="text-xs font-bold text-gray-500 hover:text-gray-700 no-underline">
          ← Voltar para Documentos
        </a>
        <button 
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md no-underline transition-all"
          on:click={() => currentStep = 3}
        >
          Encaminhar para o Orçamentista →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 3: AVALIAÇÃO DO ORÇAMENTISTA ==================== -->
  {#if currentStep === 3}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-emerald-600">Sub-Etapa 3 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">📐 Revisão Técnica da EAP pelo Orçamentista</h2>
        </div>
        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
          Status: APPROVED
        </span>
      </div>

      <!-- TABELA FIEL AO WIREFRAME 3.2 -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-gray-200 text-gray-500 uppercase font-bold text-[11px]">
              <th class="py-2.5">Tarefa Proposta pela IA</th>
              <th class="py-2.5">Categoria</th>
              <th class="py-2.5">Prazo Limite</th>
              <th class="py-2.5 text-right">Mão de Obra</th>
              <th class="py-2.5 text-right">Insumos</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each eapTasks as t}
              <tr class="hover:bg-gray-50">
                <td class="py-3 font-semibold text-gray-900">{t.title}</td>
                <td class="py-3">
                  <span class="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded text-[10px]">{t.cat}</span>
                </td>
                <td class="py-3 text-gray-600 font-mono">[{t.due_date}]</td>
                <td class="py-3 text-right font-mono font-bold text-gray-900">R$ {Number(t.labor).toLocaleString('pt-BR')}</td>
                <td class="py-3 text-right font-mono font-bold text-gray-900">R$ {Number(t.mats).toLocaleString('pt-BR')}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- TOTAIS DA EAP -->
      <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-wrap justify-between items-center text-xs">
        <div>Total Mão de Obra: <strong>R$ {totalMaoObra.toLocaleString('pt-BR')},00</strong></div>
        <div>Total Materiais: <strong>R$ {totalMateriais.toLocaleString('pt-BR')},00</strong></div>
        <div>Fretes & Logística: <strong>R$ {custoFrete},00</strong></div>
        <div class="bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl text-sm">
          VALOR FINAL HOMOLOGADO: R$ {valorFinalHomologado.toLocaleString('pt-BR')},00
        </div>
      </div>

      <!-- BOTÕES -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button class="text-xs font-bold text-gray-500 hover:text-gray-700" on:click={() => currentStep = 2}>
          ← Voltar ao Diagnóstico IA
        </button>
        <button 
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all"
          on:click={() => currentStep = 4}
        >
          Gerar Proposta Comercial & Contrato →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 4: ENVIO DE PROPOSTA ==================== -->
  {#if currentStep === 4}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">Sub-Etapa 4 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">📜 Envio de Proposta Comercial e Minuta Contratual</h2>
        </div>
        <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
          Status: PROPOSAL_READY
        </span>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
        <div class="font-bold text-gray-800 uppercase tracking-wider">Resumo da Proposta a ser Enviada ao Cliente:</div>
        <ul class="space-y-1 text-gray-700 pl-0 list-none m-0">
          <li>• <strong>Cliente:</strong> Marina Costa (marina.costa@email.com)</li>
          <li>• <strong>Obra:</strong> Reforma Loft Jardins (Alameda dos Anapurus, 780 - 72m²)</li>
          <li>• <strong>Valor Fechado da EAP:</strong> R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</li>
        </ul>

        <div class="pt-3 border-t border-slate-200">
          <div class="font-bold text-gray-800 mb-1">Condições de Pagamento Vinculadas a Vistorias:</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div class="bg-white p-2.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-gray-500 font-bold">Sinal de Mobilização (Assinatura)</span>
              <div class="font-black text-gray-900 mt-0.5">R$ 20.000,00</div>
            </div>
            <div class="bg-white p-2.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-gray-500 font-bold">Parcela 2 (Medição Porcelanato c/ Foto)</span>
              <div class="font-black text-gray-900 mt-0.5">R$ 14.200,00</div>
            </div>
            <div class="bg-white p-2.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-gray-500 font-bold">Parcela 3 (Entrega de Gesso c/ Foto)</span>
              <div class="font-black text-gray-900 mt-0.5">R$ 10.000,00</div>
            </div>
          </div>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
          <strong>⚖️ Cláusula Pétrea de Evidência:</strong> A liberação das parcelas 2 e 3 fica estritamente condicionada ao envio prévio de fotos auditadas no canteiro pelo Mestre de Obras.
        </div>
      </div>

      <!-- BOTÕES -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button class="text-xs font-bold text-gray-500 hover:text-gray-700" on:click={() => currentStep = 3}>
          ← Voltar à Composição da EAP
        </button>
        <button 
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"
          on:click={() => currentStep = 5}
        >
          <span>✉️</span> Disparar Notificação para o Cliente Aceitar →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 5: ACEITE DO CLIENTE ==================== -->
  {#if currentStep === 5}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-blue-600">Sub-Etapa 5 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">✍️ Revisão da Proposta e Assinatura Digital pelo Cliente</h2>
        </div>
        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
          Status: CONTRACT_SIGNED
        </span>
      </div>

      <div class="border border-gray-200 rounded-2xl p-5 space-y-4">
        <div class="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <div class="font-bold text-sm text-gray-900">CONTRATO DE PRESTAÇÃO DE SERVIÇOS — REFORMA LOFT JARDINS</div>
            <div class="text-xs text-gray-500">Contratada: Alpha Engenharia & Construções • Contratante: Marina Costa</div>
          </div>
          <div class="text-right">
            <span class="text-sm font-black text-indigo-700">R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</span>
            <div class="text-[10px] text-gray-400">Prazo Estimado: 45 dias corridos</div>
          </div>
        </div>

        <!-- TERMO DE COMPROMISSO -->
        <div class="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl text-xs space-y-2">
          <div class="font-bold text-emerald-950 uppercase tracking-wider">Termo de Aceite e Compromisso de Transparência:</div>
          <label class="flex items-start gap-2.5 cursor-pointer text-gray-800">
            <input type="checkbox" checked class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
            <span>
              Eu, <strong>Marina Costa</strong>, aprovo formalmente o orçamento técnico, a lista de insumos da EAP e o cronograma físico-financeiro com vistorias vinculadas a comprovações fotográficas.
            </span>
          </label>
        </div>

        <div class="text-xs text-gray-500 flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono">
          <span>Registro de Assinatura: contract_signed_at = 25/10/2026 09:00:12</span>
          <span class="font-bold text-emerald-700">Status: [ CONTRACT_SIGNED ] ➔ [ 🚀 IN_PROGRESS ]</span>
        </div>
      </div>

      <!-- BOTÃO DE ATIVAÇÃO FINAL -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button class="text-xs font-bold text-gray-500 hover:text-gray-700" on:click={() => currentStep = 4}>
          ← Voltar à Minuta
        </button>
        <button 
          on:click={finalizeProjectAndRedirect}
          disabled={isSavingDisk}
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/30 no-underline transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>✅</span> {isSavingDisk ? 'Gravando em Disco...' : 'CONFIRMAR ACEITE E CADASTRAR NOVA OBRA NO SISTEMA'}
        </button>
      </div>
    </div>
  {/if}

</div>
