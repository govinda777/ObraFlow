# Vercel — projeto declarativo

Para criar ou destruir os ambientes com segurança, consulte o
[`README de IaC`](../README.md).

O provider oficial da Vercel está fixado em versão exata. Esta configuração
descreve o projeto Next.js, o repositório conectado, a branch de produção, o
comando de instalação/build e a região padrão das Functions. Os identificadores
de equipe, repositório e região precisam ser verificados antes de qualquer
aplicação; não são inferidos da conta local.
O CI deve usar o lockfile gerado e não executar `tofu init -upgrade` sem revisão.
O registry não publica chave GPG para esse provider, então o `init` registra no
lockfile os checksums do pacote e informa que a validação da assinatura foi
ignorada.

```sh
export VERCEL_API_TOKEN="..." # nunca salvar no repositório
tofu -chdir=infra/terraform/vercel init -backend=false
tofu -chdir=infra/terraform/vercel fmt -check -recursive
tofu -chdir=infra/terraform/vercel validate
```

Antes de provisionar recursos compartilhados, configure backend remoto com
criptografia, controle de acesso e locking. Para um projeto Vercel já existente,
importe-o para o state em vez de tentar criar um duplicado. O `prevent_destroy`
impede remoção acidental do projeto.

Variáveis de ambiente são gerenciáveis por código sem colocar secrets no
repositório:

- `public_environment_values` aceita somente nomes `NEXT_PUBLIC_*`; os valores
  são visíveis no state e no browser por definição.
- `environment_secret_names` declara nomes server-only. Os valores vêm de
  `environment_secret_values`, uma variável `sensitive` e `ephemeral`, e são
  enviados por `value_wo`/`value_wo_version` do provider pinado; o valor
  write-only não é persistido no state.
- `environment_target` seleciona um único target (`development`, `preview` ou
  `production`). Para secrets em `preview`, `environment_git_branch` é
  obrigatório para não compartilhar a credencial com todos os previews.
- Não declare `MIGRATION_DATABASE_URL`, `SEED_DATABASE_URL` ou
  `ALLOW_DEMO_SEED` neste módulo. Credencial de migration pertence ao executor
  de CI; seed é apenas não produtivo e exige opt-in separado.

Antes de habilitar secrets, confirme a conta/projeto, o target e a branch; o
state remoto com locking ainda precisa ser definido. Exemplo apenas com nomes e
versões não secretas:

```hcl
manage_environment_secrets = true
environment_target         = "preview"
environment_git_branch     = "<verified-staging-branch>"
environment_secret_names   = ["DATABASE_URL", "HEALTHCHECK_TOKEN"]
environment_secret_versions = {
  DATABASE_URL      = 1
  HEALTHCHECK_TOKEN = 1
}
```

O secret manager aprovado deve injetar `TF_VAR_environment_secret_values` no
processo OpenTofu como JSON compatível com o mapa de nomes. Não coloque valores
em `terraform.tfvars`, argumentos `-var`, logs, planos ou Git. Ao girar uma
senha, injete o valor novo e incremente somente sua versão. Configure valores
públicos por `public_environment_values` no arquivo de ambiente revisado.

O provider não permite combinar o bloco inline `environment` de
`vercel_project` com recursos independentes de variáveis; este módulo não usa o
bloco inline. Consulte a [documentação versionada do recurso](https://registry.terraform.io/providers/vercel/vercel/5.24.1/docs/resources/project_environment_variable).
