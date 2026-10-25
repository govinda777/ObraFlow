---
title: ObraFlow — Plataforma de Gestão de Obras com IA
hide_title: true
---

```sql resumo_obras
SELECT 
    COUNT(*) AS total_obras,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) AS obras_ativas,
    COALESCE(
        (SELECT SUM(amount) 
         FROM obraflow.financial_transactions 
         WHERE type = 'RECEIVABLE' AND category = 'CLIENT_INSTALLMENT'),
        0
    ) AS volume_total_gerenciado
FROM obraflow.projects
```

<!-- HERO PRINCIPAL -->
<div class="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 md:p-12 mb-8 shadow-2xl border border-indigo-900/50">
    <div class="relative z-10 max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-4">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Plataforma Integrada de Gestão de Reformas & Obras
        </div>
        <h1 class="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-4">
            OBRAFLOW <span class="text-indigo-400 font-light">🏗️⚡</span>
        </h1>
        <p class="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-2xl">
            Conectamos o <strong>Cliente Proprietário</strong>, <strong>Empreiteiro Geral</strong>, <strong>Orçamentista</strong>, <strong>Mestre de Obras</strong> e <strong>Designer de Interiores</strong> em uma esteira única com extração técnica por Inteligência Artificial (Google Gemini) e controle físico-financeiro comprovado estritamente por fotos de campo.
        </p>

        <div class="flex flex-wrap gap-3">
            <a href="./login" class="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 no-underline transition-all flex items-center gap-2">
                <span>✉️</span> Acessar Sistema (Login) →
            </a>
            <a href="./dashboard" class="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold px-5 py-3 rounded-xl no-underline transition-all flex items-center gap-2">
                <span>📊</span> Ver Cockpit Multi-Obra
            </a>
            <a href="./novo-projeto" class="bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl no-underline transition-all flex items-center gap-2">
                <span>📝</span> Solicitar Novo Orçamento
            </a>
        </div>
    </div>
</div>

<!-- 4 NÚMEROS DA PLATAFORMA -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
        <div class="text-2xl font-black text-gray-900">
            <Value data={resumo_obras} column="total_obras" /> Obras
        </div>
        <div class="text-xs text-gray-500 font-medium mt-1">Canteiros Cadastrados</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
        <div class="text-2xl font-black text-indigo-600">
            <Value data={resumo_obras} column="volume_total_gerenciado" fmt="brl" />
        </div>
        <div class="text-xs text-gray-500 font-medium mt-1">Volume Orçado Contratado</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
        <div class="text-2xl font-black text-emerald-600">100%</div>
        <div class="text-xs text-gray-500 font-medium mt-1">Medição c/ Foto Auditada</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
        <div class="text-2xl font-black text-purple-600">Gemini 1.5</div>
        <div class="text-xs text-gray-500 font-medium mt-1">Motor de IA Integrado</div>
    </div>
</div>

<!-- 5 PERFIS OFICIAIS DE ACESSO -->
<div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Ecossistema Colaborativo</span>
            <h2 class="text-xl md:text-2xl font-bold text-gray-900 m-0">Acesso Especializado por Persona</h2>
            <p class="text-xs text-gray-500 mt-1">Selecione uma persona para experimentar seu respectivo painel e fluxo de trabalho:</p>
        </div>
        <a href="./onboarding" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 no-underline mt-2 md:mt-0">
            Ver Central de Onboarding →
        </a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <!-- 1. Cliente -->
        <a href="./dashboard" class="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-300 transition-all no-underline block">
            <div class="text-2xl mb-2">👤</div>
            <div class="font-bold text-sm text-gray-900 mb-1">Cliente / Proprietário</div>
            <p class="text-xs text-gray-600 mb-3">Portal de transparência, acompanhamento por fotos de vistoria e solicitação de novos orçamentos.</p>
            <span class="text-[11px] font-bold text-blue-600">Acessar Visão do Cliente →</span>
        </a>

        <!-- 2. Empreiteiro -->
        <a href="./dashboard" class="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-300 transition-all no-underline block">
            <div class="text-2xl mb-2">🏢</div>
            <div class="font-bold text-sm text-gray-900 mb-1">Empreiteiro Geral (Gestor)</div>
            <p class="text-xs text-gray-600 mb-3">Cockpit multi-obra, termômetro físico x financeiro, alertas de compras de suprimentos e caixa.</p>
            <span class="text-[11px] font-bold text-indigo-600">Acessar Cockpit de Gestão →</span>
        </a>

        <!-- 3. Orçamentista -->
        <a href="./novo-projeto" class="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-300 transition-all no-underline block">
            <div class="text-2xl mb-2">📐</div>
            <div class="font-bold text-sm text-gray-900 mb-1">Engenheiro Orçamentista</div>
            <p class="text-xs text-gray-600 mb-3">Leitura de documentos por IA (PDF, XLSX, TXT), calibragem de preços de EAP e proposta comercial.</p>
            <span class="text-[11px] font-bold text-emerald-600">Iniciar Novo Orçamento →</span>
        </a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 4. Mestre de Obras -->
        <a href="./detalhes" class="p-4 rounded-2xl border border-amber-100 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-300 transition-all no-underline block">
            <div class="text-2xl mb-2">🏗️</div>
            <div class="font-bold text-sm text-gray-900 mb-1">Mestre de Obras (Campo Mobile)</div>
            <p class="text-xs text-gray-600 mb-3">Tarefas do dia, conferência e descarga de caminhões de materiais e upload mandatório de fotos de vistoria.</p>
            <span class="text-[11px] font-bold text-amber-600">Abrir Canteiro Mobile →</span>
        </a>

        <!-- 5. Designer -->
        <a href="./detalhes" class="p-4 rounded-2xl border border-purple-100 bg-purple-50/30 hover:bg-purple-50 hover:border-purple-300 transition-all no-underline block">
            <div class="text-2xl mb-2">🎨</div>
            <div class="font-bold text-sm text-gray-900 mb-1">Designer de Interiores</div>
            <p class="text-xs text-gray-600 mb-3">Estúdio de acabamentos com simulação Antes x Depois por IA, especificação de marcenaria e iluminação.</p>
            <span class="text-[11px] font-bold text-purple-600">Abrir Estúdio de Design →</span>
        </a>
    </div>
</div>

<!-- DIAGRAMA MACRO DO FLUXO -->
<div class="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-sm">
    <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Jornada de Ponta a Ponta</span>
            <h3 class="text-lg font-bold text-white m-0">Como Funciona a Esteira ObraFlow</h3>
        </div>
        <span class="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 font-medium">Fluxo 100% Auditável</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div class="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div class="text-indigo-400 font-bold mb-1">1. Entrada</div>
            <div class="font-semibold text-white mb-1">Dados & Documentos</div>
            <p class="text-slate-400 leading-relaxed m-0">Upload de Planta (PDF), Planilha (XLSX) e Memorial (TXT). Status: <code>QUOTE_REQUESTED</code>.</p>
        </div>
        <div class="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div class="text-indigo-400 font-bold mb-1">2. Motor IA</div>
            <div class="font-semibold text-white mb-1">Google Gemini API</div>
            <p class="text-slate-400 leading-relaxed m-0">Diagnóstico técnico, quantitativos e sugestão inicial de EAP. Status: <code>BUDGET_READY</code>.</p>
        </div>
        <div class="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div class="text-indigo-400 font-bold mb-1">3. Orçamentista</div>
            <div class="font-semibold text-white mb-1">Revisão Técnica EAP</div>
            <p class="text-slate-400 leading-relaxed m-0">Calibragem de diárias, insumos e frete. Emissão da minuta contratual vinculada a fotos.</p>
        </div>
        <div class="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div class="text-indigo-400 font-bold mb-1">4. Cliente</div>
            <div class="font-semibold text-white mb-1">Aceite e Execução</div>
            <p class="text-slate-400 leading-relaxed m-0">Assinatura digital do termo, destravamento automático no Dashboard e status <code>IN_PROGRESS</code>.</p>
        </div>
    </div>
</div>
