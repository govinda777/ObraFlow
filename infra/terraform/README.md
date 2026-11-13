# IaC do ObraFlow — criar e destruir

Este diretório usa OpenTofu para provisionar Neon e Vercel. Os módulos têm
states independentes:

| Módulo | Provisiona | Ainda não configura |
| --- | --- | --- |
| `neon/` | Projeto PostgreSQL, branch raiz, compute, retenção PITR, database name e roles runtime/migration separadas | Grants de objetos/RLS (migrations), distribuição de secrets, state remoto e branches efêmeras |
| `vercel/` | Projeto Next.js conectado ao Git, região das Functions, variáveis públicas e secrets write-only por ambiente/branch | Domínios, Firewall/WAF e integração automatizada Preview↔Neon |

## Antes de começar

- OpenTofu `>= 1.11.0` instalado.
- Tokens autorizados no ambiente do terminal: `NEON_API_KEY` e/ou
  `VERCEL_API_TOKEN`. Nunca os grave em `.tfvars`, argumentos `-var` ou Git.
- Valores confirmados para os arquivos `.tfvars`: ambiente, regiões, team ID,
  repositório e branch. Os valores `<...>` são placeholders.
- O backend remoto com criptografia, controle de acesso e locking ainda não foi
  definido. **Até isso ser configurado, use somente ambiente descartável de
  desenvolvimento com state local; não aplique em staging/produção.**

O state Neon pode conter dados sensíveis. Não compartilhe state ou arquivos de
plano. Os arquivos `*.tfstate`, `*.tfplan` e `*.tfvars` estão ignorados pelo Git.

## Validar sem acessar contas

Antes de configurar tokens, rode `npm run test:iac`. Os testes usam providers
mockados e verificam grants/roles do Neon, senhas mínimas, escopo de secrets de
Preview e bloqueio de credenciais de migration na Vercel. Eles não criam
recursos remotos. O CI também executa `fmt`, `init -lockfile=readonly` e
`validate` para os dois módulos.

## Criar ambiente descartável

1. Copie os exemplos e preencha valores reais/verificados:

   ```sh
   cp infra/terraform/neon/terraform.tfvars.example infra/terraform/neon/terraform.tfvars
   cp infra/terraform/vercel/terraform.tfvars.example infra/terraform/vercel/terraform.tfvars
   ```

   Em Neon, use `environment = "development"`. Confirme que as regiões Neon e
   Vercel são compatíveis. Para Vercel, confirme a equipe e o repositório.

2. Exporte os tokens necessários na sessão atual:

   ```sh
   export NEON_API_KEY="<token-neon>"
   export VERCEL_API_TOKEN="<token-vercel>"
   ```

3. Inicialize cada módulo e selecione um workspace separado por ambiente:

   ```sh
   tofu -chdir=infra/terraform/neon init
   tofu -chdir=infra/terraform/neon workspace new development
   tofu -chdir=infra/terraform/vercel init
   tofu -chdir=infra/terraform/vercel workspace new development
   ```

   Se o workspace já existir, use `workspace select development`. Sempre
   confirme `workspace show` antes de planejar. Não crie um workspace novo para
   contornar state perdido ou divergente.

4. Valide, gere e revise o plano. Na primeira passagem do Neon, mantenha
   `manage_runtime_role = false` e `manage_migration_role = false` (padrão):
   os endpoints só existem depois que o projeto Neon é criado. Repita
   separadamente para Neon e Vercel:

   ```sh
   tofu -chdir=infra/terraform/neon fmt -check -recursive
   tofu -chdir=infra/terraform/neon validate
   tofu -chdir=infra/terraform/neon plan -var-file=terraform.tfvars -out=create.tfplan
   tofu -chdir=infra/terraform/neon show create.tfplan
   ```

   Para Vercel, troque `neon` por `vercel` nos quatro comandos. Pare se o plano
   mostrar remoção/substituição, conta ou região inesperada, ou recursos além do
   ambiente descartável solicitado.

5. Depois da revisão explícita, aplique o plano de cada módulo:

   ```sh
   tofu -chdir=infra/terraform/neon apply create.tfplan
   tofu -chdir=infra/terraform/vercel apply create.tfplan
   ```

   Aplicar um arquivo de plano executa exatamente as ações revisadas sem uma
   segunda confirmação interativa. No Neon, esta primeira passagem cria o
   projeto e expõe somente identificadores/host/database name, nunca senhas.

6. Gerencie as roles runtime e migration numa segunda passagem do mesmo
   state/workspace. O
   provider PostgreSQL usa o endpoint direto do Neon para DDL; carregue a
   credencial administrativa de bootstrap por variáveis `PG*` a partir do
   secret manager. O certificado raiz Neon deve estar disponível localmente e
   `PGSSLMODE=verify-full` deve validar host e certificado. A role runtime
   recebe senha write-only/efêmera via `TF_VAR_runtime_role_password`, com pelo
   menos 32 caracteres; não a salve em `.tfvars`, plano, state ou Git.
   Configure também `TF_VAR_manage_runtime_role=true`,
   `TF_VAR_manage_migration_role=true` e a versão das duas senhas. A role
   migration usa `TF_VAR_migration_role_password`, injetada independentemente
   via secret manager; não salve nenhuma senha em `.tfvars`, plano, state ou Git.
   Exemplo de variáveis não secretas para obter os valores de conexão:

   ```sh
   export PGHOST="$(tofu -chdir=infra/terraform/neon output -raw database_host)"
   export PGPORT=5432
   export PGDATABASE="$(tofu -chdir=infra/terraform/neon output -raw database_name)"
   export PGSSLMODE=verify-full
   export PGSSLROOTCERT="<caminho-do-certificado-raiz-neon>"
   export TF_VAR_manage_runtime_role=true
   export TF_VAR_manage_migration_role=true
   export TF_VAR_runtime_role_password_version=1
   export TF_VAR_migration_role_password_version=1
   ```

   O output `database_host` é somente o host direto para o provider SQL e
   migrations. Para construir `DATABASE_URL` do app, use
   `tofu -chdir=infra/terraform/neon output -raw database_host_pooler` e a
   senha `obraflow_runtime` obtida no secret manager. Não inclua essa URL no
   state OpenTofu.

   `PGUSER`, `PGPASSWORD`, `TF_VAR_runtime_role_password` e
   `TF_VAR_migration_role_password` devem ser injetados na sessão pelo
   gerenciador de secrets, sem incluí-los no histórico do shell.
   Gere e revise um novo plano (mantenha as variáveis efêmeras disponíveis no
   `plan` e no `apply`):

   ```sh
   tofu -chdir=infra/terraform/neon plan -var-file=terraform.tfvars -out=runtime-role.tfplan
   tofu -chdir=infra/terraform/neon show runtime-role.tfplan
   tofu -chdir=infra/terraform/neon apply runtime-role.tfplan
   ```

   Aplique-o somente após aprovação. A role
   `obraflow_runtime` não pode ser destruída enquanto a aplicação depende dela.
   `obraflow_migrator` é separado, sem superuser, `CREATEROLE`, `CREATEDB` ou
   `BYPASSRLS`; recebe `CONNECT`/`CREATE` no database e `USAGE`/`CREATE` no
   schema `public`. O runner recusa conexões com outra role. Configure
   `DATABASE_URL` com o host pooler e a role runtime para o app; configure
   `MIGRATION_DATABASE_URL` direto e com a role `obraflow_migrator` apenas no
   executor de migrations/CI, nunca na runtime Vercel.

   A Vercel aceita secrets write-only por alvo de ambiente. Habilite-os somente
   após confirmar target/branch e injetar os valores via secret manager; secrets
   de Preview precisam estar limitados a uma branch. Não inclua secrets de
   migration/seed. O workflow ainda não provisiona variáveis nem executa
   migrations automaticamente.

### Vercel já tem o projeto

Não aplique um plano que tente criar um duplicado. Confirme o projeto/team ID e
importe o projeto existente no workspace correto usando o formato de import da
versão pinada do provider. Exemplo para projeto de equipe:

```sh
tofu -chdir=infra/terraform/vercel import -var-file=terraform.tfvars vercel_project.obraflow "<team_id>/<project_id>"
```

Use apenas IDs confirmados no painel e confira o formato na
[documentação do resource Vercel Project](https://registry.terraform.io/providers/vercel/vercel/latest/docs/resources/project).
Depois do import, revise o plano e resolva o drift antes de aplicar. Não
importe o recurso em state de outro ambiente.

## Destruir ambiente descartável

Os projetos Neon e Vercel e as roles runtime/migration têm `prevent_destroy = true`.
Portanto, `tofu destroy` deve ser bloqueado por padrão. A destruição do projeto Neon apaga o banco e seus dados:
**nunca use este procedimento em staging/produção** e só prossiga com aprovação
e backup/export verificado.

Para remover intencionalmente um ambiente descartável:

1. Confirme módulo, credencial, backend, workspace com `workspace show` e
   recursos com `tofu state list`.
2. Em alteração temporária e revisada, mantenha `manage_runtime_role = true` e
   `manage_migration_role = true` ao destruir todo o Neon. Remova somente o bloco
   `lifecycle { prevent_destroy = true }` dos recursos exatos no módulo a
   destruir e mantenha a conexão direta para que OpenTofu remova grants e roles
   antes do projeto. Para remover só uma role e preservar o banco, desabilite
   sua flag, remova temporariamente apenas o `prevent_destroy` dessa role e use
   um `plan` normal; confira que o projeto e a outra role não serão alterados.
3. Gere e inspecione um plano de destruição:

   ```sh
   tofu -chdir=infra/terraform/neon plan -destroy -var-file=terraform.tfvars -out=destroy.tfplan
   tofu -chdir=infra/terraform/neon show destroy.tfplan
   ```

   Para Vercel, repita com `infra/terraform/vercel`. Execute um módulo por vez.
   Se houver qualquer recurso inesperado no plano, pare. Para destruir apenas
   a role, use o procedimento específico acima, não `plan -destroy`.
4. Com aprovação explícita do plano revisado, aplique-o:

   ```sh
   tofu -chdir=infra/terraform/neon apply destroy.tfplan
   ```

   Para Vercel, repita com `infra/terraform/vercel`. Aplicar plano salvo não
   pede confirmação adicional; a autorização deve ocorrer antes.
5. Restaure `prevent_destroy = true`. Como a configuração ainda descreve os
   recursos, um próximo `plan` normal proporá recriá-los. Não aplique esse plano
   se a intenção for manter o ambiente removido. Para descomissionamento
   permanente, retire a configuração em mudança revisada após destruir.

Não use `tofu state rm` como atalho: ele apenas deixa de rastrear o recurso,
sem destruí-lo. Não use `-auto-approve` em recursos persistentes.

## Depois da criação

Confira outputs/state sem expor secrets. Valide o app com `npm run test:web` e,
em deploy autorizado, execute os health checks daquele ambiente. Os testes
locais não comprovam conectividade real com Neon/Vercel. A rota protegida
`/api/ready` verifica no banco a role runtime, policies/RLS obrigatórias,
append-only de auditoria e privilégios sensíveis; essa probe ainda precisa ser
executada contra um ambiente Neon autorizado. Health checks do executor de
migrations, Thirdweb, Blob e IA continuam pendentes.
