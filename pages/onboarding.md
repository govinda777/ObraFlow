---
title: Seleção de Perfil - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<script>
    let currentUser = {
        id: 'usr_5',
        name: 'Marina Costa (Cliente)',
        email: 'marina.costa@email.com',
        role: 'CLIENT'
    };

    onMount(() => {
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('obraflow_active_user');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.email) {
                        currentUser = parsed;
                    }
                }
            } catch (err) {
                console.warn('Erro ao ler sessão local:', err);
            }
        }
    });

    function setRoleAndRedirect(role, destUrl) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('obraflow_active_role', role);
            const updated = { ...currentUser, role };
            localStorage.setItem('obraflow_active_user', JSON.stringify(updated));
            window.location.href = destUrl;
        }
    }
</script>

<div class="max-w-5xl mx-auto py-8 px-4">
  <div class="flex flex-wrap items-center justify-between pb-4 mb-8 border-b border-gray-200 text-xs gap-2">
    <div class="flex items-center gap-2">
      <a href="/" class="font-black text-indigo-700 tracking-wider no-underline">🏗️⚡ OBRAFLOW</a>
      <span class="text-gray-300">|</span>
      <span class="text-gray-500 font-semibold">Central de Onboarding & Seleção de Perfil Local</span>
    </div>
    <div class="flex items-center gap-2 bg-gray-100 text-gray-700 font-semibold px-3.5 py-1.5 rounded-full border border-gray-200">
      <span>👤 {currentUser.name} ({currentUser.email})</span>
      <a href="/login/" class="text-gray-400 hover:text-rose-500 ml-1 no-underline font-bold" title="Trocar de conta">✕</a>
    </div>
  </div>

  <div class="text-center mb-10">
    <h1 class="text-2xl md:text-3xl font-black text-gray-900 tracking-tight m-0">BEM-VINDO(A), {currentUser.name.split(' ')[0].toUpperCase()}! 👋</h1>
    <p class="text-gray-500 text-xs md:text-sm mt-1.5">Selecione o perfil de atuação para carregar seu painel operacional conectado ao banco local:</p>
  </div>

  <!-- GRADE 3 SUPERIORES: CLIENTE, EMPREITEIRO, ORÇAMENTISTA -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-blue-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">👤 Cliente Proprietário</span>
          <span class="text-2xl">🏠</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Acompanhe todas as suas obras no Master Pipeline dinâmico</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Solicite novos orçamentos com upload real de PDF e TXT</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Visualize fotos reais enviadas pelo Mestre de Obras</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Aprove simulações Antes x Depois do Estúdio IA</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('CLIENT', '/dashboard/')}
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm cursor-pointer"
      >
        Entrar como Cliente →
      </button>
    </div>

    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-indigo-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">🏢 Empreiteiro / Gestor</span>
          <span class="text-2xl">📊</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Cockpit executivo da carteira e margem em caixa</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Termômetro comparativo: % Físico vs. % Financeiro</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Compra direta de suprimentos críticos c/ baixa no caixa</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>ERP de equipe, diárias e quitação de folha de pagamento</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('CONTRACTOR', '/dashboard/')}
        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm cursor-pointer"
      >
        Entrar como Gestor →
      </button>
    </div>

    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-emerald-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl">📐 Engenheiro Orçamentista</span>
          <span class="text-2xl">🤖</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Esteira de projetos técnicos e indicadores de confiança</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Motor Local de Engenharia (offline) + Google Gemini API</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Edição interativa de tarefas, mão de obra, insumos e fretes</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Emissão de contrato local com 3 parcelas vinculadas a foto</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('ENGINEER', '/processamento/')}
        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm cursor-pointer"
      >
        Abrir Esteira de Orçamentos →
      </button>
    </div>
  </div>

  <!-- GRADE 2 INFERIORES: MESTRE DE OBRAS E DESIGNER -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-amber-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-xl">🏗️ Mestre de Obras (Campo)</span>
          <span class="text-2xl">📲</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Painel Mobile focado nas tarefas pendentes do canteiro</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Upload físico real de fotos de evidência (./uploads/)</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Conferência de cargas em trânsito e registro de avarias</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Liberação automática do % Físico Auditado no DuckDB</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('FOREMAN', '/detalhes/?tab=MESTRE')}
        class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm cursor-pointer"
      >
        Acessar Canteiro Mobile →
      </button>
    </div>

    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-purple-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-xl">🎨 Designer de Interiores</span>
          <span class="text-2xl">✨</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Estúdio de ambientação e prototipagem Antes x Depois</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Upload de foto real da obra e geração local de simulação</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Vínculo direto com os insumos decorativos e iluminação</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Receita de consultoria IA integrada ao fluxo de caixa</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('DESIGNER', '/detalhes/?tab=DESIGNER')}
        class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm cursor-pointer"
      >
        Abrir Estúdio IA →
      </button>
    </div>
  </div>
</div>
