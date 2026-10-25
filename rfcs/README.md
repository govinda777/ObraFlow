# Arquitetura e Decisões Técnicas (RFCs) — ObraFlow

Este diretório centraliza todas as **RFCs (Request for Comments)** do projeto **ObraFlow**. Cada RFC documenta uma decisão arquitetural, estratégia técnica ou especificação de módulo antes de sua implementação em código.

---

## 📋 Índice de RFCs

| ID | Título | Status | Data | Documentos Relacionados |
| :--- | :--- | :---: | :---: | :--- |
| **[RFC-0001](./0001-prototipagem-dados-e-relatorios.md)** | Estratégia de Prototipagem de Dados e Visualização de Relatórios (Minimal-Code) | 🔵 `Aprovada` | 2026-10-24 | [MER.md](../MER.md), [mock_data/](../mock_data) |
| **[RFC-0002](./0002-adr-jornada-orcamento-contrato-ia.md)** | Arquitetura de Prototipagem da Jornada Comercial, Orçamento e EAP com IA (Minimal-Code) | 🔵 `Aprovada` | 2026-10-25 | [MER.md](../MER.md), [ACTORS.md](../ACTORS.md), [RFC-0001](./0001-prototipagem-dados-e-relatorios.md) |

---

## 🔄 Ciclo de Vida de uma RFC

1. 🟡 **Em Discussão (`Draft`):** Proposta aberta para análise de trade-offs e definição de abordagem.
2. 🔵 **Aprovada (`Accepted`):** Abordagem escolhida e liberada para execução.
3. 🟢 **Implementada (`Implemented`):** Solução já construída e validada no repositório.
4. ⚪ **Substituída (`Superseded`):** Substituída por uma RFC mais recente.

---

## ➕ Como Criar uma Nova RFC

1. Copie o arquivo [0000-template.md](./0000-template.md) usando o próximo número sequencial (ex: `0002-nome-do-topico.md`).
2. Preencha as seções obrigatórias (Contexto, Requisitos, Opções Avaliadas, Recomendação e Questões em Aberto).
3. Adicione a entrada correspondente na tabela de **Índice de RFCs** acima.
