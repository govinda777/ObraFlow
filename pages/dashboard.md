---
title: ObraFlow — Dashboard Global Multi-Obra
---

<script>
    // Role Switcher Interativo (Simula a visão selecionada no Onboarding)
    let activeRole = 'CLIENT'; // 'CLIENT' ou 'CONTRACTOR'
</script>

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

<!-- BARRA DE CONTROLE SUPERIOR: ROLE SWITCHER E SELETOR DE OBRA -->
<div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white mb-6 shadow-md flex flex-wrap justify-between items-center gap-4">
    <div class="flex items-center gap-3">
        <span class="text-xs uppercase font-bold text-indigo-300">Perfil Ativo:</span>
        <button 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all {activeRole === 'CLIENT' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}"
            on:click={() => activeRole = 'CLIENT'}
        >
            👤 Visão do Cliente
        </button>
        <button 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all {activeRole === 'CONTRACTOR' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}"
            on:click={() => activeRole = 'CONTRACTOR'}
        >
            🏢 Visão do Empreiteiro
        </button>
    </div>

    <div class="flex items-center gap-3">
        <span class="text-xs text-indigo-300 font-semibold">Canteiro:</span>
        <Dropdown
            data={lista_obras}
            name="obra_filtro"
            value="id"
            label="name"
            defaultValue="proj_1"
        />
        {#if activeRole === 'CLIENT'}
            <a href="./novo-projeto" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl no-underline shadow-sm transition-all flex items-center gap-1.5">
                <span>+</span> Solicitar Novo Orçamento
            </a>
        {:else}
            <a href="./novo-projeto" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl no-underline shadow-sm transition-all flex items-center gap-1.5">
                <span>+</span> Cadastrar Nova Obra
            </a>
        {/if}
    </div>
</div>

{#if activeRole === 'CLIENT'}
    <!-- ==================== 1. VISÃO DO CLIENTE ==================== -->
    <div class="mb-4 flex items-center justify-between">
        <div>
            <h2 class="text-xl font-bold text-gray-900 m-0">📱 Portal de Transparência do Proprietário</h2>
            <p class="text-xs text-gray-500 mt-0.5">Acompanhe o avanço real da sua obra com comprovação por fotos e simulações com IA.</p>
        </div>
        <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
            Status: Obra em Andamento
        </span>
    </div>

    <!-- 4 BIGVALUES DO CLIENTE -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <BigValue data={kpis_obra} value="orcamento_total_eap" title="Total Orçado da Obra" fmt="brl" />
        <BigValue data={kpis_obra} value="avanco_fisico_pct" title="Avanço Físico (c/ Foto)" fmt="pct1" />
        <BigValue data={caixa_obra} value="receita_recebida" title="Parcelas Liberadas" fmt="brl" />
        <BigValue data={kpis_obra} value="total_fisico_brl" title="Valor Físico Entregue" fmt="brl" />
    </div>

    <!-- MASTER PIPELINE DAS OBRAS DO CLIENTE -->
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider m-0">📅 Minhas Obras Cadastradas</h3>
            <a href="./novo-projeto" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 no-underline">+ Solicitar Novo Orçamento</a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border border-emerald-200 bg-emerald-50/30 p-4 rounded-xl">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-sm text-gray-900">🏠 Residencial Alpha</span>
                    <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">62% Concluído</span>
                </div>
                <div class="text-xs text-gray-500 mb-2">Rua das Palmeiras, 123 • Construtora Alpha</div>
                <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
                    <div class="bg-emerald-500 h-full" style="width: 62%;"></div>
                </div>
                <div class="text-[11px] text-gray-600 flex justify-between">
                    <span>5 Vistorias com Foto</span>
                    <span class="font-bold text-emerald-700">R$ 73.850,00</span>
                </div>
            </div>

            <div class="border border-blue-200 bg-blue-50/30 p-4 rounded-xl">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-sm text-gray-900">🏢 Reforma Loft Jardins</span>
                    <span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">15% Concluído</span>
                </div>
                <div class="text-xs text-gray-500 mb-2">Alameda dos Anapurus, 780 • Construtora Alpha</div>
                <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
                    <div class="bg-blue-500 h-full" style="width: 15%;"></div>
                </div>
                <div class="text-[11px] text-gray-600 flex justify-between">
                    <span>Contrato Assinado Recente</span>
                    <span class="font-bold text-blue-700">R$ 45.000,00</span>
                </div>
            </div>
        </div>
    </div>

    <!-- FOTOS RECENTES DO CANTEIRO -->
    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">📸 Comprovações Fotográficas do Canteiro (Evidências)</h3>
    <Grid cols=3>
    {#each fotos_recentes as foto}
        <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div class="text-[10px] text-gray-500 font-bold mb-1">📅 {foto.data_envio}</div>
            <div class="font-bold text-xs text-gray-900 mb-1">{foto.tarefa}</div>
            <p class="text-[11px] text-gray-600 leading-snug mb-2">{foto.notes}</p>
            <div class="text-[11px]">
                <a href="{foto.photo_url}" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline">📷 Ver Foto da Evidência</a>
            </div>
        </div>
    {/each}
    </Grid>

{:else}
    <!-- ==================== 2. VISÃO DO EMPREITEIRO ==================== -->
    <div class="mb-4 flex items-center justify-between">
        <div>
            <h2 class="text-xl font-bold text-gray-900 m-0">🏢 Cockpit Multi-Obra do Empreiteiro</h2>
            <p class="text-xs text-gray-500 mt-0.5">Gestão de carteira, termômetro físico x financeiro, alertas de compras e caixa.</p>
        </div>
        <span class="text-xs bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full">
            Painel Executivo
        </span>
    </div>

    <!-- 4 BIGVALUES DO EMPREITEIRO -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <BigValue data={kpis_obra} value="orcamento_total_eap" title="Orçamento da Carteira" fmt="brl" />
        <BigValue data={caixa_obra} value="margem_caixa" title="Margem Atual de Caixa" fmt="brl" />
        <BigValue data={kpis_obra} value="avanco_fisico_pct" title="% Avanço Físico" fmt="pct1" />
        <BigValue data={kpis_obra} value="avanco_financeiro_pct" title="% Avanço Financeiro" fmt="pct1" />
    </div>

    <!-- TERMÔMETRO FÍSICO X FINANCEIRO POR ÉPICO -->
    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">📊 Termômetro de Saúde da Obra (% Físico vs. % Financeiro)</h3>
    <BarChart
        data={saude_epicos_gestor}
        x="epico"
        y={["avanco_fisico", "avanco_financeiro"]}
        type="grouped"
        yFmt="pct0"
    />

    <!-- CRONOGRAMA DE COMPRAS CRÍTICAS (SUPPLY CHAIN) -->
    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 mt-6">🚨 Alerta de Compras e Suprimentos (Supply Chain)</h3>
    <DataTable data={compras_criticas} rows=6>
        <Column id="alerta" title="Situação" />
        <Column id="material" title="Insumo / Material" />
        <Column id="limite_compra" title="Data Limite" />
        <Column id="recebedor" title="Quem Recebe" />
        <Column id="custo_total" title="Valor Total" fmt="brl" />
    </DataTable>

    <!-- EXTRATO FINANCEIRO -->
    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 mt-6">💰 Extrato de Movimentações Financeiras</h3>
    <DataTable data={extrato_caixa} rows=8>
        <Column id="vencimento" title="Vencimento" />
        <Column id="tipo" title="Tipo" />
        <Column id="categoria" title="Categoria" />
        <Column id="descricao" title="Descrição" />
        <Column id="valor" title="Valor" fmt="brl" />
        <Column id="status" title="Status" />
    </DataTable>
{/if}
