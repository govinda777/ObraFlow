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

## Fase 0 — Decisões, inventário e baseline

- [ ] Aprovar a ADR-0005 ou registrar as alterações necessárias antes de implementar suas decisões.
- [ ] Inventariar telas, fluxos, endpoints, dados em `mock_data/`, scripts de seed/migration, variáveis de ambiente e integrações atuais.
- [ ] Criar uma matriz de lacunas (`Implemented`, `Partial`, `Missing`, `Blocked`) para cada componente das duas ADRs, indicando dependências, responsável, comando de teste, health check e estratégia de rollback.
- [ ] Definir ambientes e limites de cada um: local, preview, staging e produção; documentar quais recursos e secrets podem ser usados em cada ambiente.
- [ ] Definir a estratégia de IaC para Neon e Vercel, verificando quais recursos podem ser controlados integralmente por código/API. Registrar limitações e validações automatizadas; não depender de cliques manuais não documentados no dashboard.
- [ ] Inspecionar a configuração Thirdweb usando a equipe [govinda-systems](https://thirdweb.com/team/govinda-systems). Registrar somente IDs, domínios, projetos, chains, contratos, webhooks e permissões efetivamente verificados; marcar o restante como `TBD`.
- [ ] Definir política de migração e reconciliação dos dados do protótipo, incluindo tratamento de registros sem tenant, associação inequívoca a projetos e validação dos dados antes da carga.

**Saída da fase:** inventário revisado, ADR-0005 aprovada, ambientes definidos, decisões de IaC e testes registradas e nenhum identificador/segredo externo presumido.

## Fase 1 — Fundamento de testes e CI

- [ ] Escolher e documentar o runner de testes unitários e a ferramenta BDD compatíveis com a aplicação Next.js/TypeScript. Avaliar Vitest para unidade e cenários Gherkin executados com Playwright para BDD.
- [ ] Criar comandos padronizados, por exemplo `test:unit`, `test:integration`, `test:bdd` e `test:health`, e integrar seus gates ao CI.
- [ ] Separar testes unitários, integração e BDD; definir fixtures, dados sintéticos, limpeza segura e isolamento por execução.
- [ ] Configurar mocks/fakes para Thirdweb, PSP, Blob, provedor de IA e blockchain, sem usar credenciais produtivas.
- [ ] Adicionar verificação de tipos, lint, build, análise de dependências e validação/formatação da IaC ao CI.
- [ ] Definir que BDD contra preview usa branch Neon efêmera e nunca aponta para produção.

**Saída da fase:** pipeline executa os comandos de teste em ambiente limpo; falhas bloqueiam merge/deploy e não há acesso acidental a serviços produtivos.

## Fase 2 — Neon 100% como código e modelo de dados

- [ ] Implementar IaC para projeto/região Neon, branches e sua política de ciclo de vida, databases, roles, grants, pooling, referências de conexão, proteção/recuperação e state backend com locking.
- [ ] Automatizar a associação de branches de preview ao ambiente Vercel correspondente e a criação, migração, seed sintético e descarte da branch efêmera.
- [ ] Fazer um segundo `plan`/`apply` e comprovar ausência de drift inesperado; documentar qualquer capacidade não suportada pelo provider e cobri-la com verificação automatizada.
- [ ] Separar role de runtime e role de migrations. Validar que a role de runtime não cria roles, altera schema, ignora RLS ou executa operações destrutivas.
- [ ] Versionar migrations para o modelo multi-tenant, incluindo usuários/identidades Thirdweb, tenants, memberships, projetos, memberships de projeto, permissões, estados de aprovação, auditoria, idempotência e outbox quando aplicável.
- [ ] Definir constraints, índices, chaves estrangeiras, política de exclusão/retenção e estratégia de backup/restore.
- [ ] Implementar carga/reconciliação dos dados existentes em ambiente não produtivo; validar contagens, relacionamentos e ausência de vínculos ambíguos antes de planejar produção.
- [ ] Implementar policies RLS com negação por padrão, contexto transacional local e relação determinística entre tenant, projeto e usuário.
- [ ] Verificar com testes de integração que o contexto de RLS não vaza entre requisições/conexões pooladas e que o usuário runtime não consegue contornar as policies.

**Testes obrigatórios:** migrations em branch descartável; constraints e grants; isolamento entre tenants/projetos; rollback transacional; contexto RLS ausente/inválido; tentativa de acesso cross-tenant; branch preview criada e removida por automação.

## Fase 3 — Aplicação e deploy Vercel

- [ ] Preparar a aplicação de produção em Next.js App Router/TypeScript, mapeando as telas e jornadas existentes do Evidence/protótipo para os componentes de produção.
- [ ] Migrar gradualmente endpoints e persistência de arquivos JSON para Route Handlers/Server Actions e Neon; manter os scripts/dados do protótipo isolados do caminho de produção.
- [ ] Codificar as configurações Vercel suportadas como código: build, regiões, duração de Functions, variáveis por ambiente, domínios e associação de Preview ao Neon correspondente.
- [ ] Garantir que Preview/Staging não possam usar Neon, Blob, IA ou credenciais Thirdweb de produção.
- [ ] Implementar handlers com validação de schema, autenticação e autorização server-side, respostas de erro consistentes, limites de payload e `request_id` para correlação.
- [ ] Proteger mutações autenticadas por cookie contra CSRF; não confiar em `tenant_id`, `role`, `project_id` ou permissões enviados pelo cliente.
- [ ] Configurar Vercel Firewall/WAF para tráfego anômalo e rotas sensíveis (login, upload e jobs de IA); documentar regras, alertas e procedimento de resposta.

**Testes obrigatórios:** deploy de preview a partir de checkout limpo; variáveis server-only ausentes do bundle; endpoint protegido nega anônimo; configuração de preview não aponta para produção; erros não expõem detalhes internos.

## Fase 4 — Thirdweb, sessão JWT e autorização multi-tenant

- [ ] Configurar Thirdweb Auth/SIWE no backend e validar assinatura, domínio, chain, nonce, expiração e proteção contra replay conforme o fluxo adotado.
- [ ] Sincronizar a identidade Thirdweb com o usuário local; nunca aceitar endereço de wallet informado sem prova de posse.
- [ ] Implementar onboarding por perfil pretendido. Selecionar `CLIENT`, `CONTRACTOR`, `ENGINEER`, `FOREMAN` ou `DESIGNER` não concede acesso a tenant/projeto existente; `PLATFORM_ADMIN` só pode ser provisionado por processo interno.
- [ ] Implementar criação de tenant próprio quando permitido, convites, aprovação, suspensão e revogação de memberships.
- [ ] Emitir JWT de curta duração com identidade, membership/tenant ativo, role, permissões necessárias, `authz_version`, `iat` e `exp`; usar cookie `HttpOnly`, `Secure` em produção e política `SameSite` adequada.
- [ ] Implementar troca de tenant/contexto validando membership no servidor e emitindo nova sessão; não incluir no token listas irrestritas de projetos.
- [ ] Aplicar guard centralizado às APIs/ações e contexto RLS na mesma transação das queries; consultar membership atual nas operações críticas para revogação efetiva.
- [ ] Aplicar autorização no backend e no banco. Ocultar controles na interface é apenas conveniência, nunca controle de acesso.
- [ ] Verificar Thirdweb testnet com credenciais de teste e configurar produção separadamente, somente após confirmar permissões e valores na equipe `govinda-systems`.

**Testes unitários:** validação/expiração de JWT, claims e troca de contexto; nonce/replay SIWE; estados de membership; resolução de permissions; falha fechada; autorização por recurso.

**Testes de integração:** login de teste, emissão/verificação do cookie, RLS com roles Neon reais do ambiente de teste, revogação e troca de tenant, sem vazamento de contexto do pool.

## Fase 5 — Auditoria, pagamentos, documentos e assinaturas

- [ ] Criar `audit_events` append-only, com evento e alteração de estado na mesma transação; restringir `UPDATE`/`DELETE` da role runtime.
- [ ] Criar eventos de domínio para aprovação de orçamento, confirmação de pagamento, assinatura de contrato, envio/aceite de evidência, conclusão da obra e acionamento de garantia.
- [ ] Guardar versão/hash do orçamento/documento, ator, tenant/projeto, origem, timestamps, `request_id` e chave de idempotência; redigir dados sensíveis de `metadata` e logs.
- [ ] Validar webhooks PIX/Stripe por assinatura/autenticidade, timestamp quando suportado, replay protection e idempotência. Somente o PSP confirma o pagamento; redirect do navegador não confirma liquidação.
- [ ] Persistir callback e transição de pagamento de modo idempotente; definir tratamento de eventos fora de ordem, duplicados e falhos.
- [ ] Definir plataforma e fluxo de assinatura de contratos, guardando o documento final em storage privado, hash e trilha de assinatura; revisar requisitos legais do caso de uso.
- [ ] Implementar EIP-712 apenas nos fluxos que precisam comprovar a assinatura da wallet; nonce único, deadline e validação do hash/versão assinada.
- [ ] Manter ancoragem blockchain fora do caminho transacional principal. Se aprovada como necessidade concreta, usar outbox/retries e publicar somente hashes/raízes sem dados pessoais.

**Testes unitários e de integração:** imutabilidade dos eventos pela role runtime; atomicidade do evento com a alteração; eventos duplicados/fora de ordem; assinatura inválida; nonce expirado/reutilizado; webhook falso/repetido; hash divergente; falha de ancoragem sem perda do evento original.

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

- [ ] Implementar `GET /api/health` como liveness mínimo, sem detalhes de dependências ou dados internos.
- [ ] Implementar `GET /api/ready` para readiness; devolver somente estado agregado/redigido e não revelar topologia, claims, tenants, respostas brutas de provedores ou secrets.
- [ ] Implementar health checks internos/autenticados de Neon, RLS/autorização, auditoria, Blob, IA e Thirdweb; blockchain apenas se habilitada e somente com leitura não mutável.
- [ ] Garantir que check de IA não consuma tokens por padrão e que check de Blob use namespace descartável e operação segura.
- [ ] Implementar `npm run test:health` para local/preview com assertions específicas por ambiente e falha segura.
- [ ] Adicionar logs estruturados com `request_id`/`job_id`, latência, status e categoria de erro redigida; impedir log de JWT, cookies, chaves, conteúdo de documentos e dados completos de pagamento.
- [ ] Configurar alertas de erro/latência, conexões Neon, backlog de jobs, falhas Blob, quotas/custo IA e eventos de segurança.

**Saída da fase:** health checks validam funcionamento real dos novos componentes sem efeitos colaterais e sem divulgação de informação sensível.

## Fase 9 — Cenários BDD e critérios de aceite

Criar cenários Gherkin executáveis com dados isolados. Cobrir, no mínimo:

- [ ] `@auth`: usuário autentica via Thirdweb e recebe sessão curta; token ausente, adulterado ou expirado é negado.
- [ ] `@onboarding`: seleção de perfil pretendido não dá acesso a tenant existente; convite/aprovação válida ativa somente o membership concedido.
- [ ] `@tenant-isolation`: usuários de tenant A não leem nem alteram recursos do tenant B, inclusive ao adulterar IDs de projeto/documento.
- [ ] `@membership`: membership pendente/suspensa/revogada é bloqueada; troca de tenant aceita somente membership ativo; operação crítica respeita revogação atual.
- [ ] `@budget`: orçamento aprovado gera evento imutável com versão/hash e assinatura válida; reenvio idempotente não duplica aprovação.
- [ ] `@payment`: webhook PIX/Stripe válido confirma uma única vez; webhook inválido/repetido ou redirect do browser não confirma pagamento.
- [ ] `@contract`: assinatura/documento fica associado ao tenant, signatários e hash corretos; outro tenant não consegue baixar o documento.
- [ ] `@evidence`: usuário autorizado envia evidência privada para tarefa permitida; arquivo inválido ou acesso cross-tenant é negado.
- [ ] `@closeout` e `@warranty`: conclusão exige workflow/evidências/assinaturas definidos; garantia registra ator, evidência e transições auditáveis.
- [ ] `@ai`: request anônimo, burst, quota excedida, arquivo inválido e referência cross-tenant não acionam provedor; retries não duplicam jobs e falhas chegam a estado terminal.
- [ ] `@health`: liveness/readiness e checks internos refletem dependência indisponível sem revelar segredo ou informação interna.
- [ ] `@thirdweb`: assinatura de webhook inválida, chain/contrato incorretos e evento replayado são rejeitados; testes não executam mutação em mainnet.

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
- [ ] Migrations são versionadas, reproduzíveis e testadas em branch isolada; roles de runtime e migration têm privilégios separados.
- [ ] Unit, integração, BDD, health checks, build, typecheck, segurança e validação IaC passam no CI.
- [ ] Testes demonstram isolamento de tenant/projeto em APIs e RLS, revogação de acesso e proteção contra replay/idempotência.
- [ ] Rotas sensíveis têm autenticação, autorização, validação, rate limit/quota quando aplicável e testes de abuso; health endpoints não expõem detalhes internos.
- [ ] Eventos de negócio críticos são auditáveis e consistentes com as transições; documentos ficam privados e blockchain não recebe dados pessoais.
- [ ] Preview/Staging não usam recursos ou secrets de produção; nenhum secret está versionado, exposto ao browser ou presente em logs.
- [ ] Health checks confirmam Neon, autorização/RLS, auditoria, Blob, IA e Thirdweb no ambiente correspondente.
- [ ] Cutover e rollback foram exercitados em staging e a operação de produção foi aprovada.
