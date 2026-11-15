# Guia de Operação e Infraestrutura — ObraFlow

Este projeto utiliza a **integração nativa GitHub ↔ Vercel ↔ Neon**.

> [!TIP]
> **Zero Tokens Locais:** Não é necessário gerar ou salvar chaves de API (`NEON_API_KEY`, `VERCEL_API_TOKEN`) na sua máquina. A Vercel e o Neon já estão conectados diretamente ao repositório via GitHub App / OIDC / Marketplace Integration.

---

## 🏗️ Como Funciona a Arquitetura (Sem Tokens Locais)

Assim como nos projetos [`XperienceClimb`](https://github.com/govinda777/XperienceClimb) e [`gemini-chatbot`](https://github.com/govinda777/gemini-chatbot):

1. **Deploy Automático por Git Push:**
   - Ao fazer `git push origin main` (ou abrir um Pull Request), o webhook do GitHub dispara o build automaticamente na **Vercel**.
2. **Injeção de Credenciais do Banco (Neon ↔ Vercel):**
   - A integração Vercel + Neon injeta nativamente as variáveis de conexão:
     - `POSTGRES_URL` (com Connection Pooling do PgBouncer habilitado para Serverless).
     - `DATABASE_URL`
   - O Next.js consome essas variáveis em runtime sem você precisar configurá-las no seu computador.
3. **Isolamento de Branches:**
   - Em Pull Requests, a Vercel cria um ambiente de **Preview** e o Neon cria uma branch de banco instantânea (*instant database branch*) automaticamente.

---

## 🚀 Passo a Passo de Execução Diária

### 1. Desenvolvimento e Testes Locais

Para trabalhar e testar o código no seu Mac:

```bash
# 1. Instalar as dependências
npm install --legacy-peer-deps

# 2. Executar a suíte de validação de IaC (com providers mockados, sem tocar na nuvem)
npm run test:iac

# 3. Executar os testes do app Next.js
npm run test:web
```

### 2. Puxar as Variáveis do Projeto (Se precisar rodar o Next.js localmente com o Neon remoto)

Se você quiser conectar o seu servidor local ao Neon sem digitar nenhuma senha:

```bash
# O Vercel CLI sincroniza o .env.local diretamente da integração autorizada:
npx vercel env pull .env.local
```

### 3. Deploy para Produção

Basta comitar suas alterações e enviar para o GitHub:

```bash
git add .
git commit -m "feat: sua alteracao"
git push origin main
```

A Vercel executará o pipeline de build e deploy automaticamente.

---

## 🛠️ OpenTofu / Gestão de Infraestrutura via NPM (Zero Tokens Manuais)

Você pode criar, inspecionar e excluir a infraestrutura na nuvem via código usando comandos simples do `npm`:

### Pré-requisitos
1. **OpenTofu instalado no Mac:**
   ```bash
   brew install opentofu
   ```
2. **Logins Oficiais (somente na primeira vez, via navegador):**
   ```bash
   npx neonctl login
   npx vercel login
   ```
   *(Eles abrem uma aba no navegador. Você apenas clica em autorizar. **Zero** tokens manuais).*

---

### Ciclo de Vida da Infraestrutura (Comandos NPM)

| Comando | Descrição |
| :--- | :--- |
| `npm run test:iac` | Valida as políticas de segurança e estrutura do OpenTofu localmente |
| `npm run infra:plan` | Simula o plano para **Neon + Vercel** (`tofu plan`) |
| `npm run infra:up` | **Cria** a infraestrutura completa (**Neon + Vercel**) |
| `npm run infra:down` | **Exclui** toda a infraestrutura (**Neon + Vercel**) |
| `npm run infra:up:neon` / `down:neon` | Cria ou exclui **apenas o Neon** |
| `npm run infra:up:vercel` / `down:vercel` | Cria ou exclui **apenas a Vercel** |

> **Como funciona por baixo dos panos:** O script [`scripts/tofu-neon.cjs`](../../scripts/tofu-neon.cjs) utiliza a sua sessão OAuth ativa para obter uma credencial efêmera válida apenas para o tempo de execução do comando e a revoga automaticamente logo em seguida, mantendo seu ambiente 100% seguro e sem chaves salvas.

---

---

## 🩺 Verificação de Saúde do Banco em Produção

Após o deploy realizado pela Vercel:

```bash
# Rota protegida que valida conectividade, roles e integridade de RLS do Neon
curl -H "Authorization: Bearer <SEU_HEALTHCHECK_TOKEN>" https://seu-app.vercel.app/api/ready
```
