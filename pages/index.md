---
title: ObraFlow — Relatórios Executivos, Cronograma e Kanban (MER)
---

Painel analítico declarativo (**Evidence.dev + DuckDB**) alimentado diretamente pelos arquivos JSON em `mock_data/`.

---

## 1. Indicadores Globais de Saúde da Obra (EAP Expandida)

```sql eap_por_tarefa
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
    e.title AS epico,
    e.order_index,
    e.status AS status_epico,
    CAST(e.start_date AS DATE) AS inicio_epico,
    CAST(e.end_date AS DATE) AS fim_epico,
    t.title AS tarefa,
    t.description AS descricao,
    t.category AS categoria,
    t.kanban_status,
    c.name AS responsavel,
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
ORDER BY e.order_index, t.due_date, t.id
```

```sql kpis_globais
SELECT
    SUM(c_tarefa_total) AS orcamento_total_eap,
    SUM(valor_fisico_executado) AS total_fisico_brl,
    SUM(valor_financeiro_realizado) AS total_financeiro_brl,
    SUM(valor_fisico_executado) / SUM(c_tarefa_total) AS avanco_fisico_pct,
    SUM(valor_financeiro_realizado) / SUM(c_tarefa_total) AS avanco_financeiro_pct,
    (SUM(valor_financeiro_realizado) - SUM(valor_fisico_executado)) / SUM(c_tarefa_total) AS desvio_pct
FROM ${eap_por_tarefa}
```

```sql margem_empreiteiro
SELECT
    SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS receita_recebida,
    SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS custos_pagos,
    SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END)
      - SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS margem_atual
FROM obraflow.financial_transactions
```

<BigValue data={kpis_globais} value="orcamento_total_eap" title="Orçamento Base Expandido (EAP)" fmt="brl" />
<BigValue data={kpis_globais} value="avanco_fisico_pct" title="Avanço Físico (Comprovado c/ Foto)" fmt="pct1" />
<BigValue data={kpis_globais} value="avanco_financeiro_pct" title="Avanço Financeiro (Realizado)" fmt="pct1" />
<BigValue data={margem_empreiteiro} value="margem_atual" title="Margem de Caixa (Empreiteiro)" fmt="brl" />

---

## 2. Cronograma da Obra (Master Pipeline & Linha do Tempo)

```sql cronograma_epicos
SELECT
    e.order_index,
    e.title AS epico,
    e.status AS status_epico,
    CAST(e.start_date AS DATE) AS inicio,
    CAST(e.end_date AS DATE) AS termino,
    STRFTIME(CAST(e.start_date AS DATE), '%d/%m/%Y') AS inicio_fmt,
    STRFTIME(CAST(e.end_date AS DATE), '%d/%m/%Y') AS termino_fmt,
    DATEDIFF('day', DATE '2026-09-15', CAST(e.start_date AS DATE)) AS dia_inicio_offset,
    DATEDIFF('day', CAST(e.start_date AS DATE), CAST(e.end_date AS DATE)) AS duracao_dias,
    ROUND(100.0 * SUM(t.valor_fisico_executado) / SUM(t.c_tarefa_total), 0) AS pct_fisico,
    ROUND(100.0 * SUM(t.valor_financeiro_realizado) / SUM(t.c_tarefa_total), 0) AS pct_financeiro,
    SUM(t.c_tarefa_total) AS orcamento_epico
FROM obraflow.epics e
JOIN ${eap_por_tarefa} t ON t.epic_id = e.id
GROUP BY e.order_index, e.title, e.status, e.start_date, e.end_date
ORDER BY e.order_index
```

### Master Pipeline (Macroetapas da Obra)

<Grid cols=4>
{#each cronograma_epicos as ep}
    <div class="p-3.5 rounded-lg border {ep.status_epico === 'COMPLETED' ? 'border-emerald-300 bg-emerald-50/40' : ep.status_epico === 'IN_PROGRESS' ? 'border-blue-300 bg-blue-50/40' : 'border-rose-300 bg-rose-50/40'}">
        <div class="text-xs font-bold uppercase tracking-wider {ep.status_epico === 'COMPLETED' ? 'text-emerald-700' : ep.status_epico === 'IN_PROGRESS' ? 'text-blue-700' : 'text-rose-700'}">
            {ep.status_epico === 'COMPLETED' ? '✅ Concluído' : ep.status_epico === 'IN_PROGRESS' ? '🚧 Em Andamento' : '🔒 Bloqueado (Compras)'}
        </div>
        <div class="font-bold text-sm mt-1">{ep.epico}</div>
        <div class="text-xs text-gray-600 mt-1">📅 {ep.inicio_fmt} até {ep.termino_fmt} ({ep.duracao_dias}d)</div>
        <div class="mt-2 text-xs flex justify-between">
            <span>Físico: <strong>{ep.pct_fisico}%</strong></span>
            <span>Financ.: <strong>{ep.pct_financeiro}%</strong></span>
        </div>
    </div>
{/each}
</Grid>

### Gráfico de Gantt — Linha do Tempo dos Épicos (Set/2026 a Nov/2026)

<ECharts config={{
    tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
    },
    grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
    xAxis: {
        type: 'value',
        min: 0,
        max: 75,
        name: 'Dias corridos da Obra (Início: 15/09/2026 | Hoje: Dia 39 - 24/10)',
        nameLocation: 'middle',
        nameGap: 25
    },
    yAxis: {
        type: 'category',
        inverse: true,
        data: cronograma_epicos.map(r => r.epico)
    },
    series: [
        {
            name: 'Início',
            type: 'bar',
            stack: 'gantt',
            itemStyle: { borderColor: 'transparent', color: 'transparent' },
            emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
            data: cronograma_epicos.map(r => r.dia_inicio_offset)
        },
        {
            name: 'Duração da Etapa (Dias)',
            type: 'bar',
            stack: 'gantt',
            label: {
                show: true,
                position: 'inside',
                formatter: (p) => {
                    const row = cronograma_epicos[p.dataIndex];
                    return `${row.inicio_fmt} → ${row.termino_fmt} (${row.pct_fisico}% Físico)`;
                }
            },
            data: cronograma_epicos.map(r => ({
                value: r.duracao_dias,
                itemStyle: {
                    color: r.status_epico === 'COMPLETED' ? '#10b981' : r.status_epico === 'IN_PROGRESS' ? '#3b82f6' : '#f43f5e',
                    borderRadius: 6
                }
            }))
        }
    ]
}} />

### Cronograma Detalhado de Tarefas e Entregas (`due_date`)

```sql cronograma_tarefas
SELECT
    prazo_tarefa,
    epico,
    tarefa,
    categoria,
    responsavel,
    kanban_status,
    c_tarefa_total,
    CASE
        WHEN kanban_status = 'DONE' AND concluida_com_foto THEN '✅ Concluída no Prazo (c/ Foto)'
        WHEN kanban_status = 'DONE' AND NOT concluida_com_foto THEN '⚠️ DONE sem Foto'
        WHEN prazo_tarefa <= DATE '2026-10-26' THEN '🔥 Atenção (Próximos dias)'
        ELSE '📅 Planejada'
    END AS situacao_cronograma
FROM ${eap_por_tarefa}
ORDER BY prazo_tarefa ASC
```

<DataTable data={cronograma_tarefas} rows=15>
    <Column id="prazo_tarefa" title="Prazo Limite" />
    <Column id="situacao_cronograma" title="Situação no Cronograma" />
    <Column id="epico" title="Épico" />
    <Column id="tarefa" title="Tarefa" />
    <Column id="categoria" title="Categoria" />
    <Column id="responsavel" title="Responsável" />
    <Column id="kanban_status" title="Status Kanban" />
    <Column id="c_tarefa_total" title="Peso EAP" fmt="brl" />
</DataTable>

---

## 3. Quadro Kanban Polimórfico (Visões Personalizadas)

Filtre os cartões do quadro Kanban por categoria operacional (**Execução de Campo**, **Logística e Recebimento**, **Compras de Material** ou **Vistorias**):

<ButtonGroup name="filtro_categoria" defaultValue="%">
    <ButtonGroupItem valueLabel="Todas as Tarefas" value="%" />
    <ButtonGroupItem valueLabel="🧱 Execução de Campo" value="EXECUTION" />
    <ButtonGroupItem valueLabel="📦 Logística & Recebimento" value="MATERIAL_RECEIVING" />
    <ButtonGroupItem valueLabel="🛒 Compras de Material" value="MATERIAL_PURCHASE" />
    <ButtonGroupItem valueLabel="🔍 Vistorias" value="INSPECTION" />
</ButtonGroup>

```sql kanban_cards
SELECT *
FROM ${eap_por_tarefa}
WHERE categoria LIKE '${inputs.filtro_categoria}'
ORDER BY order_index, prazo_tarefa
```

<Grid cols=4>
    <!-- COLUNA 1: TODO -->
    <div class="bg-gray-100 p-3 rounded-xl border border-gray-200">
        <div class="font-bold text-xs uppercase tracking-wider text-gray-700 mb-3 flex justify-between items-center">
            <span>📋 A Fazer (TODO)</span>
            <span class="bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'TODO').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'TODO') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-2.5">
                <div class="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 inline-block px-1.5 py-0.5 rounded">{card.categoria}</div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                <div class="text-[11px] text-gray-500 mt-1">{card.epico}</div>
                <div class="text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>📅 {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>

    <!-- COLUNA 2: IN_PROGRESS -->
    <div class="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
        <div class="font-bold text-xs uppercase tracking-wider text-blue-800 mb-3 flex justify-between items-center">
            <span>🚧 Em Andamento</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'IN_PROGRESS').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'IN_PROGRESS') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-blue-200 mb-2.5">
                <div class="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 inline-block px-1.5 py-0.5 rounded">{card.categoria}</div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                <div class="text-[11px] text-gray-500 mt-1">{card.epico}</div>
                <div class="text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>📅 {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>

    <!-- COLUNA 3: REVIEW -->
    <div class="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
        <div class="font-bold text-xs uppercase tracking-wider text-amber-800 mb-3 flex justify-between items-center">
            <span>🔎 Em Conferência (REVIEW)</span>
            <span class="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'REVIEW').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'REVIEW') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-amber-200 mb-2.5">
                <div class="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 inline-block px-1.5 py-0.5 rounded">{card.categoria}</div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                <div class="text-[11px] text-gray-500 mt-1">{card.epico}</div>
                <div class="text-[10px] text-amber-700 mt-1.5 font-medium">📷 Aguardando foto de inspeção</div>
                <div class="text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>📅 {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>

    <!-- COLUNA 4: DONE -->
    <div class="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
        <div class="font-bold text-xs uppercase tracking-wider text-emerald-800 mb-3 flex justify-between items-center">
            <span>✅ Concluído (DONE)</span>
            <span class="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'DONE').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'DONE') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-emerald-200 mb-2.5">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">{card.categoria}</span>
                    <span class="text-[10px] font-bold text-emerald-700">📸 Foto OK</span>
                </div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                {#if card.foto_url}
                    <img src={card.foto_url} alt="Evidência" class="w-full h-20 object-cover rounded mt-2 border border-gray-200" />
                {/if}
                <div class="text-[11px] text-gray-600 mt-2 pt-1.5 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>✓ {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>
</Grid>

---

## 4. Termômetro de Saúde da Obra (Avanço Físico vs. Financeiro por Épico)

> **Diagnóstico de Transparência (Seção 3.4.3 do MER):** O avanço financeiro supera o físico quando materiais de etapas seguintes (como porcelanatos e acabamentos) já foram adquiridos e pagos antecipadamente, aguardando a conclusão da alvenaria/instalações.

```sql saude_por_epico
SELECT
    epico,
    status_epico,
    SUM(c_tarefa_total) AS orcamento_epico,
    SUM(valor_fisico_executado) / SUM(c_tarefa_total) AS avanco_fisico,
    SUM(valor_financeiro_realizado) / SUM(c_tarefa_total) AS avanco_financeiro
FROM ${eap_por_tarefa}
GROUP BY epico, status_epico, order_index
ORDER BY order_index
```

<BarChart
    data={saude_por_epico}
    x="epico"
    y={["avanco_fisico", "avanco_financeiro"]}
    type="grouped"
    yFmt="pct0"
    title="Comparativo % Avanço Físico vs. % Avanço Financeiro por Épico"
/>

<DataTable data={saude_por_epico}>
    <Column id="epico" title="Macroetapa (Épico)" />
    <Column id="status_epico" title="Status Pipeline" />
    <Column id="orcamento_epico" title="Orçamento EAP" fmt="brl" />
    <Column id="avanco_fisico" title="% Físico (DONE + Foto)" fmt="pct1" contentType="bar" />
    <Column id="avanco_financeiro" title="% Financeiro (Gasto)" fmt="pct1" contentType="bar" />
</DataTable>

---

## 5. Gestão e Cronograma de Compras (Supply Chain + Consultoria IA)

```sql cronograma_compras
SELECT
    m.name AS material,
    e.title AS epico,
    m.material_group AS grupo,
    CAST(m.purchase_deadline AS DATE) AS limite_compra,
    CAST(m.estimated_delivery AS DATE) AS previsao_entrega,
    m.receiver_responsible AS recebedor_obra,
    m.total_price AS custo_total,
    m.purchased AS comprado,
    DATEDIFF('day', DATE '2026-10-24', CAST(m.purchase_deadline AS DATE)) AS dias_para_vencer,
    CASE
        WHEN m.purchased = true THEN '✅ Comprado'
        WHEN DATEDIFF('day', DATE '2026-10-24', CAST(m.purchase_deadline AS DATE)) <= 7 THEN '🚨 GARGALO (<= 7 dias)'
        ELSE '⏳ No Prazo'
    END AS alerta_gargalo,
    CASE
        WHEN m.purchased = false AND m.material_group IN ('FINISHINGS', 'LIGHTING', 'DRYWALL')
        THEN '✨ Simular no Cômodo com IA'
        ELSE '—'
    END AS gatilho_ia
FROM obraflow.materials m
JOIN obraflow.tasks t ON t.id = m.task_id
JOIN obraflow.epics e ON e.id = t.epic_id
ORDER BY m.purchase_deadline ASC
```

<DataTable data={cronograma_compras} rows=10>
    <Column id="alerta_gargalo" title="Status / Gargalo" />
    <Column id="material" title="Material / Insumo" />
    <Column id="epico" title="Épico" />
    <Column id="limite_compra" title="Data Limite Compra" />
    <Column id="previsao_entrega" title="Chegada na Obra" />
    <Column id="recebedor_obra" title="Quem Recebe" />
    <Column id="custo_total" title="Total (c/ Frete + Taxa)" fmt="brl" />
    <Column id="gatilho_ia" title="Gatilho Consultoria IA" />
</DataTable>

### Simulações de Ambientes via IA (`ai_room_simulations`)

```sql simulacoes_ia
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

<Grid cols=3>
{#each simulacoes_ia as sim}
    <div class="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <div class="font-bold text-xs text-gray-900 flex justify-between">
            <span>✨ {sim.comodo}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{sim.status_simulacao}</span>
        </div>
        <div class="text-[11px] text-gray-500 mt-0.5 truncate">{sim.material_aplicado}</div>
        <div class="grid grid-cols-2 gap-1.5 mt-2">
            <div>
                <div class="text-[9px] text-gray-500 uppercase font-bold">Antes (Obra Real)</div>
                <img src={sim.original_photo_url} alt="Antes" class="w-full h-24 object-cover rounded border border-gray-200" />
            </div>
            <div>
                <div class="text-[9px] text-indigo-600 uppercase font-bold">Depois (Render IA)</div>
                <img src={sim.generated_photo_url} alt="Depois IA" class="w-full h-24 object-cover rounded border-2 border-indigo-400" />
            </div>
        </div>
    </div>
{/each}
</Grid>

---

## 6. Consumo do Orçamento por Categoria & Fluxo de Caixa (ERP Empreiteiro)

```sql distribuicao_orcamento
SELECT '1. Materiais e Insumos' AS categoria_custo, SUM(custo_insumos) AS valor FROM ${eap_por_tarefa}
UNION ALL
SELECT '2. Folha / Mão de Obra', SUM(custo_mao_de_obra) FROM ${eap_por_tarefa}
UNION ALL
SELECT '3. Frete e Logística', SUM(custo_frete) FROM ${eap_por_tarefa}
UNION ALL
SELECT '4. Taxas de Recebimento em Obra', SUM(custo_recebimento) FROM ${eap_por_tarefa}
UNION ALL
SELECT '5. Consultoria IA (Prototipagem)', SUM(custo_ia) FROM ${eap_por_tarefa}
```

<BarChart
    data={distribuicao_orcamento}
    x="categoria_custo"
    y="valor"
    swapXY=true
    yFmt="brl"
    title="Composição do Orçamento Base Expandido por Categoria (R$)"
/>

### Extrato Financeiro (`financial_transactions`)

```sql extrato_financeiro
SELECT
    CAST(due_date AS DATE) AS vencimento,
    type AS tipo,
    category AS categoria,
    description AS descricao,
    amount AS valor,
    status
FROM obraflow.financial_transactions
ORDER BY due_date ASC
```

<DataTable data={extrato_financeiro} rows=15>
    <Column id="vencimento" title="Vencimento" />
    <Column id="tipo" title="Tipo" />
    <Column id="categoria" title="Categoria" />
    <Column id="descricao" title="Descrição" />
    <Column id="valor" title="Valor" fmt="brl" />
    <Column id="status" title="Status" />
</DataTable>
