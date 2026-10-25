---
title: Login - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<div class="flex flex-col items-center justify-center min-h-[75vh] px-4">
  <!-- Card Principal de Login fiel ao Wireframe 2.1 de JOURNEYS.md -->
  <div class="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-200 max-w-md w-full text-center">
    
    <!-- Header -->
    <div class="mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 text-3xl mb-4 border border-indigo-100">
        🏗️⚡
      </div>
      <h1 class="text-2xl font-black text-gray-900 tracking-tight m-0">OBRAFLOW</h1>
      <p class="text-gray-500 text-xs mt-2">Acesse a sua gestão de obras com transparência e IA</p>
    </div>

    <!-- Formulário Exclusivo por E-mail -->
    <form class="space-y-4 text-left" on:submit|preventDefault={() => {
      const base = (typeof window !== 'undefined' && window.__sveltekit_dev && window.__sveltekit_dev.base) || '/ObraFlow';
      window.location.href = `${base}/onboarding/`;
    }}>
      <div>
        <label for="email" class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          E-mail Corporativo ou Pessoal
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm">
            ✉️
          </div>
          <input 
            id="email"
            type="email" 
            required
            placeholder="Digite seu e-mail (ex: marina@email.com)" 
            class="w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-xs bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            value="marina.costa@email.com"
          />
        </div>
      </div>

      <a 
        href="/onboarding/" 
        class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 text-center no-underline text-xs tracking-wide uppercase transition-all mt-5"
      >
        Entrar com E-mail →
      </a>

      <!-- Cláusula de Segurança -->
      <div class="pt-4 border-t border-gray-100 mt-6 text-center">
        <p class="text-[11px] text-gray-400 m-0 flex items-center justify-center gap-1.5">
          <span>🔒</span> Acesso corporativo seguro via link mágico ou código OTP
        </p>
      </div>
    </form>

  </div>

  <div class="mt-6 text-center">
    <a href="/" class="text-xs text-gray-500 hover:text-indigo-600 font-semibold no-underline">
      ← Voltar para a Apresentação
    </a>
  </div>
</div>
