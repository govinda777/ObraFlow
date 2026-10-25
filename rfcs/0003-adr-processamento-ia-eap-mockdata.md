# ADR-0003: Pipeline de IA para Ingestão de Insumos do Cliente, Decomposição em EAP (Épicos/Tarefas) e Persistência de Obras

| Metadado | Valor |
| :--- | :--- |
| **Status** | 🟡 `Proposed` |
| **Data** | 2026-10-25 |
| **Autores** | Equipe ObraFlow |
| **Contexto** | `pages/processamento.md`, `pages/novo-projeto.md`, `mock_data/` |
| **Decisões Relacionadas** | [RFC-0002](./0002-adr-jornada-orcamento-contrato-ia.md), [MER.md](../MER.md), [JOURNEYS.md](../JOURNEYS.md) |

---

## 1. Contexto e Problema

No fluxo comercial e técnico do ObraFlow, o cliente submete múltiplos insumos para orçar uma nova obra (memorial descritivo em texto, planta executiva e planilha de quantidades/preços de referência). 

Atualmente, na tela de processamento (`pages/processamento.md`), o botão **⚡ Reexecutar IA** apenas valida a conectividade da API Key do Gemini com um prompt textual genérico, sem processar os insumos técnicos do cliente de ponta a ponta e sem gerar uma decomposição estruturada de **Épicos** e **Tarefas (EAP)** pronta para auditoria do engenheiro orçamentista. 

Além disso, ao avançar pelas sub-etapas até o aceite final do contrato, os dados precisam ser consolidados e persistidos na base de dados do protótipo (`mock_data/projects.json`, `mock_data/epics.json`, `mock_data/tasks.json`), permitindo que a nova obra passe a existir no sistema, reflita no Cockpit Global do Empreiteiro (`pages/dashboard.md`) e no Quadro Kanban (`pages/detalhes.md`).

---

## 2. Decisão Arquitetural

1. **Ingestão Completa de Insumos do Cliente:**
   - A tela `pages/processamento.md` passará a carregar os insumos fornecidos na etapa anterior (nome da obra, endereço, área m², teto financeiro, memorial descritivo, lista de arquivos anexados e observações do cliente).
   - O prompt enviado ao Google Gemini será estruturado para atuar como o **Agente Técnico de Engenharia Orçamentista**, solicitando como resposta um JSON estrito contendo:
     - `diagnostico`: Análise técnica do escopo e identificação de riscos/intervenções.
     - `orcamento_base`: Estimativa preliminar total sugerida.
     - `epicos`: Lista de macroetapas numeradas (ex: Demolição, Instalações, Revestimentos, Acabamentos).
     - `tarefas`: Lista de microtarefas detalhadas por épico com categoria (`EXECUTION`, `MATERIAL_RECEIVING`), prazo sugerido, custo estimado de mão de obra (`cost_labor`) e materiais (`cost_materials`).

2. **Revisão e Ajuste Técnico pelo Orçamentista (Sub-Etapa 3):**
   - Os épicos e tarefas gerados pela IA alimentarão de forma reativa a tabela da EAP em tela.
   - O orçamentista poderá editar os valores de mão de obra e insumos diretamente na tabela, recalibrando a proposta antes de gerar o contrato.

2. **Persistência Direta em `/Users/govinda/projetos/ObraFlow/mock_data/`:**
   - Em vez de reter os dados apenas em `localStorage`, a aplicação salvará os novos registros **diretamente nos arquivos físicos em disco**:
     - `mock_data/projects.json`: Registra a nova obra com todos os metadados (nome, endereço, área m², teto orçamentário, documentos anexados, diagnóstico e confiança da IA).
     - `mock_data/epics.json`: Registra os Épicos gerados pela IA para a nova obra.
     - `mock_data/tasks.json`: Registra todas as Tarefas operacionais com mão de obra, materiais e datas.
   - **Mecanismo de Gravação em Disco:**
     - Um serviço backend leve em Node.js (`scripts/mock-data-server.js`) rodando em segundo plano (porta local 3001) expõe a rota `POST http://localhost:3001/api/save-mock`.
     - Ao clicar em `Enviar para Processamento IA →` em `novo-projeto.md` ou em `Reexecutar IA` / `Confirmar Aceite` em `processamento.md`, o frontend dispara a gravação assíncrona para esse serviço, que escreve os JSONs atualizados em `mock_data/`.
     - Isso garante que a nova obra passe a existir fisicamente no repositório e seja versionada e processada pelas queries DuckDB do Evidence.

4. **Transição de Estados e Termo de Aceite:**
   - Ao concluir a Sub-Etapa 5 (Assinatura e Aceite do Cliente):
     - Projeto transiciona para `status = 'IN_PROGRESS'`.
     - Registra `contract_signed_at = new Date().toISOString()`.
     - Grava os novos Épicos e Tarefas aprovados vinculados ao `project_id` gerado.
     - Redireciona o usuário para o Dashboard (`pages/dashboard.md`) com o novo canteiro já ativo e refletido nos gráficos e no Kanban.

---

## 3. Consequências e Benefícios

* **Benefícios:**
  - **Experiência Realista:** O cliente e o orçamentista veem a IA trabalhando sobre as informações reais da obra, estruturando de fato os épicos e as tarefas da construção.
  - **Zero Código Legado:** Mantém a coerência estrita com [MER.md](../MER.md) e o formato JSON do `mock_data/`.
  - **Continuidade Ponta a Ponta:** Uma obra recém-criada via formulário agora aparece instantaneamente na lista de obras, no Master Pipeline e no Kanban.
* **Riscos Mitigados:**
  - Caso a API Key do Gemini não seja fornecida ou atinja limites de quota, o sistema carrega um conjunto pré-calibrado de alta fidelidade como fallback automático, nunca travando o fluxo do usuário.
