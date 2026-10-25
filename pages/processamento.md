---
title: Processamento IA, Avaliação e Contrato - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<script>
    // Sub-etapas da Esteira (2 a 5)
    let currentStep = 2; // 2: IA, 3: EAP Orçamentista, 4: Proposta/Minuta, 5: Aceite Cliente
    let apiKey = '';
    let isAiLoading = false;
    let aiError = '';

    // EAP Auditada pelo Orçamentista (Sub-Etapa 3)
    let eapTasks = [
        { id: 1, title: '1. Demolição de Alvenaria e Remoção de Entulho', cat: 'EXEC', due_date: '28/10/2026', labor: 2200, mats: 400 },
        { id: 2, title: '2. Readequação de Circuitos Elétricos e Ilha', cat: 'EXEC', due_date: '30/10/2026', labor: 1800, mats: 1200 },
        { id: 3, title: '3. Recebimento de Porcelanato 120x120', cat: 'RECEIVING', due_date: '03/11/2026', labor: 300, mats: 0 },
        { id: 4, title: '4. Assentamento Porcelanato Social', cat: 'EXEC', due_date: '12/11/2026', labor: 4200, mats: 9800 },
        { id: 5, title: '5. Instalação Drywall e Trilhos LED', cat: 'EXEC', due_date: '24/11/2026', labor: 2600, mats: 3500 }
    ];

    $: totalMaoObra = eapTasks.reduce((acc, t) => acc + Number(t.labor || 0), 0);
    $: totalMateriais = eapTasks.reduce((acc, t) => acc + Number(t.mats || 0), 0);
    let custoFrete = 850;
    $: valorFinalHomologado = totalMaoObra + totalMateriais + custoFrete;

    let aiModel = 'gemini-1.5-flash-latest';
    let availableModels = [];

    async function runRealGemini() {
        if (!apiKey) {
            aiError = 'Por favor, insira uma API Key válida do Google Gemini.';
            return;
        }
        isAiLoading = true;
        aiError = '';
        try {
            const prompt = "Você é o agente técnico de engenharia do ObraFlow. Analise a reforma de 72m² e confirme os quantitativos.";
            
            // Tentativa prioritária no modelo selecionado ou fallback automático resiliente
            const candidateModels = [
                aiModel,
                'gemini-1.5-flash-latest',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-2.0-flash',
                'gemini-2.5-flash'
            ].filter((v, idx, arr) => arr.indexOf(v) === idx);

            let success = false;
            let lastErr = null;
            let responseText = '';
            let usedModel = '';

            for (const model of candidateModels) {
                try {
                    // Testa rota v1beta e depois v1 se necessário
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    });
                    const data = await res.json();
                    if (!res.ok || data.error) {
                        lastErr = new Error(data.error?.message || `Erro HTTP ${res.status}`);
                        continue;
                    }
                    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                        responseText = data.candidates[0].content.parts[0].text;
                        usedModel = model;
                        success = true;
                        break;
                    }
                } catch (e) {
                    lastErr = e;
                }
            }

            if (!success) {
                // Tenta consultar a lista de modelos suportados pela chave do usuário para orientar
                try {
                    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    const listData = await listRes.json();
                    if (listData.models) {
                        const supported = listData.models
                            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                            .map(m => m.name.replace('models/', ''));
                        availableModels = supported;
                        if (supported.length > 0) {
                            throw new Error(`O modelo requisitado não está liberado para sua chave. Modelos ativos com suporte a generateContent: ${supported.slice(0, 5).join(', ')}`);
                        }
                    }
                } catch (listErr) {
                    // ignora erro ao listar
                }
                throw lastErr || new Error('Não foi possível gerar conteúdo com a chave informada.');
            }

            alert(`⚡ Gemini API respondeu com sucesso usando o modelo [${usedModel}]!\n\nDiagnóstico validado pelo agente do ObraFlow.`);
        } catch (err) {
            aiError = err.message;
        } finally {
            isAiLoading = false;
        }
    }
</script>

<div class="max-w-4xl mx-auto py-6 px-4">
  <!-- BARRA DE PROGRESSO SUPERIOR DAS SUB-ETAPAS 2 A 5 -->
  <div class="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
    <div class="flex items-center gap-2">
      <span class="text-xs font-black text-indigo-700 tracking-wider">🏗️⚡ OBRAFLOW</span>
      <span class="text-gray-300">|</span>
      <span class="text-xs font-bold text-gray-700">Esteira de Contratação</span>
    </div>
    <div class="flex items-center gap-1.5 text-xs">
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 2 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 2}
      >
        2. IA
      </button>
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 3 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 3}
      >
        3. EAP
      </button>
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 4 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 4}
      >
        4. Proposta
      </button>
      <button 
        class="px-3 py-1 rounded-full font-bold transition-all {currentStep === 5 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}"
        on:click={() => currentStep = 5}
      >
        5. Aceite
      </button>
    </div>
  </div>

  <!-- ==================== SUB-ETAPA 2: PROCESSAMENTO IA ==================== -->
  {#if currentStep === 2}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">Sub-Etapa 2 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">🤖 Agente Técnico de Engenharia (Google Gemini API)</h2>
        </div>
        <div class="text-right">
          <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            ⚡ Processamento Concluído (Confiança: 94%)
          </span>
        </div>
      </div>

      <!-- BOX DE DIAGNÓSTICO EXTRAÍDO -->
      <div class="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-5">
        <div class="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2">
          Diagnóstico Preliminar Extraído pela IA:
        </div>
        <p class="text-xs text-gray-700 leading-relaxed font-mono bg-white p-3 rounded-xl border border-indigo-100 m-0">
          "Reforma de 72m² em ambiente residencial. Não foram identificadas intervenções estruturais em pilares ou vigas portantes. Demolição de mureta divisória com geração de 3m³ de entulho. Necessidade de 65m² de piso porcelanato retificado 120x120 e novo circuito elétrico 220V para ilha da cozinha."
        </p>
      </div>

      <!-- VALORES SUGERIDOS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div class="text-xs text-gray-500 font-semibold mb-1">Orçamento Base Sugerido pela IA:</div>
          <div class="text-2xl font-black text-indigo-700">R$ 43.500,00</div>
          <div class="text-[11px] text-emerald-600 font-bold mt-1">✓ Dentro do teto do cliente (R$ 45.000,00)</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div class="text-xs text-gray-500 font-semibold mb-1">Status do Projeto Atualizado:</div>
          <div class="text-2xl font-black text-blue-700">BUDGET_READY</div>
          <div class="text-[11px] text-gray-500 mt-1">Aguardando auditoria do engenheiro orçamentista</div>
        </div>
      </div>

      <!-- CHAVE REAL GEMINI OPCIONAL -->
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
        <div class="flex items-center justify-between mb-2">
          <div class="font-bold text-gray-800">Testar Chamada Real com Chave do Google Gemini:</div>
          <span class="text-[11px] text-gray-500 font-mono">Modelo Selecionado: {aiModel}</span>
        </div>
        <div class="flex flex-wrap md:flex-nowrap gap-2">
          <input 
            type="password" 
            placeholder="Cole sua Gemini API Key (ex: AIzaSy...)" 
            bind:value={apiKey} 
            class="flex-1 min-w-[240px] border border-gray-300 rounded-xl p-2.5 text-xs bg-white outline-none" 
          />
          <select 
            bind:value={aiModel} 
            class="border border-gray-300 rounded-xl p-2.5 text-xs bg-white text-gray-800 outline-none"
          >
            <option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          </select>
          <button 
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 whitespace-nowrap"
            on:click={runRealGemini}
            disabled={isAiLoading}
          >
            {isAiLoading ? 'Extraindo...' : '⚡ Reexecutar IA'}
          </button>
        </div>
        {#if aiError}
          <div class="text-rose-600 font-semibold mt-2 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            ⚠️ {aiError}
          </div>
        {/if}
        {#if availableModels.length > 0}
          <div class="mt-2 text-[11px] text-gray-600">
            <strong>Modelos detectados na sua conta:</strong>
            <div class="flex flex-wrap gap-1 mt-1">
              {#each availableModels as m}
                <button 
                  class="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2 py-0.5 hover:bg-indigo-100 font-mono text-[10px]"
                  on:click={() => { aiModel = m; }}
                >
                  {m}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- BOTÕES DE NAVEGAÇÃO -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <a href="/novo-projeto/" class="text-xs font-bold text-gray-500 hover:text-gray-700 no-underline">
          ← Voltar para Documentos
        </a>
        <button 
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md no-underline transition-all"
          on:click={() => currentStep = 3}
        >
          Encaminhar para o Orçamentista →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 3: AVALIAÇÃO DO ORÇAMENTISTA ==================== -->
  {#if currentStep === 3}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-emerald-600">Sub-Etapa 3 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">📐 Revisão Técnica da EAP pelo Orçamentista</h2>
        </div>
        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
          Status: APPROVED
        </span>
      </div>

      <!-- TABELA FIEL AO WIREFRAME 3.2 -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-gray-200 text-gray-500 uppercase font-bold text-[11px]">
              <th class="py-2.5">Tarefa Proposta pela IA</th>
              <th class="py-2.5">Categoria</th>
              <th class="py-2.5">Prazo Limite</th>
              <th class="py-2.5 text-right">Mão de Obra</th>
              <th class="py-2.5 text-right">Insumos</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each eapTasks as t}
              <tr class="hover:bg-gray-50">
                <td class="py-3 font-semibold text-gray-900">{t.title}</td>
                <td class="py-3">
                  <span class="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded text-[10px]">{t.cat}</span>
                </td>
                <td class="py-3 text-gray-600 font-mono">[{t.due_date}]</td>
                <td class="py-3 text-right font-mono font-bold text-gray-900">R$ {Number(t.labor).toLocaleString('pt-BR')}</td>
                <td class="py-3 text-right font-mono font-bold text-gray-900">R$ {Number(t.mats).toLocaleString('pt-BR')}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- TOTAIS DA EAP -->
      <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-wrap justify-between items-center text-xs">
        <div>Total Mão de Obra: <strong>R$ {totalMaoObra.toLocaleString('pt-BR')},00</strong></div>
        <div>Total Materiais: <strong>R$ {totalMateriais.toLocaleString('pt-BR')},00</strong></div>
        <div>Fretes & Logística: <strong>R$ {custoFrete},00</strong></div>
        <div class="bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl text-sm">
          VALOR FINAL HOMOLOGADO: R$ {valorFinalHomologado.toLocaleString('pt-BR')},00
        </div>
      </div>

      <!-- BOTÕES -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button class="text-xs font-bold text-gray-500 hover:text-gray-700" on:click={() => currentStep = 2}>
          ← Voltar ao Diagnóstico IA
        </button>
        <button 
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all"
          on:click={() => currentStep = 4}
        >
          Gerar Proposta Comercial & Contrato →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 4: ENVIO DE PROPOSTA ==================== -->
  {#if currentStep === 4}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">Sub-Etapa 4 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">📜 Envio de Proposta Comercial e Minuta Contratual</h2>
        </div>
        <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
          Status: PROPOSAL_READY
        </span>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
        <div class="font-bold text-gray-800 uppercase tracking-wider">Resumo da Proposta a ser Enviada ao Cliente:</div>
        <ul class="space-y-1 text-gray-700 pl-0 list-none m-0">
          <li>• <strong>Cliente:</strong> Marina Costa (marina.costa@email.com)</li>
          <li>• <strong>Obra:</strong> Reforma Loft Jardins (Alameda dos Anapurus, 780 - 72m²)</li>
          <li>• <strong>Valor Fechado da EAP:</strong> R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</li>
        </ul>

        <div class="pt-3 border-t border-slate-200">
          <div class="font-bold text-gray-800 mb-1">Condições de Pagamento Vinculadas a Vistorias:</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div class="bg-white p-2.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-gray-500 font-bold">Sinal de Mobilização (Assinatura)</span>
              <div class="font-black text-gray-900 mt-0.5">R$ 20.000,00</div>
            </div>
            <div class="bg-white p-2.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-gray-500 font-bold">Parcela 2 (Medição Porcelanato c/ Foto)</span>
              <div class="font-black text-gray-900 mt-0.5">R$ 14.200,00</div>
            </div>
            <div class="bg-white p-2.5 rounded-xl border border-gray-200">
              <span class="text-[10px] text-gray-500 font-bold">Parcela 3 (Entrega de Gesso c/ Foto)</span>
              <div class="font-black text-gray-900 mt-0.5">R$ 10.000,00</div>
            </div>
          </div>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
          <strong>⚖️ Cláusula Pétrea de Evidência:</strong> A liberação das parcelas 2 e 3 fica estritamente condicionada ao envio prévio de fotos auditadas no canteiro pelo Mestre de Obras.
        </div>
      </div>

      <!-- BOTÕES -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button class="text-xs font-bold text-gray-500 hover:text-gray-700" on:click={() => currentStep = 3}>
          ← Voltar à Composição da EAP
        </button>
        <button 
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"
          on:click={() => currentStep = 5}
        >
          <span>✉️</span> Disparar Notificação para o Cliente Aceitar →
        </button>
      </div>
    </div>
  {/if}

  <!-- ==================== SUB-ETAPA 5: ACEITE DO CLIENTE ==================== -->
  {#if currentStep === 5}
    <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-blue-600">Sub-Etapa 5 de 5</span>
          <h2 class="text-xl font-black text-gray-900 m-0">✍️ Revisão da Proposta e Assinatura Digital pelo Cliente</h2>
        </div>
        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
          Status: CONTRACT_SIGNED
        </span>
      </div>

      <div class="border border-gray-200 rounded-2xl p-5 space-y-4">
        <div class="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <div class="font-bold text-sm text-gray-900">CONTRATO DE PRESTAÇÃO DE SERVIÇOS — REFORMA LOFT JARDINS</div>
            <div class="text-xs text-gray-500">Contratada: Alpha Engenharia & Construções • Contratante: Marina Costa</div>
          </div>
          <div class="text-right">
            <span class="text-sm font-black text-indigo-700">R$ {valorFinalHomologado.toLocaleString('pt-BR')},00</span>
            <div class="text-[10px] text-gray-400">Prazo Estimado: 45 dias corridos</div>
          </div>
        </div>

        <!-- TERMO DE COMPROMISSO -->
        <div class="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl text-xs space-y-2">
          <div class="font-bold text-emerald-950 uppercase tracking-wider">Termo de Aceite e Compromisso de Transparência:</div>
          <label class="flex items-start gap-2.5 cursor-pointer text-gray-800">
            <input type="checkbox" checked class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
            <span>
              Eu, <strong>Marina Costa</strong>, aprovo formalmente o orçamento técnico, a lista de insumos da EAP e o cronograma físico-financeiro com vistorias vinculadas a comprovações fotográficas.
            </span>
          </label>
        </div>

        <div class="text-xs text-gray-500 flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono">
          <span>Registro de Assinatura: contract_signed_at = 25/10/2026 09:00:12</span>
          <span class="font-bold text-emerald-700">Status: [ CONTRACT_SIGNED ] ➔ [ 🚀 IN_PROGRESS ]</span>
        </div>
      </div>

      <!-- BOTÃO DE ATIVAÇÃO FINAL -->
      <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
        <button class="text-xs font-bold text-gray-500 hover:text-gray-700" on:click={() => currentStep = 4}>
          ← Voltar à Minuta
        </button>
        <a 
          href="/dashboard/" 
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/30 no-underline transition-all flex items-center gap-2"
        >
          <span>✅</span> CONFIRMAR ACEITE E CADASTRAR NOVA OBRA NO SISTEMA
        </a>
      </div>
    </div>
  {/if}

</div>
