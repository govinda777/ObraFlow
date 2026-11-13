# TODO List — Implementação das ADRs 0004 e 0005

Plano executável para migrar o protótipo para Vercel + Neon e implementar autenticação, autorização multi-tenant e auditoria. Os itens devem ser concluídos em ordem, respeitando as dependências e os critérios de saída de cada fase.

ADRs de referência:

- [ADR-0004 — Migração para Neon e infraestrutura Vercel](./rfcs/0004-adr-migracao-neon-db-infra-vercel.md) — `Accepted`.
- [ADR-0005 — Autorização por JWT, Neon e auditoria de eventos](./rfcs/0005-adr-autorizacao-por-jwt-neon-e-auditoria-de-eventos.md) — `Proposed`; aprovar antes de tratar suas decisões como definitivas.

## Regras de execução

- [ ] Não promover a próxima fase enquanto os critérios de saída e os health checks da fase atual falharem.
- [ ] Não guardar secrets, chaves privadas, tokens ou URLs de conexão com credenciais no repositório, bundle do navegador ou logs.
- [ ] Provisionar Neon por IaC; migrations de aplicação são versionadas e executadas separadamente da infraestrutura.
- [ ] Testar ambientes preview/staging com recursos e credenciais não produtivos. Não usar dinheiro real nem executar transações em mainnet em testes.
- [ ] Manter as mudanças do protótipo recuperáveis até o smoke test de produção e a decisão formal de cutover.

## Estado da execução — 2026-11-12

Primeiro corte local entregue: shell Next.js App Router coexistindo com Evidence,
health/readiness protegidos, migrations forward-only com tenant/RLS/auditoria,
testes locais de segurança do banco e scaffolding OpenTofu de Neon/Vercel com
roles separadas para runtime e migrations. O checklist registra os gates
pendentes; o runbook IaC documenta a operação local segura.

Ainda não há cutover nem provisionamento externo. O backend remoto/locking do
state, identificadores Vercel, região Neon/Vercel, credenciais e inspeção da
equipe Thirdweb `govinda-systems` precisam ser verificados antes de `plan/apply`
ou configuração de serviços. A ADR-0005 continua `Proposed`; a implementação
segue apenas em ambiente local/isolado até aprovação.

O passo a passo de criação, revisão de plano e destruição controlada da IaC está
em [`infra/terraform/README.md`](../infra/terraform/README.md). O audit atual
reporta 36 advisories (incluindo 7 critical e 10 high), sem correção automática;
remediar ou retirar a cadeia vulnerável do Evidence é gate para produção.

## Fase 0 — Decisões, inventário e baseline

- [ ] Aprovar a ADR-0005 ou registrar as alterações necessárias antes de implementar suas decisões.
- [x] Inventariar telas, fluxos, endpoints, dados em `mock_data/`, scripts de seed/migration, variáveis de ambiente e integrações atuais. A reconciliação pendente dos IDs de uploader está registrada neste checklist.
- [ ] Criar e manter uma matriz de lacunas (`Implemented`, `Partial`, `Missing`, `Blocked`) para cada componente das duas ADRs, indicando dependências, responsável, comando de teste, health check e estratégia de rollback. O artefato não está presente no worktree atual.
- [ ] Definir ambientes e limites de cada um: local, preview, staging e produção; documentar quais recursos e secrets podem ser usados em cada ambiente.
- [x] Definir a estratégia inicial de IaC para Neon e Vercel, verificar providers e registrar limitações/validação; documentar criação e destruição controlada em [`infra/terraform/README.md`](../infra/terraform/README.md). Backend remoto, apply e verificação contra contas reais continuam pendentes.
- [ ] Inspecionar a configuração Thirdweb usando a equipe [govinda-systems](https://thirdweb.com/team/govinda-systems). Registrar somente IDs, domínios, projetos, chains, contratos, webhooks e permissões efetivamente verificados; marcar o restante como `TBD`. Distinguir roles da equipe Thirdweb (`Member`/`Owner`) dos perfis do ObraFlow; não os mapear entre si.
- [ ] Definir política de migração e reconciliação dos dados do protótipo, incluindo tratamento de registros sem tenant, associação inequívoca a projetos e validação dos dados antes da carga. O preflight do seed já bloqueia referências de uploader `collab_*` que não existem em `users.id`; confirmar o mapeamento correto antes de liberar a carga — nenhum autor foi inferido ou reescrito.

**Saída da fase:** inventário revisado, ADR-0005 aprovada, ambientes definidos, decisões de IaC e testes registradas e nenhum identificador/segredo externo presumido.

## Fase 1 — Fundamento de testes e CI

- [x] Escolher e documentar o runner de testes unitários e a ferramenta BDD compatíveis com a aplicação Next.js/TypeScript. Primeiro corte: `node:test` para unitários e Cucumber/Gherkin para BDD; Playwright fica para fluxos HTTP/UI completos.
- [x] Criar comandos iniciais `test:unit`, `test:db`, `test:bdd`, `test:health`, `typecheck:web` e `build:web`, e integrar unit/DB/BDD/typecheck/build ao CI. Integração contra Neon real ainda não está configurada.
- [ ] Separar testes unitários, integração e BDD; definir fixtures, dados sintéticos, limpeza segura e isolamento por execução.
- [ ] Configurar mocks/fakes para Thirdweb, PSP, Blob, provedor de IA e blockchain, sem usar credenciais produtivas.
- [x] Integrar ao CI typecheck, build, unit/DB/BDD, rotas health e validação/formatação OpenTofu para Neon/Vercel; adicionar `tofu test` com providers mockados para grants/roles, segredos por branch e bloqueio de credenciais de migration, sem executar `plan/apply` remoto nem usar credenciais externas.
- [ ] Integrar lint e análise de dependências ao CI e resolver os advisories antes do cutover.
- [ ] Definir que BDD contra preview usa branch Neon efêmera e nunca aponta para produção.

**Saída da fase:** pipeline executa os comandos de teste em ambiente limpo; falhas bloqueiam merge/deploy e não há acesso acidental a serviços produtivos.

## Fase 2 — Neon 100% como código e modelo de dados

- [x] Declarar em OpenTofu o projeto/região/compute/branch raiz protegida/database Neon e role `obraflow_runtime` com login mínimo, sem `BYPASSRLS`; a senha usa argumento write-only/efêmero. `tofu validate` passou e não houve `plan/apply`.
- [ ] Completar backend/locking remoto, entrega segura de `DATABASE_URL` com host pooler à Vercel, entrega de `MIGRATION_DATABASE_URL` direta somente ao executor CI, política de recuperação e branches efêmeras; testar drift em branch Neon autorizada.
- [ ] Automatizar a associação de branches de preview ao ambiente Vercel correspondente e a criação, migração, seed sintético e descarte da branch efêmera.
- [ ] Fazer um segundo `plan`/`apply` e comprovar ausência de drift inesperado; documentar qualquer capacidade não suportada pelo provider e cobri-la com verificação automatizada.
- [x] Declarar em OpenTofu roles PostgreSQL separadas para runtime e migrations, ambas sem superuser/CREATEDB/CREATEROLE/BYPASSRLS e com senhas write-only/efêmeras. Runtime não recebe DDL; migrator recebe somente CONNECT/CREATE no database e USAGE/CREATE em `public`. O runner exige `current_user=obraflow_migrator`.
- [ ] Validar autenticação, ownership, grants e rotação/entrega das senhas das duas roles em branch Neon isolada; os testes PGlite exercitam migrations com o role migrator e negam DDL ao runtime.
- [x] Criar migrations forward-only iniciais com tenant, membership, projeto, permissões, auditoria e ledger; runner valida checksum, idempotência e rollback local.
- [ ] Completar o modelo de identidades Thirdweb, estados de aprovação e outbox quando aplicável; testar migrations e backfill numa branch Neon não produtiva.
- [ ] Definir constraints, índices, chaves estrangeiras, política de exclusão/retenção e estratégia de backup/restore.
- [ ] Implementar carga/reconciliação dos dados existentes em ambiente não produtivo; validar contagens, relacionamentos e ausência de vínculos ambíguos antes de planejar produção. O seed transacional/idempotente e os testes sintéticos de rollback estão prontos; o dataset real permanece bloqueado até resolver `evidences.uploaded_by=collab_*` com associação de identidade confirmada. `npm run db:seed -- --dry-run` deve falhar nesse estado, sem conectar ao banco.
- [x] Implementar a primeira camada de policies RLS default-deny, contexto transacional local e relação determinística entre tenant, projeto e usuário.
- [x] Testar localmente cross-tenant, membership pendente/suspenso, contexto ausente, role runtime sem bypass e grants limitados com PGlite.
- [ ] Verificar no Neon que o contexto não vaza entre requisições/conexões pooladas e que a role provisionada por OpenTofu não contorna as policies.

**Testes obrigatórios:** migrations em branch descartável; constraints e grants; isolamento entre tenants/projetos; rollback transacional; contexto RLS ausente/inválido; tentativa de acesso cross-tenant; branch preview criada e removida por automação.

## Fase 3 — Aplicação e deploy Vercel

- [ ] Preparar a aplicação de produção em Next.js App Router/TypeScript, mapeando as telas e jornadas existentes do Evidence/protótipo para os componentes de produção. Shell inicial existe; migração de jornadas não começou.
- [ ] Migrar gradualmente endpoints e persistência de arquivos JSON para Route Handlers/Server Actions e Neon; manter os scripts/dados do protótipo isolados do caminho de produção.
- [ ] Codificar as configurações Vercel suportadas como código: build, regiões, duração de Functions, variáveis por ambiente, domínios e associação de Preview ao Neon correspondente. Projeto/build/região, vars públicas e secrets write-only por target estão declarados; target/branch reais, domínios, Preview↔Neon, state e `apply` continuam pendentes.
- [ ] Garantir que Preview/Staging não possam usar Neon, Blob, IA ou credenciais Thirdweb de produção.
- [ ] Implementar handlers com validação de schema, autenticação e autorização server-side, respostas de erro consistentes, limites de payload e `request_id` para correlação.
- [ ] Proteger mutações autenticadas por cookie contra CSRF; não confiar em `tenant_id`, `role`, `project_id` ou permissões enviados pelo cliente.
- [ ] Configurar Vercel Firewall/WAF para tráfego anômalo e rotas sensíveis (login, upload e jobs de IA); documentar regras, alertas e procedimento de resposta.

**Testes obrigatórios:** deploy de preview a partir de checkout limpo; variáveis server-only ausentes do bundle; endpoint protegido nega anônimo; configuração de preview não aponta para produção; erros não expõem detalhes internos.

## Fase 4 — Thirdweb, sessão JWT e autorização multi-tenant

- [ ] Implementar SIWE/EIP-4361 com Thirdweb Auth: validar no backend desafio/assinatura, domínio, chain, nonce, expiração e proteção contra replay.
- [ ] Resolver no Neon a identidade verificada (`thirdweb_id`), usuário e membership ativo; nunca aceitar endereço de wallet informado sem prova de posse.
- [ ] Emitir a sessão da aplicação no backend via Thirdweb Auth somente após resolver o contexto no Neon. Claims de tenant, membership, role e permissões vêm do Neon, nunca do client.
- [ ] Implementar onboarding por perfil pretendido. Selecionar `CLIENT`, `CONTRACTOR`, `ENGINEER`, `FOREMAN` ou `DESIGNER` não concede acesso a tenant/projeto existente; `PLATFORM_ADMIN` só pode ser provisionado por processo interno.
- [ ] Implementar criação de tenant próprio quando permitido, convites, aprovação, suspensão e revogação de memberships.
- [ ] Atribuir role ao membership do usuário em cada tenant, não globalmente; obter permissões e escopo de projeto pelas relações autorizadas no Neon.
- [ ] Emitir JWT de curta duração com identidade, membership/tenant ativo, role, permissões necessárias, `authz_version`, `iat` e `exp`; usar cookie `HttpOnly`, `Secure` em produção e política `SameSite` adequada.
- [ ] Implementar troca de tenant/contexto validando membership no servidor e emitindo nova sessão; não incluir no token listas irrestritas de projetos.
- [ ] Aplicar guard centralizado às APIs/ações e contexto RLS na mesma transação das queries; consultar membership atual nas operações críticas para revogação efetiva.
- [ ] Aplicar autorização no backend e no banco. Ocultar controles na interface é apenas conveniência, nunca controle de acesso.
- [ ] Não mapear automaticamente perfis do ObraFlow para roles on-chain. Se uma feature exigir autorização executada por contrato, abrir ADR específica; a regra do contrato será adicional à policy Neon e não concederá acesso a dados privados.
- [ ] Validar Thirdweb Auth em ambiente isolado e configurar credenciais de produção separadamente. Testar contrato em testnet somente se houver feature on-chain aprovada; confirmar valores e permissões na equipe `govinda-systems`.

**Testes unitários:** emissão server-side e validação/expiração de JWT; rejeição de claims adulteradas pelo client; nonce/replay SIWE; estados de membership; roles distintas por tenant para a mesma identidade; resolução de permissions; falha fechada; autorização por recurso; ausência de concessão on-chain implícita.

**Testes de integração:** login de teste, emissão/verificação do cookie, RLS com roles PostgreSQL do ambiente de teste, revogação e troca de tenant, sem vazamento de contexto do pool; roles `Member`/`Owner` Thirdweb não concedem perfil ObraFlow.

## Fase 5 — Auditoria, pagamentos, documentos e assinaturas

- [ ] Criar `audit_events` append-only, com evento e alteração de estado na mesma transação; restringir `UPDATE`/`DELETE` da role PostgreSQL de runtime.
- [ ] Criar eventos de domínio para aprovação de orçamento, confirmação de pagamento, assinatura de contrato, envio/aceite de evidência, conclusão da obra e acionamento de garantia.
- [ ] Guardar versão/hash do orçamento/documento, ator, tenant/projeto, origem, timestamps, `request_id` e chave de idempotência; redigir dados sensíveis de `metadata` e logs.
- [ ] Validar webhooks PIX/Stripe por assinatura/autenticidade, timestamp quando suportado, replay protection e idempotência. Somente o PSP confirma o pagamento; redirect do navegador não confirma liquidação.
- [ ] Persistir callback e transição de pagamento de modo idempotente; definir tratamento de eventos fora de ordem, duplicados e falhos.
- [ ] Definir plataforma e fluxo de assinatura de contratos, guardando o documento final em storage privado, hash e trilha de assinatura; revisar requisitos legais do caso de uso.
- [ ] Implementar EIP-712 apenas nos fluxos que precisam comprovar a assinatura da wallet; nonce único, deadline e validação do hash/versão assinada.
- [ ] Manter ancoragem blockchain fora do caminho transacional principal. Se aprovada como necessidade concreta, usar outbox/retries e publicar somente hashes/raízes sem dados pessoais.

**Testes unitários e de integração:** imutabilidade dos eventos pela role PostgreSQL de runtime; atomicidade do evento com a alteração; eventos duplicados/fora de ordem; assinatura inválida; nonce expirado/reutilizado; webhook falso/repetido; hash divergente; falha de ancoragem sem perda do evento original.

## Fase 6 — Vercel Blob e evidências privadas

- [ ] Implementar fluxo de upload/download assinado e server-side, vinculado ao tenant/projeto/recurso autorizado.
- [ ] Validar tipo real do arquivo, tamanho, extensão permitida, expiração da URL e autorização antes de emitir URL assinada.
- [ ] Impedir acesso público a contratos, evidências e documentos privados; definir retenção, remoção e trilha de acesso.
- [ ] Evitar persistir arquivos/documentos em Neon ou filesystem efêmero da Function; persistir metadados e hashes necessários à auditoria.

**Testes obrigatórios:** upload permitido; anônimo e cross-tenant negados; tipo/tamanho inválidos negados; URL expirada negada; arquivo não público; health check em namespace descartável sem apagar dados de usuário.

## Fase 7 — Gateway de IA, resiliência e prevenção de abuso

- [ ] Remover do caminho de produção chamadas Gemini feitas pelo navegador e qualquer chave em `localStorage`/bundle.
- [ ] Implementar criação e processamento assíncrono de jobs (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) com persistência no Neon.
- [ ] Aplicar autenticação, autorização de tenant/projeto, rate limit distribuído por IP/usuário/tenant, quotas de uso/custo e limites de arquivo/tokens/duração antes de chamar o provedor.
- [ ] Implementar chave de idempotência, retries limitados com backoff, timeout, circuit breaker e estado terminal para falhas; não duplicar job/cobrança em reenvio.
- [ ] Tratar camadas como independentes: mitigação DDoS/WAF na borda, limites distribuídos na aplicação, quotas de custo e limites/retries do provedor. Escalabilidade da Vercel ou proteção DDoS não substituem rate limit para usuário autenticado.
- [ ] Registrar metadados operacionais redigidos (tenant/ator, modelo, duração, tokens/custo estimados e resultado) sem prompts/documentos sensíveis ou secrets desnecessários.
- [ ] Definir alertas de burst, consumo/quota, aumento de erros, jobs presos e falhas do provedor; testar procedimento de contenção.

**Testes unitários e integração:** anon/tenant alheio/limite excedido negados antes da chamada Gemini; burst gera `429`; duplicata retorna o mesmo job; payload grande rejeitado; timeout/429/5xx produz retries limitados e estado final; circuit breaker e quota falham fechados; nenhum secret no bundle/log.

## Fase 8 — Health checks, observabilidade e segurança operacional

- [x] Implementar `GET /api/health` como liveness mínimo, sem detalhes de dependências ou dados internos.
- [x] Implementar `GET /api/ready` para readiness; exigir bearer token e devolver somente estado agregado/redigido, sem revelar topologia, claims, tenants, respostas brutas de provedores ou secrets.
- [x] Implementar readiness interno/autenticado de Neon, identidade da role runtime, policies RLS obrigatórias, trigger append-only de auditoria e ausência de acesso a dados sensíveis. Checks de Blob, IA e Thirdweb permanecem pendentes; blockchain apenas se habilitada e somente com leitura não mutável.
- [ ] Garantir que check de IA não consuma tokens por padrão e que check de Blob use namespace descartável e operação segura.
- [x] Implementar `npm run test:health` local com falha segura, unit/BDD e teste HTTP automatizado do build Next no CI; a probe de role/RLS/auditoria é validada em PGlite por `test:db`. A execução contra Neon real e checks Blob/IA/Thirdweb permanecem pendentes.
- [ ] Adicionar logs estruturados com `request_id`/`job_id`, latência, status e categoria de erro redigida; impedir log de JWT, cookies, chaves, conteúdo de documentos e dados completos de pagamento.
- [ ] Configurar alertas de erro/latência, conexões Neon, backlog de jobs, falhas Blob, quotas/custo IA e eventos de segurança.

**Saída da fase:** health checks validam funcionamento real dos novos componentes sem efeitos colaterais e sem divulgação de informação sensível.

## Fase 9 — Cenários BDD e critérios de aceite

Criar cenários Gherkin executáveis com dados isolados. Cobrir, no mínimo:

- [ ] `@auth`: usuário autentica via SIWE; backend resolve membership Neon e emite sessão curta; token ausente, adulterado, expirado ou com claims de autorização injetadas pelo client é negado.
- [ ] `@onboarding`: seleção de perfil pretendido não dá acesso a tenant existente; convite/aprovação válida ativa somente o membership concedido.
- [ ] `@tenant-isolation`: usuários de tenant A não leem nem alteram recursos do tenant B, inclusive ao adulterar IDs de projeto/documento; a mesma identidade pode ter roles diferentes em tenants distintos.
- [ ] `@membership`: membership pendente/suspensa/revogada é bloqueada; troca de tenant aceita somente membership ativo; operação crítica respeita revogação atual.
- [ ] `@budget`: orçamento aprovado gera evento imutável com versão/hash e assinatura válida; reenvio idempotente não duplica aprovação.
- [ ] `@payment`: webhook PIX/Stripe válido confirma uma única vez; webhook inválido/repetido ou redirect do browser não confirma pagamento.
- [ ] `@contract`: assinatura/documento fica associado ao tenant, signatários e hash corretos; outro tenant não consegue baixar o documento.
- [ ] `@evidence`: usuário autorizado envia evidência privada para tarefa permitida; arquivo inválido ou acesso cross-tenant é negado.
- [ ] `@closeout` e `@warranty`: conclusão exige workflow/evidências/assinaturas definidos; garantia registra ator, evidência e transições auditáveis.
- [ ] `@ai`: request anônimo, burst, quota excedida, arquivo inválido e referência cross-tenant não acionam provedor; retries não duplicam jobs e falhas chegam a estado terminal.
- [x] `@health`: liveness/readiness refletem indisponibilidade sem revelar segredo ou informação interna (4 cenários BDD e 1 teste HTTP local; probe de role/RLS/auditoria validada em PGlite; Neon real e checks Blob/IA/Thirdweb pendentes).
- [ ] `@thirdweb`: roles de equipe `Member`/`Owner` não são interpretadas como perfis do ObraFlow e não há mapeamento automático de perfis para roles on-chain.
- [ ] `@thirdweb`: assinatura de webhook inválida e evento replayado são rejeitados; validações de chain/contrato só são exigidas para feature on-chain aprovada; testes não executam mutação em mainnet.

## Fase 10 — Preview, staging, cutover e rollback

- [ ] Executar migrations e seeds sintéticos numa branch Neon efêmera; rodar unidade, integração, BDD, IaC, segurança e `test:health` em CI.
- [ ] Fazer deploy de preview e comprovar que está isolado de produção; executar journeys BDD completas e revisar logs/alertas.
- [ ] Promover a staging após aprovação dos gates; executar carga/reconciliação representativa, falhas de provedores, uploads, pagamentos simulados e análise de observabilidade.
- [ ] Registrar plano de migração dos dados e reconciliação final, janela de cutover, critérios de aborto, backup e responsável pelo rollback.
- [ ] Promover para produção com aprovação explícita, IaC plan revisado e migrations compatíveis com a estratégia de rollback.
- [ ] Executar smoke tests read-only em produção e uma transação controlada com dados seguros; não efetuar pagamento real, upload de documento real de cliente ou transação mainnet sem autorização específica.
- [ ] Monitorar erros, latência, isolamento, conexões, custos/quota IA, Blob, jobs e webhooks antes de encerrar a migração.
- [ ] Desativar o caminho do protótipo somente depois da aceitação formal do cutover e confirmação do rollback disponível.

## Definition of Done

- [ ] Neon e configuração de ambientes são provisionáveis por código; execução repetida não causa drift inesperado.
- [ ] Migrations são versionadas, reproduzíveis e testadas em branch isolada; roles PostgreSQL de runtime e migration têm privilégios separados.
- [ ] Unit, integração, BDD, health checks, build, typecheck, segurança e validação IaC passam no CI.
- [ ] Testes demonstram isolamento de tenant/projeto em APIs e RLS, revogação de acesso e proteção contra replay/idempotência.
- [ ] Rotas sensíveis têm autenticação, autorização, validação, rate limit/quota quando aplicável e testes de abuso; health endpoints não expõem detalhes internos.
- [ ] Neon é a única fonte de roles/permissões de negócio; nenhum perfil é sincronizado automaticamente para roles de contrato ou de equipe Thirdweb.
- [ ] Eventos de negócio críticos são auditáveis e consistentes com as transições; documentos ficam privados e blockchain não recebe dados pessoais.
- [ ] Preview/Staging não usam recursos ou secrets de produção; nenhum secret está versionado, exposto ao browser ou presente em logs.
- [ ] Health checks confirmam Neon, autorização/RLS, auditoria, Blob, IA e Thirdweb no ambiente correspondente.
- [ ] Cutover e rollback foram exercitados em staging e a operação de produção foi aprovada.
