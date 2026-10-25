---
title: Seleção de Perfil - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<script>
    function setRoleAndRedirect(role, targetUrl) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('obraflow_active_role', role);
            window.location.href = targetUrl;
        }
    }
</script>

<div class="max-w-5xl mx-auto py-8 px-4">
  <!-- BARRA DE USUÁRIO SUPERIOR (Wireframe 2.2 de JOURNEYS.md) -->
  <div class="flex items-center justify-between pb-4 mb-8 border-b border-gray-200 text-xs">
    <div class="flex items-center gap-2">
      <span class="font-black text-indigo-700 tracking-wider">🏗️⚡ OBRAFLOW</span>
      <span class="text-gray-300">|</span>
      <span class="text-gray-500 font-semibold">Central de Onboarding & Seleção de Sessão</span>
    </div>
    <div class="flex items-center gap-2 bg-gray-100 text-gray-700 font-semibold px-3.5 py-1.5 rounded-full border border-gray-200">
      <span>✉️ marina.costa@email.com</span>
      <a href="./login" class="text-gray-400 hover:text-rose-500 ml-1 no-underline font-bold" title="Sair / Trocar de conta">✕</a>
    </div>
  </div>

  <!-- CABEÇALHO -->
  <div class="text-center mb-10">
    <h1 class="text-2xl md:text-3xl font-black text-gray-900 tracking-tight m-0">BEM-VINDO AO OBRAFLOW! 👋</h1>
    <p class="text-gray-500 text-xs md:text-sm mt-1.5">Selecione o seu perfil de atuação para carregar o seu cockpit de gestão personalizado:</p>
  </div>

  <!-- GRADE 3 SUPERIORES: CLIENTE, EMPREITEIRO, ORÇAMENTISTA -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
    
    <!-- 1. CLIENTE PROPRIETÁRIO -->
    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-blue-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">👤 Cliente Proprietário</span>
          <span class="text-2xl">🏠</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Acompanhe suas obras ativas no Master Pipeline</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Botão exclusivo para solicitar novos orçamentos</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Comprovação física rigorosa por fotos de canteiro</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Aprovação de simulações de acabamentos com IA</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('CLIENT', './dashboard')}
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm"
      >
        Entrar como Cliente →
      </button>
    </div>

    <!-- 2. EMPREITEIRO / GESTOR -->
    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-indigo-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">🏢 Empreiteiro / Gestor</span>
          <span class="text-2xl">📊</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Cockpit executivo de toda a carteira de obras</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Termômetro comparativo: % Físico vs. % Financeiro</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Alertas de compras críticas e suprimentos</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Fluxo de caixa consolidado e margem em tempo real</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('CONTRACTOR', './dashboard')}
        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm"
      >
        Entrar como Gestor →
      </button>
    </div>

    <!-- 3. ENGENHEIRO ORÇAMENTISTA -->
    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-emerald-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl">📐 Engenheiro Orçamentista</span>
          <span class="text-2xl">🤖</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Esteira de projetos técnicos e quantitativos</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Leitura de PDF, XLSX e TXT via Google Gemini IA</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Estruturação e calibração de diárias na EAP</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Emissão da proposta com cláusula de vistoria</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('ENGINEER', './novo-projeto')}
        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm"
      >
        Iniciar Orçamento →
      </button>
    </div>

  </div>

  <!-- GRADE 2 INFERIORES: MESTRE DE OBRAS E DESIGNER -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
    
    <!-- 4. MESTRE DE OBRAS -->
    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-amber-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-xl">🏗️ Mestre de Obras (Campo)</span>
          <span class="text-2xl">📲</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Painel Mobile Touch adaptado para uso no canteiro</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Checklist das tarefas civis com prazo para hoje</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Conferência de descarga de materiais e notas fiscais</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Upload obrigatório de fotos para liberação de medição</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('FOREMAN', './detalhes')}
        class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm"
      >
        Acessar Canteiro Mobile →
      </button>
    </div>

    <!-- 5. DESIGNER DE INTERIORES -->
    <div class="bg-white rounded-3xl border-2 border-gray-200 hover:border-purple-500 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-xl">🎨 Designer de Interiores</span>
          <span class="text-2xl">✨</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-2.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-2"><span>•</span> <span>Estúdio de ambientação e prototipagem visual</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Simulações Antes x Depois em 3D geradas por IA</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Especificação de acabamentos finos e iluminação linear</span></li>
          <li class="flex items-start gap-2"><span>•</span> <span>Gestão de aprovações e orçamentos com o cliente</span></li>
        </ul>
      </div>
      <button 
        on:click={() => setRoleAndRedirect('DESIGNER', './detalhes')}
        class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition-colors shadow-sm"
      >
        Abrir Estúdio IA →
      </button>
    </div>

  </div>
</div>
