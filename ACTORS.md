# Documentação Oficial: Arquitetura de Atores e Fluxo de Trabalho (ObraFlow)

Esta documentação consolida a arquitetura funcional do **ObraFlow**, detalhando todos os **atores** envolvidos no ecossistema e o **fluxo de trabalho de ponta a ponta** — abrangendo desde a engenharia civil e orçamentação até a marcenaria, design de interiores e entrega final.

---

## 👥 1. Atores do Sistema e Seus Papéis

O ecossistema do ObraFlow divide-se em cinco personas principais, garantindo a especialização de tarefas, separação de responsabilidades e transparência.

| Ator | Perfil / Descrição | Responsabilidades Principais |
| --- | --- | --- |
| **Administrador / Gestor** | Dono da construtora, gestor de projetos sênior ou líder do empreendimento. | Gerencia múltiplos canteiros, monitora o fluxo de caixa, acompanha o consolidado de custos (orçado x real) e controla acessos. |
| **Orçamentista / Engenheiro** | Profissional técnico responsável pela viabilidade financeira e estrutural. | Analisa os documentos da obra, estrutura a EAP (Estrutura Analítica do Projeto), cadastra tarefas, insumos de **materiais** e **mão de obra**. |
| **Mestre de Obras / Campo** | Profissional na linha de frente da execução civil (pedreiros, encanadores, eletricistas). | Executa as etapas físicas, atualiza o status das tarefas e envia obrigatoriamente a **foto de evidência** com geolocalização e data. |
| **Designer de Interiores / Decorador(a)** | Profissional focado na estética, ambientação, marcenaria e acabamentos refinados. | Especifica móveis planejados, iluminação decorativa e revestimentos estéticos; gerencia prazos de fornecedores e aprova montagens. |
| **Cliente Final / Proprietário** | O dono do imóvel, investidor ou morador. | Acompanha passivamente o portal de transparência, visualizando o avanço percentual, o consumo do orçamento e as fotos do "antes e depois". |

---

## ⚙️ 2. Fluxo de Trabalho End-to-End (Workflow)

O ciclo de vida de um projeto no ObraFlow segue uma esteira integrada e controlada, dividida em cinco fases sequenciais:

```
[1. Setup & Documentos] ➔ [2. Orçamento & EAP] ➔ [3. Obra Grossa & Evidência] ➔ [4. Decoração & Ambientação] ➔ [5. Entrega & Transparência]

```

### Fase 1: Setup e Ingestão de Documentos

* **Início:** O **Administrador** cria um novo projeto na plataforma (endereço, prazo global, orçamento teto).
* **Ação:** O **Orçamentista** e o **Designer de Interiores** fazem o **upload dos documentos da obra** (projetos arquitetônicos, memoriais descritivos, plantas de layout e especificações estéticas).
* **Processamento:** A plataforma lê os documentos para auxiliar na estruturação inicial do escopo.

### Fase 2: Planejamento Orçamentário e Estruturação (EAP)

* **Responsáveis:** **Orçamentista / Engenheiro** e **Designer de Interiores**
* **Ação:**
* O *Orçamentista* divide a construção em etapas (Fundações, Alvenaria, Instalações, Revestimentos), cadastrando para cada tarefa os **insumos de materiais** (quantidades e preços) e os **custos de mão de obra**.
* O *Designer de Interiores* cadastra as tarefas de ambientação (Marcar marcenaria, Instalar luminárias pendentes, Montar mobiliário solto), vinculando os custos de peças e fornecedores específicos.


* **Resultado:** O orçamento detalhado passa a ser a regra de controle que comanda o andamento do projeto.

### Fase 3: Execução da Obra Grossa e Cidadania de Campo

* **Responsável:** **Mestre de Obras / Equipe de Campo**
* **Ação:**
* A equipe executa as etapas físicas estruturais e de acabamento grosso.
* Ao concluir uma tarefa (ex: "Conclusão da alvenaria do 2º pavimento"), o sistema exige obrigatoriamente o **envio de uma foto de evidência**.
* A foto valida o avanço e alimenta o cálculo do orçamento real x orçado.



### Fase 4: Decoração, Marcenaria e Ambientação

* **Responsável:** **Designer de Interiores / Montadores**
* **Ação:**
* Com a obra civil finalizada, entram os itens de fabricação e montagem (com prazos logísticos mais longos).
* Ao receber e montar a marcenaria ou móveis, a equipe envia a **foto de evidência de conclusão**.
* *Tratamento de Avarias:* Caso chegue um móvel com defeito, o sistema permite registrar uma foto de ressalva para acionar a garantia do fornecedor sem travar indevidamente o fluxo principal.



### Fase 5: Monitoramento, Auditoria e Portal do Cliente

* **Responsáveis:** **Administrador** e **Cliente Final**
* **Ação:**
* O *Gestor* monitora alertas preditivos de desvio de custo e margem de lucro em tempo real.
* O *Cliente Final* acessa um dashboard intuitivo para acompanhar a evolução das tarefas, visualizar as fotos de evidência de cada entrega (da fundação ao último objeto decorativo) e conferir a saúde financeira do projeto com total transparência.



---

## 📋 3. Matriz de Permissões por Módulo

| Módulo do Sistema | Administrador | Orçamentista | Mestre de Obras | Designer de Interiores | Cliente Final |
| --- | --- | --- | --- | --- | --- |
| **Gestão de Projetos & Upload** | Leitura / Escrita | Leitura / Escrita | Leitura | Leitura / Escrita | Apenas Leitura |
| **Orçamento & Custos (Materiais/Mão de Obra)** | Leitura / Escrita | Leitura / Escrita | Sem Acesso | Leitura (Decoração) | Sem Acesso |
| **Canteiro de Obras (Status & Fotos Civis)** | Leitura | Leitura | Leitura / Escrita | Sem Acesso | Apenas Leitura |
| **Módulo de Decoração & Fornecedores** | Leitura / Escrita | Leitura | Sem Acesso | Leitura / Escrita | Apenas Leitura |
| **Dashboard Financeiro & Transparência** | Leitura Completa | Leitura Técnica | Sem Acesso | Leitura Estética | Leitura Amigável |
