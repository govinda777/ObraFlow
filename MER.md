# Arquitetura de Dados e MER Atualizado do ObraFlow

A nova arquitetura de dados do ObraFlow expande o motor central de Épicos e Kanban para englobar o ciclo comercial do cliente (orçamento e assinatura de contrato), o ERP financeiro do empreiteiro (colaboradores, folha de pagamento, contas a pagar/receber), a logística de frete e recebimento em obra, e o módulo de prototipagem de ambientes por Inteligência Artificial.

## 1. Diagrama Entidade-Relacionamento (MER Atualizado)

```mermaid
erDiagram
    User {
        string id PK
        string privy_id UK "Autenticação via Privy"
        string name "Nome completo"
        string email UK "E-mail"
        string role "CLIENT | CONTRACTOR | ENGINEER | FOREMAN | ADMIN"
        timestamp created_at
    }

    Project {
        string id PK
        string name "Nome da Obra"
        string address "Endereço do canteiro"
        string client_id FK "Cliente Proprietário"
        string contractor_id FK "Empreiteiro / Construtora responsável"
        string status "QUOTE_REQUESTED | AI_ANALYZING | BUDGET_READY | APPROVED | CONTRACT_SIGNED | IN_PROGRESS | COMPLETED"
        string scope_pdf_url "PDF inicial no Vercel Blob"
        string contract_pdf_url "Contrato assinado no Vercel Blob"
        timestamp contract_signed_at "Data de assinatura do contrato"
        timestamp created_at
    }

    Collaborator {
        string id PK
        string contractor_id FK "Empreiteiro empregador"
        string name "Nome do colaborador"
        string role_function "Pedreiro | Mestre | Eletricista | Conferente"
        decimal remuneration_rate "Valor da diária ou salário base"
        string payment_info "Dados bancários / Chave PIX"
        boolean active "Status do colaborador"
    }

    Payroll {
        string id PK
        string collaborator_id FK "Colaborador pago"
        string project_id FK "Obra alocada"
        string reference_period "Período (Semana / Mês)"
        decimal amount "Valor total pago"
        string status "PENDING | PAID"
        timestamp due_date "Data de vencimento"
        timestamp paid_at "Data de pagamento"
    }

    FinancialTransaction {
        string id PK
        string project_id FK "Obra relacionada"
        string contractor_id FK "Gestor financeiro"
        string type "PAYABLE | RECEIVABLE"
        string category "MATERIAL | FREIGHT | PAYROLL | RECEIVING_FEE | CLIENT_INSTALLMENT | AI_PROTOTYPING"
        string description "Descrição do lançamento"
        decimal amount "Valor da transação"
        string status "PENDING | PAID | OVERDUE"
        timestamp due_date "Vencimento"
        timestamp paid_at "Data de quitação"
    }

    Epic {
        string id PK
        string project_id FK "Obra associada"
        string title "Macroetapa (Fundação, Estrutura, Acabamento...)"
        int order_index "Ordem na Master Pipeline"
        string status "LOCKED | IN_PROGRESS | COMPLETED"
        boolean requires_materials_purchase "Trava de dependência de compra"
        timestamp start_date "Previsão de início"
        timestamp end_date "Previsão de término"
    }

    Task {
        string id PK
        string epic_id FK "Épico associado"
        string assigned_collaborator_id FK "Colaborador responsável"
        string title "Título da tarefa"
        string description "Instruções técnicas"
        string category "EXECUTION | MATERIAL_PURCHASE | MATERIAL_RECEIVING | INSPECTION | ADMINISTRATIVE"
        string kanban_status "TODO | IN_PROGRESS | REVIEW | DONE"
        decimal cost_labor "Custo planejado de mão de obra"
        timestamp due_date "Prazo limite (alimenta os cronogramas)"
    }

    Material {
        string id PK
        string task_id FK "Tarefa vinculada"
        string created_by_id FK "Cadastrado pelo Cliente ou Empreiteiro"
        string name "Especificação do material"
        string material_group "STRUCTURAL | FINISHINGS | LIGHTING | PLUMBING | DRYWALL"
        string unit "m2 | kg | un | sc"
        decimal quantity "Quantidade necessária"
        decimal unit_price "Preço unitário"
        decimal freight_cost "Custo do frete"
        decimal receiving_fee "Custo de recepção na obra (se Empreiteiro receber)"
        decimal total_price " (quantity * unit_price) + freight_cost + receiving_fee "
        string receiver_responsible "CLIENT | CONTRACTOR"
        string received_by_user_id FK "Usuário que conferiu na entrega"
        boolean purchased "Comprado pelo cliente/empreiteiro"
        string delivery_status "PENDING_PURCHASE | IN_TRANSIT | DELIVERED_INSPECTED | REJECTED"
        timestamp purchase_deadline "Data limite para compra sem atrasar o Épico"
        timestamp estimated_delivery "Previsão de chegada na obra"
    }

    Evidence {
        string id PK
        string task_id FK "Tarefa ou Recebimento validado"
        string uploaded_by FK "Responsável pela foto (Mestre/Cliente/Conferente)"
        string evidence_type "TASK_EXECUTION | MATERIAL_INSPECTION"
        string photo_url "Foto obrigatória no Vercel Blob"
        string notes "Observações de campo ou avarias no material"
        timestamp created_at
    }

    AIRoomSimulation {
        string id PK
        string project_id FK "Obra associada"
        string material_id FK "Material testado (Pia, Revestimento, Luminária...)"
        string requested_by_id FK "Cliente ou Empreiteiro solicitante"
        string room_name "Cômodo (Ex: Banheiro Suíte, Cozinha)"
        string target_element "COUNTERTOP_SINK | FLOOR_TILE | DRYWALL_CEILING | LIGHTING | COATING"
        string original_photo_url "Foto real do cômodo na obra (Vercel Blob)"
        string generated_photo_url "Imagem renderizada pela IA com material instalado"
        decimal consulting_fee "Custo do serviço de consultoria/prototipagem IA"
        string status "PROCESSING | READY | APPROVED_BY_CLIENT"
        timestamp created_at
    }

    User ||--o{ Project : "cria / contrata / gerencia"
    User ||--o{ Collaborator : "emprega (Empreiteiro)"
    Collaborator ||--o{ Payroll : "recebe"
    Project ||--o{ Payroll : "aloca custo de equipe"
    Project ||--o{ FinancialTransaction : "movimenta caixa"
    Project ||--|{ Epic : "divide-se em pipeline"
    Epic ||--|{ Task : "decompõe-se no Kanban"
    Collaborator ||--o{ Task : "executa"
    Task ||--o{ Material : "exige insumos e logística"
    User ||--o{ Material : "cadastra / recebe no canteiro"
    Task ||--o{ Evidence : "comprova conclusão ou recebimento"
    Project ||--o{ AIRoomSimulation : "simula acabamentos via IA"
    Material ||--o{ AIRoomSimulation : "é aplicado virtualmente no cômodo"
```

## 2. Dicionário de Dados Detalhado (Tabelas)

Abaixo explicamos o papel de cada entidade (tabela) que compõe a arquitetura do ObraFlow:

* **User**: Tabela central de usuários. Armazena a identidade (nome, e-mail) e o papel (`role`) no sistema (Cliente, Empreiteiro, Engenheiro, etc.). A autenticação real é delegada ao provedor externo (Privy), por isso o campo `privy_id`.
* **Project**: Representa a obra em si. É o núcleo que liga o proprietário (`client_id`) à construtora (`contractor_id`). Controla a jornada desde o orçamento (`QUOTE_REQUESTED`) até a execução (`IN_PROGRESS`), armazenando links vitais como o PDF do projeto e do contrato assinado.
* **Collaborator**: Representa a força de trabalho operacional do empreiteiro (pedreiros, mestres de obras, eletricistas). Armazena seus dados básicos, taxa de remuneração (diária/salário) e chave de pagamento.
* **Payroll**: Tabela de folha de pagamento que cruza o colaborador com a obra em que ele trabalhou num período específico, gerando a obrigação de pagamento (status pendente ou pago).
* **FinancialTransaction**: O coração financeiro (ERP) do projeto. Registra todas as movimentações de caixa (entradas do cliente e saídas para fornecedores, folha e impostos). Categoriza cada despesa para permitir o cálculo da margem e do avanço financeiro real.
* **Epic**: A macro-divisão estrutural da obra (ex: Fundação, Alvenaria, Acabamento). Serve para ordenar a linha do tempo (Master Pipeline) e travar/destravar o progresso caso existam dependências financeiras ou de compra pendentes.
* **Task**: As tarefas atômicas da obra que compõem um Épico. Elas vivem no Kanban e possuem categorias específicas (execução civil, compra de material, recebimento, etc.). É no nível da tarefa que se registra o custo da mão de obra (`cost_labor`).
* **Material**: Insumos necessários para completar uma tarefa. Esta tabela controla o que, quanto, e por quanto deve ser comprado. Também incorpora toda a inteligência logística: quem recebe no canteiro, frete, e taxa extra caso o empreiteiro assuma o tempo de recebimento da carga.
* **Evidence**: Registro de comprovação em campo (foto obrigatória). Garante transparência total: uma tarefa só é `DONE` fisicamente quando uma evidência fotográfica é anexada.
* **AIRoomSimulation**: O módulo de Inovação em Prototipagem. Registra simulações onde a IA mescla uma foto real do canteiro (em reboco, por exemplo) com materiais virtuais, facilitando a decisão de compra e gerando receita de consultoria (`consulting_fee`).

## 3. Detalhamento das Novas Regras de Negócio no Banco de Dados

| Módulo | Entidades Envolvidas | Como Funciona na Prática |
|---|---|---|
| Jornada Comercial do Cliente | projects | O status evolui de QUOTE_REQUESTED (pedido de orçamento) -> AI_ANALYZING (leitura do PDF via IA) -> BUDGET_READY -> APPROVED (aprovação do orçamento) -> CONTRACT_SIGNED (assinatura registrada em contract_pdf_url e contract_signed_at) -> IN_PROGRESS. |
| Kanban Polimórfico (Visões Personalizadas) | tasks (category) | Cliente e Empreiteiro enxergam o mesmo quadro Kanban (TODO, IN_PROGRESS, REVIEW, DONE), mas o atributo tasks.category permite criar filtros e visões dinâmicas por assunto: Execução Civil, Compras de Material, Recebimento e Conferência, Vistorias e Administrativo. |
| Logística, Frete e Recebimento de Material | materials, tasks, evidences | Tanto CLIENT quanto CONTRACTOR podem cadastrar materiais (created_by_id) e informar o frete (freight_cost). Na entrega, o campo receiver_responsible define quem receberá no canteiro: se for CLIENT, o custo adicional é R$ 0,00 (mas o cliente assume o compromisso de estar na obra); se for CONTRACTOR, o sistema adiciona a taxa receiving_fee ao custo da tarefa para cobrir o deslocamento/tempo do colaborador que fará a checagem com foto obrigatória (evidence_type = MATERIAL_INSPECTION). |
| ERP do Empreiteiro (RH e Financeiro) | collaborators, payrolls, financial_transactions | O empreiteiro cadastra sua equipe em collaborators, gera a folha de pagamento por obra em payrolls e controla todo o fluxo de caixa (parcelas a receber do cliente, pagamento de fornecedores, fretes e diárias) em financial_transactions. |
| Prototipagem de Ambientes via IA | ai_room_simulations, materials | Conectado ao cronograma de compras: o usuário tira uma foto real do cômodo ainda em osso ou reboco (original_photo_url), escolhe os materiais de acabamento (pia, revestimento, forro de gesso, luminárias) e a IA gera uma visualização realista do item instalado (generated_photo_url), destravando a decisão de compra e gerando receita de consultoria (consulting_fee). |

## 3. Relatórios e Cálculos de Avanço (Físico, Financeiro e Compras)

### 3.1. Cálculo de Peso da EAP (Orçamento Base Expandido)
Com a inclusão do frete, da taxa de recebimento em obra e da consultoria de IA, o custo planejado de cada tarefa (C_tarefa) passa a integrar todas as variáveis logísticas e operacionais:
`Custo Total da Tarefa = Custo Mão de Obra + (Soma dos Insumos) + Custo Fretes + Custo Recebimentos + Consultoria IA`

### 3.2. Cálculo do Avanço Físico (% Físico)
O avanço físico mede exclusivamente o trabalho e a logística concluídos e comprovados visualmente no canteiro.
* **Regra de Validação**: Uma tarefa de execução ou de recebimento/conferência de material só atinge 100% quando seu status muda para DONE mediante o upload de uma foto em evidences.
* **Fórmula Matemática**:
`Avanço Físico (%) = (Soma do C_tarefa das Tarefas DONE e Comprovadas) / (Custo Total do Projeto)`

### 3.3. Cálculo do Avanço Financeiro (% Financeiro e Fluxo de Caixa)
O avanço financeiro reflete o consumo real do orçamento somando insumos adquiridos, fretes contratados, taxas de recebimento, folha de pagamento executada e serviços de prototipagem IA.
* **Visão do Orçamento da Obra (Cliente e Empreiteiro)**:
`Avanço Financeiro (%) = (Soma dos Custos Realizados) / (Custo Total Orçado do Projeto)`
* **Visão de Margem e Fluxo de Caixa (Exclusiva do Empreiteiro)**:
`Margem do Projeto = (Receita Total Recebida do Cliente) - (Soma dos Custos de Folha + Repasses a Fornecedores + Impostos)`

### 3.4. Especificação dos Relatórios Inteligentes do Sistema

1. **Relatório de Gestão e Cronograma de Compras (Supply Chain + Consultoria IA)**
* **Lógica de Geração**: Varre todas as tasks filtrando pela categoria MATERIAL_PURCHASE e cruza a data de início dos epics (start_date) com o prazo de entrega do frete (estimated_delivery), ordenando pela data limite de compra (purchase_deadline).
* **Prevenção de Gargalos**: Destaca em vermelho os materiais com purchased = false cujo purchase_deadline vence nos próximos 7 dias, evitando que o Épico fique bloqueado (status = LOCKED).
* **Gatilho de Venda (Consultoria / Prototipagem IA)**: Para todos os itens dos grupos FINISHINGS, LIGHTING e DRYWALL que ainda não foram comprados, o relatório exibe o botão "Simular no Cômodo com IA", abrindo o fluxo da tabela ai_room_simulations para o cliente visualizar pias, revestimentos, gesso e luminárias aplicados na foto real da sua obra antes de bater o martelo na compra.

2. **Painel de Visões Personalizadas do Kanban (Filtros por Categoria)**
* **Visão "Logística e Recebimento em Canteiro"**: Filtra tasks.category = 'MATERIAL_RECEIVING'. Exibe cartões contendo a data prevista do frete (estimated_delivery), quem deve estar na obra para assinar e conferir (receiver_responsible = CLIENT ou CONTRACTOR) e o botão para anexar a foto do material entregue sem avarias.
* **Visão "Execução de Campo"**: Filtra tasks.category = 'EXECUTION', focada no Mestre de Obras e nos colaboradores alocados.

3. **Relatório Comparativo de Saúde da Obra (Termômetro Físico vs. Financeiro)**
* Compara lado a lado o % de Avanço Físico e o % de Avanço Financeiro geral e por Épico.
* Aponta desvios automaticamente: se o cliente antecipou compras de revestimentos e fretes mas a alvenaria ainda não terminou, o relatório explica de forma transparente que a diferença entre o Financeiro e o Físico decorre do estoque de materiais já adquiridos no canteiro, mantendo a confiança entre cliente e empreiteiro.

### 3.5. Simulação Visual de Relatórios (Gráficos)

Abaixo simulamos como os dados estruturados no MER se traduzem em painéis visuais dentro da plataforma ObraFlow.

**Avanço Físico x Avanço Financeiro (Termômetro de Saúde)**
```mermaid
gantt
    title Saúde da Obra (Residencial Alpha)
    dateFormat  YYYY-MM-DD
    axisFormat  %

    section Status Global
    Avanço Físico (Executado)        :done, 2023-01-01, 62d
    Avanço Financeiro (Gasto/Comprado) :active, 2023-01-01, 75d
```
*Interpretação:* O gráfico alerta visualmente que a obra já comprometeu 75% do orçamento financeiro, mas executou apenas 62% do cronograma físico no canteiro.

**Distribuição do Orçamento (Fluxo de Caixa / FinancialTransaction)**
```mermaid
pie title Consumo do Orçamento por Categoria
    "Materiais e Insumos" : 45
    "Folha de Pagamento (Mão de Obra)" : 30
    "Frete e Logística" : 10
    "Impostos e Taxas" : 8
    "Consultoria IA (Prototipagem)" : 7
```
