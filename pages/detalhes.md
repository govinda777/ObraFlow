---
title: Detalhe da Obra, Canteiro Mobile & Estúdio IA - ObraFlow
hide_title: true
hide_sidebar: true
---

```sql lista_obras
SELECT id, name, status, address
FROM obraflow.projects
ORDER BY id
```

```sql eap_detalhe_obra
WITH mat_agg AS (
    SELECT
        task_id,
        FIRST(name) AS primeiro_material,
        SUM(quantity * unit_price) AS custo_insumos,
        SUM(freight_cost) AS custo_frete,
        SUM(CASE WHEN receiver_responsible = 'CONTRACTOR' THEN receiving_fee ELSE 0 END) AS custo_recebimento,
        SUM(CASE WHEN purchased = true THEN total_price ELSE 0 END) AS mat_realizado
    FROM obraflow.materials
    GROUP BY task_id
),
ai_agg AS (
    SELECT
        m.task_id,
        SUM(s.consulting_fee) AS custo_ia,
        SUM(CASE WHEN s.status IN ('READY', 'APPROVED_BY_CLIENT') THEN s.consulting_fee ELSE 0 END) AS ia_realizado
    FROM obraflow.ai_room_simulations s
    JOIN obraflow.materials m ON m.id = s.material_id
    GROUP BY m.task_id
),
evid_agg AS (
    SELECT
        task_id,
        COUNT(*) AS qtd_fotos,
        LAST(photo_url) AS foto_url,
        LAST(notes) AS nota_evidencia
    FROM obraflow.evidences
    GROUP BY task_id
)
SELECT
    t.id AS task_id,
    t.epic_id,
    e.project_id,
    e.title AS epico,
    e.order_index,
    e.status AS status_epico,
    t.title AS tarefa,
    t.description AS descricao,
    t.category AS categoria,
    t.kanban_status,
    COALESCE(c.name, 'Equipe de Campo') AS responsavel,
    STRFTIME(CAST(t.due_date AS DATE), '%d/%m/%Y') AS prazo_fmt,
    t.cost_labor AS custo_mao_de_obra,
    m.primeiro_material,
    (t.cost_labor + COALESCE(m.custo_insumos, 0) + COALESCE(m.custo_frete, 0) + COALESCE(m.custo_recebimento, 0) + COALESCE(a.custo_ia, 0)) AS c_tarefa_total,
    COALESCE(ev.qtd_fotos, 0) AS qtd_fotos,
    ev.foto_url,
    ev.nota_evidencia,
    CASE
        WHEN t.kanban_status = 'DONE' AND COALESCE(ev.qtd_fotos, 0) > 0
        THEN (t.cost_labor + COALESCE(m.custo_insumos, 0) + COALESCE(m.custo_frete, 0) + COALESCE(m.custo_recebimento, 0) + COALESCE(a.custo_ia, 0))
        ELSE 0
    END AS valor_fisico_executado,
    (
        CASE WHEN t.kanban_status = 'DONE' THEN t.cost_labor WHEN t.kanban_status IN ('IN_PROGRESS', 'REVIEW') THEN t.cost_labor * 0.5 ELSE 0 END
        + COALESCE(m.mat_realizado, 0)
        + COALESCE(a.ia_realizado, 0)
    ) AS valor_financeiro_realizado
FROM obraflow.tasks t
JOIN obraflow.epics e ON e.id = t.epic_id
LEFT JOIN obraflow.collaborators c ON c.id = t.assigned_collaborator_id
LEFT JOIN mat_agg m ON m.task_id = t.id
LEFT JOIN ai_agg a ON a.task_id = t.id
LEFT JOIN evid_agg ev ON ev.task_id = t.id
WHERE e.project_id = '${inputs.obra_filtro.value}'
ORDER BY e.order_index, t.due_date, t.id
```

```sql kpis_detalhe
SELECT
    COALESCE(SUM(c_tarefa_total), 0) AS orcamento_total_eap,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico_pct,
    COALESCE(SUM(valor_financeiro_realizado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_financeiro_pct,
    COALESCE(SUM(qtd_fotos), 0) AS fotos_auditadas_obra,
    COUNT(CASE WHEN categoria IN ('EXECUTION', 'INSPECTION') AND kanban_status != 'DONE' THEN 1 END) AS tarefas_campo_abertas,
    COUNT(CASE WHEN categoria = 'MATERIAL_RECEIVING' AND kanban_status != 'DONE' THEN 1 END) AS cargas_a_conferir
FROM ${eap_detalhe_obra}
```

```sql compras_obra_ativa
SELECT
    m.id AS material_id,
    m.name AS material,
    m.material_group AS grupo,
    m.quantity AS qtd,
    m.unit AS unid,
    STRFTIME(CAST(m.purchase_deadline AS DATE), '%d/%m/%Y') AS limite_fmt,
    STRFTIME(CAST(m.estimated_delivery AS DATE), '%d/%m/%Y') AS entrega_fmt,
    m.receiver_responsible AS recebedor,
    m.total_price AS custo_total,
    m.purchased AS comprado,
    m.delivery_status AS status_entrega,
    CASE
        WHEN m.delivery_status = 'DELIVERED_INSPECTED' THEN '✅ Recebido s/ Avarias'
        WHEN m.delivery_status = 'REJECTED' THEN '⚠️ Avaria / Ressalva'
        WHEN m.purchased = true THEN '🚚 Em Trânsito'
        ELSE '⏳ Aguardando Compra'
    END AS alerta
FROM obraflow.materials m
JOIN obraflow.tasks t ON t.id = m.task_id
JOIN obraflow.epics e ON e.id = t.epic_id
WHERE e.project_id = '${inputs.obra_filtro.value}'
ORDER BY m.purchase_deadline ASC
```

```sql materiais_decor_obra
SELECT *
FROM ${compras_obra_ativa}
WHERE grupo IN ('FINISHINGS', 'LIGHTING', 'DRYWALL')
```

```sql simulacoes_estudio
SELECT
    s.id AS sim_id,
    s.project_id,
    s.room_name AS comodo,
    COALESCE(m.name, 'Acabamento Decorativo') AS material_aplicado,
    s.target_element AS elemento,
    s.consulting_fee AS taxa_consultoria_ia,
    s.status AS status_simulacao,
    s.original_photo_url,
    s.generated_photo_url
FROM obraflow.ai_room_simulations s
LEFT JOIN obraflow.materials m ON m.id = s.material_id
WHERE s.project_id = '${inputs.obra_filtro.value}'
ORDER BY s.created_at DESC
```

```sql kpis_designer
SELECT
    COUNT(*) AS total_simulacoes,
    COUNT(CASE WHEN s.status = 'APPROVED_BY_CLIENT' THEN 1 END) AS total_aprovadas,
    COALESCE(SUM(s.consulting_fee), 0) AS receita_ia_total,
    (
        SELECT COUNT(*)
        FROM obraflow.materials m
        JOIN obraflow.tasks t ON t.id = m.task_id
        JOIN obraflow.epics e ON e.id = t.epic_id
        WHERE e.project_id = '${inputs.obra_filtro.value}'
          AND m.material_group IN ('FINISHINGS', 'LIGHTING', 'DRYWALL')
          AND m.delivery_status != 'DELIVERED_INSPECTED'
    ) AS itens_decor_ativos
FROM obraflow.ai_room_simulations s
WHERE s.project_id = '${inputs.obra_filtro.value}'
```

<script>
    let activeModule = 'KANBAN'; // 'KANBAN' | 'MESTRE' | 'DESIGNER'
    let kanbanCategoryFilter = 'ALL';

    let actionFeedback = '';
    let actionError = '';
    let busyTaskId = '';

    // Modal de Evidência Fotográfica Obrigatória (Cláusula Pétrea)
    let evidenceModalTask = null;
    let evidencePhotoUrl = '';
    let evidencePhotoName = '';
    let evidenceNotes = '';
    let evidenceHasIssue = false;
    let isUploadingEvidence = false;
    let isSubmittingEvidence = false;

    // Formulário Nova Simulação no Estúdio IA
    let showSimForm = false;
    let simRoomName = 'Living Integrado';
    let simMaterialId = '';
    let simTargetElement = 'FINISHINGS';
    let simConsultingFee = 350;
    let simOriginalPhotoUrl = '';
    let simOriginalPhotoName = '';
    let isCreatingSim = false;

    onMount(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            const matParam = params.get('mat');
            const savedRole = localStorage.getItem('obraflow_active_role');

            if (tabParam === 'MESTRE' || tabParam === 'DESIGNER' || tabParam === 'KANBAN') {
                activeModule = tabParam;
            } else if (savedRole === 'FOREMAN') {
                activeModule = 'MESTRE';
            } else if (savedRole === 'DESIGNER') {
                activeModule = 'DESIGNER';
            }

            if (matParam) {
                simMaterialId = matParam;
                showSimForm = true;
            }
        }
    });

    $: filteredKanbanTasks =
        kanbanCategoryFilter === 'ALL'
            ? eap_detalhe_obra
            : eap_detalhe_obra.filter((t) => t.categoria === kanbanCategoryFilter);

    $: todoTasks = filteredKanbanTasks.filter((t) => t.kanban_status === 'TODO');
    $: inProgressTasks = filteredKanbanTasks.filter((t) => t.kanban_status === 'IN_PROGRESS');
    $: reviewTasks = filteredKanbanTasks.filter((t) => t.kanban_status === 'REVIEW');
    $: doneTasks = filteredKanbanTasks.filter((t) => t.kanban_status === 'DONE');

    $: foremanExecTasks = eap_detalhe_obra.filter(
        (t) => (t.categoria === 'EXECUTION' || t.categoria === 'INSPECTION') && t.kanban_status !== 'DONE'
    );
    $: foremanReceivingTasks = eap_detalhe_obra.filter(
        (t) => t.categoria === 'MATERIAL_RECEIVING' && t.kanban_status !== 'DONE'
    );

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    async function moveTaskStatus(taskId, newStatus) {
        busyTaskId = taskId;
        actionError = '';
        try {
            const res = await fetch('http://localhost:3001/api/tasks/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, newStatus })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao atualizar status da tarefa.');
            }
            actionFeedback = `📋 Tarefa movida para ${newStatus} com sucesso!`;
            setTimeout(() => window.location.reload(), 350);
        } catch (err) {
            actionError = err.message;
        } finally {
            busyTaskId = '';
        }
    }

    function openEvidenceModal(taskObj) {
        evidenceModalTask = taskObj;
        evidencePhotoUrl = '';
        evidencePhotoName = '';
        evidenceNotes = '';
        evidenceHasIssue = false;
        actionError = '';
    }

    async function handleEvidenceFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        isUploadingEvidence = true;
        actionError = '';
        try {
            const base64Data = await fileToBase64(file);
            const res = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    mimeType: file.type || 'image/jpeg',
                    folder: 'evidences',
                    base64Data
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao salvar foto em disco.');
            evidencePhotoUrl = data.url;
            evidencePhotoName = data.filename;
        } catch (err) {
            actionError = `Falha ao salvar foto: ${err.message}`;
        } finally {
            isUploadingEvidence = false;
        }
    }

    async function generateInstantFieldPhoto() {
        if (!evidenceModalTask) return;
        isUploadingEvidence = true;
        actionError = '';
        try {
            const nowStr = new Date().toLocaleString('pt-BR');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
              <rect width="800" height="520" fill="#0f172a"/>
              <rect x="30" y="30" width="740" height="360" rx="18" fill="#1e293b" stroke="#334155" stroke-width="3"/>
              <circle cx="400" cy="185" r="56" fill="#10b981" opacity="0.2"/>
              <text x="400" y="198" text-anchor="middle" fill="#34d399" font-family="system-ui,sans-serif" font-size="42">📸</text>
              <text x="400" y="275" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="20" font-weight="800">EVIDÊNCIA DE CAMPO AUDITADA</text>
              <text x="400" y="310" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="15">${String(evidenceModalTask.tarefa || '').replace(/[<>&"]/g, '')}</text>
              <text x="50" y="445" fill="#34d399" font-family="monospace" font-size="14" font-weight="700">✓ OBRAFLOW • REGISTRO LOCAL EM ./uploads/evidences/</text>
              <text x="50" y="475" fill="#cbd5e1" font-family="monospace" font-size="13">Data/Hora: ${nowStr} • Resp: ${String(evidenceModalTask.responsavel || 'Mestre José').replace(/[<>&"]/g, '')}</text>
            </svg>`;
            const base64Data = btoa(unescape(encodeURIComponent(svg)));
            const res = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: `vistoria_${evidenceModalTask.task_id}.svg`,
                    mimeType: 'image/svg+xml',
                    folder: 'evidences',
                    base64Data
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao gerar foto de campo.');
            evidencePhotoUrl = data.url;
            evidencePhotoName = data.filename;
        } catch (err) {
            actionError = err.message;
        } finally {
            isUploadingEvidence = false;
        }
    }

    async function submitEvidenceCompletion() {
        if (!evidenceModalTask || !evidencePhotoUrl) {
            actionError = 'Cláusula Pétrea: Anexe uma foto do seu computador ou gere um registro fotográfico antes de confirmar.';
            return;
        }
        isSubmittingEvidence = true;
        actionError = '';
        try {
            const res = await fetch('http://localhost:3001/api/tasks/complete-with-evidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: evidenceModalTask.task_id,
                    uploadedBy: 'collab_1',
                    photoUrl: evidencePhotoUrl,
                    notes: evidenceNotes,
                    hasIssue: evidenceHasIssue
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao concluir tarefa com foto.');
            evidenceModalTask = null;
            actionFeedback = evidenceHasIssue
                ? '⚠️ Ressalva/avaria registrada com foto! Tarefa mantida em conferência.'
                : '✅ Foto auditada salva em ./uploads/evidences/! Tarefa concluída e % Físico atualizado.';
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            actionError = err.message;
        } finally {
            isSubmittingEvidence = false;
        }
    }

    async function handleSimPhotoUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const base64Data = await fileToBase64(file);
            const res = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    mimeType: file.type || 'image/jpeg',
                    folder: 'simulations',
                    base64Data
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                simOriginalPhotoUrl = data.url;
                simOriginalPhotoName = data.filename;
            }
        } catch (err) {
            actionError = `Falha no upload da foto do cômodo: ${err.message}`;
        }
    }

    async function handleCreateSimulation() {
        isCreatingSim = true;
        actionError = '';
        try {
            const activeProjId =
                (typeof inputs !== 'undefined' && inputs.obra_filtro?.value) || 'proj_1';
            const chosenMatId =
                simMaterialId || (materiais_decor_obra[0]?.material_id ?? 'mat_5');
            const res = await fetch('http://localhost:3001/api/simulations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: activeProjId,
                    materialId: chosenMatId,
                    roomName: simRoomName,
                    targetElement: simTargetElement,
                    originalPhotoUrl: simOriginalPhotoUrl || undefined,
                    consultingFee: Number(simConsultingFee) || 350
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao criar simulação.');
            showSimForm = false;
            actionFeedback = '✨ Nova simulação Antes x Depois gerada localmente em ./uploads/simulations/!';
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            actionError = err.message;
        } finally {
            isCreatingSim = false;
        }
    }

    async function handleApproveSim(simId) {
        busyTaskId = simId;
        try {
            const res = await fetch('http://localhost:3001/api/simulations/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ simulationId: simId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao aprovar.');
            actionFeedback = '✅ Simulação aprovada pelo cliente e receita lançada no caixa!';
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            actionError = err.message;
        } finally {
            busyTaskId = '';
        }
    }
</script>

<!-- TOPBAR PERSISTENTE DA ÁREA LOGADA -->
<div class="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 mb-6 shadow-xl border border-slate-800">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-6">
            <a href="/" class="flex items-center gap-2 no-underline text-white">
                <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/40">⚡</span>
                <span class="font-black text-sm tracking-tight">OBRAFLOW</span>
            </a>

            <div class="hidden md:flex items-center gap-2 text-xs">
                <a href="/dashboard/" class="text-slate-300 hover:text-white font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                    📊 Visão Global
                </a>
                <a href="/detalhes/" class="bg-indigo-600/30 text-indigo-300 font-bold px-3 py-1.5 rounded-xl border border-indigo-500/30 no-underline">
                    🏗️ Kanban & Canteiro
                </a>
                <a href="/processamento/" class="text-slate-300 hover:text-white font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                    📐 Esteira EAP
                </a>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-400 font-semibold">Canteiro Ativo:</span>
                <Dropdown
                    data={lista_obras}
                    name="obra_filtro"
                    value="id"
                    label="name"
                    defaultValue="proj_1"
                />
            </div>

            <a href="/onboarding/" class="text-xs text-slate-400 hover:text-white font-semibold no-underline">
                5 Perfis ⚙️
            </a>
        </div>
    </div>
</div>

<!-- BARRA DE SELEÇÃO DE MÓDULO INTERNO -->
<div class="bg-white border border-gray-200 rounded-3xl p-3 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-2">
        <button 
            type="button"
            class="px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-all {activeModule === 'KANBAN' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeModule = 'KANBAN'}
        >
            📋 Kanban Polimórfico
        </button>
        <button 
            type="button"
            class="px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-all {activeModule === 'MESTRE' ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeModule = 'MESTRE'}
        >
            🏗️ Canteiro Mobile (Mestre)
        </button>
        <button 
            type="button"
            class="px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-all {activeModule === 'DESIGNER' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeModule = 'DESIGNER'}
        >
            🎨 Estúdio IA (Designer)
        </button>
    </div>

    <div class="text-xs text-gray-500 font-semibold pr-2">
        Cláusula Pétrea Ativa: Conclusão exige foto em <code>./uploads/evidences/</code>
    </div>
</div>

{#if actionFeedback}
    <div class="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl p-3.5">
        {actionFeedback}
    </div>
{/if}
{#if actionError}
    <div class="mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-3.5">
        ⚠️ {actionError}
    </div>
{/if}

<!-- MODAL DE COMPROVAÇÃO FOTOGRÁFICA OBRIGATÓRIA -->
{#if evidenceModalTask}
    <div class="mb-8 bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-500/60 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
                <span class="text-[11px] uppercase tracking-wider font-bold text-emerald-400">📸 Validação Obrigatória de Campo (Cláusula Pétrea)</span>
                <h3 class="text-lg font-black text-white m-0">{evidenceModalTask.tarefa}</h3>
                <div class="text-xs text-slate-400">Categoria: {evidenceModalTask.categoria} • Responsável: {evidenceModalTask.responsavel}</div>
            </div>
            <button type="button" on:click={() => evidenceModalTask = null} class="text-slate-400 hover:text-white text-sm font-bold cursor-pointer">✕ Fechar</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="space-y-3">
                <label class="border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-slate-800/70 rounded-2xl p-4 block text-center cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" class="hidden" on:change={handleEvidenceFileSelect} />
                    <div class="text-2xl mb-1">📷</div>
                    <div class="font-bold text-emerald-300">
                        {isUploadingEvidence ? 'Gravando imagem em ./uploads/evidences/...' : 'Selecionar Foto do Computador / Câmera'}
                    </div>
                    <div class="text-[11px] text-slate-400 mt-1">JPG, PNG, WEBP ou SVG salvos no servidor local (:3001)</div>
                </label>

                <button
                    type="button"
                    disabled={isUploadingEvidence}
                    on:click={generateInstantFieldPhoto}
                    class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer"
                >
                    ⚡ Ou Gerar Carimbo Fotográfico de Teste Local (1 Clique)
                </button>

                {#if evidencePhotoUrl}
                    <div class="bg-emerald-950/60 border border-emerald-700 rounded-xl p-3 flex items-center justify-between">
                        <span class="text-emerald-300 font-mono truncate">✔️ {evidencePhotoName}</span>
                        <a href={evidencePhotoUrl} target="_blank" rel="noreferrer" class="text-emerald-400 underline font-bold ml-2">Ver ↗</a>
                    </div>
                {/if}
            </div>

            <div class="space-y-3">
                <div>
                    <label for="ev-notes" class="block font-bold text-slate-300 mb-1">Observações Técnicas de Campo / Medição:</label>
                    <textarea
                        id="ev-notes"
                        rows="3"
                        bind:value={evidenceNotes}
                        placeholder="Ex: Serviço executado no prumo, estanqueidade testada e conferida."
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none"
                    ></textarea>
                </div>

                {#if evidenceModalTask.categoria === 'MATERIAL_RECEIVING'}
                    <label class="flex items-center gap-2 bg-amber-950/50 border border-amber-700/60 p-3 rounded-xl cursor-pointer text-amber-200">
                        <input type="checkbox" bind:checked={evidenceHasIssue} />
                        <span><strong>⚠️ Registrar Avaria / Ressalva na Carga</strong> (mantém em conferência e marca lote p/ troca)</span>
                    </label>
                {/if}

                <button
                    type="button"
                    disabled={isSubmittingEvidence}
                    on:click={submitEvidenceCompletion}
                    class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-5 rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
                >
                    {isSubmittingEvidence ? 'Auditando e Atualizando DuckDB...' : '✅ Confirmar Evidência e Atualizar Obra'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- ======================================================== -->
<!-- 1. ABA KANBAN POLIMÓRFICO INTERATIVO                      -->
<!-- ======================================================== -->
{#if activeModule === 'KANBAN'}
    <div class="space-y-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigValue data={kpis_detalhe} value="orcamento_total_eap" title="Orçamento da Obra" fmt="brl" />
            <BigValue data={kpis_detalhe} value="avanco_fisico_pct" title="Avanço Físico (c/ Foto)" fmt="pct1" />
            <BigValue data={kpis_detalhe} value="avanco_financeiro_pct" title="Avanço Financeiro" fmt="pct1" />
            <BigValue data={kpis_detalhe} value="fotos_auditadas_obra" title="Fotos Auditadas na Obra" />
        </div>

        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-6">
            <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 gap-3">
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                        📋 Quadro Kanban Polimórfico (Filtros por Categoria & Transição Real)
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5">Filtre por disciplina e avance os cartões até a comprovação com foto.</p>
                </div>

                <div class="flex flex-wrap gap-1.5 text-xs">
                    <button type="button" on:click={() => kanbanCategoryFilter = 'ALL'} class="px-3 py-1.5 rounded-xl font-bold cursor-pointer {kanbanCategoryFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600'}">
                        Todas ({eap_detalhe_obra.length})
                    </button>
                    <button type="button" on:click={() => kanbanCategoryFilter = 'EXECUTION'} class="px-3 py-1.5 rounded-xl font-bold cursor-pointer {kanbanCategoryFilter === 'EXECUTION' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}">
                        🧱 Execução
                    </button>
                    <button type="button" on:click={() => kanbanCategoryFilter = 'MATERIAL_RECEIVING'} class="px-3 py-1.5 rounded-xl font-bold cursor-pointer {kanbanCategoryFilter === 'MATERIAL_RECEIVING' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}">
                        📦 Recebimento
                    </button>
                    <button type="button" on:click={() => kanbanCategoryFilter = 'MATERIAL_PURCHASE'} class="px-3 py-1.5 rounded-xl font-bold cursor-pointer {kanbanCategoryFilter === 'MATERIAL_PURCHASE' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}">
                        🛒 Compras
                    </button>
                    <button type="button" on:click={() => kanbanCategoryFilter = 'INSPECTION'} class="px-3 py-1.5 rounded-xl font-bold cursor-pointer {kanbanCategoryFilter === 'INSPECTION' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}">
                        🔍 Vistoria
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <!-- COLUNA 1: TODO -->
                <div class="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-gray-200">
                        <span class="text-xs font-bold text-gray-700 uppercase">📋 A Fazer</span>
                        <span class="text-[10px] bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full">{todoTasks.length}</span>
                    </div>
                    <div class="space-y-2.5">
                        {#each todoTasks as item}
                            <div class="bg-white p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
                                <div class="font-bold text-gray-900">{item.tarefa}</div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>{item.responsavel}</span>
                                    <span class="font-mono">📅 {item.prazo_fmt}</span>
                                </div>
                                <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                                    <span class="bg-gray-100 px-2 py-0.5 rounded font-bold">{item.categoria}</span>
                                    <span class="font-bold text-indigo-700">R$ {Number(item.c_tarefa_total || 0).toLocaleString('pt-BR')}</span>
                                </div>
                                <button
                                    type="button"
                                    disabled={busyTaskId === item.task_id}
                                    on:click={() => moveTaskStatus(item.task_id, 'IN_PROGRESS')}
                                    class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 rounded-lg text-[11px] cursor-pointer"
                                >
                                    ▶ Iniciar Tarefa
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- COLUNA 2: IN_PROGRESS -->
                <div class="bg-blue-50/40 rounded-2xl p-4 border border-blue-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-blue-200">
                        <span class="text-xs font-bold text-blue-800 uppercase">🚧 Em Execução</span>
                        <span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
                    </div>
                    <div class="space-y-2.5">
                        {#each inProgressTasks as item}
                            <div class="bg-white p-3 rounded-xl border border-blue-200 space-y-2 text-xs">
                                <div class="font-bold text-gray-900">{item.tarefa}</div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>{item.responsavel}</span>
                                    <span class="font-mono text-blue-600 font-bold">📅 {item.prazo_fmt}</span>
                                </div>
                                <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                                    <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">{item.categoria}</span>
                                    <span class="font-bold text-indigo-700">R$ {Number(item.c_tarefa_total || 0).toLocaleString('pt-BR')}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-1.5">
                                    <button
                                        type="button"
                                        on:click={() => moveTaskStatus(item.task_id, 'REVIEW')}
                                        class="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-1.5 rounded-lg text-[10px] cursor-pointer"
                                    >
                                        🔍 Conferência
                                    </button>
                                    <button
                                        type="button"
                                        on:click={() => openEvidenceModal(item)}
                                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[10px] cursor-pointer"
                                    >
                                        📷 Foto & OK
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- COLUNA 3: REVIEW -->
                <div class="bg-amber-50/40 rounded-2xl p-4 border border-amber-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-amber-200">
                        <span class="text-xs font-bold text-amber-800 uppercase">🔍 Conferência</span>
                        <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">{reviewTasks.length}</span>
                    </div>
                    <div class="space-y-2.5">
                        {#each reviewTasks as item}
                            <div class="bg-white p-3 rounded-xl border border-amber-200 space-y-2 text-xs">
                                <div class="font-bold text-gray-900">{item.tarefa}</div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>{item.responsavel}</span>
                                    <span class="font-mono">📅 {item.prazo_fmt}</span>
                                </div>
                                {#if item.nota_evidencia}
                                    <div class="text-[10px] bg-amber-50 text-amber-900 p-1.5 rounded border border-amber-200">{item.nota_evidencia}</div>
                                {/if}
                                <button
                                    type="button"
                                    on:click={() => openEvidenceModal(item)}
                                    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[11px] cursor-pointer"
                                >
                                    📷 Anexar Evidência & Concluir
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- COLUNA 4: DONE COM FOTO -->
                <div class="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-emerald-200">
                        <span class="text-xs font-bold text-emerald-800 uppercase">✅ Concluído c/ Foto</span>
                        <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">{doneTasks.length}</span>
                    </div>
                    <div class="space-y-2.5">
                        {#each doneTasks as item}
                            <div class="bg-white p-3 rounded-xl border border-emerald-200 space-y-2 text-xs">
                                <div class="font-bold text-gray-900 flex items-center justify-between gap-1">
                                    <span>{item.tarefa}</span>
                                    <span class="text-emerald-600 font-bold">✓</span>
                                </div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>{item.responsavel}</span>
                                    <span class="font-bold text-emerald-800">R$ {Number(item.c_tarefa_total || 0).toLocaleString('pt-BR')}</span>
                                </div>
                                {#if item.foto_url}
                                    <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                                        <span class="text-emerald-700 font-bold">📷 {item.qtd_fotos} foto(s)</span>
                                        <a href={item.foto_url} target="_blank" rel="noreferrer" class="text-blue-600 underline font-bold">Abrir Foto ↗</a>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- ======================================================== -->
<!-- 2. ABA CANTEIRO MOBILE: MESTRE DE OBRAS (100% DINÂMICO)   -->
<!-- ======================================================== -->
{#if activeModule === 'MESTRE'}
    <div class="max-w-lg mx-auto space-y-6 pb-8">
        <div class="bg-white border-2 border-amber-300 rounded-3xl p-6 shadow-xl space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-amber-600">🏗️ ObraFlow Campo • Mobile Touch</span>
                    <h2 class="text-base font-black text-gray-900 m-0">👷 Painel Operacional do Mestre</h2>
                </div>
                <span class="text-[11px] font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
                    Obra: {inputs.obra_filtro.label || inputs.obra_filtro.value}
                </span>
            </div>

            <!-- 3 INDICADORES SQL DE CAMPO -->
            <div class="grid grid-cols-3 gap-2.5 text-center">
                <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div class="text-xl font-black text-gray-900"><Value data={kpis_detalhe} column="tarefas_campo_abertas" /></div>
                    <div class="text-[10px] text-gray-500 font-bold mt-0.5">Execuções Abertas</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div class="text-xl font-black text-amber-600"><Value data={kpis_detalhe} column="cargas_a_conferir" /></div>
                    <div class="text-[10px] text-gray-500 font-bold mt-0.5">Cargas a Conferir</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div class="text-xl font-black text-emerald-600"><Value data={kpis_detalhe} column="fotos_auditadas_obra" /></div>
                    <div class="text-[10px] text-gray-500 font-bold mt-0.5">Fotos OK</div>
                </div>
            </div>

            <hr class="border-gray-100 m-0" />

            <!-- FILA DE EXECUÇÃO CIVIL E VISTORIA -->
            <div class="space-y-3">
                <div class="text-xs font-bold uppercase tracking-wider text-gray-800">
                    🧱 Tarefas de Execução & Vistoria em Aberto ({foremanExecTasks.length})
                </div>

                {#if foremanExecTasks.length === 0}
                    <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-semibold text-center">
                        🎉 Todas as tarefas de execução deste canteiro já foram comprovadas com foto!
                    </div>
                {:else}
                    {#each foremanExecTasks as t}
                        <div class="border border-blue-200 bg-blue-50/30 p-4 rounded-2xl space-y-2.5 text-xs">
                            <div class="flex justify-between items-start gap-2">
                                <span class="font-bold text-gray-900">🔹 {t.tarefa}</span>
                                <span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded whitespace-nowrap">{t.prazo_fmt}</span>
                            </div>
                            <div class="text-[11px] text-gray-600">
                                Épico: {t.epico} • Equipe: <strong>{t.responsavel}</strong>
                            </div>
                            <button 
                                type="button"
                                class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                                on:click={() => openEvidenceModal(t)}
                            >
                                <span>📷</span> Enviar Foto de Evidência e Concluir
                            </button>
                        </div>
                    {/each}
                {/if}
            </div>

            <hr class="border-gray-100 m-0" />

            <!-- LOGÍSTICA & RECEBIMENTO NO CANTEIRO -->
            <div class="space-y-3">
                <div class="text-xs font-bold uppercase tracking-wider text-gray-800">
                    📦 Conferência de Descarga & Materiais ({foremanReceivingTasks.length})
                </div>

                {#if foremanReceivingTasks.length === 0}
                    <div class="bg-gray-50 border border-gray-200 text-gray-500 rounded-2xl p-4 text-xs text-center">
                        Nenhuma conferência de recebimento pendente para este canteiro.
                    </div>
                {:else}
                    {#each foremanReceivingTasks as r}
                        <div class="border border-amber-200 bg-amber-50/30 p-4 rounded-2xl space-y-3 text-xs">
                            <div class="flex justify-between items-start gap-2">
                                <span class="font-bold text-gray-900">🚚 {r.tarefa}</span>
                                <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">{r.prazo_fmt}</span>
                            </div>
                            {#if r.primeiro_material}
                                <div class="text-[11px] text-amber-950 bg-white p-2 rounded-lg border border-amber-100">
                                    Insumo vinculado: <strong>{r.primeiro_material}</strong>
                                </div>
                            {/if}
                            <button 
                                type="button"
                                class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
                                on:click={() => openEvidenceModal(r)}
                            >
                                📸 Fotografar Nota + Carga (ou Registrar Ressalva)
                            </button>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
{/if}

<!-- ======================================================== -->
<!-- 3. ABA ESTÚDIO DE AMBIENTES IA: DESIGNER (100% DINÂMICO)  -->
<!-- ======================================================== -->
{#if activeModule === 'DESIGNER'}
    <div class="max-w-5xl mx-auto space-y-8 pb-8">
        <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
                <span class="text-xs uppercase font-bold tracking-wider text-purple-600">Estúdio de Ambientação & Acabamentos</span>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 m-0">Prototipagem Antes x Depois com IA</h1>
                <p class="text-xs text-gray-500 mt-1">Gere simulações locais sobre os materiais decorativos desta obra e libere aprovações do cliente.</p>
            </div>
            <button
                type="button"
                on:click={() => showSimForm = !showSimForm}
                class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-3 px-5 rounded-2xl shadow-lg cursor-pointer"
            >
                {showSimForm ? '✕ Fechar Formulário' : '✨ + Nova Simulação no Cômodo'}
            </button>
        </div>

        <!-- 4 BIGVALUES SQL DA DESIGNER -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigValue data={kpis_designer} value="total_aprovadas" title="Simulações Aprovadas" />
            <BigValue data={kpis_designer} value="receita_ia_total" title="Receita Consultoria IA" fmt="brl" />
            <BigValue data={kpis_designer} value="itens_decor_ativos" title="Insumos Décor Ativos" />
            <BigValue data={kpis_designer} value="total_simulacoes" title="Total de Renders" />
        </div>

        <!-- FORMULÁRIO DE NOVA SIMULAÇÃO LOCAL -->
        {#if showSimForm}
            <div class="bg-purple-50/50 border-2 border-purple-200 rounded-3xl p-6 space-y-4 text-xs">
                <div class="font-black text-sm text-purple-950">✨ Gerar Nova Simulação Visual no Cômodo (Salva em ./uploads/simulations/)</div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label class="block font-bold text-gray-700 mb-1">Nome do Cômodo:</label>
                        <input type="text" bind:value={simRoomName} class="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white" />
                    </div>
                    <div>
                        <label class="block font-bold text-gray-700 mb-1">Material da Obra:</label>
                        <select bind:value={simMaterialId} class="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white">
                            {#each materiais_decor_obra as m}
                                <option value={m.material_id}>{m.material}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-gray-700 mb-1">Elemento Aplicado:</label>
                        <select bind:value={simTargetElement} class="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white">
                            <option value="FLOOR_TILE">FLOOR_TILE (Piso)</option>
                            <option value="COUNTERTOP_SINK">COUNTERTOP_SINK (Bancada)</option>
                            <option value="LIGHTING">LIGHTING (Iluminação)</option>
                            <option value="DRYWALL_CEILING">DRYWALL_CEILING (Forro)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-gray-700 mb-1">Taxa Consultoria (R$):</label>
                        <input type="number" step="50" bind:value={simConsultingFee} class="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white font-mono" />
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label class="bg-white border border-purple-300 hover:border-purple-500 text-purple-800 font-bold px-4 py-2 rounded-xl cursor-pointer">
                        <input type="file" accept="image/*" class="hidden" on:change={handleSimPhotoUpload} />
                        📷 {simOriginalPhotoName ? `Foto Base: ${simOriginalPhotoName}` : 'Opcional: Subir Foto Atual do Cômodo em Obra'}
                    </label>

                    <button
                        type="button"
                        disabled={isCreatingSim}
                        on:click={handleCreateSimulation}
                        class="bg-purple-600 hover:bg-purple-700 text-white font-black py-2.5 px-6 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                    >
                        {isCreatingSim ? 'Renderizando Localmente...' : '🚀 Gerar Antes x Depois e Salvar'}
                    </button>
                </div>
            </div>
        {/if}

        <!-- GALERIA COMPARATIVA ANTES x DEPOIS -->
        {#if simulacoes_estudio.length === 0}
            <div class="bg-white rounded-3xl p-8 border border-dashed border-purple-200 text-center text-xs text-gray-500">
                Nenhuma simulação criada para esta obra ainda. Clique em <strong>✨ + Nova Simulação no Cômodo</strong> acima para gerar a primeira!
            </div>
        {:else}
            {#each simulacoes_estudio as sim}
                <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-5">
                    <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                        <div>
                            <h3 class="text-sm font-black text-purple-950 m-0">
                                ✨ {sim.comodo} — {sim.material_aplicado}
                            </h3>
                            <p class="text-xs text-gray-500 mt-0.5">Elemento: {sim.elemento} • Consultoria IA: R$ {Number(sim.taxa_consultoria_ia || 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            {#if sim.status_simulacao === 'APPROVED_BY_CLIENT'}
                                <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                                    ✅ Aprovado pelo Cliente
                                </span>
                            {:else}
                                <button
                                    type="button"
                                    disabled={busyTaskId === sim.sim_id}
                                    on:click={() => handleApproveSim(sim.sim_id)}
                                    class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer"
                                >
                                    ✅ Homologar c/ Cliente
                                </button>
                            {/if}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                            <img src={sim.original_photo_url} alt="Antes - Canteiro" class="w-full h-56 object-cover bg-slate-200" />
                            <div class="p-3 flex justify-between items-center text-xs">
                                <span class="font-bold text-gray-700">📷 ANTES (Obra / Osso)</span>
                                <a href={sim.original_photo_url} target="_blank" rel="noreferrer" class="text-blue-600 font-bold underline">Ampliar ↗</a>
                            </div>
                        </div>

                        <div class="border border-purple-200 rounded-2xl overflow-hidden bg-purple-50/30">
                            <img src={sim.generated_photo_url} alt="Depois - Simulação IA" class="w-full h-56 object-cover bg-slate-900" />
                            <div class="p-3 flex justify-between items-center text-xs">
                                <span class="font-bold text-purple-900">🎨 DEPOIS (Material Aplicado)</span>
                                <a href={sim.generated_photo_url} target="_blank" rel="noreferrer" class="text-purple-700 font-bold underline">Ampliar Render ↗</a>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}

        <!-- FORNECEDORES DECORATIVOS & ILUMINAÇÃO (100% SQL) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                🛋️ Cronograma Real de Acabamentos, Drywall & Iluminação Desta Obra
            </h3>
            <DataTable data={materiais_decor_obra} rows=8>
                <Column id="alerta" title="Status Logístico" />
                <Column id="material" title="Especificação" />
                <Column id="grupo" title="Disciplina" />
                <Column id="limite_fmt" title="Limite Compra" />
                <Column id="entrega_fmt" title="Entrega Prevista" />
                <Column id="custo_total" title="Valor" fmt="brl" />
            </DataTable>
        </div>
    </div>
{/if}
