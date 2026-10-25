---
title: Canteiro de Obras & Estúdio de Design - ObraFlow
hide_title: true
---

```sql simulacoes_estudio
SELECT
    s.room_name AS comodo,
    m.name AS material_aplicado,
    s.target_element AS elemento,
    s.consulting_fee AS taxa_consultoria_ia,
    s.status AS status_simulacao,
    s.original_photo_url,
    s.generated_photo_url
FROM obraflow.ai_room_simulations s
JOIN obraflow.materials m ON m.id = s.material_id
```

<script>
    // Seletor de Módulo: 'MESTRE' ou 'DESIGNER'
    let activeTab = 'MESTRE';
</script>

<!-- BARRA DE SELEÇÃO DE MÓDULO -->
<div class="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm mb-6 flex flex-wrap justify-between items-center gap-3">
    <div class="flex items-center gap-2">
        <span class="text-xs uppercase font-bold text-gray-500">Módulo Operacional Especializado:</span>
        <button 
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all {activeTab === 'MESTRE' ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeTab = 'MESTRE'}
        >
            🏗️ Canteiro Mobile (Mestre de Obras)
        </button>
        <button 
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all {activeTab === 'DESIGNER' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeTab = 'DESIGNER'}
        >
            🎨 Estúdio de Acabamentos (Designer)
        </button>
    </div>

    <a href="./dashboard" class="text-xs text-indigo-600 hover:underline font-bold no-underline">
        ← Ir para Dashboard Global
    </a>
</div>

<!-- ======================================================== -->
<!-- 4.4. 🏗️ CANTEIRO MOBILE DO MESTRE DE OBRAS (WIREFRAME 4.4)  -->
<!-- ======================================================== -->
{#if activeTab === 'MESTRE'}
    <div class="max-w-md mx-auto space-y-5 pb-8">
        
        <!-- CARD ESTILO CELULAR / MOBILE FIRST -->
        <div class="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-lg space-y-4">
            
            <!-- HEADER MOBILE -->
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-amber-600">🏗️ ObraFlow Campo</span>
                    <h2 class="text-base font-black text-gray-900 m-0">👷 Mestre José</h2>
                </div>
                <div class="text-right">
                    <span class="text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full">
                        Residencial Alpha
                    </span>
                </div>
            </div>

            <!-- 3 CARDS RÁPIDOS (Wireframe 4.4) -->
            <div class="grid grid-cols-3 gap-2 text-center">
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <div class="text-lg font-black text-gray-900">2</div>
                    <div class="text-[10px] text-gray-500 font-bold">Tarefas Hoje</div>
                </div>
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <div class="text-lg font-black text-amber-600">1 Carga</div>
                    <div class="text-[10px] text-gray-500 font-bold">A Conferir</div>
                </div>
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <div class="text-lg font-black text-emerald-600">5</div>
                    <div class="text-[10px] text-gray-500 font-bold">Fotos OK</div>
                </div>
            </div>

            <hr class="border-gray-100 m-0" />

            <!-- 🧱 MINHAS TAREFAS DE EXECUÇÃO HOJE -->
            <div class="space-y-3">
                <div class="text-xs font-bold uppercase tracking-wider text-gray-800">
                    🧱 Minhas Tarefas de Execução Hoje
                </div>

                <div class="border border-blue-200 bg-blue-50/30 p-3.5 rounded-2xl space-y-2 text-xs">
                    <div class="flex justify-between items-start">
                        <span class="font-bold text-gray-900">🔹 Teste de Estanqueidade Hidráulica</span>
                        <span class="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Hoje até 18h</span>
                    </div>
                    <div class="text-[11px] text-gray-500">Responsável de Campo: Roberto (Encanador)</div>
                    <button 
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5"
                        on:click={() => alert('📸 Foto de evidência anexada! Tarefa concluída e enviada ao cliente.')}
                    >
                        <span>📷</span> Tirar Foto de Evidência e Concluir
                    </button>
                </div>
            </div>

            <hr class="border-gray-100 m-0" />

            <!-- 📦 LOGÍSTICA & RECEBIMENTO NO CANTEIRO -->
            <div class="space-y-3">
                <div class="text-xs font-bold uppercase tracking-wider text-gray-800">
                    📦 Logística & Recebimento no Canteiro
                </div>

                <div class="border border-amber-200 bg-amber-50/30 p-3.5 rounded-2xl space-y-2.5 text-xs">
                    <div class="flex justify-between items-start">
                        <span class="font-bold text-gray-900">🚚 Porcelanato Calacata 90x90 (85 m²)</span>
                        <span class="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">14h - 16h</span>
                    </div>
                    <div class="text-[11px] text-gray-600">
                        Responsável Conferência: <strong class="text-indigo-700">EMPREITEIRO</strong>
                    </div>

                    <div class="bg-white p-2.5 rounded-xl border border-amber-100 text-[11px] space-y-1">
                        <div class="font-bold text-gray-700">Checklist Obrigatório de Descarga:</div>
                        <label class="flex items-center gap-1.5">
                            <input type="checkbox" checked /> Quantidade confere (42 caixas)
                        </label>
                        <label class="flex items-center gap-1.5">
                            <input type="checkbox" checked /> Sem avarias ou caixas molhadas
                        </label>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button 
                            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-[11px] flex items-center justify-center gap-1"
                            on:click={() => alert('📸 Foto da nota fiscal e palete anexada!')}
                        >
                            <span>📸</span> Tirar Foto Carga
                        </button>
                        <button 
                            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-[11px]"
                            on:click={() => alert('✅ Recebimento confirmado! Insumo liberado para assentamento.')}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>

            <!-- BOTÃO TROCAR DE CANTEIRO -->
            <div class="pt-2 text-center">
                <button 
                    class="text-xs font-bold text-gray-500 hover:text-amber-700 bg-gray-100 hover:bg-gray-200 w-full py-2 rounded-xl"
                    on:click={() => alert('📍 Canteiro alterado para: Reforma Loft Jardins (Apto 82)')}
                >
                    📍 Trocar de Canteiro (Ir para Reforma Loft)
                </button>
            </div>

        </div>
    </div>
{/if}

<!-- ======================================================== -->
<!-- 4.5. 🎨 ESTÚDIO DA DESIGNER DE INTERIORES (WIREFRAME 4.5)   -->
<!-- ======================================================== -->
{#if activeTab === 'DESIGNER'}
    <div class="max-w-4xl mx-auto space-y-6">
        
        <!-- HEADER DESIGNER -->
        <div class="flex flex-wrap items-center justify-between pb-3 border-b border-gray-200">
            <div>
                <h2 class="text-xl md:text-2xl font-black text-gray-900 m-0">Estúdio de Ambientação & Prototipagem IA</h2>
                <p class="text-xs text-gray-500 mt-0.5">Simulação visual de acabamentos em fotos reais do canteiro e controle de fornecedores.</p>
            </div>
            <span class="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full border border-purple-200">
                Perfil: 🎨 Designer de Interiores
            </span>
        </div>

        <!-- 4 BIGVALUES DESIGNER (Wireframe 4.5) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-purple-700">2 Aprovadas</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Simulações IA</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-indigo-700">R$ 950,00</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Receita Consultoria IA</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-blue-700">2 Insumos</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Em Trânsito Décor</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
                <div class="text-2xl font-black text-emerald-700">12/11</div>
                <div class="text-xs text-gray-500 font-semibold mt-1">Prazo Marcenaria</div>
            </div>
        </div>

        <!-- ✨ VISUALIZADOR DE PROTOTIPAGEM DE AMBIENTES (ANTES x DEPOIS COM IA) -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 class="text-xs font-bold uppercase tracking-wider text-purple-800 m-0">
                    ✨ Visualizador de Prototipagem de Ambientes (Antes x Depois com IA)
                </h3>
                <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    ✅ Aprovado pelo Cliente
                </span>
            </div>

            <div class="text-xs text-gray-600">
                <strong>Cômodo:</strong> Cozinha Integrada • <strong>Material:</strong> Bancada Ilha em Quartzo Branco + Cuba Inox
            </div>

            <!-- COMPARATIVO ANTES X DEPOIS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border border-gray-200 rounded-2xl p-4 bg-gray-50 text-center space-y-2">
                    <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">📷 Foto Original (Obra Real)</span>
                    <p class="text-xs text-gray-500">[ Reboco, contrapiso e tubulação aparente ]</p>
                    <a href="https://images.unsplash.com/photo-1503387762-592deb58ef4e" target="_blank" rel="noreferrer" class="text-xs font-bold text-blue-600 hover:underline">
                        Ver Foto Real do Canteiro
                    </a>
                </div>

                <div class="border border-purple-200 rounded-2xl p-4 bg-purple-50 text-center space-y-2">
                    <span class="text-xs font-bold text-purple-800 uppercase tracking-wider">🎨 Render IA (Material Aplicado)</span>
                    <p class="text-xs text-purple-600">[ Bancada branca instalada, iluminação e acabamentos ]</p>
                    <a href="https://images.unsplash.com/photo-1621905251189-08b45d6a269e" target="_blank" rel="noreferrer" class="text-xs font-bold text-purple-700 hover:underline">
                        Ver Simulação IA Gerada
                    </a>
                </div>
            </div>

            <div class="pt-2 flex flex-wrap gap-3">
                <button class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm" on:click={() => alert('✨ Nova variação solicitada ao modelo de renderização!')}>
                    🔄 Gerar Nova Variação IA
                </button>
                <button class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm" on:click={() => alert('💾 Especificação técnica salva para o time de compras!')}>
                    💾 Salvar Especificação para Compras
                </button>
            </div>
        </div>

        <!-- 🛋️ GESTÃO DE FORNECEDORES DECORATIVOS & ILUMINAÇÃO -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-800 m-0">
                🛋️ Gestão de Fornecedores Decorativos & Iluminação
            </h3>
            <ul class="text-xs text-gray-700 space-y-2 pl-0 list-none m-0">
                <li class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span>• Pendente Linear LED Dourado (Sala de Jantar)</span>
                    <span class="text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">⏳ Compra até 05/11</span>
                </li>
                <li class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span>• Chapas Drywall c/ Sanca (Living Integrado)</span>
                    <span class="text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">⏳ Compra até 29/10</span>
                </li>
                <li class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span>• Porcelanato Calacata 90x90 (Área Social)</span>
                    <span class="text-blue-800 font-bold bg-blue-100 px-2.5 py-0.5 rounded-full text-[11px]">🚚 Em Trânsito (Previsão 26/10)</span>
                </li>
            </ul>
        </div>

    </div>
{/if}
