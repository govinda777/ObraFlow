---
title: Criação de Projeto - ObraFlow
hide_title: true
hide_sidebar: true
---

<div class="max-w-2xl mx-auto py-8">
  <div class="mb-8">
    <h2 class="text-2xl font-bold text-gray-900">Novo Projeto</h2>
    <p class="text-gray-500 text-sm mt-1">Preencha os dados e anexe o projeto para orçamentação inteligente.</p>
  </div>

  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <div class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nome da Obra</label>
        <input type="text" placeholder="Ex: Residência Família Silva" class="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <input type="text" placeholder="Nome do Proprietário" class="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input type="text" placeholder="Endereço da Obra" class="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Upload de Documentos (PDF)</label>
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer">
          <svg class="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          <span class="text-sm font-medium text-blue-600">Clique para fazer upload</span>
          <span class="text-xs text-gray-500 mt-1">ou arraste e solte seu Projeto Arquitetônico (PDF)</span>
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100">
        <a href="./processamento" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-sm transition-colors text-center text-lg no-underline">
          Enviar para Orçamento Inteligente (IA)
        </a>
      </div>
    </div>
  </div>
</div>
