---
title: ObraFlow — Dashboard Global Multi-Obra
hide_title: true
---

```sql lista_obras
SELECT id, name, status, address
FROM obraflow.projects
ORDER BY id
```

```sql eap_tarefas_obra
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
    CAST(e.start_date AS DATE) AS inicio_epico,
    CAST(e.end_date AS DATE) AS fim_epico,
    t.title AS tarefa,
    t.description AS descricao,
    t.category AS categoria,
    t.kanban_status,
    COALESCE(c.name, 'Equipe de Campo') AS responsavel,
    CAST(t.due_date AS DATE) AS prazo_tarefa,
    STRFTIME(CAST(t.due_date AS DATE), '%d/%m/%Y') AS prazo_fmt,
    t.cost_labor AS custo_mao_de_obra,
    COALESCE(m.custo_insumos, 0) AS custo_insumos,
    COALESCE(m.custo_frete, 0) AS custo_frete,
    COALESCE(m.custo_recebimento, 0) AS custo_recebimento,
    COALESCE(a.custo_ia, 0) AS custo_ia,
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

```sql kpis_obra
SELECT
    SUM(c_tarefa_total) AS orcamento_total_eap,
    SUM(valor_fisico_executado) AS total_fisico_brl,
    SUM(valor_financeiro_realizado) AS total_financeiro_brl,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico_pct,
    COALESCE(SUM(valor_financeiro_realizado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_financeiro_pct,
    COALESCE((SUM(valor_financeiro_realizado) - SUM(valor_fisico_executado)) / NULLIF(SUM(c_tarefa_total), 0), 0) AS desvio_pct
FROM ${eap_tarefas_obra}
```

```sql caixa_obra
SELECT
    SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS receita_recebida,
    SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS despesas_pagas,
    SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END)
      - SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS margem_caixa
FROM obraflow.financial_transactions
WHERE project_id = '${inputs.obra_filtro.value}'
```

```sql fotos_recentes
SELECT
    t.title AS tarefa,
    e.photo_url,
    e.notes,
    STRFTIME(CAST(e.created_at AS DATE), '%d/%m/%Y') AS data_envio
FROM obraflow.evidences e
JOIN obraflow.tasks t ON t.id = e.task_id
JOIN obraflow.epics ep ON ep.id = t.epic_id
WHERE ep.project_id = '${inputs.obra_filtro.value}'
ORDER BY e.created_at DESC
LIMIT 3
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
    m.name AS material,
    m.material_group AS grupo,
    CAST(m.purchase_deadline AS DATE) AS limite_compra,
    m.receiver_responsible AS recebedor,
    m.total_price AS custo_total,
    m.purchased AS comprado,
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

```sql extrato_caixa
SELECT
    CAST(due_date AS DATE) AS vencimento,
    type AS tipo,
    category AS categoria,
    description AS descricao,
    amount AS valor,
    status
FROM obraflow.financial_transactions
WHERE project_id = '${inputs.obra_filtro.value}'
ORDER BY due_date ASC
```

<script>
    // Inicializa o Role com base no Onboarding (ou fallback para CLIENT)
    let activeRole = 'CLIENT';
    
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('obraflow_active_role');
        if (saved) activeRole = saved;
    }

    function switchRole(role) {
        activeRole = role;
        if (typeof window !== 'undefined') {
            localStorage.setItem('obraflow_active_role', role);
        }
    }
</script>

<!-- ======================================================== -->
<!-- APP SHELL: TOPBAR PERSISTENTE DA ÁREA LOGADA             -->
<!-- ======================================================== -->
<div class="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 mb-8 shadow-xl border border-slate-800">
    <div class="flex flex-wrap items-center justify-between gap-4">
        
        <!-- Logo e Links de Navegação da Plataforma -->
        <div class="flex items-center gap-6">
            <a href="/" class="flex items-center gap-2 no-underline text-white group">
                <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/40">⚡</span>
                <span class="font-black text-sm tracking-tight">OBRAFLOW</span>
            </a>

            <div class="hidden md:flex items-center gap-2 text-xs">
                <a href="/dashboard/" class="bg-indigo-600/30 text-indigo-300 font-bold px-3 py-1.5 rounded-xl border border-indigo-500/30 no-underline">
                    📊 Visão Global
                </a>
                <a href="/detalhes/" class="text-slate-400 hover:text-white font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                    🏗️ Detalhe da Obra
                </a>
                {#if activeRole === 'CLIENT'}
                    <a href="/novo-projeto/" class="text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1.5 rounded-xl no-underline transition-colors">
                        📝 Novo Orçamento
                    </a>
                {/if}
            </div>
        </div>

        <!-- Seletor de Canteiro e Role Switcher Instantâneo -->
        <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-400 font-semibold">Canteiro:</span>
                <Dropdown
                    data={lista_obras}
                    name="obra_filtro"
                    value="id"
                    label="name"
                    defaultValue="proj_1"
                />
            </div>

            <!-- Role Switcher -->
            <div class="inline-flex bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                <button 
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {activeRole === 'CLIENT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                    on:click={() => switchRole('CLIENT')}
                >
                    👤 Cliente
                </button>
                <button 
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {activeRole === 'CONTRACTOR' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                    on:click={() => switchRole('CONTRACTOR')}
                >
                    🏢 Empreiteiro
                </button>
            </div>

            <a href="/onboarding/" class="text-xs text-slate-400 hover:text-indigo-400 font-bold px-2 py-1" title="Ver todos os 5 perfis">
                Trocar Perfil ⚙️
            </a>
        </div>
    </div>
</div>

<!-- ======================================================== -->
<!-- 👤 1. VISÃO DO CLIENTE / PROPRIETÁRIO (WIREFRAME 4.1)     -->
<!-- ======================================================== -->
{#if activeRole === 'CLIENT'}
    <div class="space-y-8">
        
        <!-- HEADER DO CLIENTE COM BOTÃO EXCLUSIVO DE ORÇAMENTO -->
        <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
                <div class="text-xs uppercase font-bold tracking-wider text-blue-600">Portal de Transparência do Proprietário</div>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 m-0">Minhas Obras & Reformas</h1>
                <p class="text-xs text-gray-500 mt-1">Olá, <strong>Marina Costa</strong>! Acompanhe o avanço real das suas propriedades com comprovação por fotos auditadas.</p>
            </div>

            <!-- BOTÃO EXCLUSIVO DO CLIENTE -->
            <a 
                href="/novo-projeto/" 
                class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-black py-3 px-6 rounded-2xl shadow-lg shadow-emerald-600/30 no-underline transition-all flex items-center gap-2"
            >
                <span class="text-base font-bold">+</span> Solicitar Novo Orçamento
            </a>
        </div>

        <!-- 4 BIGVALUES DO CLIENTE (Wireframe 4.1) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Orçado Investido</div>
                <div class="text-2xl font-black text-gray-900">R$ 118.850,00</div>
                <div class="text-[11px] text-gray-500 mt-1">2 Contratos em execução</div>
            </div>
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Avanço Físico c/ Foto</div>
                <div class="text-2xl font-black text-emerald-600">48%</div>
                <div class="text-[11px] text-emerald-700 font-semibold mt-1">Auditado por imagens</div>
            </div>
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Vistorias Validadas</div>
                <div class="text-2xl font-black text-blue-600">6 Fotos</div>
                <div class="text-[11px] text-blue-700 font-semibold mt-1">Enviadas pelo canteiro</div>
            </div>
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Obras Cadastradas</div>
                <div class="text-2xl font-black text-purple-600">2 Imóveis</div>
                <div class="text-[11px] text-purple-700 font-semibold mt-1">Em status IN_PROGRESS</div>
            </div>
        </div>

        <!-- 📅 STATUS DAS SUAS OBRAS (MASTER PIPELINE DO CLIENTE) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">📅 Status das Suas Obras (Master Pipeline)</h3>
                <span class="text-xs text-gray-400">Progresso físico com fotos obrigatórias</span>
            </div>

            <!-- Obra 1: Residencial Alpha -->
            <div class="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="font-bold text-base text-gray-900">🏠 Residencial Alpha</span>
                        <span class="text-xs text-gray-500 ml-2">Rua das Palmeiras, 123 • Construtora: Alpha Engenharia</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">62% Concluído</span>
                        <a href="/detalhes/" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 no-underline">Ver Detalhes →</a>
                    </div>
                </div>
                <div class="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full" style="width: 62%;"></div>
                </div>
                <div class="text-xs text-gray-600 flex flex-wrap gap-4 pt-1 font-medium">
                    <span>• 1. Estrutura: <strong class="text-emerald-700">✅ Concluída</strong></span>
                    <span>• 2. Alvenaria: <strong class="text-amber-700">🚧 Em Andamento</strong></span>
                    <span>• 3. Acabamento: <strong class="text-gray-400">🔒 Aguardando</strong></span>
                </div>
            </div>

            <!-- Obra 2: Reforma Loft Jardins -->
            <div class="p-5 rounded-2xl border border-blue-100 bg-blue-50/20 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="font-bold text-base text-gray-900">🏢 Reforma Loft Jardins</span>
                        <span class="text-xs text-gray-500 ml-2">Alameda dos Anapurus, 780 • Construtora: Alpha Engenharia</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">15% Concluído</span>
                        <a href="/detalhes/" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 no-underline">Ver Detalhes →</a>
                    </div>
                </div>
                <div class="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                    <div class="bg-blue-500 h-full rounded-full" style="width: 15%;"></div>
                </div>
                <div class="text-xs text-gray-600 flex flex-wrap gap-4 pt-1 font-medium">
                    <span>• 1. Demolição: <strong class="text-emerald-700">✅ Concluída</strong></span>
                    <span>• 2. Revestimentos: <strong class="text-amber-700">🚧 Em Andamento</strong></span>
                </div>
            </div>
        </div>

        <!-- 📸 FOTOS RECENTES DO CANTEIRO (EVIDÊNCIAS DE VISTORIA) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">📸 Comprovações Fotográficas Recentes (Evidências de Vistoria)</h3>
                <span class="text-xs text-gray-400">Enviadas diretamente pelo Mestre de Obras</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                {#each fotos_recentes as foto}
                    <div class="border border-gray-200 rounded-2xl p-4 bg-gray-50/40 space-y-2">
                        <div class="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                            <span>📅 {foto.data_envio}</span>
                            <span class="text-emerald-600">✓ Auditada</span>
                        </div>
                        <div class="font-bold text-xs text-gray-900">{foto.tarefa}</div>
                        <p class="text-xs text-gray-600 leading-snug m-0">{foto.notes}</p>
                        <div class="pt-2 border-t border-gray-200 text-xs">
                            <a href="{foto.photo_url}" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline font-bold flex items-center gap-1">
                                <span>📷</span> Ver Foto em Alta Resolução
                            </a>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- ✨ SIMULAÇÕES DE ACABAMENTOS POR INTELIGÊNCIA ARTIFICIAL -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-purple-900 m-0">✨ Simulações de Ambientes & Acabamentos por IA</h3>
                <span class="text-xs text-gray-400">Sugestões estéticas da Designer de Interiores</span>
            </div>

            <ul class="text-xs text-gray-700 space-y-2.5 pl-0 list-none m-0">
                <li class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div>
                        <strong>• Cozinha Integrada:</strong> Bancada em Quartzo Branco + Cuba Gourmet de Inox
                    </div>
                    <span class="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-[11px]">✅ Aprovado por Você</span>
                </li>
                <li class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div>
                        <strong>• Living Social:</strong> Porcelanato Retificado Calacata 90x90cm
                    </div>
                    <span class="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-[11px]">✅ Aprovado por Você</span>
                </li>
                <li class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div>
                        <strong>• Sala de Jantar:</strong> Pendente Linear Dourado LED com Fita Embutida
                    </div>
                    <span class="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-[11px]">⏳ Em Análise</span>
                </li>
            </ul>

            <div class="pt-2">
                <a href="/detalhes/" class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl no-underline inline-block">
                    Abrir Estúdio Antes x Depois com IA →
                </a>
            </div>
        </div>

    </div>
{/if}

<!-- ======================================================== -->
<!-- 🏢 2. VISÃO DO EMPREITEIRO / GESTOR (WIREFRAME 4.2)       -->
<!-- ======================================================== -->
{#if activeRole === 'CONTRACTOR'}
    <div class="space-y-8">
        
        <!-- HEADER DO EMPREITEIRO -->
        <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 gap-4">
            <div>
                <div class="text-xs uppercase font-bold tracking-wider text-indigo-600">Painel Executivo da Construtora</div>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 m-0">Cockpit Multi-Obra do Empreiteiro</h1>
                <p class="text-xs text-gray-500 mt-1">Gestão consolidada da carteira, termômetro físico x financeiro, suprimentos e fluxo de caixa.</p>
            </div>

            <a 
                href="/novo-projeto/" 
                class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-black py-3 px-6 rounded-2xl shadow-lg shadow-indigo-600/30 no-underline transition-all flex items-center gap-2"
            >
                <span class="text-base font-bold">+</span> Cadastrar Nova Obra
            </a>
        </div>

        <!-- 4 BIGVALUES DO EMPREITEIRO (Wireframe 4.2) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BigValue data={kpis_obra} value="orcamento_total_eap" title="Carteira Total (R$)" fmt="brl" />
            <BigValue data={caixa_obra} value="margem_caixa" title="Margem Atual em Caixa" fmt="brl" />
            <BigValue data={kpis_obra} value="desvio_pct" title="Desvio Físico x Fin." fmt="pct1" />
            <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Gargalos de Compra</div>
                <div class="text-2xl font-black text-rose-600">🚨 1 Insumo</div>
                <div class="text-[11px] text-rose-700 font-semibold mt-1">Entrega em &le; 7 dias</div>
            </div>
        </div>

        <!-- 📊 COMPARATIVO DE SAÚDE POR CANTEIRO (TERMÔMETRO FÍSICO x FINANCEIRO) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                        📊 Termômetro de Saúde da Obra (% Físico Auditado vs. % Financeiro Realizado)
                    </h3>
                    <p class="text-xs text-gray-500 mt-0.5">Identifique se o avanço financeiro está superando o avanço físico comprovado por fotos.</p>
                </div>
                <a href="/detalhes/" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 no-underline">
                    Ver Quadro Kanban →
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

        <!-- 🚨 ALERTA DE COMPRAS CRÍTICAS (SUPPLY CHAIN) -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-rose-700 m-0 flex items-center gap-2">
                    <span>🚨</span> Alerta de Compras Críticas & Suprimentos (Supply Chain)
                </h3>
                <span class="text-xs text-gray-400 font-medium">Insumos vinculados aos prazos da EAP</span>
            </div>
            <DataTable data={compras_criticas} rows=6>
                <Column id="alerta" title="Situação" />
                <Column id="material" title="Insumo / Material" />
                <Column id="limite_compra" title="Data Limite" />
                <Column id="recebedor" title="Quem Recebe" />
                <Column id="custo_total" title="Valor Total" fmt="brl" />
            </DataTable>
        </div>

        <!-- 💰 EXTRATO FINANCEIRO & FLUXO DE CAIXA CONSOLIDADO -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0 flex items-center gap-2">
                    <span>💰</span> Extrato Financeiro & Fluxo de Caixa Consolidado
                </h3>
                <span class="text-xs font-bold text-emerald-700">Saldo Atual Auditado</span>
            </div>
            <DataTable data={extrato_caixa} rows=8>
                <Column id="vencimento" title="Vencimento" />
                <Column id="tipo" title="Tipo" />
                <Column id="categoria" title="Categoria" />
                <Column id="descricao" title="Descrição" />
                <Column id="valor" title="Valor" fmt="brl" />
                <Column id="status" title="Status" />
            </DataTable>
        </div>

    </div>
{/if}
