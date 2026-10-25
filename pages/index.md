---
title: ObraFlow — Relatórios Executivos, Cronograma e Onboarding IA
---

<script>
    // Estado da Jornada de Onboarding & IA (8 Etapas)
    let currentStep = 1;
    let apiKey = '';
    let isAiLoading = false;
    let aiError = '';

    // Etapa 1: Usuário
    let userName = 'Marina Costa';
    let userEmail = 'marina.costa@email.com';
    let userRole = 'CLIENT';

    // Etapa 2: Orçamento
    let projectName = 'Reforma Loft Jardins';
    let projectAddress = 'Alameda dos Anapurus, 780 - Apto 82';
    let projectArea = 72;
    let projectEstimatedBudget = 45000;
    let projectScope = 'Reforma completa de loft residencial: integração de cozinha, piso porcelanato 120x120, sanca e trilhos de iluminação.';

    // Etapa 3: Documentação
    let docPdf = 'planta_executiva_loft.pdf (2.4 MB)';
    let docXlsx = 'orcamento_materiais_loft.xlsx (840 KB)';
    let docTxt = 'memorial_descritivo_acabamentos.txt (45 KB)';
    let docTxtContent = `Memorial Descritivo:
- Área útil: 72m²
- Demolição de alvenaria divisória da cozinha (vão de 3.20m).
- Instalação de piso porcelanato retificado 120x120 em toda área social e cozinha.
- Readequação elétrica com instalação de circuito 220V para fogão de indução.
- Forro de gesso acartonado com sanca invertida e trilho magnético para iluminação LED.`;

    // Etapa 4: Diagnóstico IA
    let aiSummary = 'Diagnóstico preliminar gerado pela IA: Obra de reforma sem intervenções estruturais críticas. Recomendado foco logístico na entrega antecipada dos porcelanatos para não travar a fase de pintura.';
    let aiEstimatedTotal = 43750;
    let aiConfidence = 95;

    // Etapa 5 & 6: Contrato e Assinatura
    let contractAccepted = true;
    let contractSignedAt = '24/10/2026 19:40:12';

    // Etapa 7 & 8: EAP gerada por IA e editável pelo Empreiteiro
    let liveEpics = [
        { id: 'epic_5', title: '1. Demolição e Adequação Elétrica', start_date: '2026-10-25', end_date: '2026-10-31', status: 'COMPLETED' },
        { id: 'epic_6', title: '2. Revestimentos e Porcelanatos', start_date: '2026-11-01', end_date: '2026-11-14', status: 'IN_PROGRESS' },
        { id: 'epic_7', title: '3. Forro Drywall e Iluminação Linear', start_date: '2026-11-15', end_date: '2026-11-26', status: 'IN_PROGRESS' }
    ];

    let liveTasks = [
        { id: 'task_12', epic_title: '1. Demolição e Adequação Elétrica', title: 'Demolição de Mureta e Remoção de Entulho', category: 'EXECUTION', cost_labor: 2200, due_date: '2026-10-28', approved: true },
        { id: 'task_13', epic_title: '1. Demolição e Adequação Elétrica', title: 'Readequação de Pontos Elétricos e Ilha', category: 'EXECUTION', cost_labor: 1800, due_date: '2026-10-30', approved: true },
        { id: 'task_14', epic_title: '2. Revestimentos e Porcelanatos', title: 'Recebimento e Inspeção do Porcelanato Cinza 120x120', category: 'MATERIAL_RECEIVING', cost_labor: 300, due_date: '2026-11-03', approved: true },
        { id: 'task_15', epic_title: '2. Revestimentos e Porcelanatos', title: 'Assentamento de Porcelanato 120x120 em Área Social', category: 'EXECUTION', cost_labor: 4200, due_date: '2026-11-12', approved: true },
        { id: 'task_16', epic_title: '3. Forro Drywall e Iluminação Linear', title: 'Instalação de Trilhos Magnéticos e Perfis de LED', category: 'EXECUTION', cost_labor: 2600, due_date: '2026-11-24', approved: true }
    ];

    $: totalMaoDeObra = liveTasks.reduce((acc, t) => acc + Number(t.cost_labor || 0), 0);

    onMount(() => {
        if (typeof window !== 'undefined') {
            const savedKey = localStorage.getItem('OBRAFLOW_GEMINI_KEY');
            if (savedKey) apiKey = savedKey;
        }
    });

    function saveApiKey() {
        if (typeof window !== 'undefined' && apiKey) {
            localStorage.setItem('OBRAFLOW_GEMINI_KEY', apiKey);
        }
    }

    async function processWithGemini() {
        if (!apiKey) {
            aiError = 'Informe sua Google Gemini API Key para executar a chamada em tempo real (ou use a massa pré-carregada).';
            return;
        }
        aiError = '';
        isAiLoading = true;

        try {
            const prompt = `Você é o agente orçamentista técnico e de planejamento do ObraFlow.
Analise os seguintes dados e documentos da obra:
- Nome da Obra: ${projectName}
- Área: ${projectArea} m²
- Orçamento Estimado pelo Cliente: R$ ${projectEstimatedBudget}
- Escopo Preliminar: ${projectScope}
- Documentos: ${docPdf}, ${docXlsx}, ${docTxt}
- Conteúdo do Memorial: ${docTxtContent}

Responda OBRIGATORIAMENTE em JSON puro no formato:
{
  "resumo_diagnostico": "texto explicativo com viabilidade e riscos",
  "orcamento_base_estimado": 43500,
  "confianca_pct": 95,
  "epicos": [
     {"title": "1. Demolições e Infraestrutura", "start_date": "2026-10-25", "end_date": "2026-10-31"},
     {"title": "2. Revestimentos Cerâmicos", "start_date": "2026-11-01", "end_date": "2026-11-14"},
     {"title": "3. Acabamentos e Iluminação", "start_date": "2026-11-15", "end_date": "2026-11-26"}
  ],
  "tarefas": [
     {"epic_title": "1. Demolições e Infraestrutura", "title": "Demolição e Descarte de Entulho", "category": "EXECUTION", "cost_labor": 2200, "due_date": "2026-10-28"},
     {"epic_title": "1. Demolições e Infraestrutura", "title": "Passagem de Circuitos Elétricos", "category": "EXECUTION", "cost_labor": 1800, "due_date": "2026-10-30"},
     {"epic_title": "2. Revestimentos Cerâmicos", "title": "Recebimento e Conferência de Porcelanatos", "category": "MATERIAL_RECEIVING", "cost_labor": 300, "due_date": "2026-11-03"},
     {"epic_title": "2. Revestimentos Cerâmicos", "title": "Assentamento de Pisos e Rodapés", "category": "EXECUTION", "cost_labor": 4200, "due_date": "2026-11-12"},
     {"epic_title": "3. Acabamentos e Iluminação", "title": "Montagem de Drywall e Trilhos LED", "category": "EXECUTION", "cost_labor": 2600, "due_date": "2026-11-24"}
  ]
}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Erro na API Gemini: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const parsed = JSON.parse(textResponse);

            aiSummary = parsed.resumo_diagnostico || aiSummary;
            aiEstimatedTotal = parsed.orcamento_base_estimado || aiEstimatedTotal;
            aiConfidence = parsed.confianca_pct || aiConfidence;

            if (parsed.epicos && parsed.epicos.length > 0) {
                liveEpics = parsed.epicos.map((e, idx) => ({
                    id: `epic_gemini_${idx + 1}`,
                    title: e.title,
                    start_date: e.start_date,
                    end_date: e.end_date,
                    status: 'IN_PROGRESS'
                }));
            }

            if (parsed.tarefas && parsed.tarefas.length > 0) {
                liveTasks = parsed.tarefas.map((t, idx) => ({
                    id: `task_gemini_${idx + 1}`,
                    epic_title: t.epic_title,
                    title: t.title,
                    category: t.category || 'EXECUTION',
                    cost_labor: Number(t.cost_labor || 2000),
                    due_date: t.due_date || '2026-11-15',
                    approved: true
                }));
            }

            currentStep = 5;
        } catch (e) {
            aiError = e.message || 'Falha ao processar com Gemini.';
        } finally {
            isAiLoading = false;
        }
    }
</script>

```sql lista_projetos
SELECT id, name, status, address
FROM obraflow.projects
ORDER BY id
```

<!-- SELETOR UNIFICADO DE PROJETO (DRY: ZERO CÓDIGO DUPLICADO) -->
<div class="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-xl text-white mb-6 shadow-md flex flex-wrap justify-between items-center gap-4">
    <div>
        <div class="text-xs uppercase tracking-wider text-indigo-300 font-bold">Obra Selecionada no Dashboard</div>
        <div class="text-lg font-bold">Residencial Alpha vs. Reforma Loft Jardins</div>
    </div>
    <div class="flex items-center gap-3">
        <Dropdown
            data={lista_projetos}
            name="projeto_selecionado"
            value="id"
            label="name"
            defaultValue="proj_1"
        />
    </div>
</div>

---

## 🚀 Simulador Interativo da Jornada com IA (8 Etapas)

Painel funcional para prototipar o fluxo de ponta a ponta: **Criação de Usuário $\rightarrow$ Orçamento $\rightarrow$ Envio de PDF/Planilha/TXT $\rightarrow$ Análise Real por IA (Google Gemini) $\rightarrow$ Contrato $\rightarrow$ Aceite do Cliente $\rightarrow$ Geração de Épicos e Tarefas $\rightarrow$ Edição e Aprovação pelo Empreiteiro**.

<div class="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm mb-8">
    <!-- BARRA DE PROGRESSO DAS 8 ETAPAS -->
    <div class="flex items-center justify-between overflow-x-auto pb-4 border-b border-gray-100 gap-2 text-xs">
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 1}>1. Usuário</button>
        <span>→</span>
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 2}>2. Orçamento</button>
        <span>→</span>
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 3}>3. Docs (PDF/Planilha/TXT)</button>
        <span>→</span>
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 4 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 4}>4. Processamento IA</button>
        <span>→</span>
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 5 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 5}>5. Contrato</button>
        <span>→</span>
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 6 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 6}>6. Aceite Cliente</button>
        <span>→</span>
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 7 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 7}>7. Épicos IA</button>
        <span>→</span>
        <button class="px-3 py-1.5 rounded-lg font-bold {currentStep === 8 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => currentStep = 8}>8. Aprovação Empreiteiro</button>
    </div>

    <!-- CONTEÚDO DINÂMICO POR ETAPA -->
    <div class="mt-5">
        {#if currentStep === 1}
            <div class="space-y-4">
                <h3 class="font-bold text-gray-800 text-base">👤 Etapa 1: Criação ou Seleção de Usuário</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Nome Completo</label>
                        <input class="w-full border border-gray-300 rounded-lg p-2 text-sm" bind:value={userName} />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                        <input class="w-full border border-gray-300 rounded-lg p-2 text-sm" bind:value={userEmail} />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Papel no Sistema (Role)</label>
                        <select class="w-full border border-gray-300 rounded-lg p-2 text-sm" bind:value={userRole}>
                            <option value="CLIENT">CLIENT (Proprietário)</option>
                            <option value="CONTRACTOR">CONTRACTOR (Empreiteiro)</option>
                            <option value="ENGINEER">ENGINEER (Engenheiro / Orçamentista)</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end">
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700" on:click={() => currentStep = 2}>Salvar Usuário e Avançar →</button>
                </div>
            </div>

        {:else if currentStep === 2}
            <div class="space-y-4">
                <h3 class="font-bold text-gray-800 text-base">📝 Etapa 2: Preenchimento dos Dados do Orçamento</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Nome da Obra</label>
                        <input class="w-full border border-gray-300 rounded-lg p-2 text-sm" bind:value={projectName} />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Endereço do Canteiro</label>
                        <input class="w-full border border-gray-300 rounded-lg p-2 text-sm" bind:value={projectAddress} />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Área Estimada (m²)</label>
                        <input type="number" class="w-full border border-gray-300 rounded-lg p-2 text-sm" bind:value={projectArea} />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Teto Orçamentário Máximo (R$)</label>
                        <input type="number" class="w-full border border-gray-300 rounded-lg p-2 text-sm" bind:value={projectEstimatedBudget} />
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Escopo Preliminar da Obra</label>
                    <textarea class="w-full border border-gray-300 rounded-lg p-2 text-sm" rows="3" bind:value={projectScope}></textarea>
                </div>
                <div class="flex justify-between">
                    <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold" on:click={() => currentStep = 1}>← Voltar</button>
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700" on:click={() => currentStep = 3}>Avançar para Envio de Documentos →</button>
                </div>
            </div>

        {:else if currentStep === 3}
            <div class="space-y-4">
                <h3 class="font-bold text-gray-800 text-base">📂 Etapa 3: Envio da Documentação da Obra (PDF, Planilha, TXT)</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50/50">
                        <div class="text-2xl mb-1">📄</div>
                        <div class="font-bold text-xs text-gray-800">Planta / Escopo (PDF)</div>
                        <div class="text-[11px] text-emerald-700 mt-1 font-semibold">{docPdf}</div>
                        <input type="file" accept=".pdf" class="mt-2 text-xs w-full" on:change={(e) => { if (e.target.files[0]) docPdf = e.target.files[0].name; }} />
                    </div>
                    <div class="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50/50">
                        <div class="text-2xl mb-1">📊</div>
                        <div class="font-bold text-xs text-gray-800">Planilha de Custos (XLSX/CSV)</div>
                        <div class="text-[11px] text-emerald-700 mt-1 font-semibold">{docXlsx}</div>
                        <input type="file" accept=".xlsx,.csv" class="mt-2 text-xs w-full" on:change={(e) => { if (e.target.files[0]) docXlsx = e.target.files[0].name; }} />
                    </div>
                    <div class="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50/50">
                        <div class="text-2xl mb-1">📝</div>
                        <div class="font-bold text-xs text-gray-800">Memorial Técnico (TXT)</div>
                        <div class="text-[11px] text-emerald-700 mt-1 font-semibold">{docTxt}</div>
                        <input type="file" accept=".txt" class="mt-2 text-xs w-full" on:change={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                docTxt = file.name;
                                const r = new FileReader();
                                r.onload = (ev) => docTxtContent = ev.target.result;
                                r.readAsText(file);
                            }
                        }} />
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Prévia do Conteúdo Técnico Ingerido (TXT)</label>
                    <textarea class="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono bg-gray-50" rows="3" bind:value={docTxtContent}></textarea>
                </div>

                <div class="flex justify-between">
                    <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold" on:click={() => currentStep = 2}>← Voltar</button>
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700" on:click={() => currentStep = 4}>Avançar para Processamento IA →</button>
                </div>
            </div>

        {:else if currentStep === 4}
            <div class="space-y-4">
                <h3 class="font-bold text-gray-800 text-base">🤖 Etapa 4: Processamento dos Dados por IA (Google Gemini API)</h3>

                <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div class="text-xs font-bold text-indigo-900 mb-2">Configuração da Chamada Real à IA (Google Gemini):</div>
                    <div class="flex flex-wrap gap-2 items-center">
                        <input
                            type="password"
                            placeholder="Insira sua Google Gemini API Key (ex: AIzaSy...)"
                            class="flex-1 min-w-[260px] border border-indigo-300 rounded-lg p-2 text-xs bg-white"
                            bind:value={apiKey}
                            on:blur={saveApiKey}
                        />
                        <button
                            class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                            on:click={processWithGemini}
                            disabled={isAiLoading}
                        >
                            {isAiLoading ? 'Processando com Gemini...' : '⚡ Chamar IA em Tempo Real'}
                        </button>
                    </div>
                    {#if aiError}
                        <div class="text-xs text-rose-600 font-semibold mt-2">⚠️ {aiError}</div>
                    {/if}
                    <div class="text-[11px] text-gray-500 mt-2">
                        Dica: Você também pode avançar diretamente utilizando os dados pré-carregados validados da arquitetura.
                    </div>
                </div>

                <div class="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold uppercase text-gray-500">Resultado do Diagnóstico Extraído</span>
                        <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">Confiança IA: {aiConfidence}%</span>
                    </div>
                    <p class="text-xs text-gray-700 leading-relaxed">{aiSummary}</p>
                    <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 text-xs">
                        <div>Orçamento Base Calculado: <strong class="text-indigo-700">R$ {aiEstimatedTotal.toLocaleString('pt-BR')}</strong></div>
                        <div>Status do Pipeline: <strong class="text-blue-700">BUDGET_READY</strong></div>
                    </div>
                </div>

                <div class="flex justify-between">
                    <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold" on:click={() => currentStep = 3}>← Voltar</button>
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700" on:click={() => currentStep = 5}>Gerar Minuta de Contrato →</button>
                </div>
            </div>

        {:else if currentStep === 5}
            <div class="space-y-4">
                <h3 class="font-bold text-gray-800 text-base">📜 Etapa 5: Criação do Contrato da Obra</h3>
                <div class="border border-gray-300 rounded-xl p-4 bg-gray-50 font-serif text-xs text-gray-800 space-y-2 leading-relaxed">
                    <div class="font-bold text-center text-sm uppercase text-gray-900 border-b border-gray-200 pb-2">Contrato de Prestação de Serviços de Reforma e Execução Civil</div>
                    <p><strong>CONTRATANTE:</strong> {userName} ({userEmail}).</p>
                    <p><strong>CONTRATADA:</strong> Construtora Alpha (Eng. Maria Souza / CREA-SP 506981).</p>
                    <p><strong>OBJETO:</strong> Execução das obras do projeto <em>{projectName}</em>, situado em {projectAddress}, com área estimada de {projectArea}m².</p>
                    <p><strong>VALOR TOTAL DA EAP:</strong> R$ {aiEstimatedTotal.toLocaleString('pt-BR')} divididos em parcelas de mobilização e medições físicas.</p>
                    <p><strong>CLÁUSULA DE TRANSPARÊNCIA E EVIDÊNCIA:</strong> Todas as medições e liberações de parcelas financeiras estão estritamente condicionadas à comprovação fotográfica de conclusão das tarefas no Kanban (status DONE c/ foto obrigatória).</p>
                </div>
                <div class="flex justify-between">
                    <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold" on:click={() => currentStep = 4}>← Voltar</button>
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700" on:click={() => currentStep = 6}>Avançar para Aceite do Cliente →</button>
                </div>
            </div>

        {:else if currentStep === 6}
            <div class="space-y-4">
                <h3 class="font-bold text-gray-800 text-base">✍️ Etapa 6: Aceite do Contrato por Parte do Cliente</h3>
                <div class="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-3">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="aceite" class="w-4 h-4 text-emerald-600" bind:checked={contractAccepted} />
                        <label for="aceite" class="text-xs text-gray-800 font-semibold">
                            Eu, <strong>{userName}</strong>, li e aceito as condições orçamentárias, o escopo técnico e a metodologia de medição por fotos do ObraFlow.
                        </label>
                    </div>
                    <div class="text-[11px] text-gray-600">
                        Registro de Assinatura Digital: <code>contract_signed_at = {contractSignedAt}</code> | Status: <span class="font-bold text-emerald-700">CONTRACT_SIGNED</span>
                    </div>
                </div>
                <div class="flex justify-between">
                    <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold" on:click={() => currentStep = 5}>← Voltar</button>
                    <button
                        class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                        disabled={!contractAccepted}
                        on:click={() => currentStep = 7}
                    >
                        Confirmar Aceite e Gerar Obra com IA →
                    </button>
                </div>
            </div>

        {:else if currentStep === 7}
            <div class="space-y-4">
                <h3 class="font-bold text-gray-800 text-base">🏗️ Etapa 7: A IA Cria a Obra com Épicos e Tarefas</h3>
                <div class="text-xs text-gray-600">A IA desmembrou o contrato e os documentos nos seguintes Épicos da Master Pipeline e Tarefas operacionais:</div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {#each liveEpics as ep}
                        <div class="border border-indigo-200 bg-indigo-50/40 p-3 rounded-xl">
                            <div class="text-[10px] font-bold uppercase text-indigo-700">Macroetapa IA</div>
                            <div class="font-bold text-xs text-gray-900 mt-0.5">{ep.title}</div>
                            <div class="text-[11px] text-gray-600 mt-1">📅 {ep.start_date} até {ep.end_date}</div>
                        </div>
                    {/each}
                </div>

                <div class="text-xs font-bold text-gray-700 mt-2">Tarefas Desdobradas pela IA no Kanban:</div>
                <div class="space-y-2">
                    {#each liveTasks as t}
                        <div class="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
                            <div>
                                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-800">{t.category}</span>
                                <span class="font-bold ml-2 text-gray-900">{t.title}</span>
                                <span class="text-[11px] text-gray-500 ml-2">({t.epic_title})</span>
                            </div>
                            <div class="text-right">
                                <strong>R$ {Number(t.cost_labor).toLocaleString('pt-BR')}</strong>
                                <span class="text-gray-500 ml-2">Prazo: {t.due_date}</span>
                            </div>
                        </div>
                    {/each}
                </div>

                <div class="flex justify-between">
                    <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold" on:click={() => currentStep = 6}>← Voltar</button>
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700" on:click={() => currentStep = 8}>Revisar e Aprovar como Empreiteiro →</button>
                </div>
            </div>

        {:else if currentStep === 8}
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-gray-800 text-base">👷 Etapa 8: Empreiteiro Aprova ou Edita Épicos e Tarefas</h3>
                        <p class="text-xs text-gray-600">Altere custos de mão de obra ou prazos diretamente na tabela. O orçamento total da EAP recalcula em tempo real.</p>
                    </div>
                    <div class="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-right">
                        <div class="text-[10px] uppercase font-bold text-indigo-700">Total Mão de Obra EAP</div>
                        <div class="text-sm font-bold text-indigo-950">R$ {totalMaoDeObra.toLocaleString('pt-BR')}</div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-gray-100 border-b border-gray-200 text-gray-700">
                                <th class="p-2">Épico / Tarefa</th>
                                <th class="p-2">Categoria</th>
                                <th class="p-2">Prazo Limite</th>
                                <th class="p-2">Custo Mão de Obra (R$)</th>
                                <th class="p-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each liveTasks as task, idx}
                                <tr class="border-b border-gray-100 hover:bg-gray-50/80">
                                    <td class="p-2">
                                        <input class="w-full border border-gray-200 rounded px-2 py-1 text-xs" bind:value={task.title} />
                                        <div class="text-[10px] text-gray-400 mt-0.5">{task.epic_title}</div>
                                    </td>
                                    <td class="p-2">
                                        <select class="border border-gray-200 rounded px-1.5 py-1 text-xs" bind:value={task.category}>
                                            <option value="EXECUTION">EXECUTION</option>
                                            <option value="MATERIAL_RECEIVING">MATERIAL_RECEIVING</option>
                                            <option value="MATERIAL_PURCHASE">MATERIAL_PURCHASE</option>
                                            <option value="INSPECTION">INSPECTION</option>
                                        </select>
                                    </td>
                                    <td class="p-2">
                                        <input type="date" class="border border-gray-200 rounded px-1.5 py-1 text-xs" bind:value={task.due_date} />
                                    </td>
                                    <td class="p-2">
                                        <input type="number" class="w-28 border border-gray-200 rounded px-2 py-1 text-xs font-semibold text-right" bind:value={task.cost_labor} />
                                    </td>
                                    <td class="p-2 text-center">
                                        <input type="checkbox" bind:checked={task.approved} />
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <div class="flex justify-between items-center pt-2">
                    <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold" on:click={() => currentStep = 7}>← Voltar</button>
                    <button
                        class="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm"
                        on:click={() => alert('✅ EAP auditada e aprovada pelo Empreiteiro! A obra entrou oficialmente em status IN_PROGRESS e está ativa no Dashboard abaixo.')}
                    >
                        ✅ Aprovar EAP e Liberar Execução da Obra (IN_PROGRESS)
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

---

## 1. Indicadores Globais de Saúde da Obra (EAP Expandida)

```sql eap_por_tarefa
WITH mat_agg AS (
    SELECT
        task_id,
        SUM(quantity * unit_price) AS custo_insumos,
        SUM(freight_cost) AS custo_frete,
        SUM(CASE WHEN receiver_responsible = 'CONTRACTOR' THEN receiving_fee ELSE 0 END) AS custo_recebimento,
        SUM(CASE WHEN purchased = true THEN total_price ELSE 0 END) AS mat_realizado
    FROM obraflow.materials
    GROUP BY task_id
),
ai_agg AS (
    SELECT
        m.task_id,
        SUM(s.consulting_fee) AS custo_ia,
        SUM(CASE WHEN s.status IN ('READY', 'APPROVED_BY_CLIENT') THEN s.consulting_fee ELSE 0 END) AS ia_realizado
    FROM obraflow.ai_room_simulations s
    JOIN obraflow.materials m ON m.id = s.material_id
    GROUP BY m.task_id
),
evid_agg AS (
    SELECT
        task_id,
        COUNT(*) AS qtd_fotos,
        FIRST(photo_url) AS foto_url,
        FIRST(notes) AS nota_evidencia
    FROM obraflow.evidences
    GROUP BY task_id
)
SELECT
    t.id AS task_id,
    t.epic_id,
    e.project_id,
    e.title AS epico,
    e.order_index,
    e.status AS status_epico,
    CAST(e.start_date AS DATE) AS inicio_epico,
    CAST(e.end_date AS DATE) AS fim_epico,
    t.title AS tarefa,
    t.description AS descricao,
    t.category AS categoria,
    t.kanban_status,
    COALESCE(c.name, 'Equipe de Campo') AS responsavel,
    CAST(t.due_date AS DATE) AS prazo_tarefa,
    STRFTIME(CAST(t.due_date AS DATE), '%d/%m/%Y') AS prazo_fmt,
    t.cost_labor AS custo_mao_de_obra,
    COALESCE(m.custo_insumos, 0) AS custo_insumos,
    COALESCE(m.custo_frete, 0) AS custo_frete,
    COALESCE(m.custo_recebimento, 0) AS custo_recebimento,
    COALESCE(a.custo_ia, 0) AS custo_ia,
    (t.cost_labor + COALESCE(m.custo_insumos, 0) + COALESCE(m.custo_frete, 0) + COALESCE(m.custo_recebimento, 0) + COALESCE(a.custo_ia, 0)) AS c_tarefa_total,
    COALESCE(ev.qtd_fotos, 0) AS qtd_fotos,
    ev.foto_url,
    ev.nota_evidencia,
    CASE WHEN t.kanban_status = 'DONE' AND COALESCE(ev.qtd_fotos, 0) > 0 THEN true ELSE false END AS concluida_com_foto,
    CASE
        WHEN t.kanban_status = 'DONE' AND COALESCE(ev.qtd_fotos, 0) > 0
        THEN (t.cost_labor + COALESCE(m.custo_insumos, 0) + COALESCE(m.custo_frete, 0) + COALESCE(m.custo_recebimento, 0) + COALESCE(a.custo_ia, 0))
        ELSE 0
    END AS valor_fisico_executado,
    (
        CASE WHEN t.kanban_status = 'DONE' THEN t.cost_labor WHEN t.kanban_status IN ('IN_PROGRESS', 'REVIEW') THEN t.cost_labor * 0.5 ELSE 0 END
        + COALESCE(m.mat_realizado, 0)
        + COALESCE(a.ia_realizado, 0)
    ) AS valor_financeiro_realizado
FROM obraflow.tasks t
JOIN obraflow.epics e ON e.id = t.epic_id
LEFT JOIN obraflow.collaborators c ON c.id = t.assigned_collaborator_id
LEFT JOIN mat_agg m ON m.task_id = t.id
LEFT JOIN ai_agg a ON a.task_id = t.id
LEFT JOIN evid_agg ev ON ev.task_id = t.id
WHERE e.project_id = '${inputs.projeto_selecionado.value}'
ORDER BY e.order_index, t.due_date, t.id
```

```sql kpis_globais
SELECT
    SUM(c_tarefa_total) AS orcamento_total_eap,
    SUM(valor_fisico_executado) AS total_fisico_brl,
    SUM(valor_financeiro_realizado) AS total_financeiro_brl,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico_pct,
    COALESCE(SUM(valor_financeiro_realizado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_financeiro_pct,
    COALESCE((SUM(valor_financeiro_realizado) - SUM(valor_fisico_executado)) / NULLIF(SUM(c_tarefa_total), 0), 0) AS desvio_pct
FROM ${eap_por_tarefa}
```

```sql margem_empreiteiro
SELECT
    SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS receita_recebida,
    SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS custos_pagos,
    SUM(CASE WHEN type = 'RECEIVABLE' AND status = 'PAID' THEN amount ELSE 0 END)
      - SUM(CASE WHEN type = 'PAYABLE' AND status = 'PAID' THEN amount ELSE 0 END) AS margem_atual
FROM obraflow.financial_transactions
WHERE project_id = '${inputs.projeto_selecionado.value}'
```

<BigValue data={kpis_globais} value="orcamento_total_eap" title="Orçamento Base Expandido (EAP)" fmt="brl" />
<BigValue data={kpis_globais} value="avanco_fisico_pct" title="Avanço Físico (Comprovado c/ Foto)" fmt="pct1" />
<BigValue data={kpis_globais} value="avanco_financeiro_pct" title="Avanço Financeiro (Realizado)" fmt="pct1" />
<BigValue data={margem_empreiteiro} value="margem_atual" title="Margem de Caixa (Empreiteiro)" fmt="brl" />

---

## 2. Cronograma da Obra (Master Pipeline & Linha do Tempo)

```sql cronograma_epicos
SELECT
    e.order_index,
    e.title AS epico,
    e.status AS status_epico,
    CAST(e.start_date AS DATE) AS inicio,
    CAST(e.end_date AS DATE) AS termino,
    STRFTIME(CAST(e.start_date AS DATE), '%d/%m/%Y') AS inicio_fmt,
    STRFTIME(CAST(e.end_date AS DATE), '%d/%m/%Y') AS termino_fmt,
    DATEDIFF('day', MIN(CAST(e.start_date AS DATE)) OVER(), CAST(e.start_date AS DATE)) AS dia_inicio_offset,
    DATEDIFF('day', CAST(e.start_date AS DATE), CAST(e.end_date AS DATE)) AS duracao_dias,
    COALESCE(ROUND(100.0 * SUM(t.valor_fisico_executado) / NULLIF(SUM(t.c_tarefa_total), 0), 0), 0) AS pct_fisico,
    COALESCE(ROUND(100.0 * SUM(t.valor_financeiro_realizado) / NULLIF(SUM(t.c_tarefa_total), 0), 0), 0) AS pct_financeiro,
    SUM(t.c_tarefa_total) AS orcamento_epico
FROM obraflow.epics e
JOIN ${eap_por_tarefa} t ON t.epic_id = e.id
WHERE e.project_id = '${inputs.projeto_selecionado.value}'
GROUP BY e.order_index, e.title, e.status, e.start_date, e.end_date
ORDER BY e.order_index
```

### Master Pipeline (Macroetapas da Obra)

<Grid cols=3>
{#each cronograma_epicos as ep}
    <div class="p-3.5 rounded-lg border {ep.status_epico === 'COMPLETED' ? 'border-emerald-300 bg-emerald-50/40' : ep.status_epico === 'IN_PROGRESS' ? 'border-blue-300 bg-blue-50/40' : 'border-rose-300 bg-rose-50/40'}">
        <div class="text-xs font-bold uppercase tracking-wider {ep.status_epico === 'COMPLETED' ? 'text-emerald-700' : ep.status_epico === 'IN_PROGRESS' ? 'text-blue-700' : 'text-rose-700'}">
            {ep.status_epico === 'COMPLETED' ? '✅ Concluído' : ep.status_epico === 'IN_PROGRESS' ? '🚧 Em Andamento' : '🔒 Bloqueado (Compras)'}
        </div>
        <div class="font-bold text-sm mt-1">{ep.epico}</div>
        <div class="text-xs text-gray-600 mt-1">📅 {ep.inicio_fmt} até {ep.termino_fmt} ({ep.duracao_dias}d)</div>
        <div class="mt-2 text-xs flex justify-between">
            <span>Físico: <strong>{ep.pct_fisico}%</strong></span>
            <span>Financ.: <strong>{ep.pct_financeiro}%</strong></span>
        </div>
    </div>
{/each}
</Grid>

---

## 3. Quadro Kanban Polimórfico (Visões Personalizadas)

Filtre os cartões do quadro Kanban por categoria operacional (**Execução de Campo**, **Logística e Recebimento**, **Compras de Material** ou **Vistorias**):

<ButtonGroup name="filtro_categoria" defaultValue="%">
    <ButtonGroupItem valueLabel="Todas as Tarefas" value="%" />
    <ButtonGroupItem valueLabel="🧱 Execução de Campo" value="EXECUTION" />
    <ButtonGroupItem valueLabel="📦 Logística & Recebimento" value="MATERIAL_RECEIVING" />
    <ButtonGroupItem valueLabel="🛒 Compras de Material" value="MATERIAL_PURCHASE" />
    <ButtonGroupItem valueLabel="🔍 Vistorias" value="INSPECTION" />
</ButtonGroup>

```sql kanban_cards
SELECT *
FROM ${eap_por_tarefa}
WHERE categoria LIKE '${inputs.filtro_categoria}'
ORDER BY order_index, prazo_tarefa
```

<Grid cols=4>
    <!-- COLUNA 1: TODO -->
    <div class="bg-gray-100 p-3 rounded-xl border border-gray-200">
        <div class="font-bold text-xs uppercase tracking-wider text-gray-700 mb-3 flex justify-between items-center">
            <span>📋 A Fazer (TODO)</span>
            <span class="bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'TODO').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'TODO') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-2.5">
                <div class="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 inline-block px-1.5 py-0.5 rounded">{card.categoria}</div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                <div class="text-[11px] text-gray-500 mt-1">{card.epico}</div>
                <div class="text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>📅 {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>

    <!-- COLUNA 2: IN_PROGRESS -->
    <div class="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
        <div class="font-bold text-xs uppercase tracking-wider text-blue-800 mb-3 flex justify-between items-center">
            <span>🚧 Em Andamento</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'IN_PROGRESS').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'IN_PROGRESS') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-blue-200 mb-2.5">
                <div class="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 inline-block px-1.5 py-0.5 rounded">{card.categoria}</div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                <div class="text-[11px] text-gray-500 mt-1">{card.epico}</div>
                <div class="text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>📅 {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>

    <!-- COLUNA 3: REVIEW -->
    <div class="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
        <div class="font-bold text-xs uppercase tracking-wider text-amber-800 mb-3 flex justify-between items-center">
            <span>🔎 Em Conferência (REVIEW)</span>
            <span class="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'REVIEW').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'REVIEW') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-amber-200 mb-2.5">
                <div class="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 inline-block px-1.5 py-0.5 rounded">{card.categoria}</div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                <div class="text-[11px] text-gray-500 mt-1">{card.epico}</div>
                <div class="text-[10px] text-amber-700 mt-1.5 font-medium">📷 Aguardando foto de inspeção</div>
                <div class="text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>📅 {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>

    <!-- COLUNA 4: DONE -->
    <div class="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
        <div class="font-bold text-xs uppercase tracking-wider text-emerald-800 mb-3 flex justify-between items-center">
            <span>✅ Concluído (DONE)</span>
            <span class="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-xs">{kanban_cards.filter(t => t.kanban_status === 'DONE').length}</span>
        </div>
        {#each kanban_cards.filter(t => t.kanban_status === 'DONE') as card}
            <div class="bg-white p-3 rounded-lg shadow-sm border border-emerald-200 mb-2.5">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">{card.categoria}</span>
                    <span class="text-[10px] font-bold text-emerald-700">📸 Foto OK</span>
                </div>
                <div class="font-bold text-xs text-gray-900 mt-1">{card.tarefa}</div>
                {#if card.foto_url}
                    <div class="mt-2 text-[10px] text-gray-500 bg-gray-50 p-1 rounded border border-gray-100 flex items-center gap-1">
                        <span>📷 Evidência:</span>
                        <a href="{card.foto_url}" target="_blank" rel="noreferrer" class="text-indigo-600 hover:underline truncate">Ver foto no canteiro</a>
                    </div>
                {/if}
                <div class="text-[11px] text-gray-600 mt-2 pt-1.5 border-t border-gray-100 flex justify-between">
                    <span>👷 {card.responsavel.split(' ')[0]}</span>
                    <strong>✓ {card.prazo_fmt}</strong>
                </div>
            </div>
        {/each}
    </div>
</Grid>

---

## 4. Termômetro de Saúde da Obra (Avanço Físico vs. Financeiro por Épico)

```sql saude_por_epico
SELECT
    epico,
    status_epico,
    SUM(c_tarefa_total) AS orcamento_epico,
    COALESCE(SUM(valor_fisico_executado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_fisico,
    COALESCE(SUM(valor_financeiro_realizado) / NULLIF(SUM(c_tarefa_total), 0), 0) AS avanco_financeiro
FROM ${eap_por_tarefa}
GROUP BY epico, status_epico, order_index
ORDER BY order_index
```

<BarChart
    data={saude_por_epico}
    x="epico"
    y={["avanco_fisico", "avanco_financeiro"]}
    type="grouped"
    yFmt="pct0"
    title="Comparativo % Avanço Físico vs. % Avanço Financeiro por Épico"
/>

<DataTable data={saude_por_epico}>
    <Column id="epico" title="Macroetapa (Épico)" />
    <Column id="status_epico" title="Status Pipeline" />
    <Column id="orcamento_epico" title="Orçamento EAP" fmt="brl" />
    <Column id="avanco_fisico" title="% Físico (DONE + Foto)" fmt="pct1" contentType="bar" />
    <Column id="avanco_financeiro" title="% Financeiro (Gasto)" fmt="pct1" contentType="bar" />
</DataTable>

---

## 5. Gestão e Cronograma de Compras (Supply Chain)

```sql cronograma_compras
SELECT
    m.name AS material,
    e.title AS epico,
    m.material_group AS grupo,
    CAST(m.purchase_deadline AS DATE) AS limite_compra,
    CAST(m.estimated_delivery AS DATE) AS previsao_entrega,
    m.receiver_responsible AS recebedor_obra,
    m.total_price AS custo_total,
    m.purchased AS comprado,
    DATEDIFF('day', DATE '2026-10-24', CAST(m.purchase_deadline AS DATE)) AS dias_para_vencer,
    CASE
        WHEN m.purchased = true THEN '✅ Comprado'
        WHEN DATEDIFF('day', DATE '2026-10-24', CAST(m.purchase_deadline AS DATE)) <= 7 THEN '🚨 GARGALO (<= 7 dias)'
        ELSE '⏳ No Prazo'
    END AS alerta_gargalo
FROM obraflow.materials m
JOIN obraflow.tasks t ON t.id = m.task_id
JOIN obraflow.epics e ON e.id = t.epic_id
WHERE e.project_id = '${inputs.projeto_selecionado.value}'
ORDER BY m.purchase_deadline ASC
```

<DataTable data={cronograma_compras} rows=10>
    <Column id="alerta_gargalo" title="Status / Gargalo" />
    <Column id="material" title="Material / Insumo" />
    <Column id="epico" title="Épico" />
    <Column id="limite_compra" title="Data Limite Compra" />
    <Column id="previsao_entrega" title="Chegada na Obra" />
    <Column id="recebedor_obra" title="Quem Recebe" />
    <Column id="custo_total" title="Total (c/ Frete + Taxa)" fmt="brl" />
</DataTable>

---

## 6. Fluxo de Caixa e Extrato Financeiro

```sql extrato_financeiro
SELECT
    CAST(due_date AS DATE) AS vencimento,
    type AS tipo,
    category AS categoria,
    description AS descricao,
    amount AS valor,
    status
FROM obraflow.financial_transactions
WHERE project_id = '${inputs.projeto_selecionado.value}'
ORDER BY due_date ASC
```

<DataTable data={extrato_financeiro} rows=15>
    <Column id="vencimento" title="Vencimento" />
    <Column id="tipo" title="Tipo" />
    <Column id="categoria" title="Categoria" />
    <Column id="descricao" title="Descrição" />
    <Column id="valor" title="Valor" fmt="brl" />
    <Column id="status" title="Status" />
</DataTable>
