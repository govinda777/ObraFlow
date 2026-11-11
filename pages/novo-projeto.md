---
title: Novo Orçamento de Obra - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<script>
    let currentUser = { id: 'usr_5', name: 'Marina Costa', email: 'marina.costa@email.com', role: 'CLIENT' };

    let projectName = 'Reforma Studio Vila Madalena';
    let projectAddress = 'Rua Harmonia, 410 - Apto 54';
    let projectArea = 68;
    let projectBudget = 52000;
    let projectScope = 'Reforma completa de studio: demolição de mureta para integração da cozinha, nova rede elétrica 220V para cooktop, assentamento de porcelanato 90x90, bancada em quartzo branco, forro drywall e iluminação em trilhos LED.';

    let docPdf = { name: '', url: '', size: 0 };
    let docSheet = { name: '', url: '', size: 0, textContent: '' };
    let docTxt = { name: '', url: '', size: 0, textContent: '' };

    let uploadingField = '';
    let isSaving = false;
    let statusMessage = '';
    let errorMessage = '';

    onMount(() => {
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('obraflow_active_user');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.id) currentUser = parsed;
                }
            } catch (err) {
                console.warn('Sessão padrão aplicada:', err);
            }
        }
    });

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    async function handleFileSelect(event, kind) {
        const file = event.target.files?.[0];
        if (!file) return;
        uploadingField = kind;
        errorMessage = '';
        try {
            const base64Data = await fileToBase64(file);
            const res = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    mimeType: file.type,
                    folder: 'docs',
                    base64Data
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erro ao gravar arquivo localmente.');
            }
            const info = {
                name: data.filename,
                url: data.url,
                size: data.size,
                textContent: data.textContent || ''
            };
            if (kind === 'pdf') docPdf = info;
            if (kind === 'sheet') docSheet = info;
            if (kind === 'txt') docTxt = info;
            statusMessage = `✔️ Arquivo "${data.filename}" salvo fisicamente em ./uploads/docs/`;
        } catch (err) {
            errorMessage = `Falha no upload local: ${err.message}. Verifique se npm run dev está ativo.`;
        } finally {
            uploadingField = '';
        }
    }

    async function generateSampleLocalDocs() {
        uploadingField = 'sample';
        errorMessage = '';
        try {
            const res = await fetch('http://localhost:3001/api/demo-docs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao carregar kit de documentos de demonstração.');
            }

            if (data.presetProject) {
                projectName = data.presetProject.name;
                projectAddress = data.presetProject.address;
                projectArea = data.presetProject.area_m2;
                projectBudget = data.presetProject.budget_estimated;
                projectScope = data.presetProject.scope_description;
            }

            docPdf = { name: data.pdf.filename, url: data.pdf.url, size: data.pdf.size, textContent: '' };
            docSheet = { name: data.sheet.filename, url: data.sheet.url, size: data.sheet.size, textContent: data.sheet.textContent || '' };
            docTxt = { name: data.txt.filename, url: data.txt.url, size: data.txt.size, textContent: data.txt.textContent || '' };
            statusMessage = '✨ Kit oficial (Planta PDF vetorial + Planilha SINAPI CSV + Memorial ABNT) carregado em ./uploads/docs/!';
        } catch (err) {
            errorMessage = `Não foi possível conectar ao servidor local (:3001): ${err.message}`;
        } finally {
            uploadingField = '';
        }
    }

    async function submitToAI() {
        if (!projectName.trim() || !projectAddress.trim()) {
            errorMessage = 'Preencha o nome da obra e o endereço do canteiro.';
            return;
        }
        isSaving = true;
        errorMessage = '';
        try {
            const clientId = currentUser.role === 'CLIENT' ? currentUser.id : 'usr_5';
            const newProject = {
                id: 'NEW',
                name: projectName.trim(),
                address: projectAddress.trim(),
                client_id: clientId,
                contractor_id: 'usr_2',
                status: 'QUOTE_REQUESTED',
                area_m2: Number(projectArea) || 68,
                budget_estimated: Number(projectBudget) || 50000,
                scope_description: projectScope.trim(),
                scope_pdf_url: docPdf.url || '',
                doc_spreadsheet_url: docSheet.url || '',
                doc_txt_url: docTxt.url || '',
                doc_pdf_name: docPdf.name || 'escopo_informado_em_tela.pdf',
                doc_spreadsheet_name: docSheet.name || 'estimativa_parametrica.csv',
                doc_txt_name: docTxt.name || 'memorial_preliminar.txt',
                created_at: new Date().toISOString()
            };

            const res = await fetch('http://localhost:3001/api/save-full-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: newProject })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erro ao gravar nova obra em mock_data/projects.json');
            }

            if (typeof window !== 'undefined') {
                localStorage.setItem('obraflow_editing_project_id', data.projectId);
                const extraText = [docSheet.textContent, docTxt.textContent].filter(Boolean).join('\n\n');
                localStorage.setItem('obraflow_extra_doc_text', extraText);
                window.location.href = `/processamento/?project_id=${encodeURIComponent(data.projectId)}&auto_analyze=1`;
            }
        } catch (err) {
            errorMessage = `Erro ao salvar obra: ${err.message}`;
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="max-w-4xl mx-auto py-6 px-4">
  <div class="flex flex-wrap items-center justify-between pb-4 mb-6 border-b border-gray-200 gap-3">
    <div class="flex items-center gap-3">
      <a href="/dashboard/" class="text-xs text-gray-500 hover:text-indigo-600 font-bold no-underline">← Painel</a>
      <span class="text-gray-300">|</span>
      <div>
        <span class="text-xs uppercase tracking-wider font-bold text-indigo-600">🏗️ ObraFlow • Esteira Comercial Local</span>
        <h1 class="text-xl md:text-2xl font-black text-gray-900 m-0">Novo Orçamento de Obra / Reforma</h1>
      </div>
    </div>
    <div class="text-right">
      <span class="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
        Etapa: [ 1 de 5: Dados & Upload Local ]
      </span>
      <div class="text-[11px] text-gray-500 font-mono mt-0.5">Solicitante: {currentUser.name}</div>
    </div>
  </div>

  <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-8">
    <!-- 1. DADOS BÁSICOS DO IMÓVEL -->
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">1</span>
        Dados Básicos do Imóvel & Canteiro
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label for="p-name" class="block font-bold text-gray-700 mb-1">Nome da Obra:</label>
          <input 
            id="p-name"
            type="text" 
            bind:value={projectName} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
        <div>
          <label for="p-addr" class="block font-bold text-gray-700 mb-1">Endereço Completo do Canteiro:</label>
          <input 
            id="p-addr"
            type="text" 
            bind:value={projectAddress} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
        <div>
          <label for="p-area" class="block font-bold text-gray-700 mb-1">Área Estimada (m²):</label>
          <input 
            id="p-area"
            type="number" 
            min="10"
            bind:value={projectArea} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
        <div>
          <label for="p-budget" class="block font-bold text-gray-700 mb-1">
            Teto Orçamentário do Cliente (R$ {Number(projectBudget || 0).toLocaleString('pt-BR')}):
          </label>
          <input 
            id="p-budget"
            type="number" 
            step="500"
            min="5000"
            bind:value={projectBudget} 
            class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50" 
          />
        </div>
      </div>

      <div class="mt-4 text-xs">
        <label for="p-scope" class="block font-bold text-gray-700 mb-1">Escopo Preliminar da Intervenção (lido pelo Motor de IA):</label>
        <textarea id="p-scope" rows="3" bind:value={projectScope} class="w-full border border-gray-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"></textarea>
      </div>
    </div>

    <hr class="border-gray-100 m-0" />

    <!-- 2. DOCUMENTAÇÃO TÉCNICA REAL EM DISCO LOCAL -->
    <div>
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0 flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">2</span>
          Documentação Técnica (Salva em ./uploads/docs/)
        </h3>
        <button
          type="button"
          on:click={generateSampleLocalDocs}
          disabled={uploadingField !== ''}
          class="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl border border-indigo-200 cursor-pointer transition-colors disabled:opacity-50"
        >
          {uploadingField === 'sample' ? 'Carregando kit...' : '✨ Carregar Kit Oficial de Demonstração'}
        </button>
      </div>
      <div class="text-[11px] text-gray-500 mb-4">
        💡 Para selecionar manualmente no Finder durante uma demo, use os 3 arquivos prontos em <code class="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-indigo-700">docs/exemplos-orcamento/</code>.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Upload 1: PDF / Imagem -->
        <label class="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 rounded-2xl p-4 text-center cursor-pointer block transition-all">
          <input type="file" accept=".pdf,image/*" class="hidden" on:change={(e) => handleFileSelect(e, 'pdf')} />
          <div class="text-3xl mb-2">📄</div>
          <div class="text-xs font-bold text-gray-900 mb-1">PLANTA EXECUTIVA (PDF)</div>
          <div class="text-[11px] text-blue-600 font-semibold mb-3">
            {uploadingField === 'pdf' ? 'Salvando em disco...' : '[ Clique para selecionar do computador ]'}
          </div>
          {#if docPdf.name}
            <div class="bg-white border border-blue-200 rounded-xl p-2 text-left text-[11px] text-blue-900 font-mono space-y-1">
              <div class="truncate font-bold text-emerald-700">✔️ {docPdf.name}</div>
              <a href={docPdf.url} target="_blank" rel="noreferrer" class="text-[10px] text-blue-600 underline block">Abrir arquivo local ↗</a>
            </div>
          {:else}
            <div class="text-[10px] text-gray-400">Opcional (aceita PDF ou imagem da planta)</div>
          {/if}
        </label>

        <!-- Upload 2: CSV / XLSX -->
        <label class="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 rounded-2xl p-4 text-center cursor-pointer block transition-all">
          <input type="file" accept=".csv,.xlsx,.tsv,.txt" class="hidden" on:change={(e) => handleFileSelect(e, 'sheet')} />
          <div class="text-3xl mb-2">📊</div>
          <div class="text-xs font-bold text-gray-900 mb-1">PLANILHA CUSTOS (CSV/XLSX)</div>
          <div class="text-[11px] text-emerald-600 font-semibold mb-3">
            {uploadingField === 'sheet' ? 'Salvando em disco...' : '[ Clique para selecionar do computador ]'}
          </div>
          {#if docSheet.name}
            <div class="bg-white border border-emerald-200 rounded-xl p-2 text-left text-[11px] text-emerald-900 font-mono space-y-1">
              <div class="truncate font-bold text-emerald-700">✔️ {docSheet.name}</div>
              <a href={docSheet.url} target="_blank" rel="noreferrer" class="text-[10px] text-emerald-600 underline block">Abrir arquivo local ↗</a>
            </div>
          {:else}
            <div class="text-[10px] text-gray-400">Opcional (extrai linhas para a IA)</div>
          {/if}
        </label>

        <!-- Upload 3: TXT / MD -->
        <label class="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/20 rounded-2xl p-4 text-center cursor-pointer block transition-all">
          <input type="file" accept=".txt,.md" class="hidden" on:change={(e) => handleFileSelect(e, 'txt')} />
          <div class="text-3xl mb-2">📝</div>
          <div class="text-xs font-bold text-gray-900 mb-1">MEMORIAL (TXT / MD)</div>
          <div class="text-[11px] text-purple-600 font-semibold mb-3">
            {uploadingField === 'txt' ? 'Salvando em disco...' : '[ Clique para selecionar do computador ]'}
          </div>
          {#if docTxt.name}
            <div class="bg-white border border-purple-200 rounded-xl p-2 text-left text-[11px] text-purple-900 font-mono space-y-1">
              <div class="truncate font-bold text-emerald-700">✔️ {docTxt.name}</div>
              <a href={docTxt.url} target="_blank" rel="noreferrer" class="text-[10px] text-purple-600 underline block">Abrir arquivo local ↗</a>
            </div>
          {:else}
            <div class="text-[10px] text-gray-400">Opcional (lido pelo analisador técnico)</div>
          {/if}
        </label>
      </div>

      {#if statusMessage}
        <div class="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          {statusMessage}
        </div>
      {/if}
      {#if errorMessage}
        <div class="mt-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          ⚠️ {errorMessage}
        </div>
      {/if}
    </div>

    <!-- BOTÕES DE RODAPÉ -->
    <div class="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
      <div class="text-xs font-semibold text-gray-500">
        Cria um novo registro incremental em <code class="bg-gray-100 px-1.5 py-0.5 rounded">mock_data/projects.json</code>
      </div>

      <div class="flex items-center gap-3">
        <a href="/dashboard/" class="text-xs text-gray-500 hover:text-gray-700 font-bold px-4 py-2 no-underline">
          Cancelar
        </a>
        <button 
          type="button"
          on:click={submitToAI}
          disabled={isSaving}
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 px-6 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>⚡</span> {isSaving ? 'Criando Obra e Sincronizando DuckDB...' : 'Criar Obra e Processar na Esteira IA →'}
        </button>
      </div>
    </div>
  </div>
</div>
