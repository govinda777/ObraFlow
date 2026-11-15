# Diagramas de Infraestrutura por Casos de Uso e Jornadas — ObraFlow

Este documento apresenta a infraestrutura do ObraFlow mapeada ponta a ponta, dividida pela visão geral da arquitetura e detalhada em cada uma das suas **4 jornadas operacionais** principais (Orçamento com IA, Canteiro Mobile, Autenticação/Auditoria e Governança CI/CD).

---

## 1. Topologia Geral da Infraestrutura

Visão consolidada de todos os serviços orquestrados via **OpenTofu**, **Vercel**, **Neon** e APIs externas:

```mermaid
flowchart TD
    subgraph Clients ["1. Camada de Apresentação & Atores"]
        PROPRIETARIO["Proprietário (Web Desktop)"]
        ORCAMENTISTA["Engenheiro / Orçamentista (Web Desktop)"]
        MESTRE["Mestre de Obras / Encarregado (Mobile PWA)"]
        ADMIN["Administrador / Empreiteiro (Web Dashboard)"]
    end

    subgraph VercelEdge ["2. Vercel Platform (Infraestrutura Serverless - Região iad1)"]
        WAF["Vercel Firewall / WAF & DDoS Shield"]
        ROUTER["Next.js App Router (Páginas & Server Actions)"]
        AI_ENGINE["Resilient AI Engine (Vercel AI SDK + Proxy)"]
        BLOB["Vercel Blob Storage (Plantas PDF e Fotos de Vistoria)"]
        AUTH_GUARD["Thirdweb Auth Guard & JWT Verifier"]
    end

    subgraph NeonDB ["3. Neon Serverless Postgres (Região aws-us-east-1)"]
        PGBOUNCER["Connection Pooler (PgBouncer)"]
        DIRECT["Direct Postgres Endpoint (Porta 5432)"]
        
        subgraph Engine ["PostgreSQL 16 Engine (0.25 a 1 CU Autoscaling)"]
            RLS_LAYER["Row-Level Security (RLS Enforcement)"]
            TABLES_CORE[("10 Tabelas de Negócio<br/>projects, tasks, materials, evidences...")]
            TABLES_AUTH[("5 Tabelas de Governança<br/>tenants, memberships, audit_events...")]
        end
    end

    subgraph ExternalServices ["4. Provedores Externos"]
        GEMINI["Google Gemini 2.5 Flash API (Diagnóstico de EAP)"]
        THIRDWEB["Thirdweb Infrastructure (SIWE / Wallets / Signatures)"]
    end

    Clients --> WAF --> ROUTER
    ROUTER --> AI_ENGINE --> GEMINI
    ROUTER --> AUTH_GUARD --> THIRDWEB
    ROUTER --> BLOB
    ROUTER -->|Runtime App Queries| PGBOUNCER --> RLS_LAYER
    RLS_LAYER --> TABLES_CORE
    RLS_LAYER --> TABLES_AUTH
    DIRECT -->|Migrations & DDL| RLS_LAYER
```

---

## 2. Jornada 1: Novo Orçamento & Diagnóstico Inteligente de EAP com IA

**Ator:** Engenheiro / Orçamentista  
**Objetivo:** Fazer upload do PDF da planta/memorial, processar com Google Gemini e gerar a EAP estruturada de macroetapas, custos e insumos.

```mermaid
sequenceDiagram
    autonumber
    actor Eng as Orçamentista
    participant UI as Next.js Web (Client)
    participant Blob as Vercel Blob Storage
    participant Action as Server Action (Vercel iad1)
    participant AI as Resilient AI Engine (AI SDK)
    participant Gemini as Google Gemini 2.5 Flash
    participant Neon as Neon Postgres (Pooler)

    Eng->>UI: Upload de Planta/Memorial (PDF)
    UI->>Blob: Armazenamento seguro do arquivo PDF
    Blob-->>UI: Retorna URL pública assinada do PDF
    UI->>Action: POST /api/ai/extract-eap (URL do PDF + Metadados)
    Action->>AI: extractEAPFromDocument({ documentText, projectContext })
    Note over AI: Middleware mede latência e prepara payload
    AI->>Gemini: Prompt + Schema Zod com generateObject()
    Gemini-->>AI: Resposta validada em JSON estrito (Macroetapas, Tarefas, Custos)
    AI->>Neon: Grava Épicos, Tarefas e Materiais (Tenant isolado por RLS)
    AI->>Neon: Registra evento em audit_events (tokens, modelo, latência)
    Action-->>UI: Retorna EAP completa para revisão na tela
    Eng->>UI: Revisa e aprova o Orçamento da Obra
```

---

## 3. Jornada 2: Canteiro Mobile Touch com Evidência Fotográfica Obrigatória

**Ator:** Mestre de Obras / Encarregado em campo  
**Objetivo:** Concluir uma etapa física de obra no canteiro mediante envio obrigatório de evidência visual (foto) auditada.

```mermaid
sequenceDiagram
    autonumber
    actor Mestre as Mestre de Obras (Mobile)
    participant PWA as Canteiro PWA Touch
    participant Blob as Vercel Blob Storage
    participant Action as Server Action (Next.js)
    participant TW as Thirdweb Signature / SIWE
    participant Neon as Neon Postgres 16

    Mestre->>PWA: Seleciona Tarefa (ex: "Alvenaria de vedação")
    Mestre->>PWA: Tenta marcar como "DONE"
    Note over PWA: Cláusula Pétrea: Sistema BLOQUEIA sem foto
    Mestre->>PWA: Tira foto em tempo real do canteiro
    PWA->>Blob: Upload da Foto de Evidência (.jpg)
    Blob-->>PWA: URL permanente da evidência no Blob CDN
    PWA->>TW: Assina digitalmente o registro da evidência (EIP-712 / Wallet)
    TW-->>PWA: Hash e assinatura criptográfica
    PWA->>Action: Concluir tarefa (task_id, photo_url, signature)
    Action->>Neon: INSERT into evidences (task_id, photo_url, signature)
    Action->>Neon: UPDATE tasks SET status = 'DONE' WHERE id = task_id
    Action->>Neon: INSERT into audit_events (ação, mestre_id, timestamp)
    Neon-->>Action: Transação ACID confirmada
    Action-->>PWA: Status atualizado com sucesso
    PWA-->>Mestre: Exibe selo verde "Concluído com Evidência"
```

---

## 4. Jornada 3: Autenticação Multi-Tenant, Resolução de Sessão e RLS

**Atores:** Todos os perfis (Proprietário, Construtor, Engenheiro, Designer)  
**Objetivo:** Login seguro sem senhas fracas, mapeamento de tenants no Neon e isolamento automático de dados via Row-Level Security.

```mermaid
flowchart TD
    subgraph AuthStep ["1. Autenticação & Identidade"]
        LOGIN["Usuário clica em 'Conectar com Thirdweb' (Email/Social/Passkey/Wallet)"]
        SIWE["Assinatura do desafio criptográfico SIWE (EIP-4361)"]
        LOGIN --> SIWE
    end

    subgraph ResolutionStep ["2. Resolução de Autorização no Neon"]
        BACKEND["Server-Side: Validação da prova Thirdweb"]
        DB_QUERY["Consulta no Neon: tenant_memberships WHERE thirdweb_id = ?"]
        ROLE_CHECK{"Possui Membership Ativo?"}
        SIWE --> BACKEND --> DB_QUERY --> ROLE_CHECK
        ROLE_CHECK -->|Sim| SET_JWT["Emite JWT assinado com tenant_id e role"]
        ROLE_CHECK -->|Não| PENDING["Status PENDING (Aguardando convite)"]
    end

    subgraph DataAccess ["3. Execução de Requisições com RLS"]
        REQ["Requisição com Cookie JWT de Sessão"]
        CONN["Abre conexão via PgBouncer Pooler"]
        SET_CONTEXT["Executa: SET LOCAL app.current_tenant_id = 'tenant-xyz'"]
        RLS_FILTER{"Políticas RLS Avaliadas no PostgreSQL"}
        QUERY_DATA[("Retorna estritamente as linhas pertencentes ao Tenant do usuário")]
        
        SET_JWT --> REQ --> CONN --> SET_CONTEXT --> RLS_FILTER --> QUERY_DATA
    end
```

---

## 5. Jornada 4: Infraestrutura como Código & Ciclo de Vida CI/CD (Zero Tokens)

**Ator:** Desenvolvedor / DevOps  
**Objetivo:** Subir, validar e destruir a infraestrutura sob demanda sem expor nem criar tokens estáticos manuais.

```mermaid
flowchart LR
    subgraph DevMachine ["Terminal do Desenvolvedor (Mac)"]
        CLI_LOGIN["npx neonctl login<br/>npx vercel login<br/>(OAuth via Browser)"]
        NPM_UP["npm run infra:up"]
        NPM_DOWN["npm run infra:down"]
    end

    subgraph LocalRunner ["Runner Automatizado (scripts/tofu-infra.cjs)"]
        READ_SESS["Lê sessão OAuth ativa (~/.config/neon e Library/Application Support)"]
        EXEC_TOFU["Dispara OpenTofu com credencial em memória"]
    end

    subgraph CloudInfra ["Provedores de Nuvem"]
        NEON_CLOUD["Neon Cloud API:<br/>Provisiona Projeto, Compute, Pooler e Roles"]
        VERCEL_CLOUD["Vercel API:<br/>Provisiona Projeto, Git Link e GEMINI_MODEL"]
    end

    CLI_LOGIN --> READ_SESS
    NPM_UP --> READ_SESS --> EXEC_TOFU -->|OpenTofu Apply| NEON_CLOUD & VERCEL_CLOUD
    NPM_DOWN --> READ_SESS --> EXEC_TOFU -->|OpenTofu Destroy| NEON_CLOUD & VERCEL_CLOUD
```

---

## 6. Matriz de Auditoria de Componentes

| Componente | Planejado em | Onde está no Código | Status Atual | Detalhes / Observações |
| :--- | :--- | :--- | :--- | :--- |
| **Cluster Neon (PostgreSQL 16)** | ADR-0004 | `infra/terraform/neon/main.tf` | 🟢 **Coberto (IaC)** | Provisiona projeto, Postgres 16, autoscaling compute (0.25-1 CU) e region matching (`aws-us-east-1`). |
| **Connection Pooler (PgBouncer)** | ADR-0004 | `infra/terraform/neon/outputs.tf` | 🟢 **Coberto (IaC)** | Gerado nativamente pelo Neon no endpoint pooled (`database_host_pooler`). |
| **PITR History Retention** | ADR-0004 | `infra/terraform/neon/variables.tf` | 🟢 **Coberto (IaC)** | Suporta 6h (Free) e escalável para 86400s (24h+ em Pro). |
| **Projeto Vercel (Next.js)** | ADR-0004 | `infra/terraform/vercel/main.tf` | 🟢 **Coberto (IaC)** | Configura projeto, Node 22, Git integration (`govinda777/ObraFlow`), root dir e região (`iad1`). |
| **Motor de IA Resiliente (Gemini)** | ADR-0006 | `infra/terraform/vercel/main.tf` & `src/lib/ai/` | 🟢 **Coberto (IaC + App)** | Injeta `GEMINI_MODEL = "gemini-2.5-flash"` e usa Vercel AI SDK com Zod schemas. |
| **Regras de Build & Dependências** | ADR-0004 | `infra/terraform/vercel/main.tf` | 🟢 **Coberto (IaC)** | `install_command = "npm ci --legacy-peer-deps"` e `build_command = "npm run build:web"`. |
| **Vercel Blob Storage** | ADR-0004 | Vercel Storage Console / API | 🟡 **Provisionamento Externo** | Habilitado via Dashboard Vercel (`Storage > Create Blob Store`). Injeta `BLOB_READ_WRITE_TOKEN`. |
| **Roles PostgreSQL Menor Privilégio** | ADR-0004 / ADR-0005 | `infra/terraform/neon/main.tf` | 🟢 **Coberto (IaC)** | Declara `obraflow_runtime` (apenas DML com RLS) e `obraflow_migrator` (DDL restrito, sem bypass de RLS). |
| **Schema e 10 Tabelas MER** | ADR-0004 | `scripts/db/migrations/0001_*.sql` | 🟢 **Coberto (Migrations)** | `users`, `projects`, `epics`, `collaborators`, `tasks`, `materials`, `evidences`, `financial_transactions`, `payrolls`, `ai_room_simulations`. |
| **Multi-tenancy & Auditoria (5 Tabelas)** | ADR-0005 | `scripts/db/migrations/0002_*.sql` | 🟢 **Coberto (Migrations)** | `tenants`, `tenant_memberships`, `role_permissions`, `project_memberships`, `audit_events`. |
| **Políticas de Row-Level Security (RLS)** | ADR-0005 | `scripts/db/migrations/0002_*.sql` | 🟢 **Coberto (Migrations)** | RLS ativada com políticas de tenant context em todas as tabelas sensíveis. |
