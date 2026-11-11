---
title: ObraFlow — Dashboard Global Multi-Obra
hide_title: true
hide_sidebar: true
---

```sql lista_obras
SELECT id, name, status, address, contract_pdf_url
FROM obraflow.projects
ORDER BY id
```

```sql eap_todas_obras
WITH mat_agg AS (
    SELECT
        task_id,
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
        FIRST(photo_url) AS foto_url,
        FIRST(notes) AS nota_evidencia
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
    t.category AS categoria,
    t.kanban_status,
    COALESCE(c.name, 'Equipe de Campo') AS responsavel,
    STRFTIME(CAST(t.due_date AS DATE), '%d/%m/%Y') AS prazo_fmt,
    t.cost_labor AS custo_mao_de_obra,
    (t.cost_labor + COALESCE(m.custo_insumos, 0) + COALESCE(m.custo_frete, 0) + COALESCE(m.custo_recebimento, 0) + COALESCE(a.custo_ia, 0)) AS c_tarefa_total,
    COALESCE(ev.qtd_fotos, 0) AS qtd_fotos,
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
```

```sql kpis_portfolio_cliente
SELECT
    COALESCE(SUM(c_tarefa_total), 0) AS total_investido_brl,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico_medio,
    (SELECT COUNT(*) FROM obraflow.evidences) AS total_fotos_auditadas,
    (SELECT COUNT(*) FROM obraflow.projects) AS total_obras_cadastradas
FROM ${eap_todas_obras}
```

```sql pipeline_obras_cliente
WITH ep_labels AS (
    SELECT
        project_id,
        order_index,
        title || ': ' || CASE
            WHEN status = 'COMPLETED' THEN '✅ Concluída'
            WHEN status = 'IN_PROGRESS' THEN '🚧 Em Andamento'
            ELSE '🔒 Aguardando'
        END AS ep_txt
    FROM obraflow.epics
),
ep_resumo AS (
    SELECT
        project_id,
        STRING_AGG(ep_txt, '   •   ' ORDER BY order_index) AS etapas_resumo
    FROM ep_labels
    GROUP BY project_id
),
agg_obra AS (
    SELECT
        project_id,
        SUM(c_tarefa_total) AS valor_eap,
        COALESCE(ROUND(100.0 * SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0)), 0) AS pct_fisico
    FROM ${eap_todas_obras}
    GROUP BY project_id
)
SELECT
    p.id,
    p.name,
    p.address,
    p.status,
    p.contract_pdf_url,
    COALESCE(a.valor_eap, p.budget_estimated, 0) AS valor_obra,
    COALESCE(a.pct_fisico, 0) AS pct_concluido,
    COALESCE(er.etapas_resumo, 'EAP em estruturação técnica') AS etapas_resumo
FROM obraflow.projects p
LEFT JOIN agg_obra a ON a.project_id = p.id
LEFT JOIN ep_resumo er ON er.project_id = p.id
ORDER BY p.id
```

```sql eap_tarefas_obra
SELECT *
FROM ${eap_todas_obras}
WHERE project_id = '${inputs.obra_filtro.value}'
ORDER BY order_index, task_id
```

```sql kpis_obra
SELECT
    COALESCE(SUM(c_tarefa_total), 0) AS orcamento_total_eap,
    COALESCE(SUM(valor_fisico_executado), 0) AS total_fisico_brl,
    COALESCE(SUM(valor_financeiro_realizado), 0) AS total_financeiro_brl,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico_pct,
    COALESCE(SUM(valor_financeiro_realizado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_financeiro_pct,
    COALESCE((SUM(valor_financeiro_realizado) - SUM(valor_fisico_executado)) / NULLIF(SUM(c_tarefa_total), 0), 0) AS desvio_pct
FROM ${eap_tarefas_obra}
```

```sql caixa_obra
SELECT
    COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END), 0) AS receita_recebida,
    COALESCE(SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END), 0) AS despesas_pagas,
    COALESCE(SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END), 0) AS margem_caixa
FROM obraflow.financial_transactions
WHERE project_id = '${inputs.obra_filtro.value}'
```

```sql fotos_recentes
SELECT
    e.id AS evidence_id,
    t.title AS tarefa,
    e.photo_url,
    e.notes,
    e.evidence_type,
    STRFTIME(CAST(e.created_at AS DATE), '%d/%m/%Y') AS data_envio
FROM obraflow.evidences e
JOIN obraflow.tasks t ON t.id = e.task_id
JOIN obraflow.epics ep ON ep.id = t.epic_id
WHERE ep.project_id = '${inputs.obra_filtro.value}'
ORDER BY e.created_at DESC
LIMIT 6
```

```sql simulacoes_obra_ativa
SELECT
    s.id AS sim_id,
    s.room_name AS comodo,
    m.name AS material_nome,
    s.consulting_fee AS taxa_ia,
    s.status AS status_sim,
    s.original_photo_url,
    s.generated_photo_url
FROM obraflow.ai_room_simulations s
LEFT JOIN obraflow.materials m ON m.id = s.material_id
WHERE s.project_id = '${inputs.obra_filtro.value}'
ORDER BY s.created_at DESC
```

```sql saude_epicos_gestor
SELECT
    epico,
    SUM(c_tarefa_total) AS orcamento_epico,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico,
    COALESCE(SUM(valor_financeiro_realizado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_financeiro
FROM ${eap_tarefas_obra}
GROUP BY epico, order_index
ORDER BY order_index
```

```sql compras_criticas
SELECT
    m.id AS material_id,
    m.name AS material,
    m.material_group AS grupo,
    STRFTIME(CAST(m.purchase_deadline AS DATE), '%d/%m/%Y') AS limite_fmt,
    m.receiver_responsible AS recebedor,
    m.total_price AS custo_total,
    m.purchased AS comprado,
    m.delivery_status AS status_entrega,
    CASE
        WHEN m.purchased = true AND m.delivery_status = 'DELIVERED_INSPECTED' THEN '✅ Entregue c/ Foto'
        WHEN m.purchased = true THEN '🚚 Comprado / Em Trânsito'
        ELSE '🚨 Compra Pendente'
    END AS situacao
FROM obraflow.materials m
JOIN obraflow.tasks t ON t.id = m.task_id
JOIN obraflow.epics e ON e.id = t.epic_id
WHERE e.project_id = '${inputs.obra_filtro.value}'
ORDER BY m.purchased ASC, m.purchase_deadline ASC
```

```sql kpis_gargalos
SELECT
    COUNT(CASE WHEN comprado = false THEN 1 END) AS pendentes_compra
FROM ${compras_criticas}
```

```sql folha_obra
SELECT
    p.id AS payroll_id,
    c.name AS colaborador,
    c.role_function AS funcao,
    c.payment_info AS chave_pix,
    p.reference_period AS periodo,
    p.amount AS valor,
    p.status AS status_folha,
    STRFTIME(CAST(p.due_date AS DATE), '%d/%m/%Y') AS vencimento_fmt
FROM obraflow.payrolls p
JOIN obraflow.collaborators c ON c.id = p.collaborator_id
WHERE p.project_id = '${inputs.obra_filtro.value}'
ORDER BY p.status DESC, p.due_date ASC
```

```sql colaboradores_lista
SELECT id, name, role_function, remuneration_rate
FROM obraflow.collaborators
WHERE active = true
ORDER BY id
```

```sql extrato_caixa
SELECT
    STRFTIME(CAST(due_date AS DATE), '%d/%m/%Y') AS vencimento,
    type AS tipo,
    category AS categoria,
    description AS descricao,
    amount AS valor,
    status
FROM obraflow.financial_transactions
WHERE project_id = '${inputs.obra_filtro.value}'
ORDER BY due_date DESC, id DESC
```

<script>
    let activeRole = 'CLIENT';
    let currentUserName = 'Marina Costa';
    let busyActionId = '';
    let actionFeedback = '';
    let actionError = '';

    // Formulário rápido de nova folha de pagamento (ERP)
    let showNewPayrollForm = false;
    let newPayrollCollab = 'collab_1';
    let newPayrollDays = 5;
    let newPayrollPeriod = 'Quinzena Atual';

    onMount(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem('obraflow_active_role');
            if (savedRole === 'CONTRACTOR' || savedRole === 'CLIENT') {
                activeRole = savedRole;
            }
            try {
                const rawUser = localStorage.getItem('obraflow_active_user');
                if (rawUser) {
                    const u = JSON.parse(rawUser);
                    if (u && u.name) currentUserName = u.name;
                }
            } catch (err) {
                console.warn('Usuário padrão mantido:', err);
            }
        }
    });

    function switchRole(role) {
        activeRole = role;
        if (typeof window !== 'undefined') {
            localStorage.setItem('obraflow_active_role', role);
        }
    }

    async function handleApproveSimulation(simId) {
        busyActionId = simId;
        actionError = '';
        try {
            const res = await fetch('http://localhost:3001/api/simulations/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ simulationId: simId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao aprovar simulação.');
            actionFeedback = '✅ Simulação aprovada! Receita de consultoria lançada no caixa e DuckDB atualizado.';
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            actionError = err.message;
        } finally {
            busyActionId = '';
        }
    }

    async function handlePurchaseMaterial(materialId, matName) {
        busyActionId = materialId;
        actionError = '';
        try {
            const res = await fetch('http://localhost:3001/api/materials/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ materialId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao registrar compra.');
            actionFeedback = `🛒 Compra de "${matName}" registrada e lançada no Extrato Financeiro!`;
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            actionError = err.message;
        } finally {
            busyActionId = '';
        }
    }

    async function handlePayPayroll(payrollId, collabName) {
        busyActionId = payrollId;
        actionError = '';
        try {
            const res = await fetch('http://localhost:3001/api/erp/pay-payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payrollId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao quitar folha.');
            actionFeedback = `💸 Pagamento de "${collabName}" quitado e debitado da Margem em Caixa!`;
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            actionError = err.message;
        } finally {
            busyActionId = '';
        }
    }

    async function handleCreatePayroll() {
        busyActionId = 'new_payroll';
        actionError = '';
        try {
            const activeProjId =
                (typeof inputs !== 'undefined' && inputs.obra_filtro?.value) || 'proj_1';
            const res = await fetch('http://localhost:3001/api/erp/create-payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collaboratorId: newPayrollCollab,
                    projectId: activeProjId,
                    daysWorked: Number(newPayrollDays) || 5,
                    referencePeriod: newPayrollPeriod
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao lançar diárias.');
            actionFeedback = '👷 Nova folha de pagamento lançada com sucesso!';
            showNewPayrollForm = false;
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            actionError = err.message;
        } finally {
            busyActionId = '';
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
                <a href="/dashboard/" class="bg-indigo-600/30 text-indigo-300 font-bold px-3 py-1.5 rounded-xl border border-indigo-500/30 no-underline">
                    📊 Visão Global
                </a>
                <a href="/detalhes/" class="text-slate-300 hover:text-white font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                    🏗️ Kanban & Canteiro
                </a>
                <a href="/processamento/" class="text-slate-300 hover:text-white font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                    📐 Esteira EAP
                </a>
                <a href="/novo-projeto/" class="text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                    + Novo Orçamento
                </a>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-400 font-semibold">Obra em Foco:</span>
                <Dropdown
                    data={lista_obras}
                    name="obra_filtro"
                    value="id"
                    label="name"
                    defaultValue="proj_1"
                />
            </div>

            <div class="inline-flex bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                <button 
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all {activeRole === 'CLIENT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                    on:click={() => switchRole('CLIENT')}
                >
                    👤 Cliente
                </button>
                <button 
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all {activeRole === 'CONTRACTOR' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                    on:click={() => switchRole('CONTRACTOR')}
                >
                    🏢 Empreiteiro
                </button>
            </div>

            <a href="/onboarding/" class="text-xs text-slate-400 hover:text-indigo-300 font-bold px-2 py-1 no-underline">
                5 Perfis ⚙️
            </a>
        </div>
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

<!-- ======================================================== -->
<!-- 👤 1. VISÃO DO CLIENTE / PROPRIETÁRIO (100% SQL DINÂMICO)-->
<!-- ======================================================== -->
{#if activeRole === 'CLIENT'}
    <div class="space-y-8">
        <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
                <div class="text-xs uppercase font-bold tracking-wider text-blue-600">Portal de Transparência do Proprietário</div>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 m-0">Minhas Obras & Reformas</h1>
                <p class="text-xs text-gray-500 mt-1">Olá, <strong>{currentUserName}</strong>! Todos os indicadores abaixo são calculados em tempo real a partir das tarefas comprovadas por fotos.</p>
            </div>

            <a 
                href="/novo-projeto/" 
                class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-black py-3 px-6 rounded-2xl shadow-lg shadow-emerald-600/30 no-underline transition-all flex items-center gap-2"
            >
                <span class="text-base font-bold">+</span> Solicitar Novo Orçamento
            </a>
        </div>

        <!-- 4 BIGVALUES 100% DINÂMICOS DO CLIENTE -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigValue data={kpis_portfolio_cliente} value="total_investido_brl" title="Total Contratado (EAP)" fmt="brl" />
            <BigValue data={kpis_portfolio_cliente} value="avanco_fisico_medio" title="Avanço Físico c/ Foto" fmt="pct1" />
            <BigValue data={kpis_portfolio_cliente} value="total_fotos_auditadas" title="Fotos de Vistoria" />
            <BigValue data={kpis_portfolio_cliente} value="total_obras_cadastradas" title="Obras Cadastradas" />
        </div>

        <!-- MASTER PIPELINE DINÂMICO DE TODAS AS OBRAS -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">📅 Status das Obras (Master Pipeline Dinâmico)</h3>
                <span class="text-xs text-gray-400">Calculado em tempo real sobre obraflow.projects & epics</span>
            </div>

            {#each pipeline_obras_cliente as ob}
                <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <span class="font-bold text-base text-gray-900">🏠 {ob.name}</span>
                            <span class="text-xs text-gray-500 ml-2">{ob.address} • EAP: R$ {Number(ob.valor_obra || 0).toLocaleString('pt-BR')}</span>
                        </div>
                        <div class="flex items-center gap-2.5">
                            <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                                {ob.pct_concluido}% Físico c/ Foto
                            </span>
                            {#if ob.contract_pdf_url && ob.contract_pdf_url.includes('localhost:3001')}
                                <a href={ob.contract_pdf_url} target="_blank" rel="noreferrer" class="text-xs font-bold text-slate-600 hover:text-indigo-700 underline">
                                    Contrato ↗
                                </a>
                            {/if}
                            <a href="/detalhes/" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 no-underline">
                                Abrir Kanban →
                            </a>
                        </div>
                    </div>
                    <div class="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                        <div class="bg-emerald-500 h-full rounded-full transition-all" style="width: {Math.min(100, Math.max(2, Number(ob.pct_concluido || 0)))}%;"></div>
                    </div>
                    <div class="text-xs text-gray-600 pt-1 font-medium">
                        {ob.etapas_resumo}
                    </div>
                </div>
            {/each}
        </div>

        <!-- GALERIA DE FOTOS REAIS DA OBRA SELECIONADA -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">📸 Fotos de Vistoria da Obra Selecionada</h3>
                <a href="/detalhes/?tab=MESTRE" class="text-xs font-bold text-amber-700 hover:underline no-underline">
                    + Enviar Nova Evidência em Campo →
                </a>
            </div>
            
            {#if fotos_recentes.length === 0}
                <div class="text-xs text-gray-500 bg-gray-50 rounded-2xl p-6 text-center border border-dashed border-gray-200">
                    Nenhuma evidência fotográfica enviada para este canteiro ainda. Acesse o <strong>Canteiro Mobile</strong> para anexar a primeira foto!
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {#each fotos_recentes as foto}
                        <div class="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/40 flex flex-col justify-between">
                            <img src={foto.photo_url} alt={foto.tarefa} class="w-full h-36 object-cover bg-slate-200" />
                            <div class="p-4 space-y-2">
                                <div class="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                                    <span>📅 {foto.data_envio}</span>
                                    <span class="text-emerald-600">✓ Auditada</span>
                                </div>
                                <div class="font-bold text-xs text-gray-900">{foto.tarefa}</div>
                                <p class="text-xs text-gray-600 leading-snug m-0">{foto.notes}</p>
                                <div class="pt-2 border-t border-gray-200 text-xs">
                                    <a href={foto.photo_url} target="_blank" rel="noreferrer" class="text-blue-600 hover:underline font-bold">
                                        📷 Abrir Imagem Original ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- SIMULAÇÕES DE ACABAMENTOS POR IA (DINÂMICO + BOTÃO DE APROVAÇÃO) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-purple-900 m-0">✨ Simulações de Ambientes & Acabamentos (IA)</h3>
                <a href="/detalhes/?tab=DESIGNER" class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded-xl no-underline">
                    Abrir Estúdio Antes x Depois →
                </a>
            </div>

            {#if simulacoes_obra_ativa.length === 0}
                <div class="text-xs text-gray-500 bg-purple-50/30 rounded-2xl p-5 text-center border border-dashed border-purple-200">
                    Nenhuma simulação de acabamento para esta obra ainda. Crie uma nova no Estúdio IA!
                </div>
            {:else}
                <div class="space-y-2.5">
                    {#each simulacoes_obra_ativa as sim}
                        <div class="flex flex-wrap items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-200 gap-3 text-xs">
                            <div>
                                <strong class="text-gray-900">• {sim.comodo}:</strong>
                                <span class="text-gray-700 ml-1">{sim.material_nome || 'Acabamento Decorativo'}</span>
                                <span class="text-gray-400 ml-2">(Consultoria: R$ {Number(sim.taxa_ia || 0).toLocaleString('pt-BR')})</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <a href={sim.generated_photo_url} target="_blank" rel="noreferrer" class="text-purple-700 font-bold underline">
                                    Ver Render ↗
                                </a>
                                {#if sim.status_sim === 'APPROVED_BY_CLIENT'}
                                    <span class="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-[11px]">✅ Aprovado</span>
                                {:else}
                                    <button
                                        type="button"
                                        disabled={busyActionId === sim.sim_id}
                                        on:click={() => handleApproveSimulation(sim.sim_id)}
                                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-xl text-[11px] cursor-pointer disabled:opacity-50"
                                    >
                                        {busyActionId === sim.sim_id ? 'Aprovando...' : '✅ Aprovar Agora'}
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<!-- ======================================================== -->
<!-- 🏢 2. VISÃO DO EMPREITEIRO / GESTOR + ERP FINANCEIRO      -->
<!-- ======================================================== -->
{#if activeRole === 'CONTRACTOR'}
    <div class="space-y-8">
        <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
                <div class="text-xs uppercase font-bold tracking-wider text-indigo-600">Painel Executivo & ERP da Construtora</div>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 m-0">Cockpit do Empreiteiro</h1>
                <p class="text-xs text-gray-500 mt-1">Controle físico x financeiro, compra de insumos, folha de pagamento da equipe e extrato auditado.</p>
            </div>

            <a 
                href="/novo-projeto/" 
                class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-black py-3 px-6 rounded-2xl shadow-lg shadow-indigo-600/30 no-underline transition-all flex items-center gap-2"
            >
                <span class="text-base font-bold">+</span> Cadastrar Nova Obra
            </a>
        </div>

        <!-- 4 BIGVALUES 100% SQL DO EMPREITEIRO -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigValue data={kpis_obra} value="orcamento_total_eap" title="Orçamento da Obra (EAP)" fmt="brl" />
            <BigValue data={caixa_obra} value="margem_caixa" title="Saldo Líquido em Caixa" fmt="brl" />
            <BigValue data={kpis_obra} value="desvio_pct" title="Desvio Fin. vs Físico" fmt="pct1" />
            <BigValue data={kpis_gargalos} value="pendentes_compra" title="Insumos Pendentes Compra" />
        </div>

        <!-- TERMÔMETRO FÍSICO x FINANCEIRO -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                        📊 Termômetro de Saúde por Épico (% Físico c/ Foto vs. % Financeiro Realizado)
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5">Compara a execução comprovada em canteiro com o desembolso de compras e mão de obra.</p>
                </div>
                <a href="/detalhes/" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 no-underline">
                    Abrir Kanban Polimórfico →
                </a>
            </div>
            <BarChart
                data={saude_epicos_gestor}
                x="epico"
                y={["avanco_fisico", "avanco_financeiro"]}
                type="grouped"
                yFmt="pct0"
            />
        </div>

        <!-- SUPPLY CHAIN INTERATIVO + GATILHO ESTÚDIO IA -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-rose-700 m-0">
                    🚨 Gestão de Suprimentos & Cronograma de Compras (Supply Chain)
                </h3>
                <span class="text-xs text-gray-400">Comprar debita automaticamente do Fluxo de Caixa</span>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="border-b border-gray-200 text-gray-500 uppercase text-[11px]">
                            <th class="py-2.5">Situação</th>
                            <th class="py-2.5">Insumo / Material</th>
                            <th class="py-2.5">Limite Compra</th>
                            <th class="py-2.5">Recebedor</th>
                            <th class="py-2.5 text-right">Custo Total</th>
                            <th class="py-2.5 text-right">Ações Operacionais</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        {#each compras_criticas as item}
                            <tr class="hover:bg-gray-50">
                                <td class="py-3 font-semibold">{item.situacao}</td>
                                <td class="py-3 font-bold text-gray-900">{item.material} <span class="text-[10px] text-gray-400 font-mono">({item.grupo})</span></td>
                                <td class="py-3 font-mono text-gray-600">{item.limite_fmt}</td>
                                <td class="py-3 font-semibold text-gray-700">{item.recebedor}</td>
                                <td class="py-3 text-right font-mono font-bold text-gray-900">R$ {Number(item.custo_total || 0).toLocaleString('pt-BR')}</td>
                                <td class="py-3 text-right space-x-1.5 whitespace-nowrap">
                                    {#if !item.comprado}
                                        <button
                                            type="button"
                                            disabled={busyActionId === item.material_id}
                                            on:click={() => handlePurchaseMaterial(item.material_id, item.material)}
                                            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] cursor-pointer disabled:opacity-50"
                                        >
                                            {busyActionId === item.material_id ? 'Comprando...' : '🛒 Comprar'}
                                        </button>
                                        {#if item.grupo === 'FINISHINGS' || item.grupo === 'LIGHTING' || item.grupo === 'DRYWALL'}
                                            <a
                                                href="/detalhes/?tab=DESIGNER&mat={item.material_id}"
                                                class="inline-block bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold px-2.5 py-1 rounded-lg text-[11px] no-underline"
                                            >
                                                ✨ Simular IA
                                            </a>
                                        {/if}
                                    {:else}
                                        <span class="text-[11px] text-emerald-700 font-semibold">Adquirido</span>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- MÓDULO ERP: EQUIPE ALOCADA & FOLHA DE PAGAMENTO -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-900 m-0">
                        👷 ERP de RH: Equipe de Campo & Folha de Pagamento
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5">Gerencie diárias e quite pagamentos pendentes via PIX com lançamento direto no caixa.</p>
                </div>
                <button
                    type="button"
                    on:click={() => showNewPayrollForm = !showNewPayrollForm}
                    class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                >
                    {showNewPayrollForm ? 'Cancelar' : '+ Lançar Diárias / Folha'}
                </button>
            </div>

            {#if showNewPayrollForm}
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Colaborador</label>
                        <select bind:value={newPayrollCollab} class="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white">
                            {#each colaboradores_lista as col}
                                <option value={col.id}>{col.name} (R$ {col.remuneration_rate}/dia)</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Qtd. Diárias</label>
                        <input type="number" min="1" max="30" bind:value={newPayrollDays} class="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Período Referência</label>
                        <input type="text" bind:value={newPayrollPeriod} class="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white" />
                    </div>
                    <button
                        type="button"
                        disabled={busyActionId === 'new_payroll'}
                        on:click={handleCreatePayroll}
                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl cursor-pointer disabled:opacity-50"
                    >
                        {busyActionId === 'new_payroll' ? 'Gravando...' : 'Confirmar Lançamento'}
                    </button>
                </div>
            {/if}

            {#if folha_obra.length === 0}
                <div class="text-xs text-gray-500 bg-gray-50 rounded-2xl p-5 text-center border border-dashed border-gray-200">
                    Nenhuma folha cadastrada para este canteiro ainda. Clique em <strong>+ Lançar Diárias / Folha</strong> acima.
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-gray-200 text-gray-500 uppercase text-[11px]">
                                <th class="py-2.5">Colaborador</th>
                                <th class="py-2.5">Função / PIX</th>
                                <th class="py-2.5">Período</th>
                                <th class="py-2.5">Vencimento</th>
                                <th class="py-2.5 text-right">Valor</th>
                                <th class="py-2.5 text-right">Status / Ação</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            {#each folha_obra as f}
                                <tr class="hover:bg-gray-50">
                                    <td class="py-3 font-bold text-gray-900">{f.colaborador}</td>
                                    <td class="py-3 text-gray-600">{f.funcao} • <span class="font-mono text-[11px]">{f.chave_pix}</span></td>
                                    <td class="py-3 text-gray-700">{f.periodo}</td>
                                    <td class="py-3 font-mono text-gray-600">{f.vencimento_fmt}</td>
                                    <td class="py-3 text-right font-mono font-bold text-gray-900">R$ {Number(f.valor || 0).toLocaleString('pt-BR')}</td>
                                    <td class="py-3 text-right">
                                        {#if f.status_folha === 'PAID'}
                                            <span class="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">✓ PAGO</span>
                                        {:else}
                                            <button
                                                type="button"
                                                disabled={busyActionId === f.payroll_id}
                                                on:click={() => handlePayPayroll(f.payroll_id, f.colaborador)}
                                                class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-[11px] cursor-pointer disabled:opacity-50"
                                            >
                                                {busyActionId === f.payroll_id ? 'Quitando...' : '💸 Quitar PIX'}
                                            </button>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>

        <!-- EXTRATO FINANCEIRO CONSOLIDADO -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                    💰 Extrato Financeiro & Fluxo de Caixa da Obra
                </h3>
                <span class="text-xs font-bold text-emerald-700">Sincronizado com compras, parcelas e folha</span>
            </div>
            <DataTable data={extrato_caixa} rows=10>
                <Column id="vencimento" title="Data" />
                <Column id="tipo" title="Tipo" />
                <Column id="categoria" title="Categoria" />
                <Column id="descricao" title="Descrição" />
                <Column id="valor" title="Valor" fmt="brl" />
                <Column id="status" title="Status" />
            </DataTable>
        </div>
    </div>
{/if}
