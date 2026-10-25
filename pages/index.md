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

<!-- TOPBAR INSTITUCIONAL DE MARKETING -->
<div class="flex items-center justify-between pb-6 mb-8 border-b border-gray-100">
    <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-indigo-600/30">
            ⚡
        </div>
        <div>
            <span class="text-base font-black text-gray-900 tracking-tight">OBRAFLOW</span>
            <span class="text-[10px] block font-bold uppercase tracking-wider text-indigo-600">SaaS de Engenharia Civil</span>
        </div>
    </div>

    <div class="flex items-center gap-4">
        <a href="./login" class="text-xs font-bold text-gray-700 hover:text-indigo-600 no-underline transition-colors">
            Entrar
        </a>
        <a href="./login" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 px-5 rounded-xl shadow-md shadow-indigo-600/20 no-underline transition-all">
            Acessar Plataforma →
        </a>
    </div>
</div>

<!-- HERO DE IMPACTO COM DESIGN SYSTEM SAAS -->
<div class="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 md:p-12 mb-10 shadow-2xl border border-indigo-900/40">
    <div class="relative z-10 max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-4">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Plataforma Integrada de Gestão de Reformas & Obras
        </div>
        
        <h1 class="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-4">
            Acompanhamento Físico-Financeiro com <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">Inteligência Artificial</span>.
        </h1>
        
        <p class="text-slate-300 text-sm md:text-base leading-relaxed mb-8 max-w-2xl">
            Conectamos o <strong>Cliente Proprietário</strong>, <strong>Empreiteiro</strong>, <strong>Orçamentista</strong>, <strong>Mestre de Obras</strong> e <strong>Designer de Interiores</strong>. Orçamentos gerados em segundos a partir de plantas e planilhas com Google Gemini e liberação de pagamentos condicionada rigorosamente a evidências fotográficas.
        </p>

        <div class="flex flex-wrap gap-3">
            <a href="./login" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-black px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 no-underline transition-all flex items-center gap-2">
                <span>🚀</span> Entrar na Plataforma →
            </a>
            <a href="./onboarding" class="bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs md:text-sm font-bold px-5 py-3.5 rounded-xl no-underline transition-all flex items-center gap-2">
                <span>🎭</span> Experimentar os 5 Perfis
            </a>
        </div>
    </div>
</div>

<!-- 4 NÚMEROS DINÂMICOS DA PLATAFORMA (SEM HARDCODE) -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
        <div class="text-2xl font-black text-gray-900">
            <Value data={resumo_obras} column="total_obras" /> Canteiros
        </div>
        <div class="text-xs text-gray-500 font-medium mt-1">Obras sob Gestão Ativa</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
        <div class="text-2xl font-black text-indigo-600">
            <Value data={resumo_obras} column="volume_total_gerenciado" fmt="brl" />
        </div>
        <div class="text-xs text-gray-500 font-medium mt-1">Volume Contratual em EAP</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
        <div class="text-2xl font-black text-emerald-600">100%</div>
        <div class="text-xs text-gray-500 font-medium mt-1">Medições c/ Evidência Fotográfica</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
        <div class="text-2xl font-black text-purple-600">Gemini 1.5</div>
        <div class="text-xs text-gray-500 font-medium mt-1">Leitura Multimodal de PDF/XLSX</div>
    </div>
</div>

<!-- 3 PILARES TECNOLÓGICOS DO PRODUTO -->
<div class="mb-12">
    <div class="text-center max-w-2xl mx-auto mb-8">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Diferenciais Competitivos</span>
        <h2 class="text-2xl font-black text-gray-900 tracking-tight mt-1">Construção Civil Moderna e Confiável</h2>
        <p class="text-xs text-gray-500 mt-1">Acabamos com o clássico problema de obras que atrasam, estouram o caixa e geram desconfiança entre cliente e construtora.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold">
                🤖
            </div>
            <h3 class="text-base font-bold text-gray-900 m-0">Orçamento Inteligente com IA</h3>
            <p class="text-xs text-gray-600 leading-relaxed m-0">
                O cliente ou orçamentista envia Planta (PDF), Planilha SINAPI (XLSX) e Memorial (TXT). O Google Gemini decompõe automaticamente em macroetapas e tarefas atômicas da EAP em menos de 1 minuto.
            </p>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                📸
            </div>
            <h3 class="text-base font-bold text-gray-900 m-0">Cláusula Pétrea de Evidência</h3>
            <p class="text-xs text-gray-600 leading-relaxed m-0">
                Nenhuma parcela é liberada por estimativa ou relatório em papel. O Mestre de Obras envia fotos obrigatórias no canteiro, gerando auditoria transparente e destravando a medição financeira.
            </p>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold">
                📊
            </div>
            <h3 class="text-base font-bold text-gray-900 m-0">Termômetro Físico vs. Financeiro</h3>
            <p class="text-xs text-gray-600 leading-relaxed m-0">
                Cockpit executivo que alerta imediatamente quando o percentual pago pelo cliente não condiz com o avanço físico real executado, evitando quebras de caixa da construtora.
            </p>
        </div>
    </div>
</div>

<!-- AS 5 PERSONAS: ESCOLHA DE EXPERIÊNCIA -->
<div class="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm mb-12">
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Ecossistema Completo</span>
            <h2 class="text-xl md:text-2xl font-black text-gray-900 m-0">5 Visões Especializadas por Perfil</h2>
            <p class="text-xs text-gray-500 mt-1">Cada usuário atua com as ferramentas e indicadores específicos do seu papel na obra:</p>
        </div>
        <a href="./onboarding" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 no-underline mt-2 md:mt-0">
            Ir para Central de Onboarding →
        </a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <!-- 1. Cliente -->
        <a href="./dashboard" class="p-5 rounded-2xl border border-blue-100 bg-blue-50/20 hover:bg-blue-50/60 hover:border-blue-300 transition-all no-underline block space-y-2">
            <div class="text-3xl">👤</div>
            <div class="font-bold text-sm text-gray-900">Cliente / Proprietário</div>
            <p class="text-xs text-gray-600 m-0 leading-relaxed">Portal de transparência, acompanhamento por fotos de vistoria e botão exclusivo para solicitar novos orçamentos.</p>
            <div class="pt-2 text-xs font-bold text-blue-600">Acessar Visão do Cliente →</div>
        </a>

        <!-- 2. Empreiteiro -->
        <a href="./dashboard" class="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50/60 hover:border-indigo-300 transition-all no-underline block space-y-2">
            <div class="text-3xl">🏢</div>
            <div class="font-bold text-sm text-gray-900">Empreiteiro Geral (Gestor)</div>
            <p class="text-xs text-gray-600 m-0 leading-relaxed">Cockpit multi-obra, termômetro físico x financeiro, alertas de compras críticas de suprimentos e fluxo de caixa.</p>
            <div class="pt-2 text-xs font-bold text-indigo-600">Acessar Cockpit de Gestão →</div>
        </a>

        <!-- 3. Orçamentista -->
        <a href="./novo-projeto" class="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all no-underline block space-y-2">
            <div class="text-3xl">📐</div>
            <div class="font-bold text-sm text-gray-900">Engenheiro Orçamentista</div>
            <p class="text-xs text-gray-600 m-0 leading-relaxed">Leitura assistida por IA (PDF, XLSX, TXT), calibração técnica de diárias, insumos e emissão de propostas formais.</p>
            <div class="pt-2 text-xs font-bold text-emerald-600">Iniciar Novo Orçamento →</div>
        </a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 4. Mestre de Obras -->
        <a href="./detalhes" class="p-5 rounded-2xl border border-amber-100 bg-amber-50/20 hover:bg-amber-50/60 hover:border-amber-300 transition-all no-underline block space-y-2">
            <div class="text-3xl">🏗️</div>
            <div class="font-bold text-sm text-gray-900">Mestre de Obras (Canteiro Mobile)</div>
            <p class="text-xs text-gray-600 m-0 leading-relaxed">Tarefas de hoje, checklist de recebimento de materiais e botão direto para envio de fotos de comprovação.</p>
            <div class="pt-2 text-xs font-bold text-amber-600">Abrir Canteiro Mobile →</div>
        </a>

        <!-- 5. Designer -->
        <a href="./detalhes" class="p-5 rounded-2xl border border-purple-100 bg-purple-50/20 hover:bg-purple-50/60 hover:border-purple-300 transition-all no-underline block space-y-2">
            <div class="text-3xl">🎨</div>
            <div class="font-bold text-sm text-gray-900">Designer de Interiores</div>
            <p class="text-xs text-gray-600 m-0 leading-relaxed">Estúdio de acabamentos com visualizador Antes x Depois em 3D, controle de aprovações e marcenaria fina.</p>
            <div class="pt-2 text-xs font-bold text-purple-600">Abrir Estúdio de Design →</div>
        </a>
    </div>
</div>

<!-- FOOTER SAAS INSTITUCIONAL -->
<div class="pt-8 pb-12 border-t border-gray-200 text-center text-xs text-gray-500 space-y-2">
    <div class="font-bold text-gray-800">ObraFlow Tecnologia da Construção Civil Ltda.</div>
    <div>Plataforma desenvolvida para construtoras, engenheiros e clientes que exigem transparência e conformidade técnica.</div>
    <div class="text-[11px] text-gray-400">© 2026 ObraFlow. Todos os direitos reservados.</div>
</div>
