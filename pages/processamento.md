---
title: Processamento IA, Avaliação e Contrato - ObraFlow
hide_title: true
hide_sidebar: true
---

<script>
    let step = 2; // Inicia na Etapa 2 (Processamento IA)
    let apiKey = '';
    let isAiLoading = false;
    let aiError = '';

    // Dados do Orçamento em Processamento
    let projectName = 'Reforma Loft Jardins';
    let clientName = 'Marina Costa';
    let clientEmail = 'marina.costa@email.com';
    let areaM2 = 72;
    let budgetMaxClient = 45000;

    // Resultado IA
    let aiDiagnosis = 'Reforma de 72m² em ambiente residencial. Não foram identificadas intervenções estruturais em pilares ou vigas portantes. Demolição de mureta divisória com geração de 3m³ de entulho. Necessidade de 65m² de piso porcelanato 120x120 e novo circuito 220V para ilha da cozinha.';
    let aiConfidence = 94;
    let aiEstimatedTotal = 43500;

    // EAP Avaliada pelo Orçamentista (Etapa 3)
    let eapTasks = [
        { id: 1, title: 'Demolição de Mureta e Remoção de Entulho', category: 'EXECUTION', labor_cost: 2200, due_date: '2026-10-28', approved: true },
        { id: 2, title: 'Readequação de Pontos Elétricos e Ilha', category: 'EXECUTION', labor_cost: 1800, due_date: '2026-10-30', approved: true },
        { id: 3, title: 'Recebimento de Porcelanato Cinza 120x120', category: 'MATERIAL_RECEIVING', labor_cost: 300, due_date: '2026-11-03', approved: true },
        { id: 4, title: 'Assentamento de Porcelanato 120x120 Social', category: 'EXECUTION', labor_cost: 4200, due_date: '2026-11-12', approved: true },
        { id: 5, title: 'Instalação de Trilhos Magnéticos e LED', category: 'EXECUTION', labor_cost: 2600, due_date: '2026-11-24', approved: true }
    ];

    $: totalLabor = eapTasks.reduce((acc, t) => acc + Number(t.labor_cost || 0), 0);
    $: totalInsumos = 22400;
    $: totalEapFinal = totalLabor + totalInsumos + 850; // fretes

    // Etapa 5: Aceite do Cliente
    let clientAccepted = true;
    let contractSignedAt = '25/10/2026 09:00:12';

    onMount(() => {
        if (typeof window !== 'undefined') {
            const savedKey = localStorage.getItem('OBRAFLOW_GEMINI_KEY');
            if (savedKey) apiKey = savedKey;
        }
    });

    async function runRealGemini() {
        if (!apiKey) {
            aiError = 'Por favor, informe a Google Gemini API Key para executar a chamada em tempo real (ou use os dados pré-carregados).';
            return;
        }
        aiError = '';
        isAiLoading = true;

        try {
            const prompt = `Você é o orçamentista de engenharia do ObraFlow.
Analise a obra ${projectName} (${areaM2}m²), teto de R$ ${budgetMaxClient}.
Responda em JSON puro:
{
  "diagnostico": "resumo técnico do escopo e viabilidade",
  "orcamento_base": 43500,
  "confianca": 94
}`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });

            if (!res.ok) throw new Error(`API Gemini erro ${res.status}`);
            const data = await res.json();
            const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);

            aiDiagnosis = parsed.diagnostico || aiDiagnosis;
            aiEstimatedTotal = parsed.orcamento_base || aiEstimatedTotal;
            aiConfidence = parsed.confianca || aiConfidence;
            step = 3; // avança para avaliação do orçamentista
        } catch (e) {
            aiError = e.message;
        } finally {
            isAiLoading = false;
        }
    }
</script>

<div class="max-w-4xl mx-auto py-8">
  <!-- Stepper de 5 Etapas -->
  <div class="flex items-center justify-between overflow-x-auto pb-4 mb-6 border-b border-gray-200 text-xs font-bold gap-2">
    <a href="./novo-projeto" class="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 no-underline">1. Dados & Docs</a>
    <span>→</span>
    <button class="px-3 py-1.5 rounded-lg {step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => step = 2}>2. Análise IA</button>
    <span>→</span>
    <button class="px-3 py-1.5 rounded-lg {step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => step = 3}>3. Avaliação Orçamentista</button>
    <span>→</span>
    <button class="px-3 py-1.5 rounded-lg {step === 4 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => step = 4}>4. Proposta & Contrato</button>
    <span>→</span>
    <button class="px-3 py-1.5 rounded-lg {step === 5 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}" on:click={() => step = 5}>5. Aceite Cliente & Ativação</button>
  </div>

  {#if step === 2}
    <!-- ETAPA 2: PROCESSAMENTO IA -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gray-900 m-0">🤖 2. Processamento Inteligente por IA</h2>
          <p class="text-gray-500 text-xs mt-1">Extração automática de quantitativos cruzando PDF, Planilha e Memorial Descritivo.</p>
        </div>
        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">Status: BUDGET_READY</span>
      </div>

      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div class="text-xs font-bold text-indigo-900 mb-1">Chamada Real à Google Gemini API:</div>
        <div class="flex gap-2 items-center">
          <input 
            type="password" 
            placeholder="Insira sua Gemini API Key (ex: AIzaSy...)" 
            class="flex-1 border border-indigo-300 rounded-lg p-2 text-xs bg-white" 
            bind:value={apiKey} 
            on:blur={() => localStorage.setItem('OBRAFLOW_GEMINI_KEY', apiKey)}
          />
          <button 
            class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
            on:click={runRealGemini}
            disabled={isAiLoading}
          >
            {isAiLoading ? 'Processando...' : '⚡ Executar Extração com IA'}
          </button>
        </div>
        {#if aiError}
          <div class="text-rose-600 text-xs font-semibold mt-2">⚠️ {aiError}</div>
        {/if}
      </div>

      <div class="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-xs font-bold uppercase text-gray-600">Diagnóstico Estruturado da IA</span>
          <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Grau de Confiança: {aiConfidence}%</span>
        </div>
        <p class="text-xs text-gray-700 leading-relaxed m-0">{aiDiagnosis}</p>
        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 text-xs">
          <div>Orçamento Base Sugerido: <strong class="text-indigo-700">R$ {aiEstimatedTotal.toLocaleString('pt-BR')}</strong></div>
          <div>Teto Máximo do Cliente: <strong>R$ {budgetMaxClient.toLocaleString('pt-BR')}</strong></div>
        </div>
      </div>

      <div class="flex justify-between pt-2">
        <a href="./novo-projeto" class="text-gray-500 hover:text-gray-700 text-xs font-semibold no-underline">← Voltar para Dados</a>
        <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs" on:click={() => step = 3}>
          Encaminhar para Avaliação do Orçamentista (Etapa 3) →
        </button>
      </div>
    </div>

  {:else if step === 3}
    <!-- ETAPA 3: AVALIAÇÃO DO ORÇAMENTISTA -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gray-900 m-0">📐 3. Avaliação Técnica e Calibração da EAP</h2>
          <p class="text-gray-500 text-xs mt-1">O Orçamentista audita os itens extraídos pela IA, ajusta custos de mão de obra e insumos.</p>
        </div>
        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">Status: APPROVED</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-gray-100 border-b border-gray-200 text-gray-700">
              <th class="p-2">Tarefa Proposta pela IA</th>
              <th class="p-2">Categoria</th>
              <th class="p-2">Prazo</th>
              <th class="p-2 text-right">Mão de Obra (R$)</th>
              <th class="p-2 text-center">Aprovar</th>
            </tr>
          </thead>
          <tbody>
            {#each eapTasks as t}
              <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="p-2 font-medium">{t.title}</td>
                <td class="p-2"><span class="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{t.category}</span></td>
                <td class="p-2 text-gray-600">{t.due_date}</td>
                <td class="p-2 text-right">
                  <input type="number" class="w-24 text-right border border-gray-200 rounded px-2 py-1 text-xs font-bold" bind:value={t.labor_cost} />
                </td>
                <td class="p-2 text-center">
                  <input type="checkbox" bind:checked={t.approved} />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="bg-slate-50 p-4 rounded-xl flex justify-between items-center text-xs border border-gray-200">
        <div>Total Mão de Obra: <strong>R$ {totalLabor.toLocaleString('pt-BR')}</strong></div>
        <div>Insumos & Materiais: <strong>R$ {totalInsumos.toLocaleString('pt-BR')}</strong></div>
        <div>Fretes & Taxas: <strong>R$ 850,00</strong></div>
        <div class="text-sm font-bold text-indigo-700">Total Homologado EAP: R$ {totalEapFinal.toLocaleString('pt-BR')}</div>
      </div>

      <div class="flex justify-between pt-2">
        <button class="text-gray-500 hover:text-gray-700 text-xs font-semibold" on:click={() => step = 2}>← Voltar para IA</button>
        <button class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs" on:click={() => step = 4}>
          Homologar Orçamento e Gerar Proposta Comercial (Etapa 4) →
        </button>
      </div>
    </div>

  {:else if step === 4}
    <!-- ETAPA 4: PROPOSTA COMERCIAL & CONTRATO -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gray-900 m-0">📜 4. Proposta Comercial & Minuta Contratual</h2>
          <p class="text-gray-500 text-xs mt-1">Formalização das condições de pagamento vinculadas às vistorias fotográficas do canteiro.</p>
        </div>
        <span class="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">Pronto para Envio</span>
      </div>

      <div class="border border-gray-300 rounded-xl p-5 bg-gray-50 font-serif text-xs text-gray-800 space-y-3 leading-relaxed">
        <div class="text-center font-bold text-sm uppercase border-b border-gray-200 pb-2">Proposta Técnica de Execução Civil e Reforma</div>
        <p><strong>CONTRATANTE:</strong> {clientName} ({clientEmail})</p>
        <p><strong>CONTRATADA:</strong> Construtora Alpha (Eng. Maria Souza)</p>
        <p><strong>VALOR TOTAL DA EAP:</strong> R$ {totalEapFinal.toLocaleString('pt-BR')} divididos em cronograma de medições físicas.</p>
        <div class="bg-white p-3 rounded-lg border border-gray-200 text-xs font-sans space-y-1">
          <div class="font-bold text-gray-800">Cronograma de Liberação Financeira:</div>
          <div>• Sinal e Mobilização Inicial: <strong>R$ 20.000,00</strong></div>
          <div>• Parcela 2 (Medição Porcelanato c/ Foto): <strong>R$ 14.200,00</strong></div>
          <div>• Parcela 3 (Entrega de Gesso e Iluminação c/ Foto): <strong>R$ 10.000,00</strong></div>
        </div>
        <p class="text-[11px] text-gray-600 italic">
          * Cláusula Obrigatória de Transparência: Nenhuma medição é liberada sem comprovação fotográfica no canteiro pelo Mestre de Obras.
        </p>
      </div>

      <div class="flex justify-between pt-2">
        <button class="text-gray-500 hover:text-gray-700 text-xs font-semibold" on:click={() => step = 3}>← Voltar para EAP</button>
        <button class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs" on:click={() => step = 5}>
          Disparar Contrato para Aceite do Cliente (Etapa 5) →
        </button>
      </div>
    </div>

  {:else if step === 5}
    <!-- ETAPA 5: ACEITE DO CLIENTE E ATIVAÇÃO OFICIAL -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gray-900 m-0">✍️ 5. Aceite do Cliente e Ativação da Obra</h2>
          <p class="text-gray-500 text-xs mt-1">O cliente assina digitalmente os termos e a obra é oficialmente cadastrada como ativa no sistema.</p>
        </div>
        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">Status: IN_PROGRESS</span>
      </div>

      <div class="border border-emerald-200 bg-emerald-50/50 rounded-xl p-5 space-y-4">
        <div class="flex items-center gap-3">
          <input type="checkbox" id="aceite_final" class="w-5 h-5 text-emerald-600 rounded" bind:checked={clientAccepted} />
          <label for="aceite_final" class="text-xs text-gray-800 font-semibold cursor-pointer">
            Eu, <strong>{clientName}</strong>, li e aprovo o orçamento final homologado de R$ {totalEapFinal.toLocaleString('pt-BR')}, as macroetapas da EAP e o cronograma de vistorias por foto do ObraFlow.
          </label>
        </div>

        <div class="text-[11px] text-gray-600 bg-white p-3 rounded-lg border border-emerald-200">
          <div>Assinatura Digital Registrada: <code>contract_signed_at = {contractSignedAt}</code></div>
          <div>Transição de Status: <strong>CONTRACT_SIGNED ➔ IN_PROGRESS</strong></div>
        </div>
      </div>

      <div class="flex justify-between pt-2">
        <button class="text-gray-500 hover:text-gray-700 text-xs font-semibold" on:click={() => step = 4}>← Voltar para Contrato</button>
        <a 
          href="./dashboard" 
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md text-xs no-underline flex items-center gap-2"
        >
          <span>🚀 Concluir e Visualizar Obra no Dashboard Global</span>
          <span>→</span>
        </a>
      </div>
    </div>
  {/if}
</div>
