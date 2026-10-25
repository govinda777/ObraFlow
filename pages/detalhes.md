---
title: Detalhes da Tarefa, Evidência e Admin - ObraFlow
---

## 1. Detalhamento de Tarefa e Regra de Conclusão (Foto Obrigatória)

```sql detalhe_tarefa
SELECT
    t.id AS task_id,
    t.title AS tarefa,
    t.cost_labor AS custo_mao_de_obra,
    SUM(m.quantity * m.unit_price) AS custo_materiais_total,
    t.kanban_status AS status,
    'SIM' AS foto_obrigatoria,
    (t.cost_labor + COALESCE(SUM(m.quantity * m.unit_price), 0)) AS peso_financeiro_tarefa
FROM obraflow.tasks t
LEFT JOIN obraflow.materials m ON m.task_id = t.id
WHERE t.id = 'task_1'
GROUP BY t.id, t.title, t.cost_labor, t.kanban_status
```

<DataTable data={detalhe_tarefa}>
    <Column id="tarefa" title="Nome da Tarefa" />
    <Column id="custo_mao_de_obra" title="Custo Mão de Obra" fmt="brl" />
    <Column id="custo_materiais_total" title="Custo Materiais" fmt="brl" />
    <Column id="peso_financeiro_tarefa" title="Peso Financeiro (Total)" fmt="brl" />
    <Column id="status" title="Status Kanban" />
    <Column id="foto_obrigatoria" title="Exige Foto p/ Concluir?" />
</DataTable>

---

## 2. Galeria de Evidências Cronológicas (Transparência)

```sql evidencias_galeria
SELECT
    e.id,
    t.title AS tarefa_ref,
    e.photo_url,
    e.notes,
    CAST(e.created_at AS DATE) AS data_envio
FROM obraflow.evidences e
JOIN obraflow.tasks t ON t.id = e.task_id
ORDER BY e.created_at DESC
```

<Grid cols=3>
{#each evidencias_galeria as evid}
    <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <div class="text-[10px] text-gray-500 font-bold mb-1">{evid.data_envio}</div>
        <img src={evid.photo_url} alt="Evidência" class="w-full h-32 object-cover rounded border border-gray-200 mb-2" />
        <div class="font-bold text-xs text-gray-900 leading-tight mb-1">{evid.tarefa_ref}</div>
        <p class="text-[11px] text-gray-600 leading-snug m-0">{evid.notes}</p>
    </div>
{/each}
</Grid>

---

## 3. Visão Consolidada do Administrador (Multi-obras)

```sql obras_admin
SELECT
    p.name AS obra,
    p.status AS status_geral,
    COUNT(t.id) AS total_tarefas,
    SUM(CASE WHEN t.kanban_status = 'DONE' THEN 1 ELSE 0 END) AS tarefas_concluidas,
    ROUND(100.0 * SUM(CASE WHEN t.kanban_status = 'DONE' THEN 1 ELSE 0 END) / COUNT(t.id), 1) AS avanco_fisico_geral_pct
FROM obraflow.projects p
JOIN obraflow.epics e ON e.project_id = p.id
JOIN obraflow.tasks t ON t.epic_id = e.id
GROUP BY p.id, p.name, p.status
```

<DataTable data={obras_admin}>
    <Column id="obra" title="Projeto / Canteiro" />
    <Column id="status_geral" title="Status" />
    <Column id="total_tarefas" title="Total Tarefas EAP" />
    <Column id="tarefas_concluidas" title="Tarefas Concluídas (c/ Foto)" />
    <Column id="avanco_fisico_geral_pct" title="Avanço Físico %" fmt="pct1" contentType="bar" />
</DataTable>
