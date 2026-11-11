---
title: Esteira de Orçamentos, EAP & Contrato - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

```sql kpis_orcamentista
SELECT
    COUNT(*) AS total_projetos,
    COUNT(CASE WHEN status IN ('QUOTE_REQUESTED', 'AI_ANALYZING', 'BUDGET_READY', 'APPROVED') THEN 1 END) AS em_orcamentacao,
    COALESCE(SUM(budget_estimated), 0) AS volume_orcado,
    COALESCE(AVG(ai_confidence_score), 0.94) AS confianca_media,
    (SELECT COUNT(*) FROM obraflow.tasks) AS total_tarefas_eap
FROM obraflow.projects
```

<script>
    let currentStep = 2; // 2: IA, 3: EAP Editável, 4: Proposta, 5: Aceite Digital
    let allProjects = [];
    let allUsers = [];
    let selectedProjectId = '';

    let apiKey = '';
    let aiModel = 'gemini-2.5-flash';
    let availableModels = [];
    let lastEngineUsed = 'Motor Heurístico Local (Offline)';
    let showGeminiConfig = false;
    let showApiKey = false;
    let geminiWarning = '';

    function clearGeminiKey() {
        apiKey = '';
        geminiWarning = '';
        aiError = '';
        availableModels = [];
        if (typeof window !== 'undefined') {
            localStorage.removeItem('obraflow_gemini_key');
        }
        feedbackBanner = '🗑️ Chave Gemini removida do navegador. O Motor Local continua disponível sem chave.';
    }

    let isAiLoading = false;
    let isSavingDisk = false;
    let aiError = '';
    let feedbackBanner = '';
    let contractAcceptedChecked = true;

    let activeProject = {
        id: 'proj_2',
        name: 'Reforma Loft Jardins',
        address: 'Alameda dos Anapurus, 780 - Apto 82',
        client_id: 'usr_5',
        contractor_id: 'usr_2',
        area_m2: 72,
        budget_estimated: 45000,
        scope_description: 'Reforma completa de loft com integração, porcelanato, gesso e iluminação.',
        doc_pdf_name: 'planta_executiva_loft.pdf',
        doc_spreadsheet_name: 'orcamento_materiais_loft.xlsx',
        doc_txt_name: 'especificacoes_tecnicas_loft.txt',
        scope_pdf_url: '',
        ai_analysis_summary: 'Carregando análise técnica da obra selecionada...',
        ai_confidence_score: 0.94,
        status: 'BUDGET_READY'
    };

    let eapEpics = [
        { temp_id: 'ep_1', title: '1. Serviços Preliminares e Infraestrutura', order_index: 1 },
        { temp_id: 'ep_2', title: '2. Revestimentos, Pisos e Bancadas', order_index: 2 },
        { temp_id: 'ep_3', title: '3. Forro, Iluminação e Entrega Final', order_index: 3 }
    ];

    let eapTasks = [
        {
            temp_epic: 'ep_1',
            title: '1. Demolição Seletiva e Remoção de Entulho',
            cat: 'EXECUTION',
            due_date: '10/11/2026',
            labor: 2200,
            mats: 500,
            material_name: 'Proteção de piso e caçamba estacionária',
            material_group: 'STRUCTURAL',
            quantity: 1,
            freight_cost: 200,
            receiver_responsible: 'CONTRACTOR'
        },
        {
            temp_epic: 'ep_2',
            title: '2. Assentamento de Porcelanato Retificado',
            cat: 'EXECUTION',
            due_date: '20/11/2026',
            labor: 4200,
            mats: 9800,
            material_name: 'Porcelanato Retificado + Argamassa AC-III',
            material_group: 'FINISHINGS',
            quantity: 72,
            freight_cost: 450,
            receiver_responsible: 'CONTRACTOR'
        }
    ];

    $: totalMaoObra = eapTasks.reduce((acc, t) => acc + Number(t.labor || 0), 0);
    $: totalMateriais = eapTasks.reduce((acc, t) => acc + Number(t.mats || 0), 0);
    $: totalFretes = eapTasks.reduce((acc, t) => acc + Number(t.freight_cost || 0), 0);
    $: totalTaxasRecebimento = eapTasks.reduce(
        (acc, t) =>
            acc +
            ((Number(t.mats || 0) > 0 || (t.material_name && t.material_name.trim())) &&
            t.receiver_responsible === 'CONTRACTOR'
                ? 180
                : 0),
        0
    );
    $: valorFinalHomologado = totalMaoObra + totalMateriais + totalFretes + totalTaxasRecebimento;
    $: p1Sinal = Math.round(valorFinalHomologado * 0.4);
    $: p2Intermediaria = Math.round(valorFinalHomologado * 0.35);
    $: p3Final = Math.max(0, valorFinalHomologado - p1Sinal - p2Intermediaria);
    $: clientUser =
        allUsers.find((u) => u.id === activeProject.client_id) || {
            name: 'Marina Costa (Proprietária)',
            email: 'marina.costa@email.com'
        };

    function hydrateProjectFromState(state, targetId) {
        const found = state.projects.find((p) => p.id === targetId) || state.projects[state.projects.length - 1];
        if (!found) return;
        selectedProjectId = found.id;
        activeProject = { ...found };

        const projEpics = state.epics
            .filter((e) => e.project_id === found.id)
            .sort((a, b) => a.order_index - b.order_index);

        if (projEpics.length > 0) {
            eapEpics = projEpics.map((e) => ({
                temp_id: e.id,
                id: e.id,
                title: e.title,
                order_index: e.order_index,
                start_date: e.start_date,
                end_date: e.end_date
            }));

            const epicIdSet = new Set(projEpics.map((e) => e.id));
            const projTasks = state.tasks.filter((t) => epicIdSet.has(t.epic_id));
            if (projTasks.length > 0) {
                eapTasks = projTasks.map((t) => {
                    const linkedMat = state.materials.find((m) => m.task_id === t.id);
                    const d = t.due_date ? new Date(t.due_date) : new Date();
                    const dueFmt = !Number.isNaN(d.getTime())
                        ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
                        : '20/11/2026';
                    return {
                        temp_epic: t.epic_id,
                        title: t.title,
                        cat: t.category || 'EXECUTION',
                        due_date: dueFmt,
                        labor: Number(t.cost_labor || 0),
                        mats: linkedMat ? Math.round(Number(linkedMat.quantity || 1) * Number(linkedMat.unit_price || 0)) : 0,
                        material_name: linkedMat ? linkedMat.name : '',
                        material_group: linkedMat ? linkedMat.material_group : 'FINISHINGS',
                        unit: linkedMat ? linkedMat.unit : 'un',
                        quantity: linkedMat ? Number(linkedMat.quantity || 1) : 1,
                        freight_cost: linkedMat ? Number(linkedMat.freight_cost || 0) : 0,
                        receiver_responsible: linkedMat ? linkedMat.receiver_responsible : 'CONTRACTOR',
                        kanban_status: t.kanban_status || 'TODO'
                    };
                });
            }
        }
    }

    let cachedState = null;

    onMount(async () => {
        let autoAnalyze = false;
        let queryProjId = '';
        if (typeof window !== 'undefined') {
            apiKey = localStorage.getItem('obraflow_gemini_key') || '';
            const params = new URLSearchParams(window.location.search);
            queryProjId = params.get('project_id') || localStorage.getItem('obraflow_editing_project_id') || '';
            autoAnalyze = params.get('auto_analyze') === '1';
        }

        try {
            const res = await fetch('http://localhost:3001/api/state');
            if (res.ok) {
                cachedState = await res.json();
                allProjects = cachedState.projects || [];
                allUsers = cachedState.users || [];
                hydrateProjectFromState(cachedState, queryProjId);
            }
        } catch (err) {
            console.warn('Servidor local indisponível na montagem inicial:', err);
        }

        if (autoAnalyze) {
            await runAnalysis(false);
        }
    });

    function handleProjectSwitch() {
        if (cachedState && selectedProjectId) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('obraflow_editing_project_id', selectedProjectId);
            }
            hydrateProjectFromState(cachedState, selectedProjectId);
            feedbackBanner = `📂 Obra "${activeProject.name}" carregada na esteira técnica.`;
        }
    }

    function addTaskRow() {
        const defaultEpic = eapEpics[0]?.temp_id || 'ep_1';
        eapTasks = [
            ...eapTasks,
            {
                temp_epic: defaultEpic,
                title: `${eapTasks.length + 1}. Nova Etapa / Serviço Técnico`,
                cat: 'EXECUTION',
                due_date: '25/11/2026',
                labor: 1500,
                mats: 1200,
                material_name: 'Insumos técnicos da tarefa',
                material_group: 'FINISHINGS',
                unit: 'un',
                quantity: 1,
                freight_cost: 150,
                receiver_responsible: 'CONTRACTOR'
            }
        ];
    }

    function removeTaskRow(index) {
        if (eapTasks.length <= 1) return;
        eapTasks = eapTasks.filter((_, idx) => idx !== index);
    }

    async function saveToDisk(newStatus, isFinal = false) {
        isSavingDisk = true;
        aiError = '';
        try {
            const projectPayload = {
                ...activeProject,
                status: newStatus || activeProject.status,
                budget_estimated: valorFinalHomologado
            };
            const res = await fetch('http://localhost:3001/api/save-full-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project: projectPayload,
                    epics: eapEpics,
                    tasks: eapTasks,
                    isFinal
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erro ao gravar dados em mock_data/');
            }
            activeProject = data.project;
            // Atualiza cache local de estado
            const stateRes = await fetch('http://localhost:3001/api/state');
            if (stateRes.ok) {
                cachedState = await stateRes.json();
                allProjects = cachedState.projects || [];
            }
            return data;
        } catch (err) {
            aiError = `Falha na persistência local: ${err.message}`;
            return null;
        } finally {
            isSavingDisk = false;
        }
    }

    async function runAnalysis(useGeminiKey = false) {
        if (useGeminiKey && !apiKey.trim()) {
            aiError = 'Informe sua Gemini API Key ou utilize o botão do Motor Local Offline.';
            return;
        }

        isAiLoading = true;
        aiError = '';
        geminiWarning = '';
        feedbackBanner = '';
        try {
            const extraText =
                typeof window !== 'undefined' ? localStorage.getItem('obraflow_extra_doc_text') || '' : '';

            const res = await fetch('http://localhost:3001/api/ai/analyze-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project: activeProject,
                    extraText,
                    apiKey: useGeminiKey ? apiKey.trim() : '',
                    aiModel
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                if (Array.isArray(data.availableModels)) {
                    availableModels = data.availableModels;
                }
                throw new Error(data.error || 'Falha ao processar análise da obra.');
            }

            lastEngineUsed =
                data.engine === 'local-heuristic'
                    ? (data.fallbackFromGemini ? 'Motor Local (fallback do Gemini)' : 'Motor Heurístico Local (Offline)')
                    : `Google ${data.engine}`;

            if (useGeminiKey && typeof window !== 'undefined') {
                if (data.keyRejected) {
                    localStorage.removeItem('obraflow_gemini_key');
                } else if (!data.fallbackFromGemini) {
                    localStorage.setItem('obraflow_gemini_key', apiKey.trim());
                }
            }
            if (data.geminiWarning) geminiWarning = data.geminiWarning;
            if (Array.isArray(data.availableModels) && data.availableModels.length > 0) {
                availableModels = data.availableModels;
            }

            if (data.diagnostico) activeProject.ai_analysis_summary = data.diagnostico;
            if (data.confianca_pct) activeProject.ai_confidence_score = Number(data.confianca_pct) / 100;
            if (Array.isArray(data.epicos) && data.epicos.length > 0) {
                eapEpics = data.epicos.map((e, i) => ({
                    temp_id: e.temp_id || e.id || `ep_${i + 1}`,
                    title: e.title,
                    order_index: e.order_index || i + 1,
                    start_date: e.start_date,
                    end_date: e.end_date
                }));
            }
            if (Array.isArray(data.tarefas) && data.tarefas.length > 0) {
                const defaultEp = eapEpics[0]?.temp_id || 'ep_1';
                eapTasks = data.tarefas.map((t) => ({
                    temp_epic: t.temp_epic || t.epic_id || defaultEp,
                    title: t.title,
                    cat: t.cat || t.category || 'EXECUTION',
                    due_date: t.due_date || '20/11/2026',
                    labor: Number(t.labor || 0),
                    mats: Number(t.mats || 0),
                    material_name: t.material_name || (Number(t.mats || 0) > 0 ? `Insumos: ${t.title}` : ''),
                    material_group: t.material_group || 'FINISHINGS',
                    unit: t.unit || 'un',
                    quantity: Number(t.quantity || 1),
                    freight_cost: Number(t.freight_cost || 0),
                    receiver_responsible: t.receiver_responsible || 'CONTRACTOR'
                }));
            }

            activeProject.status = 'BUDGET_READY';
            await saveToDisk('BUDGET_READY', false);
            feedbackBanner = `⚡ ${lastEngineUsed} estruturou ${eapEpics.length} épicos e ${eapTasks.length} tarefas com insumos gravados em mock_data/!`;
        } catch (err) {
            aiError = err.message;
        } finally {
            isAiLoading = false;
        }
    }

    async function approveEapAndAdvance() {
        const saved = await saveToDisk('APPROVED', false);
        if (saved) {
            feedbackBanner = '📐 EAP homologada e sincronizada com sucesso em mock_data/ e DuckDB!';
            currentStep = 4;
        }
    }

    async function finalizeContractAndActivate() {
        if (!contractAcceptedChecked) {
            aiError = 'Marque a caixa de concordância do Termo de Aceite antes de ativar a obra.';
            return;
        }
        const saved = await saveToDisk('IN_PROGRESS', true);
        if (saved && typeof window !== 'undefined') {
            localStorage.setItem('obraflow_selected_project', saved.projectId);
            window.location.href = '/dashboard/';
        }
    }
</script>

<div class="max-w-5xl mx-auto py-6 px-4 space-y-6">
  <!-- TOPBAR DA ESTEIRA DO ENGENHEIRO ORÇAMENTISTA -->
  <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 shadow-xl border border-slate-800">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <a href="/dashboard/" class="flex items-center gap-2 no-underline text-white">
          <span class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">📐</span>
          <div>
            <span class="font-black text-sm tracking-tight block">OBRAFLOW • ESTEIRA DE ORÇAMENTOS</span>
            <span class="text-[10px] text-emerald-300 font-semibold">Engenharia de Custos, EAP & Contratos</span>
          </div>
        </a>
      </div>

      <div class="flex flex-wrap items-center gap-3 text-xs">
        {#if allProjects.length > 0}
          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-semibold">Obra na Esteira:</span>
            <select
              bind:value={selectedProjectId}
              on:change={handleProjectSwitch}
              class="bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
            >
              {#each allProjects as p}
                <option value={p.id}>{p.name} ({p.status})</option>
              {/each}
            </select>
          </div>
        {/if}

        <a href="/novo-projeto/" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl no-underline">
          + Novo Orçamento
        </a>
        <a href="/onboarding/" class="text-slate-300 hover:text-white font-semibold no-underline">
          Trocar Perfil ⚙️
        </a>
      </div>
    </div>
  </div>

  <!-- 4 BIGVALUES DINÂMICOS DO ENGENHEIRO ORÇAMENTISTA (Wireframe 4.3) -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <BigValue data={kpis_orcamentista} value="total_projetos" title="Projetos na Base" />
    <BigValue data={kpis_orcamentista} value="volume_orcado" title="Volume Total em EAPs" fmt="brl" />
    <BigValue data={kpis_orcamentista} value="confianca_media" title="Confiança Média IA" fmt="pct0" />
    <BigValue data={kpis_orcamentista} value="total_tarefas_eap" title="Tarefas Mapeadas" />
  </div>

  <!-- NAVEGAÇÃO DAS SUB-ETAPAS 2 A 5 -->
  <div class="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
    <div class="text-xs font-bold text-gray-700 pl-2">
      Obra Ativa: <span class="text-indigo-700">{activeProject.name}</span>
      <span class="text-gray-400 font-mono ml-1">({activeProject.id} • {activeProject.status})</span>
    </div>
    <div class="flex flex-wrap items-center gap-1.5 text-xs">
      <button class="px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all {currentStep === 2 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" on:click={() => currentStep = 2}>
        2. Diagnóstico IA
      </button>
      <button class="px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all {currentStep === 3 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" on:click={() => currentStep = 3}>
        3. Revisão EAP ({eapTasks.length})
      </button>
      <button class="px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all {currentStep === 4 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" on:click={() => currentStep = 4}>
        4. Proposta & Parcelas
      </button>
      <button class="px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all {currentStep === 5 ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" on:click={() => currentStep = 5}>
        5. Assinatura & Ativação
      </button>
    </div>
  </div>

  {#if feedbackBanner}
    <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl p-3.5">
      {feedbackBanner}
    </div>
  {/if}
  {#if aiError}
    <div class="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-3.5">
      ⚠️ {aiError}
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 2: PROCESSAMENTO IA ==================== -->
  {#if currentStep === 2}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">Sub-Etapa 2 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">🤖 Extração de Quantitativos e Diagnóstico Técnico</h2>
        </div>
        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
          Motor: {lastEngineUsed} • Confiança {Math.round((activeProject.ai_confidence_score || 0.93) * 100)}%
        </span>
      </div>

      <!-- INSUMOS DO CLIENTE -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
        <div class="font-bold text-gray-800 uppercase tracking-wider">📋 Parâmetros e Documentos da Obra:</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-gray-700">
          <div>• <strong>Obra:</strong> {activeProject.name}</div>
          <div>• <strong>Área:</strong> {activeProject.area_m2} m²</div>
          <div>• <strong>Teto Informado:</strong> R$ {Number(activeProject.budget_estimated || 0).toLocaleString('pt-BR')}</div>
        </div>
        <div class="text-gray-600">• <strong>Endereço:</strong> {activeProject.address} • <strong>Cliente:</strong> {clientUser.name}</div>
        <div class="text-gray-700 italic bg-white p-2.5 rounded-xl border border-gray-200">
          "{activeProject.scope_description}"
        </div>
        <div class="flex flex-wrap gap-2 pt-1 text-[11px]">
          <span class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">📄 {activeProject.doc_pdf_name}</span>
          <span class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">📊 {activeProject.doc_spreadsheet_name}</span>
          <span class="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-200">📝 {activeProject.doc_txt_name}</span>
          {#if activeProject.scope_pdf_url && activeProject.scope_pdf_url.includes('localhost:3001')}
            <a href={activeProject.scope_pdf_url} target="_blank" rel="noreferrer" class="text-indigo-600 font-bold underline self-center ml-1">
              Abrir PDF salvo em ./uploads/ ↗
            </a>
          {/if}
        </div>
      </div>

      <!-- DIAGNÓSTICO EXTRAÍDO -->
      <div class="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-5">
        <div class="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2">
          Parecer Técnico Gerado:
        </div>
        <p class="text-xs text-gray-700 leading-relaxed font-mono bg-white p-3.5 rounded-xl border border-indigo-100 m-0">
          {activeProject.ai_analysis_summary}
        </p>
      </div>

      <!-- AÇÃO PRINCIPAL LOCAL + GEMINI OPCIONAL -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="font-bold text-gray-900">Executar Decomposição Automática de Épicos, Tarefas e Materiais</div>
            <div class="text-[11px] text-gray-500">Funciona 100% offline pelo Motor Local de Engenharia ou via Google Gemini Multimodal.</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              on:click={() => runAnalysis(false)}
              disabled={isAiLoading}
              class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isAiLoading ? 'Processando...' : '⚡ Reexecutar Motor Local (Sem Chave)'}
            </button>
            <button
              type="button"
              on:click={() => showGeminiConfig = !showGeminiConfig}
              class="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-3.5 py-2.5 rounded-xl cursor-pointer"
            >
              🤖 {showGeminiConfig ? 'Ocultar Gemini API' : 'Usar Google Gemini API (Opcional)'}
            </button>
          </div>
        </div>

        {#if showGeminiConfig}
          <div class="pt-3 border-t border-slate-200 flex flex-wrap md:flex-nowrap gap-2">
            {#if showApiKey}
              <input 
                type="text" 
                placeholder="Cole sua Gemini API Key (AIzaSy...)" 
                bind:value={apiKey} 
                class="flex-1 min-w-[220px] border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none font-mono" 
              />
            {:else}
              <input 
                type="password" 
                placeholder="Cole sua Gemini API Key (AIzaSy...)" 
                bind:value={apiKey} 
                class="flex-1 min-w-[220px] border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none" 
              />
            {/if}
            <button
              type="button"
              title="Mostrar/ocultar chave"
              on:click={() => showApiKey = !showApiKey}
              class="bg-white border border-gray-300 hover:bg-gray-50 rounded-xl px-3 text-xs cursor-pointer"
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
            <button
              type="button"
              on:click={clearGeminiKey}
              class="bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold rounded-xl px-3 text-xs cursor-pointer whitespace-nowrap"
            >
              🗑️ Limpar Chave
            </button>
            <select bind:value={aiModel} class="border border-gray-300 rounded-xl p-2.5 text-xs bg-white text-gray-800 outline-none">
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-flash-latest">gemini-flash-latest</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
            </select>
            <button 
              type="button"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 whitespace-nowrap"
              on:click={() => runAnalysis(true)}
              disabled={isAiLoading}
            >
              {isAiLoading ? 'Consultando Gemini...' : '🚀 Rodar Gemini Multimodal'}
            </button>
          </div>
          {#if availableModels.length > 0}
            <div class="text-[11px] text-gray-600">
              Modelos disponíveis na chave:
              {#each availableModels as m}
                <button type="button" class="ml-1 underline text-indigo-700 cursor-pointer" on:click={() => { aiModel = m; }}>{m}</button>
              {/each}
            </div>
          {/if}
        {/if}

        {#if geminiWarning}
          <div class="bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold rounded-xl p-3">
            ⚠️ {geminiWarning}
          </div>
        {/if}
        {#if aiError}
          <div class="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-xl p-3">
            ⚠️ {aiError}
          </div>
        {/if}
      </div>

      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <a href="/novo-projeto/" class="text-xs font-bold text-gray-500 hover:text-gray-700 no-underline">
          ← Novo Upload / Obra
        </a>
        <button 
          type="button"
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 px-6 rounded-xl shadow-md cursor-pointer"
          on:click={() => currentStep = 3}
        >
          Revisar e Editar EAP ({eapTasks.length} tarefas) →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 3: TABELA EAP 100% EDITÁVEL ==================== -->
  {#if currentStep === 3}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-emerald-600">Sub-Etapa 3 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">📐 Auditoria e Edição Interativa da EAP & Insumos</h2>
          <p class="text-xs text-gray-500 mt-0.5">Altere títulos, categorias, prazos, mão de obra, materiais, fretes e responsável pelo recebimento em canteiro.</p>
        </div>
        <button
          type="button"
          on:click={addTaskRow}
          class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
        >
          + Adicionar Tarefa / Insumo
        </button>
      </div>

      <div class="space-y-3">
        {#each eapTasks as t, idx}
          <div class="border border-gray-200 rounded-2xl p-4 bg-gray-50/40 space-y-3 text-xs">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
              <div class="md:col-span-5">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tarefa da EAP</label>
                <input type="text" bind:value={t.title} class="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold" />
              </div>
              <div class="md:col-span-3">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Macroetapa (Épico)</label>
                <select bind:value={t.temp_epic} class="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
                  {#each eapEpics as ep}
                    <option value={ep.temp_id}>{ep.title}</option>
                  {/each}
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categoria Kanban</label>
                <select bind:value={t.cat} class="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white font-mono text-[11px]">
                  <option value="EXECUTION">EXECUTION</option>
                  <option value="MATERIAL_RECEIVING">MATERIAL_RECEIVING</option>
                  <option value="MATERIAL_PURCHASE">MATERIAL_PURCHASE</option>
                  <option value="INSPECTION">INSPECTION</option>
                </select>
              </div>
              <div class="md:col-span-2 flex gap-1.5 items-end">
                <div class="flex-1">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Prazo</label>
                  <input type="text" bind:value={t.due_date} class="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white font-mono text-[11px]" />
                </div>
                <button
                  type="button"
                  on:click={() => removeTaskRow(idx)}
                  title="Remover tarefa"
                  class="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1.5 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-12 gap-2.5 pt-2 border-t border-gray-200/70 items-end">
              <div class="col-span-2 md:col-span-4">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Especificação do Material (materials.json)</label>
                <input type="text" bind:value={t.material_name} placeholder="Sem insumo vinculado" class="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Grupo</label>
                <select bind:value={t.material_group} class="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-[11px]">
                  <option value="STRUCTURAL">STRUCTURAL</option>
                  <option value="PLUMBING">PLUMBING</option>
                  <option value="FINISHINGS">FINISHINGS</option>
                  <option value="DRYWALL">DRYWALL</option>
                  <option value="LIGHTING">LIGHTING</option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mão Obra (R$)</label>
                <input type="number" step="50" bind:value={t.labor} class="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-mono font-bold text-right" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Insumos (R$)</label>
                <input type="number" step="50" bind:value={t.mats} class="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-mono font-bold text-right" />
              </div>
              <div class="md:col-span-1">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Frete</label>
                <input type="number" step="20" bind:value={t.freight_cost} class="w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white font-mono text-right" />
              </div>
              <div class="md:col-span-1">
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Recebe</label>
                <select bind:value={t.receiver_responsible} class="w-full border border-gray-300 rounded-lg px-1.5 py-1.5 bg-white text-[10px] font-bold">
                  <option value="CONTRACTOR">EMPR.</option>
                  <option value="CLIENT">CLI.</option>
                </select>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- RESUMO CONSOLIDADO DA EAP -->
      <div class="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap justify-between items-center gap-4 text-xs">
        <div class="space-y-0.5">
          <div class="text-slate-400">Mão de Obra: <strong class="text-white">R$ {totalMaoObra.toLocaleString('pt-BR')}</strong></div>
          <div class="text-slate-400">Materiais: <strong class="text-white">R$ {totalMateriais.toLocaleString('pt-BR')}</strong></div>
        </div>
        <div class="space-y-0.5">
          <div class="text-slate-400">Fretes: <strong class="text-white">R$ {totalFretes.toLocaleString('pt-BR')}</strong></div>
          <div class="text-slate-400">Taxas Recebimento Obra: <strong class="text-emerald-300">R$ {totalTaxasRecebimento.toLocaleString('pt-BR')}</strong></div>
        </div>
        <div class="bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm">
          TOTAL HOMOLOGADO: R$ {valorFinalHomologado.toLocaleString('pt-BR')},00
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button type="button" class="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer" on:click={() => currentStep = 2}>
          ← Voltar ao Diagnóstico
        </button>
        <button 
          type="button"
          disabled={isSavingDisk}
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-6 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
          on:click={approveEapAndAdvance}
        >
          {isSavingDisk ? 'Salvando EAP em Disco...' : 'Homologar EAP e Gerar Minuta Contratual →'}
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 4: MINUTA E PARCELAS DINÂMICAS ==================== -->
  {#if currentStep === 4}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">Sub-Etapa 4 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">📜 Proposta Comercial e Cronograma de Desembolso</h2>
        </div>
        <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
          Status: APPROVED
        </span>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
        <div class="font-bold text-gray-800 uppercase tracking-wider">Resumo Oficial da Proposta:</div>
        <ul class="space-y-1.5 text-gray-700 pl-0 list-none m-0">
          <li>• <strong>Contratante (Cliente):</strong> {clientUser.name} ({clientUser.email})</li>
          <li>• <strong>Obra / Canteiro:</strong> {activeProject.name} — {activeProject.address} ({activeProject.area_m2} m²)</li>
          <li>• <strong>Estrutura Homologada:</strong> {eapEpics.length} Épicos e {eapTasks.length} Tarefas auditáveis</li>
          <li>• <strong>Valor Fechado da EAP:</strong> <span class="text-indigo-700 font-black">R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</span></li>
        </ul>

        <div class="pt-3 border-t border-slate-200">
          <div class="font-bold text-gray-800 mb-2">Parcelas Geradas Automaticamente no Fluxo de Caixa:</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="bg-white p-3.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-emerald-700 font-bold uppercase">1. Sinal de Mobilização (40%)</span>
              <div class="text-base font-black text-gray-900 mt-1">R$ {p1Sinal.toLocaleString('pt-BR')},00</div>
              <div class="text-[10px] text-gray-500 mt-0.5">Quitado na assinatura digital</div>
            </div>
            <div class="bg-white p-3.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-indigo-700 font-bold uppercase">2. Medição Intermediária (35%)</span>
              <div class="text-base font-black text-gray-900 mt-1">R$ {p2Intermediaria.toLocaleString('pt-BR')},00</div>
              <div class="text-[10px] text-gray-500 mt-0.5">Exige fotos auditadas do Épico 2</div>
            </div>
            <div class="bg-white p-3.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-purple-700 font-bold uppercase">3. Vistoria Final (25%)</span>
              <div class="text-base font-black text-gray-900 mt-1">R$ {p3Final.toLocaleString('pt-BR')},00</div>
              <div class="text-[10px] text-gray-500 mt-0.5">Exige foto final de entrega</div>
            </div>
          </div>
        </div>

        <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
          <strong>⚖️ Cláusula Pétrea de Evidência:</strong> O sistema bloqueia tecnicamente a conclusão de qualquer tarefa civil ou conferência de carga sem foto anexada em <code>evidences.json</code>.
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button type="button" class="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer" on:click={() => currentStep = 3}>
          ← Editar EAP
        </button>
        <button 
          type="button"
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 px-6 rounded-xl shadow-md cursor-pointer"
          on:click={() => currentStep = 5}
        >
          Avançar para Assinatura Digital do Cliente →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 5: ACEITE DIGITAL E ATIVAÇÃO ==================== -->
  {#if currentStep === 5}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-blue-600">Sub-Etapa 5 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">✍️ Assinatura Digital e Ativação do Canteiro</h2>
        </div>
        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
          Pronto para Execução
        </span>
      </div>

      <div class="border border-gray-200 rounded-2xl p-5 space-y-4">
        <div class="flex flex-wrap justify-between items-center border-b border-gray-100 pb-3 gap-2">
          <div>
            <div class="font-bold text-sm text-gray-900 uppercase">CONTRATO DE EMPREITADA — {activeProject.name}</div>
            <div class="text-xs text-gray-500">Contratada: Construtora Alpha • Contratante: {clientUser.name}</div>
          </div>
          <div class="text-right">
            <span class="text-base font-black text-indigo-700">R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</span>
            <div class="text-[10px] text-gray-400">{activeProject.area_m2} m² • Gera HTML assinado em ./uploads/docs/</div>
          </div>
        </div>

        <div class="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl text-xs space-y-2">
          <div class="font-bold text-emerald-950 uppercase tracking-wider">Termo de Aceite e Compromisso de Transparência:</div>
          <label class="flex items-start gap-2.5 cursor-pointer text-gray-800">
            <input type="checkbox" bind:checked={contractAcceptedChecked} class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
            <span>
              Eu, <strong>{clientUser.name}</strong>, aprovo formalmente o orçamento técnico de <strong>R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</strong>, os insumos da EAP e o cronograma físico-financeiro vinculado a evidências fotográficas.
            </span>
          </label>
        </div>

        <div class="text-xs text-gray-600 flex flex-wrap justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono gap-2">
          <span>Gravação atômica: projects + epics + tasks + materials + financial_transactions</span>
          <span class="font-bold text-emerald-700">[ QUOTE ] ➔ [ 🚀 IN_PROGRESS ]</span>
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button type="button" class="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer" on:click={() => currentStep = 4}>
          ← Voltar à Proposta
        </button>
        <button 
          type="button"
          on:click={finalizeContractAndActivate}
          disabled={isSavingDisk}
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3.5 px-7 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>✅</span> {isSavingDisk ? 'Ativando Obra e Atualizando DuckDB...' : 'ASSINAR CONTRATO E ATIVAR OBRA NO DASHBOARD'}
        </button>
      </div>
    </div>
  {/if}
</div>
