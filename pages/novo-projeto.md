---
title: Novo Orçamento - ObraFlow
hide_title: true
hide_sidebar: true
---

<div class="max-w-3xl mx-auto py-8">
  <div class="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
    <div>
      <div class="text-xs uppercase tracking-wider font-bold text-blue-600">Esteira Comercial & Técnica</div>
      <h1 class="text-2xl font-bold text-gray-900 m-0">1. Solicitação de Novo Orçamento de Obra</h1>
      <p class="text-gray-500 text-xs mt-1">Preencha os parâmetros da obra e envie a documentação técnica para extração assistida por IA.</p>
    </div>
    <div class="text-right">
      <span class="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
        Etapa 1 de 5
      </span>
      <div class="text-[11px] text-gray-400 mt-1">Status: QUOTE_REQUESTED</div>
    </div>
  </div>

  <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
    <!-- Bloco 1: Dados do Imóvel -->
    <div>
      <h3 class="text-sm font-bold uppercase text-gray-800 mb-3 flex items-center gap-2">
        <span>📍</span> Dados Básicos do Projeto e Canteiro
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Nome da Obra / Reforma</label>
          <input type="text" value="Reforma Loft Jardins" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Endereço Completo</label>
          <input type="text" value="Alameda dos Anapurus, 780 - Apto 82" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Área Estimada (m²)</label>
          <input type="number" value="72" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Teto Orçamentário Máximo (R$)</label>
          <input type="number" value="45000" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-xs font-semibold text-gray-700 mb-1">Resumo do Escopo Desejado</label>
        <textarea rows="2" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none">Reforma completa de loft: demolição pontual de mureta, nova iluminação em trilhos, bancada ilha e porcelanatos 120x120.</textarea>
      </div>
    </div>

    <!-- Bloco 2: Upload dos 3 Documentos Obrigatórios -->
    <div class="pt-4 border-t border-gray-100">
      <h3 class="text-sm font-bold uppercase text-gray-800 mb-3 flex items-center gap-2">
        <span>📂</span> Documentação Técnica da Obra (Arquivos Obrigatórios)
      </h3>
      <p class="text-gray-500 text-xs mb-4">A IA cruza a geometria da planta em PDF com a planilha de quantitativos e as diretrizes do memorial em texto.</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- 1. PDF -->
        <div class="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center bg-blue-50/40">
          <div class="text-2xl mb-1">📄</div>
          <div class="font-bold text-xs text-gray-800">Planta / Escopo (PDF)</div>
          <div class="text-[11px] text-blue-700 font-semibold mt-1">planta_executiva_loft.pdf</div>
          <div class="text-[10px] text-gray-400 mt-0.5">2.4 MB • Pronto</div>
          <label class="inline-block mt-3 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 text-[11px] font-bold py-1 px-3 rounded-lg cursor-pointer">
            Substituir Arquivo
            <input type="file" accept=".pdf" class="hidden" />
          </label>
        </div>

        <!-- 2. XLSX -->
        <div class="border-2 border-dashed border-emerald-200 rounded-xl p-4 text-center bg-emerald-50/40">
          <div class="text-2xl mb-1">📊</div>
          <div class="font-bold text-xs text-gray-800">Planilha Custos (XLSX/CSV)</div>
          <div class="text-[11px] text-emerald-700 font-semibold mt-1">orcamento_materiais_loft.xlsx</div>
          <div class="text-[10px] text-gray-400 mt-0.5">840 KB • Pronto</div>
          <label class="inline-block mt-3 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold py-1 px-3 rounded-lg cursor-pointer">
            Substituir Arquivo
            <input type="file" accept=".xlsx,.csv" class="hidden" />
          </label>
        </div>

        <!-- 3. TXT -->
        <div class="border-2 border-dashed border-amber-200 rounded-xl p-4 text-center bg-amber-50/40">
          <div class="text-2xl mb-1">📝</div>
          <div class="font-bold text-xs text-gray-800">Memorial Técnico (TXT)</div>
          <div class="text-[11px] text-amber-700 font-semibold mt-1">memorial_descritivo.txt</div>
          <div class="text-[10px] text-gray-400 mt-0.5">45 KB • Pronto</div>
          <label class="inline-block mt-3 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 text-[11px] font-bold py-1 px-3 rounded-lg cursor-pointer">
            Substituir Arquivo
            <input type="file" accept=".txt" class="hidden" />
          </label>
        </div>
      </div>
    </div>

    <!-- Bloco 3: Botões de Ação -->
    <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
      <a href="./dashboard" class="text-gray-500 hover:text-gray-700 text-xs font-semibold no-underline">
        ← Voltar ao Dashboard
      </a>
      <a href="./processamento" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all text-xs no-underline flex items-center gap-2">
        <span>⚡ Enviar para Processamento e Análise IA (Etapa 2)</span>
        <span>→</span>
      </a>
    </div>
  </div>
</div>
