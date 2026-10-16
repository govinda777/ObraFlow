# ObraFlow
Plataforma inteligente de gestão de obras: do orçamento detalhado e controle de custos à comprovação visual de etapas concluídas em campo. 🏗️⚡

---

## 📌 Sobre o Projeto

O **ObraFlow** é uma solução SaaS moderna desenvolvida para eliminar a falta de previsibilidade, o estresse e a opacidade que marcam o mercado de pequenas e médias obras. A plataforma conecta o planejamento financeiro do escritório à execução operacional no canteiro de obras em tempo real, garantindo total transparência entre construtoras, engenheiros e clientes finais.

---

## 🚀 Principais Funcionalidades

### 1. Onboarding e Gestão de Projetos por IA

* **Upload de Documentos:** O cliente ou gestor faz o upload do PDF do projeto (arquitetônico, memorial descritivo ou escopo).
* **Análise Inteligente:** Um agente de IA auxilia na leitura e extração preliminar das macroetapas da obra para agilizar o trabalho do orçamentista.

### 2. Estrutura Analítica de Custos (EAP por Tarefa)

* **Orçamento Detalhado:** O setor de orçamento divide a obra em tarefas lógicas.
* **Insumos de Materiais:** Cada tarefa é associada aos materiais necessários (quantidades unitárias, especificações e custos).
* **Mão de Obra:** Inclusão clara dos custos de equipe (diárias, empreitada ou horas técnicas) vinculados diretamente à entrega da tarefa.

### 3. Canteiro de Obras Mobile com Evidência Obrigatória

* **Interface de Campo:** Uma versão mobile ágil voltada para o mestre de obras ou encarregado.
* **Conclusão com Foto:** Para marcar qualquer tarefa como "concluída", o sistema **exige obrigatoriamente o envio de uma foto de evidência** recente do canteiro, assegurando que o avanço físico é real.

### 4. Portal de Transparência para o Cliente Final

* **Dashboard Executivo:** O proprietário acompanha o andamento percentual da obra e o consumo do orçamento em tempo real.
* **Linha do Tempo Visual:** Visualização clara do que foi feito, o que está em andamento e quais são os próximos passos, reduzindo drasticamente a necessidade de cobranças e ligações diárias.

---

## 🛠️ Stack Tecnológica

O projeto foi arquitetado tirando o máximo proveito do ecossistema moderno **Vercel** e ferramentas de ponta:

* **Frontend & Backend:** **Next.js (App Router)** com **Server Actions** e **TypeScript**.
* **Estilização:** **Tailwind CSS** e **Shadcn UI**.
* **Autenticação:** **Privy** (login simplificado via E-mail, Google e Social Logins com gerenciamento seguro de sessões e perfis).
* **Banco de Dados:** **PostgreSQL** (hospedado via Neon) gerenciado com **Drizzle ORM**.
* **Armazenamento de Arquivos:** **Vercel Blob** (para armazenamento seguro de PDFs de projetos e fotos de evidência do canteiro).

---

## 👥 Perfis de Acesso (Multi-tenant)

1. **Cliente Final (Proprietário):** Acompanha o dashboard, progresso, cronograma simplificado e galeria de fotos comprovadas.
2. **Orçamentista / Engenheiro:** Gerencia os projetos recebidos, define o orçamento, insumos de materiais e custos de mão de obra.
3. **Mestre de Obras / Operacional:** Atualiza o status das tarefas em campo e dispara as fotos de evidência.
4. **Administrador:** Visão consolidada de todos os canteiros, margens e fluxo operacional da construtora.

---

## ⚙️ Instalação e Execução Local

Siga os passos abaixo para configurar o ambiente de desenvolvimento do **ObraFlow**:

1. **Clone o repositório:**
```bash
git clone https://github.com/govinda777/obraflow.git
cd obraflow

```

2. **Instale as dependências:**
```bash
npm install

```

3. **Configure as variáveis de ambiente:**
Crie um arquivo `.env.local` na raiz do projeto com base no `.env.example`:
```env
NEXT_PUBLIC_PRIVY_APP_ID=seu_app_id
PRIVY_APP_SECRET=seu_app_secret
DATABASE_URL=sua_connection_string_postgresql
BLOB_READ_WRITE_TOKEN=seu_token_vercel_blob

```

4. **Execute as migrações do banco de dados:**
```bash
npm run db:push

```

5. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev

```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para acessar a aplicação.

