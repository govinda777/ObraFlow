# Kit Oficial de Documentos para Demonstração de Orçamento (`ObraFlow`)

Esta pasta reúne um conjunto completo, realista e tecnicamente coeso dos **3 documentos de engenharia** aceitos na tela de **Novo Orçamento** (`http://localhost:3000/novo-projeto/`), prontos para você selecionar manualmente no computador durante apresentações ao vivo.

---

## 📁 Arquivos Prontos para Upload

| Cartão na Interface | Arquivo para Selecionar | Formato & Conteúdo Técnico |
| :--- | :--- | :--- |
| **1. PLANTA EXECUTIVA (PDF)** | [`01_planta_executiva_cobertura_pinheiros.pdf`](./01_planta_executiva_cobertura_pinheiros.pdf) | **PDF 1.4 vetorial válido** (A4 Paisagem, escala `1:50`), contendo planta baixa arquitetônica de `94,00 m²`, cotas, parede a demolir tracejada em vermelho (`NBR 16280`), ilha em Quartzo Branco Paraná, trilhos LED `3000K` e carimbo técnico **ABNT NBR 6492**. Abre nativamente no Preview, Chrome e Adobe Reader. |
| **2. PLANILHA CUSTOS (CSV/XLSX)** | [`02_planilha_custos_sinapi_pinheiros.csv`](./02_planilha_custos_sinapi_pinheiros.csv) | Planilha orçamentária estruturada (abre no Excel, Numbers e Google Sheets) com **8 serviços distribuídos em 4 macroetapas**, especificações de insumos, unidades, quantidades com perda técnica (`10%`), mão de obra, frete e recebedor (`CONTRACTOR` / `CLIENT`), totalizando **R$ 92.630,00**. |
| **3. MEMORIAL (TXT / MD)** | [`03_memorial_descritivo_abnt_pinheiros.md`](./03_memorial_descritivo_abnt_pinheiros.md) | Memorial descritivo executivo e caderno de encargos seguindo **ABNT NBR 16280**, **NBR 5410**, **NBR 13753** e **NBR 15758**, regras logísticas de condomínio e a **Cláusula Pétrea de Medição por Evidência Fotográfica**. |

> 💡 Caso deseje regerar ou customizar qualquer um desses arquivos programaticamente, execute `node scripts/generate-demo-docs.js`.

---

## 🎯 Roteiro Rápido para Demonstração ao Vivo (2 Minutos)

### Passo 1 — Iniciar o Ambiente Local
No terminal, na raiz do projeto:

```bash
npm run dev
```

Acesse **`http://localhost:3000/novo-projeto/`** (ou clique em **+ Solicitar Novo Orçamento** no Dashboard).

### Passo 2 — Preencher os Dados do Imóvel (ou usar 1 clique)
Você pode copiar os valores abaixo para demonstrar a digitação manual (ou clicar no botão **`✨ Carregar Kit Oficial de Demonstração`**):

- **Nome da Obra:** `Reforma Cobertura Duplex Pinheiros`
- **Endereço Completo do Canteiro:** `Rua dos Pinheiros, 840 - Cobertura 141`
- **Área Estimada (m²):** `94`
- **Teto Orçamentário do Cliente (R$):** `98000`
- **Escopo Preliminar da Intervenção:**
  > Reforma integral de cobertura duplex (94 m²): demolição seletiva NBR 16280 para integração da cozinha ao living/terraço, circuito 220V 32A e rede PPR para ilha em Quartzo Branco Paraná, porcelanato Portinari Calacata 120x120, forro drywall acústico e perfis magnéticos LED 3000K.

### Passo 3 — Selecionar os 3 Documentos no Computador
Clique em cada um dos 3 cartões tracejados e selecione os arquivos desta pasta (`docs/exemplos-orcamento/`):
1. `01_planta_executiva_cobertura_pinheiros.pdf` *(dica: clique em `Abrir arquivo local ↗` após o upload para mostrar a planta vetorial aberta no navegador!)*
2. `02_planilha_custos_sinapi_pinheiros.csv`
3. `03_memorial_descritivo_abnt_pinheiros.md`

Em seguida, clique em **`Salvar Obra e Iniciar Processamento IA →`**.

### Passo 4 — Revisão da EAP, Proposta e Assinatura Digital
Na tela `/processamento/`:
1. O motor de IA lerá as **8 linhas reais da planilha CSV** e cruzará com as normas **ABNT NBR 16280 / NBR 5410 / NBR 13753 / NBR 15758** do Memorial Descritivo, consolidando **R$ 92.630,00** (folga de **R$ 5.370,00** abaixo do teto de R$ 98.000,00) com **98% de confiança**.
2. Avance por **3. Revisão EAP (8)** → **4. Proposta & Parcelas** (40% / 35% / 25%) → **5. Assinatura & Ativação**.
3. Assine o contrato digitalmente: a nova obra (`proj_3`) será gravada no DuckDB com contrato HTML assinado em `./uploads/docs/`, insumos pendentes no ERP e tarefas ativas no **Kanban Polimórfico** e **Canteiro Mobile**!

---

## 📊 Resumo Financeiro da Planilha de Demonstração

| # | Macroetapa (Épico) | Tarefa / Serviço | Mão de Obra | Insumos | Frete | Total Item | Recebedor |
| :-: | :--- | :--- | ---: | ---: | ---: | ---: | :-: |
| 1 | 1. Preliminares & Infra | Proteção, Demolição (3,20m) e Entulho | R$ 2.600 | R$ 1.360 | R$ 280 | **R$ 4.240** | `CONTRACTOR` |
| 2 | 1. Preliminares & Infra | Elétrica 220V (32A) e Rede PPR Ilha | R$ 4.200 | R$ 4.850 | R$ 220 | **R$ 9.270** | `CONTRACTOR` |
| 3 | 2. Terraço & Piso 120x120 | Conferência de Lote/Calibre em Obra | R$ 450 | R$ 0 | R$ 0 | **R$ 450** | `CONTRACTOR` |
| 4 | 2. Terraço & Piso 120x120 | Nivelamento e Porcelanato 120x120 (104m²) | R$ 8.320 | R$ 19.240 | R$ 690 | **R$ 28.250** | `CONTRACTOR` |
| 5 | 3. Marmoraria & Metais | Ilha Gourmet e Bancadas Quartzo Branco | R$ 2.400 | R$ 14.800 | R$ 480 | **R$ 17.680** | `CLIENT` |
| 6 | 3. Marmoraria & Metais | Box Ripado Suíte Master e Metais Docol | R$ 3.100 | R$ 6.900 | R$ 210 | **R$ 10.210** | `CLIENT` |
| 7 | 4. Drywall, LED & Entrega | Forro Drywall (88m²), Pintura e LED 3000K | R$ 7.480 | R$ 12.760 | R$ 340 | **R$ 20.580** | `CONTRACTOR` |
| 8 | 4. Drywall, LED & Entrega | Estanqueidade 72h, Limpeza e Entrega | R$ 1.400 | R$ 550 | R$ 0 | **R$ 1.950** | `CONTRACTOR` |
| — | **TOTAL CONSOLIDADO** | **8 Tarefas Auditáveis c/ Foto** | **R$ 29.950** | **R$ 60.460** | **R$ 2.220** | **R$ 92.630** | — |
