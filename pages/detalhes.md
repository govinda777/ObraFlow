---
title: Detalhe da Obra & Canteiro - ObraFlow
hide_title: true
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
    t.description AS descricao,
    t.category AS categoria,
    t.kanban_status,
    COALESCE(c.name, 'Equipe de Campo') AS responsavel,
    CAST(t.due_date AS DATE) AS prazo_tarefa,
    STRFTIME(CAST(t.due_date AS DATE), '%d/%m/%Y') AS prazo_fmt,
    t.cost_labor AS custo_mao_de_obra,
    (t.cost_labor + COALESCE(m.custo_insumos, 0) + COALESCE(m.custo_frete, 0) + COALESCE(m.custo_recebimento, 0) + COALESCE(a.custo_ia, 0)) AS c_tarefa_total,
    COALESCE(ev.qtd_fotos, 0) AS qtd_fotos,
    ev.foto_url,
    ev.nota_evidencia,
    CASE WHEN t.kanban_status = 'DONE' AND COALESCE(ev.qtd_fotos, 0) > 0 THEN true ELSE false END AS concluida_com_foto,
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
    SUM(c_tarefa_total) AS orcamento_total_eap,
    SUM(valor_fisico_executado) AS total_fisico_brl,
    SUM(valor_financeiro_realizado) AS total_financeiro_brl,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico_pct,
    COALESCE(SUM(valor_financeiro_realizado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_financeiro_pct
FROM ${eap_detalhe_obra}
```

```sql kanban_contadores
SELECT
    COUNT(CASE WHEN kanban_status = 'TODO' THEN 1 END) AS total_todo,
    COUNT(CASE WHEN kanban_status = 'IN_PROGRESS' THEN 1 END) AS total_progress,
    COUNT(CASE WHEN kanban_status = 'REVIEW' THEN 1 END) AS total_review,
    COUNT(CASE WHEN kanban_status = 'DONE' THEN 1 END) AS total_done
FROM ${eap_detalhe_obra}
```

```sql compras_obra_ativa
SELECT
    m.name AS material,
    m.material_group AS grupo,
    CAST(m.purchase_deadline AS DATE) AS limite_compra,
    m.receiver_responsible AS recebedor,
    m.total_price AS custo_total,
    CASE
        WHEN m.purchased = true THEN '✅ Comprado'
        WHEN DATEDIFF('day', DATE '2026-10-24', CAST(m.purchase_deadline AS DATE)) <= 7 THEN '🚨 GARGALO (<= 7 dias)'
        ELSE '⏳ No Prazo'
    END AS alerta
FROM obraflow.materials m
JOIN obraflow.tasks t ON t.id = m.task_id
JOIN obraflow.epics e ON e.id = t.epic_id
WHERE e.project_id = '${inputs.obra_filtro.value}'
ORDER BY m.purchase_deadline ASC
```

```sql simulacoes_estudio
SELECT
    s.room_name AS comodo,
    m.name AS material_aplicado,
    s.target_element AS elemento,
    s.consulting_fee AS taxa_consultoria_ia,
    s.status AS status_simulacao,
    s.original_photo_url,
    s.generated_photo_url
FROM obraflow.ai_room_simulations s
JOIN obraflow.materials m ON m.id = s.material_id
```

<script>
    // Abas de Detalhes da Obra: 'KANBAN', 'MESTRE', 'DESIGNER'
    let activeModule = 'KANBAN';
</script>

<!-- ======================================================== -->
<!-- APP SHELL: TOPBAR PERSISTENTE DA ÁREA LOGADA             -->
<!-- ======================================================== -->
<div class="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 mb-8 shadow-xl border border-slate-800">
    <div class="flex flex-wrap items-center justify-between gap-4">
        
        <!-- Logo e Navegação -->
        <div class="flex items-center gap-6">
            <a href="../" class="flex items-center gap-2 no-underline text-white">
                <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/40">⚡</span>
                <span class="font-black text-sm tracking-tight">OBRAFLOW</span>
            </a>

            <div class="hidden md:flex items-center gap-2 text-xs">
                <a href="../dashboard/" class="text-slate-400 hover:text-white font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                    📊 Visão Global
                </a>
                <a href="../detalhes/" class="bg-indigo-600/30 text-indigo-300 font-bold px-3 py-1.5 rounded-xl border border-indigo-500/30 no-underline">
                    🏗️ Detalhe da Obra
                </a>
            </div>
        </div>

        <!-- Seletor de Canteiro e Módulos -->
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

            <a href="../dashboard/" class="text-xs text-slate-400 hover:text-white font-semibold no-underline">
                ← Voltar ao Dashboard
            </a>
        </div>
    </div>
</div>

<!-- BARRA DE SELEÇÃO DE MÓDULO INTERNO -->
<div class="bg-white border border-gray-200 rounded-3xl p-3 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2">
        <button 
            class="px-4 py-2 rounded-2xl text-xs font-bold transition-all {activeModule === 'KANBAN' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeModule = 'KANBAN'}
        >
            📋 Cockpit & Kanban da Obra
        </button>
        <button 
            class="px-4 py-2 rounded-2xl text-xs font-bold transition-all {activeModule === 'MESTRE' ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeModule = 'MESTRE'}
        >
            🏗️ Canteiro Mobile (Mestre)
        </button>
        <button 
            class="px-4 py-2 rounded-2xl text-xs font-bold transition-all {activeModule === 'DESIGNER' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeModule = 'DESIGNER'}
        >
            🎨 Estúdio IA (Designer)
        </button>
    </div>

    <div class="text-xs text-gray-500 font-semibold pr-2">
        Módulo Especializado Selecionado
    </div>
</div>

<!-- ======================================================== -->
<!-- 1. ABA COCKPIT & KANBAN OPERACIONAL DA OBRA ATIVA        -->
<!-- ======================================================== -->
{#if activeModule === 'KANBAN'}
    <div class="space-y-8">
        
        <!-- HEADER DA OBRA ATIVA -->
        <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
                <span class="text-xs uppercase font-bold tracking-wider text-indigo-600">Gestão Atômica de Canteiro</span>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 m-0">Detalhamento Técnico da Obra</h1>
                <p class="text-xs text-gray-500 mt-1">Quadro Kanban de execução, avanço físico auditado por foto e supply chain.</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                    Status: IN_PROGRESS
                </span>
            </div>
        </div>

        <!-- 4 BIGVALUES DO CANTEIRO ATIVO -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigValue data={kpis_detalhe} value="orcamento_total_eap" title="Orçamento da Obra" fmt="brl" />
            <BigValue data={kpis_detalhe} value="avanco_fisico_pct" title="Avanço Físico (c/ Foto)" fmt="pct1" />
            <BigValue data={kpis_detalhe} value="avanco_financeiro_pct" title="Avanço Financeiro" fmt="pct1" />
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Medição c/ Foto</div>
                <div class="text-2xl font-black text-emerald-600">100% Auditada</div>
                <div class="text-[11px] text-gray-500 mt-1">Conforme cláusula contratual</div>
            </div>
        </div>

        <!-- QUADRO KANBAN MULTI-RAIAS COMPLETO (4 COLUNAS OPERACIONAIS) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-6">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                    📋 Quadro Kanban de Execução Civil & Suprimentos
                </h3>
                <span class="text-xs text-gray-400">Tarefas atômicas alimentadas pelo DuckDB</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <!-- COLUNA 1: TODO -->
                <div class="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-gray-200">
                        <span class="text-xs font-bold text-gray-700 uppercase">📋 A Fazer (TODO)</span>
                        <span class="text-[10px] bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                            <Value data={kanban_contadores} column="total_todo" />
                        </span>
                    </div>

                    <div class="space-y-2.5">
                        {#each eap_detalhe_obra.filter(t => t.kanban_status === 'TODO') as item}
                            <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-xs space-y-2 text-xs">
                                <div class="font-bold text-gray-900">{item.tarefa}</div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>Resp: {item.responsavel}</span>
                                    <span class="font-mono">📅 {item.prazo_fmt}</span>
                                </div>
                                <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                                    <span class="bg-gray-100 px-2 py-0.5 rounded font-bold">{item.categoria}</span>
                                    <span class="font-bold text-indigo-700">R$ {Number(item.c_tarefa_total).toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- COLUNA 2: IN PROGRESS -->
                <div class="bg-blue-50/40 rounded-2xl p-4 border border-blue-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-blue-200">
                        <span class="text-xs font-bold text-blue-800 uppercase">🚧 Em Andamento</span>
                        <span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                            <Value data={kanban_contadores} column="total_progress" />
                        </span>
                    </div>

                    <div class="space-y-2.5">
                        {#each eap_detalhe_obra.filter(t => t.kanban_status === 'IN_PROGRESS') as item}
                            <div class="bg-white p-3 rounded-xl border border-blue-200 shadow-xs space-y-2 text-xs">
                                <div class="font-bold text-gray-900">{item.tarefa}</div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>Resp: {item.responsavel}</span>
                                    <span class="font-mono text-blue-600 font-bold">📅 {item.prazo_fmt}</span>
                                </div>
                                <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                                    <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">{item.categoria}</span>
                                    <span class="font-bold text-indigo-700">R$ {Number(item.c_tarefa_total).toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- COLUNA 3: REVIEW / CONFERÊNCIA -->
                <div class="bg-amber-50/40 rounded-2xl p-4 border border-amber-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-amber-200">
                        <span class="text-xs font-bold text-amber-800 uppercase">🔍 Conferência (REVIEW)</span>
                        <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                            <Value data={kanban_contadores} column="total_review" />
                        </span>
                    </div>

                    <div class="space-y-2.5">
                        {#each eap_detalhe_obra.filter(t => t.kanban_status === 'REVIEW') as item}
                            <div class="bg-white p-3 rounded-xl border border-amber-200 shadow-xs space-y-2 text-xs">
                                <div class="font-bold text-gray-900">{item.tarefa}</div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>Resp: {item.responsavel}</span>
                                    <span class="font-mono">📅 {item.prazo_fmt}</span>
                                </div>
                                <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                                    <span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">Aguardando Foto</span>
                                    <span class="font-bold text-indigo-700">R$ {Number(item.c_tarefa_total).toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- COLUNA 4: DONE COM FOTO -->
                <div class="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200 space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-emerald-200">
                        <span class="text-xs font-bold text-emerald-800 uppercase">✅ Concluído c/ Foto</span>
                        <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            <Value data={kanban_contadores} column="total_done" />
                        </span>
                    </div>

                    <div class="space-y-2.5">
                        {#each eap_detalhe_obra.filter(t => t.kanban_status === 'DONE') as item}
                            <div class="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs space-y-2 text-xs">
                                <div class="font-bold text-gray-900 flex items-center justify-between">
                                    <span>{item.tarefa}</span>
                                    <span class="text-emerald-600 font-bold">✓</span>
                                </div>
                                <div class="text-[11px] text-gray-500 flex justify-between">
                                    <span>Resp: {item.responsavel}</span>
                                    <span class="font-mono text-emerald-700">Comprovado</span>
                                </div>
                                <div class="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                                    <span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">📷 Foto Auditada</span>
                                    <span class="font-bold text-emerald-800">R$ {Number(item.c_tarefa_total).toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

            </div>
        </div>

        <!-- ALERTAS DE COMPRAS CRÍTICAS DA OBRA SELECIONADA -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-rose-700 m-0 flex items-center gap-2">
                <span>🚨</span> Alertas de Insumos & Suprimentos Deste Canteiro
            </h3>
            <DataTable data={compras_obra_ativa} rows=5>
                <Column id="alerta" title="Situação" />
                <Column id="material" title="Insumo / Material" />
                <Column id="limite_compra" title="Data Limite" />
                <Column id="recebedor" title="Quem Recebe" />
                <Column id="custo_total" title="Valor Total" fmt="brl" />
            </DataTable>
        </div>

    </div>
{/if}

<!-- ======================================================== -->
<!-- 2. ABA CANTEIRO MOBILE: MESTRE DE OBRAS (WIREFRAME 4.4)   -->
<!-- ======================================================== -->
{#if activeModule === 'MESTRE'}
    <div class="max-w-md mx-auto space-y-6 pb-8">
        
        <!-- CARD ESTILO CELULAR / MOBILE FIRST -->
        <div class="bg-white border-2 border-amber-300 rounded-3xl p-6 shadow-xl space-y-5">
            
            <!-- HEADER MOBILE -->
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-amber-600">🏗️ ObraFlow Campo</span>
                    <h2 class="text-base font-black text-gray-900 m-0">👷 Mestre José</h2>
                </div>
                <div class="text-right">
                    <span class="text-[11px] font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
                        Residencial Alpha
                    </span>
                </div>
            </div>

            <!-- 3 CARDS RÁPIDOS DE CAMPO (Wireframe 4.4) -->
            <div class="grid grid-cols-3 gap-2.5 text-center">
                <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div class="text-xl font-black text-gray-900">2</div>
                    <div class="text-[10px] text-gray-500 font-bold mt-0.5">Tarefas Hoje</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div class="text-xl font-black text-amber-600">1 Carga</div>
                    <div class="text-[10px] text-gray-500 font-bold mt-0.5">A Conferir</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div class="text-xl font-black text-emerald-600">5</div>
                    <div class="text-[10px] text-gray-500 font-bold mt-0.5">Fotos OK</div>
                </div>
            </div>

            <hr class="border-gray-100 m-0" />

            <!-- 🧱 MINHAS TAREFAS DE EXECUÇÃO HOJE -->
            <div class="space-y-3">
                <div class="text-xs font-bold uppercase tracking-wider text-gray-800">
                    🧱 Minhas Tarefas de Execução Hoje
                </div>

                <div class="border border-blue-200 bg-blue-50/30 p-4 rounded-2xl space-y-2.5 text-xs">
                    <div class="flex justify-between items-start">
                        <span class="font-bold text-gray-900">🔹 Teste de Estanqueidade Hidráulica</span>
                        <span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Hoje até 18h</span>
                    </div>
                    <div class="text-[11px] text-gray-500">Responsável de Campo: Roberto (Encanador)</div>
                    <button 
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5"
                        on:click={() => alert('📸 Foto de evidência anexada! Tarefa concluída e medição liberada.')}
                    >
                        <span>📷</span> Tirar Foto de Evidência e Concluir
                    </button>
                </div>
            </div>

            <hr class="border-gray-100 m-0" />

            <!-- 📦 LOGÍSTICA & RECEBIMENTO NO CANTEIRO -->
            <div class="space-y-3">
                <div class="text-xs font-bold uppercase tracking-wider text-gray-800">
                    📦 Logística & Recebimento no Canteiro
                </div>

                <div class="border border-amber-200 bg-amber-50/30 p-4 rounded-2xl space-y-3 text-xs">
                    <div class="flex justify-between items-start">
                        <span class="font-bold text-gray-900">🚚 Porcelanato Calacata 90x90 (85 m²)</span>
                        <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">14h - 16h</span>
                    </div>
                    <div class="text-[11px] text-gray-600">
                        Responsável Conferência: <strong class="text-indigo-700">EMPREITEIRO</strong>
                    </div>

                    <div class="bg-white p-3 rounded-xl border border-amber-100 text-[11px] space-y-1.5">
                        <div class="font-bold text-gray-700">Checklist Obrigatório de Descarga:</div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked /> Quantidade confere (42 caixas)
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked /> Sem avarias ou caixas molhadas
                        </label>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button 
                            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1"
                            on:click={() => alert('📸 Foto da nota fiscal e palete anexada!')}
                        >
                            <span>📸</span> Foto Carga
                        </button>
                        <button 
                            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-[11px]"
                            on:click={() => alert('✅ Recebimento confirmado! Insumo liberado no canteiro.')}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>

            <!-- TROCAR DE CANTEIRO -->
            <div class="pt-2 text-center">
                <button 
                    class="text-xs font-bold text-gray-500 hover:text-amber-700 bg-gray-100 hover:bg-gray-200 w-full py-2.5 rounded-xl"
                    on:click={() => alert('📍 Canteiro alterado para: Reforma Loft Jardins (Apto 82)')}
                >
                    📍 Trocar de Canteiro (Ir para Reforma Loft)
                </button>
            </div>

        </div>
    </div>
{/if}

<!-- ======================================================== -->
<!-- 3. ABA ESTÚDIO DE AMBIENTES: DESIGNER (WIREFRAME 4.5)    -->
<!-- ======================================================== -->
{#if activeModule === 'DESIGNER'}
    <div class="max-w-4xl mx-auto space-y-8 pb-8">
        
        <!-- HEADER DESIGNER -->
        <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
                <span class="text-xs uppercase font-bold tracking-wider text-purple-600">Estúdio de Ambientação & Acabamentos</span>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 m-0">Prototipagem de Ambientes com IA</h1>
                <p class="text-xs text-gray-500 mt-1">Simulação visual de materiais no canteiro cru e gestão de fornecedores finos.</p>
            </div>
            <span class="bg-purple-100 text-purple-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-purple-200">
                Perfil: 🎨 Designer de Interiores
            </span>
        </div>

        <!-- 4 BIGVALUES DESIGNER (Wireframe 4.5) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-purple-700">2 Aprovadas</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Simulações IA</div>
            </div>
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-indigo-700">R$ 950,00</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Receita Consultoria IA</div>
            </div>
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-blue-700">2 Insumos</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Em Trânsito Décor</div>
            </div>
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-emerald-700">12/11</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Prazo Marcenaria</div>
            </div>
        </div>

        <!-- ✨ VISUALIZADOR DE PROTOTIPAGEM (ANTES x DEPOIS COM IA) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-purple-900 m-0">
                        ✨ Visualizador de Prototipagem de Ambientes (Antes x Depois com IA)
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5">Cômodo: <strong>Cozinha Integrada</strong> • Material: <strong>Bancada Ilha em Quartzo Branco + Cuba Inox</strong></p>
                </div>
                <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                    ✅ Aprovado pelo Cliente
                </span>
            </div>

            <!-- COMPARATIVO ANTES X DEPOIS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="border border-gray-200 rounded-2xl p-5 bg-gray-50 text-center space-y-3">
                    <span class="text-xs font-bold text-gray-700 uppercase tracking-wider block">📷 Foto Original (Canteiro Real)</span>
                    <p class="text-xs text-gray-500 m-0">[ Alvenaria crua, contrapiso e eletrodutos aparentes ]</p>
                    <a href="https://images.unsplash.com/photo-1503387762-592deb58ef4e" target="_blank" rel="noreferrer" class="text-xs font-bold text-blue-600 hover:underline block pt-2">
                        Abrir Foto do Canteiro
                    </a>
                </div>

                <div class="border border-purple-200 rounded-2xl p-5 bg-purple-50/40 text-center space-y-3">
                    <span class="text-xs font-bold text-purple-800 uppercase tracking-wider block">🎨 Render 3D IA (Material Aplicado)</span>
                    <p class="text-xs text-purple-700 m-0">[ Bancada de quartzo instalada, iluminação e acabamentos ]</p>
                    <a href="https://images.unsplash.com/photo-1621905251189-08b45d6a269e" target="_blank" rel="noreferrer" class="text-xs font-bold text-purple-700 hover:underline block pt-2">
                        Abrir Renderização IA
                    </a>
                </div>
            </div>

            <div class="pt-3 flex flex-wrap gap-3">
                <button class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-md" on:click={() => alert('✨ Variação estética solicitada ao modelo!')}>
                    🔄 Gerar Nova Variação IA
                </button>
                <button class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-md" on:click={() => alert('💾 Especificação técnica encaminhada para cotação com fornecedores!')}>
                    💾 Salvar Especificação para Compras
                </button>
            </div>
        </div>

        <!-- 🛋️ GESTÃO DE FORNECEDORES DECORATIVOS & ILUMINAÇÃO -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                🛋️ Gestão de Fornecedores Decorativos & Iluminação
            </h3>
            <ul class="text-xs text-gray-700 space-y-3 pl-0 list-none m-0">
                <li class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span>• Pendente Linear LED Dourado (Sala de Jantar)</span>
                    <span class="text-amber-800 font-bold bg-amber-100 px-3 py-1 rounded-full text-[11px]">⏳ Compra até 05/11</span>
                </li>
                <li class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span>• Chapas Drywall c/ Sanca (Living Integrado)</span>
                    <span class="text-amber-800 font-bold bg-amber-100 px-3 py-1 rounded-full text-[11px]">⏳ Compra até 29/10</span>
                </li>
                <li class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span>• Porcelanato Calacata 90x90 (Área Social)</span>
                    <span class="text-blue-800 font-bold bg-blue-100 px-3 py-1 rounded-full text-[11px]">🚚 Em Trânsito (Previsão 26/10)</span>
                </li>
            </ul>
        </div>

    </div>
{/if}
