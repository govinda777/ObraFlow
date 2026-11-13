# Neon — infraestrutura declarativa

Para criar ou destruir os ambientes com segurança, consulte o
[`README de IaC`](../README.md).

Esta configuração usa o provider mantido pela Neon (`neondatabase/neon`) com
versão exata fixada. A versão publicada atualmente é beta; qualquer upgrade
exige revisão de changelog, `tofu plan` revisado e teste em ambiente isolado.
O CI não deve executar `tofu init -upgrade` nem aplicar mudanças sem aprovação.
O registry não publica chave GPG para esse provider; o `init` informa que a
validação de assinatura foi ignorada. O lockfile de OpenTofu fixa os checksums
do pacote. A origem e o checksum devem ser revisados antes de habilitar apply.

Cada ambiente persistente recebe um projeto Neon independente. O projeto
declara região, PostgreSQL 16, retenção PITR explícita, limite de autoscaling e
proteção contra destruição acidental. A região deve ser escolhida junto à
região de Functions Vercel correspondente.

## Validação local

```sh
export NEON_API_KEY="..." # necessário para plan; nunca salvar no repositório
tofu -chdir=infra/terraform/neon init -backend=false
tofu -chdir=infra/terraform/neon fmt -check -recursive
tofu -chdir=infra/terraform/neon validate
```

O `init -backend=false` serve apenas para validação local do provider. Antes de
qualquer `plan`/`apply` em ambientes compartilhados, configure backend remoto
com criptografia, controle de acesso e locking. O repositório ainda não escolhe
um backend porque a conta/serviço de state da equipe não foi informado.

## Roles e credenciais do banco

O projeto Neon cria uma role default administrativa. Ela não pode ser usada
pela aplicação. Roles criadas pela API/provider Neon herdam privilégios de
`neon_superuser`, inclusive `BYPASSRLS`; portanto, não use `neon_role` para a
aplicação. O provider PostgreSQL cria `obraflow_runtime` com `LOGIN`, sem
superuser/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS. A role é protegida por
`prevent_destroy` e criada somente quando `manage_runtime_role = true`.

`obraflow_migrator` é um login independente, também sem
superuser/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, com limite de duas
conexões. OpenTofu concede somente `CONNECT`/`CREATE` no database e
`USAGE`/`CREATE` no schema `public`; não concede acesso a tabelas/dados. Como
owner dos objetos criados pelas migrations, pode aplicar DDL versionado, e as
migrations concedem somente os privilégios de runtime necessários. A senha é
efêmera e write-only; habilite `manage_migration_role` junto às demais roles e
incremente `migration_role_password_version` ao rotacionar.

O projeto e as roles são duas passagens do mesmo módulo: primeiro provisionar o
projeto Neon; depois obter `database_host`/`database_name`, fornecer as
variáveis `PG*` para o endpoint **direto** e habilitar `manage_runtime_role` e
`manage_migration_role`. O provider PostgreSQL usa `sslmode = "verify-full"` e
`superuser = false`. As migrations SQL definem objetos, RLS e grants de
objetos; OpenTofu define as identidades e os grants de database/schema.

O output `database_host` é o endpoint direto para migrations/provisionamento;
`database_host_pooler` é obrigatório para compor `DATABASE_URL` da aplicação
serverless. O output pooled lê exclusivamente `primary_compute.host_pooler`;
se não houver um host pooled, interrompa a configuração da aplicação e não
substitua esse valor pelo host direto.

A senha runtime e a senha de migration usam `password_wo` e variáveis
`ephemeral`; injete `TF_VAR_runtime_role_password` e
`TF_VAR_migration_role_password` por secret manager e incremente a versão
correspondente ao rotacionar. As senhas não são retornadas pelo provider,
escritas no state ou exportadas por outputs. Entregue `DATABASE_URL` à runtime
por fluxo separado de secret manager; mantenha `MIGRATION_DATABASE_URL` apenas
no executor de migrations/CI, usando endpoint direto e `obraflow_migrator`. O
script de migration verifica `current_user` e recusa a role runtime ou uma
identidade administrativa. Não grave URLs/senhas em `.tfvars`, planos, state ou
Git. Nenhuma connection string é exportada.

A role PostgreSQL deve ser criada pelo administrador de bootstrap autorizado
via `PG*` no endpoint direto. Grants de database/schema são recursos OpenTofu;
grants de tabelas/funções, policies e RLS pertencem às migrations versionadas.
Isso separa o lifecycle da infraestrutura do lifecycle do schema.

## Readiness de runtime

`GET /api/ready` exige `HEALTHCHECK_TOKEN` e usa a `DATABASE_URL` da aplicação,
que deve autenticar como `obraflow_runtime`. A probe lê somente catálogos do
Postgres; valida role sem superuser/RLS bypass, policies RLS críticas com
`FORCE ROW LEVEL SECURITY`, trigger append-only de auditoria e ausência de
permissão para DDL, alteração de auditoria ou leitura de `payment_info`. Uma
falha retorna apenas `503 {"status":"not_ready"}`. PGlite testa esses casos
localmente; conectividade Neon real depende de um deploy autorizado.

O provider retorna valores sensíveis no state em alguns fluxos. O state deve
ser remoto, criptografado e restrito antes de provisionar qualquer projeto.
Nunca versionar `.tfstate`, plano Terraform, `.tfvars` real ou credenciais.
