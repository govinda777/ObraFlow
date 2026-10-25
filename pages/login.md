---
title: Login - ObraFlow
hide_title: true
hide_sidebar: true
---

<div class="flex flex-col items-center justify-center min-h-[70vh]">
  <div class="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-md w-full">
    <div class="text-center mb-8">
      <div class="text-3xl mb-2">🏗️⚡</div>
      <h2 class="text-2xl font-bold text-gray-900">Entrar no ObraFlow</h2>
      <p class="text-gray-500 text-sm mt-2">Informe seu e-mail para acessar o ambiente de obras</p>
    </div>

    <form class="space-y-4" on:submit|preventDefault={() => window.location.href = './onboarding'}>
      <div>
        <label for="email" class="block text-xs font-semibold text-gray-700 mb-1">E-mail Corporativo ou Pessoal</label>
        <input 
          id="email"
          type="email" 
          required
          placeholder="seu.email@empresa.com.br" 
          class="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-gray-50/50" 
        />
      </div>

      <a href="./onboarding" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors text-center no-underline text-sm mt-4">
        Entrar com E-mail →
      </a>
      
      <p class="text-center text-[11px] text-gray-400 mt-3">
        🔒 Acesso seguro com envio de código ou link mágico
      </p>
    </form>
  </div>
</div>
