# Tutorial: configuração do Thirdweb no ObraFlow

Este documento descreve a configuração do Thirdweb para o ObraFlow nos ambientes local, preview, staging e produção.

O Thirdweb será usado como provedor de autenticação e wallets dos usuários. O perfil de negócio, o tenant e as permissões de acesso aos dados serão controlados pelo backend e pelo Neon. O caminho padrão não usará roles on-chain: elas só serão criadas para funcionalidades específicas que precisem de autorização verificável em contrato.

## 1. Pré-requisitos

- acesso autenticado ao time Thirdweb `govinda-systems`;
- acesso ao projeto Vercel do ObraFlow;
- acesso ao secret manager/variáveis de ambiente da Vercel;
- acesso ao Neon para validar o usuário autenticado;
- Node.js e npm instalados localmente;
- domínio local, preview e produção definidos.

Não invente project IDs, client IDs, chain IDs ou endereços de contratos. Esses valores devem ser copiados do projeto Thirdweb autenticado e registrados por ambiente.

## 2. Criar ou selecionar o projeto Thirdweb

1. Acesse `https://thirdweb.com/team/govinda-systems`.
2. Abra o projeto destinado ao ObraFlow ou crie um projeto separado para ele.
3. Use projetos separados para ambientes de teste e produção quando houver risco de mistura de credenciais, contratos ou limites.
4. Registre o nome e o identificador do projeto em um inventário seguro, sem registrar secret keys no repositório.
5. Ative somente os serviços necessários: User Wallets, RPC, Account Abstraction, Storage ou outros explicitamente usados pelo produto.

Cada projeto Thirdweb possui Client ID e Secret Key. O Client ID pode ser usado no frontend com restrição de domínio; a Secret Key é somente para backend e concede acesso amplo aos serviços do projeto. [Thirdweb API Keys](https://portal.thirdweb.com/account/api-keys)

## 3. Configurar domínios permitidos

Configure os domínios permitidos no projeto Thirdweb:

| Ambiente | Domínio esperado | Uso |
| :--- | :--- | :--- |
| Local | `http://localhost:3000` | Desenvolvimento |
| Preview | domínio de preview Vercel ou domínio de teste controlado | Pull requests/homologação |
| Staging | domínio de staging | Testes integrados |
| Produção | domínio oficial do ObraFlow | Usuários reais |

Não use `*` em produção. Remova domínios antigos e revise a lista sempre que um domínio Vercel for substituído.

## 4. Variáveis de ambiente

Configure, por ambiente, as seguintes variáveis:

```dotenv
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=client_id_do_ambiente
THIRDWEB_SECRET_KEY=secret_key_do_backend
THIRDWEB_PROJECT_ID=project_id_do_ambiente
THIRDWEB_AUTH_MODE=in_app_wallet
THIRDWEB_CHAIN_ID=chain_id_configurada
THIRDWEB_CONTRACT_ADDRESS=endereco_do_contrato_se_aplicavel
```

Regras:

- somente variáveis prefixadas com `NEXT_PUBLIC_` podem chegar ao browser;
- `THIRDWEB_SECRET_KEY` nunca pode ser usada em componentes client, bundle, HTML, logs ou `localStorage`;
- Client ID deve ser restringido por domínio;
- testnet e mainnet devem usar projetos, contratos, wallets administrativas e secrets separados;
- `.env.example` deve conter apenas nomes e valores fictícios.

## 5. Configurar autenticação e User Wallets

O fluxo padrão recomendado é usar User Wallets/In-App Wallets do Thirdweb com e-mail, social login, passkey ou wallet externa, conforme habilitado no projeto. O Thirdweb suporta esses métodos e retorna a identidade/wallet para o fluxo de sessão. [User Wallets](https://portal.thirdweb.com/wallets/users)

Fluxo da aplicação:

1. O frontend inicializa o cliente com `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`.
2. O usuário conclui o login no Thirdweb.
3. O frontend envia o token de sessão para uma rota server-side do ObraFlow.
4. O backend valida o token conforme o SDK/API do Thirdweb.
5. O backend localiza ou cria o usuário por `thirdweb_id`.
6. O backend associa a wallet verificada ao usuário.
7. O backend resolve tenant e perfil no Neon.
8. O backend emite a sessão segura do ObraFlow e aplica RBAC nas requisições seguintes.

O frontend nunca decide sozinho o tenant ou o perfil. O usuário autenticado pode selecionar um contexto permitido, mas o backend deve confirmar a associação.

### 5.1. Autenticação customizada, se necessária

Se o ObraFlow precisar manter um provedor próprio de login, use a configuração de Custom Authentication do Thirdweb com `jwt` ou `auth_endpoint`. O JWT deve ter `sub` estável, `aud` destinado ao Thirdweb, expiração curta e assinatura verificável. O endpoint customizado deve validar o token antes de permitir a criação/uso da wallet. [Thirdweb Custom Authentication](https://portal.thirdweb.com/wallets/custom-auth)

Não criar uma autenticação paralela apenas para contornar a validação do Thirdweb. Escolher um único fluxo por ambiente e testá-lo de ponta a ponta.

## 6. Persistência no Neon

A tabela `users` deve usar `thirdweb_id` como identificador externo único. O modelo deve manter separadamente:

- `thirdweb_id`: identidade externa autenticada;
- `wallet_address`: endereço verificado, quando aplicável;
- `tenant_id`: organização do ObraFlow;
- `role`: perfil de negócio;
- `status`: ativo, suspenso ou revogado;
- timestamps de criação, último login e última verificação de wallet.

Ao trocar ou desvincular uma wallet, o backend deve exigir nova verificação e revogar permissões on-chain relacionadas à wallet anterior.

## 7. Regras automáticas com Thirdweb e Neon

O modelo recomendado é manter uma única fonte de verdade para as regras: o Neon.

```text
Thirdweb token → thirdweb_id → tenant_membership → project_membership → role_permissions → acesso
```

No Neon, mantenha pelo menos:

```text
users(id, thirdweb_id, status)
tenants(id)
tenant_memberships(user_id, tenant_id, role, status)
project_memberships(user_id, project_id, access_level, status)
role_permissions(role, action, resource)
```

Todas as tabelas de negócio devem conter `tenant_id` ou permitir sua resolução por `project_id`. O backend deve resolver o contexto do usuário após validar o token Thirdweb e configurar esse contexto na transação Neon. O banco deve aplicar Row-Level Security para impedir leituras e alterações fora do tenant, mesmo se uma rota tiver um bug de filtro.

Exemplo de decisão automática:

```text
usuário Thirdweb autenticado
  + membro ativo do tenant
  + membro ativo do projeto
  + role ENGINEER permite UPDATE_BUDGET
  = operação permitida
```

Se qualquer condição falhar, a operação deve ser negada. Alterar `role` ou `project_membership` no Neon passa a valer automaticamente na próxima requisição, sem sincronizar contratos ou wallets.

## 8. Roles on-chain somente quando necessárias

O RBAC de dados permanece no ObraFlow. Para operações on-chain, o contrato poderá usar roles Thirdweb/Permissions:

```text
OBRAFLOW_PLATFORM_ADMIN_ROLE
OBRAFLOW_CONTRACTOR_ROLE
OBRAFLOW_ENGINEER_ROLE
OBRAFLOW_FOREMAN_ROLE
OBRAFLOW_CLIENT_ROLE
OBRAFLOW_DESIGNER_ROLE
```

Concessão de role:

1. validar sessão Thirdweb;
2. validar tenant e perfil no Neon;
3. validar wallet por assinatura/challenge;
4. validar policy da função, contrato, chain e limite financeiro;
5. executar a concessão com wallet administrativa/relayer server-side;
6. aguardar confirmação;
7. persistir `tx_hash`, role, wallet, contrato, chain e operador;
8. executar teste de leitura da role.

Nenhum usuário operacional recebe `DEFAULT_ADMIN_ROLE`. Session keys, se usadas, devem limitar contratos-alvo, funções, validade e valor máximo. Roles de contrato do Thirdweb não concedem acesso aos dados privados do Neon. [Thirdweb Permissions](https://portal.thirdweb.com/tokens/build/extensions/general/Permissions)

## 9. Webhooks e eventos

Para cada webhook Thirdweb:

- validar assinatura e timestamp;
- rejeitar replay por nonce/event ID já processado;
- validar chain, contrato e ambiente;
- usar idempotency key;
- persistir o evento bruto somente quando necessário e de forma protegida;
- atualizar o Neon em transação;
- responder rapidamente e processar tarefas demoradas de forma assíncrona.

Eventos inválidos devem ser rejeitados sem alterar usuários, wallets, roles ou transações financeiras.

## 10. Testes obrigatórios

### Testes de autenticação

- login válido cria ou recupera o usuário correto;
- token expirado retorna `401`;
- token com audiência, issuer ou assinatura inválidos retorna `401`;
- logout invalida a sessão local;
- troca de wallet exige nova verificação;
- usuário sem tenant não acessa dados de negócio.

### Testes de autorização

- `CLIENT` não acessa dados de outro tenant;
- `FOREMAN` não altera orçamento ou folha;
- `ENGINEER` não administra roles;
- `CONTRACTOR` não recebe automaticamente `Owner` no time Thirdweb;
- apenas `PLATFORM_ADMIN` pode iniciar concessão/revogação administrativa;
- role on-chain ausente bloqueia a operação Web3;
- role on-chain válida não supera uma negação do RBAC do ObraFlow.

### Testes de segurança e operação

- secret key não aparece no bundle, HTML, logs ou respostas;
- domínio não autorizado é rejeitado pelo Thirdweb;
- testnet não usa contrato ou secret de produção;
- webhook inválido, duplicado ou atrasado é rejeitado;
- falha de RPC/Thirdweb não gera dupla gravação no Neon;
- `/api/health/thirdweb` executa somente leitura e não cria transações;
- `npm run test:health` valida autenticação, configuração, conectividade e isolamento por ambiente.

## 11. Checklist de promoção

- [ ] projeto Thirdweb correto confirmado no time `govinda-systems`;
- [ ] Client ID e Secret Key separados por ambiente;
- [ ] domínios permitidos configurados sem wildcard em produção;
- [ ] métodos de login necessários habilitados;
- [ ] `thirdweb_id` migrado e único no Neon;
- [ ] wallet vinculada por prova de posse;
- [ ] RBAC do ObraFlow testado;
- [ ] contratos, chains e roles verificados;
- [ ] roles administrativas protegidas;
- [ ] webhooks assinados e idempotentes;
- [ ] health checks aprovados;
- [ ] nenhum segredo presente no repositório ou frontend;
- [ ] rollback documentado.

## Referências oficiais

- [Thirdweb API Keys](https://portal.thirdweb.com/account/api-keys)
- [Thirdweb User Wallets](https://portal.thirdweb.com/wallets/users)
- [Thirdweb Custom Authentication](https://portal.thirdweb.com/wallets/custom-auth)
- [Thirdweb Permissions](https://portal.thirdweb.com/tokens/build/extensions/general/Permissions)
- [Thirdweb Session Keys](https://portal.thirdweb.com/react/v5/account-abstraction/permissions)
