---
title: Seleção de Perfil - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<div class="max-w-5xl mx-auto py-6 px-4">
  <!-- BARRA DE USUÁRIO SUPERIOR (Wireframe 2.2) -->
  <div class="flex items-center justify-between pb-4 mb-6 border-b border-gray-200 text-xs">
    <div class="flex items-center gap-2">
      <span class="font-black text-indigo-700 tracking-wider">🏗️⚡ OBRAFLOW</span>
      <span class="text-gray-300">|</span>
      <span class="text-gray-500 font-medium">Onboarding de Sessão</span>
    </div>
    <div class="flex items-center gap-2 bg-gray-100 text-gray-700 font-semibold px-3 py-1.5 rounded-full">
      <span>✉️ marina.costa@email.com</span>
      <a href="./login" class="text-gray-400 hover:text-rose-500 ml-1 no-underline" title="Trocar de conta">✕</a>
    </div>
  </div>

  <!-- CABEÇALHO -->
  <div class="text-center mb-8">
    <h1 class="text-2xl md:text-3xl font-black text-gray-900 tracking-tight m-0">BEM-VINDO AO OBRAFLOW! 👋</h1>
    <p class="text-gray-500 text-xs md:text-sm mt-1">Selecione seu perfil para configurar sua experiência de gestão:</p>
  </div>

  <!-- GRADE 3 SUPERIORES (CLIENTE, EMPREITEIRO, ORÇAMENTISTA) -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
    
    <!-- 1. CLIENTE PROPRIETÁRIO -->
    <div class="bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">👤 Cliente Proprietário</span>
          <span class="text-xl">🏠</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-1.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-1.5"><span>•</span> <span>Acompanhe suas obras ativas</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Solicite novos orçamentos com 1 clique</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Comprovação estrita por fotos de campo</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Simulações de acabamentos com IA</span></li>
        </ul>
      </div>
      <a href="./dashboard" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs no-underline transition-colors shadow-sm">
        Entrar como Cliente →
      </a>
    </div>

    <!-- 2. EMPREITEIRO / GESTOR -->
    <div class="bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-500 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">🏢 Empreiteiro / Gestor</span>
          <span class="text-xl">📊</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-1.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-1.5"><span>•</span> <span>Cockpit executivo multi-obra</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Termômetro de avanço físico vs. financeiro</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Alertas de compras críticas (supply chain)</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Controle de folha e margem de caixa</span></li>
        </ul>
      </div>
      <a href="./dashboard" class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs no-underline transition-colors shadow-sm">
        Entrar como Gestor →
      </a>
    </div>

    <!-- 3. ENGENHEIRO ORÇAMENTISTA -->
    <div class="bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-500 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">📐 Engenheiro Orçamentista</span>
          <span class="text-xl">🤖</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-1.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-1.5"><span>•</span> <span>Esteira de projetos técnicos</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Leitura de PDF, XLSX e TXT via Gemini IA</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Estruturação e calibragem de EAP</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Composição de custos de mão de obra e insumos</span></li>
        </ul>
      </div>
      <a href="./novo-projeto" class="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs no-underline transition-colors shadow-sm">
        Iniciar Orçamento →
      </a>
    </div>

  </div>

  <!-- GRADE 2 INFERIORES (MESTRE DE OBRAS E DESIGNER) -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
    
    <!-- 4. MESTRE DE OBRAS -->
    <div class="bg-white rounded-2xl border-2 border-gray-200 hover:border-amber-500 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">🏗️ Mestre de Obras (Campo)</span>
          <span class="text-xl">📲</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-1.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-1.5"><span>•</span> <span>Painel mobile para uso direto no canteiro</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Checklist de execução das tarefas do dia</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Recebimento e conferência de cargas/materiais</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Envio mandatório de fotos de comprovação</span></li>
        </ul>
      </div>
      <a href="./detalhes" class="block w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs no-underline transition-colors shadow-sm">
        Acessar Canteiro Mobile →
      </a>
    </div>

    <!-- 5. DESIGNER DE INTERIORES -->
    <div class="bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-500 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">🎨 Designer de Interiores</span>
          <span class="text-xl">✨</span>
        </div>
        <ul class="text-xs text-gray-600 space-y-1.5 my-4 pl-0 list-none">
          <li class="flex items-start gap-1.5"><span>•</span> <span>Estúdio de acabamentos e prototipagem</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Simulações Antes x Depois geradas por IA</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Especificação de marcenaria e iluminação</span></li>
          <li class="flex items-start gap-1.5"><span>•</span> <span>Gestão de aprovações com o cliente</span></li>
        </ul>
      </div>
      <a href="./detalhes" class="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-center text-xs no-underline transition-colors shadow-sm">
        Abrir Estúdio IA →
      </a>
    </div>

  </div>
</div>
