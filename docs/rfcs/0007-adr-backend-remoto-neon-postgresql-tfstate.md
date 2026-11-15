# ADR 0007: Backend Remoto Nativo no Neon PostgreSQL para Estado do OpenTofu (`pg` Backend)

- **Status:** Proposta (Aceita para Implementação)
- **Data:** 15 de Novembro de 2026
- **Autores:** Engenharia & DevOps ObraFlow
- **Decisores:** Govinda & Time de Arquitetura

---

## 1. Contexto & Problema

O projeto ObraFlow adota **OpenTofu / Terraform** para orquestrar e gerenciar toda a sua infraestrutura declarativa:
- Bancos de dados relacionais Serverless no **Neon PostgreSQL** (`obraflow-staging`, `obraflow-production`).
- Projetos e variáveis de ambiente na **Vercel** (`obraflow-staging`, `obraflow-prod`).

### O Problema Atual (State Drift & Runner Efeito Colateral)
Atualmente, as execuções de IaC no GitHub Actions e localmente operam com estado local (`local backend`):
1. **Ambiente Efêmero de CI/CD**: Cada runner do GitHub Actions roda em um container descartável. Ele inicia com um estado vazio (`empty state`).
2. **Conflito de Recursos (409 Conflict)**: Como o runner não possui a memória dos recursos já criados em execuções anteriores, ele tenta executar `create` em vez de `noop` ou `update`. Isso resulta em falhas graves de pipeline, como:
   `Error creating project ... conflict - Project "obraflow-staging" already exists.`
3. **Falta de State Lock Concorrente**: Se dois desenvolvedores ou duas branches (`main` e `develop`) dispararem ações de IaC ao mesmo tempo, não há trava transacional para impedir condições de corrida e corrupção de recursos.

---

## 2. Decisão Arquitetural

Decidimos adotar o **Backend Remoto Nativo do OpenTofu no PostgreSQL (`backend "pg"`)**, hospedado no próprio cluster PostgreSQL do **Neon**.

```hcl
terraform {
  backend "pg" {
    # conn_str fornecido em runtime via variável de ambiente ou parâmetro de init
    # schema_name = "tofu_state"
  }
}
```

### Por que o backend `pg` do OpenTofu?
1. **Locking Transacional Nativo (`SELECT FOR UPDATE` / Adisory Locks)**:
   O driver PostgreSQL do OpenTofu cria e gerencia uma tabela de estados (`terraform_remote_state`) e implementa travamento automático de concorrência (`State Locking`). Se um job de pipeline estiver executando um `apply`, qualquer outro job que tentar rodar esperará a liberação da trava, impedindo concorrência.
2. **Zero Dependência de Nuvem Adicional**:
   Dispensa a contratação, configuração de buckets e credenciais adicionais de AWS S3, Cloudflare R2 ou Terraform Cloud. O Neon PostgreSQL já é a espinha dorsal de dados do ObraFlow.
3. **Criptografia em Trânsito e em Repouso**:
   Toda conexão com o Neon exige SSL/TLS (`sslmode=require`) e os dados em repouso são criptografados nativamente pelo storage do Neon.
4. **Isolamento por Schema / Workspace**:
   O estado de Staging e o estado de Produção podem residir em schemas ou databases isolados (`tofu_state_staging`, `tofu_state_production`), garantindo blindagem entre ambientes.

---

## 3. Topologia e Fluxo de Estado

```
┌─────────────────────────────────────────────────────────────┐
│                       GitHub Actions                        │
│                                                             │
│   [ Runner CI/CD 1 ]                 [ Runner CI/CD 2 ]     │
│   (Branch main)                      (Branch develop)       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │  tofu init -backend-config   │
               │  tofu plan / apply           │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Neon PostgreSQL Database                 │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Database / Schema: `tofu_state`                     │   │
│   │                                                     │   │
│   │ ├─ Table: `terraform_remote_state` (Versionado)     │   │
│   │ └─ State Lock: PG Advisory Lock (Transacional)      │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. O Dilema do "Ovo e a Galinha" (Bootstrap do Backend)

Como o OpenTofu gerencia o próprio Neon, surge a pergunta clássica de infraestrutura: *Onde fica o banco do backend de estado se o banco ainda não existe?*

### Estratégia de Bootstrap Aprovada:
1. **Banco Raiz de Administração / Metadados (Infra Admin)**:
   Utilizamos o projeto Neon padrão inicial da organização ou uma database dedicada `obraflow_infra_state` para armazenar os estados de IaC.
2. **Parametrização via Variável de Ambiente (`PG_CONN_STR`)**:
   Nos workflows do GitHub Actions e scripts locais, a string de conexão é injetada via secret:
   ```bash
   tofu init \
     -backend-config="conn_str=${STATE_DATABASE_URL}" \
     -backend-config="schema_name=tofu_state_${TARGET_ENV}"
   ```
   Dessa forma, nenhuma credencial de banco é salva em código estático no repositório.

---

## 5. Prós e Contras

### Vantagens:
- **Idempotência Real**: `tofu plan` reflete com 100% de exatidão o que existe na nuvem antes de tocar em qualquer recurso.
- **Segurança de Concorrência**: Trava transacional automática evita duplicação de projetos na Vercel e Neon.
- **Histórico e PITR**: Como o Neon possui *Point-in-Time Recovery*, versões antigas de estados podem ser recuperadas em caso de desastre.
- **Custo Zero Adicional**: Utiliza a infraestrutura de banco de dados já contratada e aprovada no ADR 0004.

### Desvantagens e Mitigações:
- *Risco de Exclusão do Banco de Estado*:
  - **Mitigação**: O banco de estado do IaC possui `prevent_destroy = true` e fica isolado dos bancos efêmeros de teste da aplicação.
- *Dependência de Rede*:
  - **Mitigação**: O Neon opera em `aws-us-east-1` com alta disponibilidade nativa.

---

## 6. Plano de Implementação

1. **Criar schema dedicado no Postgres**:
   - Criação do schema `tofu_state_staging` e `tofu_state_production`.
2. **Atualizar `infra/terraform/neon` e `infra/terraform/vercel`**:
   - Declarar o bloco `terraform { backend "pg" {} }`.
3. **Atualizar `scripts/tofu-infra.cjs`**:
   - Adicionar o `-backend-config` consumindo a string de conexão autenticada.
4. **Atualizar `.github/workflows/infra-gitops.yml`**:
   - Injetar o segredo `STATE_DATABASE_URL` no `tofu init`.
