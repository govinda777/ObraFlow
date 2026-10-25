---
title: Canteiro de Obras & Estúdio de Design - ObraFlow
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
    let activeTab = 'MESTRE'; // 'MESTRE' ou 'DESIGNER'
</script>

<div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap justify-between items-center gap-3">
    <div class="flex items-center gap-2">
        <span class="text-xs uppercase font-bold text-gray-500">Selecione o Módulo de Campo / Estúdio:</span>
        <button 
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {activeTab === 'MESTRE' ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeTab = 'MESTRE'}
        >
            🏗️ Canteiro Mobile (Mestre de Obras)
        </button>
        <button 
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {activeTab === 'DESIGNER' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            on:click={() => activeTab = 'DESIGNER'}
        >
            🎨 Estúdio de Acabamentos (Designer)
        </button>
    </div>

    <a href="./dashboard" class="text-xs text-blue-600 hover:underline font-semibold no-underline">
        ← Voltar ao Dashboard Geral
    </a>
</div>

{#if activeTab === 'MESTRE'}
    <!-- ==================== 1. MESTRE DE OBRAS (CAMPO) ==================== -->
    <div class="max-w-3xl mx-auto space-y-6">
        <div class="border-b border-gray-200 pb-3 flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold text-gray-900 m-0">🏗️ Canteiro de Obras Mobile</h2>
                <p class="text-xs text-gray-500 mt-0.5">Execução diária, conferência de materiais e envio obrigatório de fotos.</p>
            </div>
            <span class="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">👷 Mestre José</span>
        </div>

        <!-- 3 CARDS RÁPIDOS DE CAMPO -->
        <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div class="text-xl font-bold text-gray-900">2</div>
                <div class="text-[11px] text-gray-500 font-semibold">Tarefas Hoje</div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div class="text-xl font-bold text-amber-600">1 Carga</div>
                <div class="text-[11px] text-gray-500 font-semibold">A Conferir</div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div class="text-xl font-bold text-emerald-600">5 Fotos</div>
                <div class="text-[11px] text-gray-500 font-semibold">Auditadas OK</div>
            </div>
        </div>

        <!-- TAREFAS DE EXECUÇÃO HOJE -->
        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-700 m-0">🧱 Minhas Tarefas de Execução Civil</h3>
            
            <div class="border border-blue-200 bg-blue-50/30 p-4 rounded-xl space-y-2">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-sm text-gray-900">Teste de Estanqueidade e Pressão Hidráulica</span>
                    <span class="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">IN_PROGRESS</span>
                </div>
                <p class="text-xs text-gray-600 m-0">Pressurizar rede hidráulica por 24h antes do fechamento das alvenarias.</p>
                <div class="text-[11px] text-gray-500 pt-1 border-t border-blue-100 flex justify-between items-center">
                    <span>Responsável: <strong>Roberto (Eletricista/Encanador)</strong></span>
                    <button class="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm" on:click={() => alert('📷 Simulador: Foto de manômetro anexada com sucesso! Tarefa concluída.')}>
                        📷 Tirar Foto e Concluir
                    </button>
                </div>
            </div>
        </div>

        <!-- RECEBIMENTO DE MATERIAL COM FOTO -->
        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-700 m-0">📦 Cargas a Receber e Inspecionar na Obra</h3>
            
            <div class="border border-amber-200 bg-amber-50/30 p-4 rounded-xl space-y-3">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-sm text-gray-900">Porcelanato Acetinado Calacata 90x90 (85 m²)</span>
                    <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Chegada Hoje</span>
                </div>
                <div class="text-xs text-gray-600">
                    Responsável pelo Recebimento: <strong class="text-indigo-700">EMPREITEIRO (Taxa R$ 250,00)</strong>
                </div>
                <div class="bg-white p-3 rounded-lg border border-amber-100 text-xs space-y-1">
                    <div class="font-semibold text-gray-800">Checklist Obrigatório de Descarga:</div>
                    <div><input type="checkbox" checked /> Quantidade de caixas confere (42 volumes)</div>
                    <div><input type="checkbox" checked /> Lote e calibre das peças idênticos</div>
                    <div><input type="checkbox" checked /> Sem trincas ou caixas úmidas</div>
                </div>
                <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg" on:click={() => alert('📸 Foto do descarregamento e integridade enviada! Carga liberada.')}>
                    📸 Tirar Foto da Nota + Carga e Liberar
                </button>
            </div>
        </div>
    </div>

{:else}
    <!-- ==================== 2. DESIGNER DE INTERIORES ==================== -->
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="border-b border-gray-200 pb-3 flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold text-gray-900 m-0">🎨 Estúdio de Ambientes & Prototipagem IA</h2>
                <p class="text-xs text-gray-500 mt-0.5">Simulação visual de acabamentos em fotos reais do canteiro e controle de fornecedores.</p>
            </div>
            <span class="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">✨ Designer Interiores</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each simulacoes_estudio as sim}
            <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-sm text-gray-900">✨ {sim.comodo}</span>
                    <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">{sim.status_simulacao}</span>
                </div>
                <div class="text-xs text-gray-600 font-medium truncate">{sim.material_aplicado}</div>

                <div class="grid grid-cols-2 gap-3 pt-2">
                    <div>
                        <div class="text-[10px] text-gray-500 uppercase font-bold mb-1">Canteiro Real (Antes)</div>
                        <div class="text-xs">
                            <a href="{sim.original_photo_url}" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline">📷 Ver Foto Original</a>
                        </div>
                    </div>
                    <div>
                        <div class="text-[10px] text-purple-700 uppercase font-bold mb-1">Render IA (Depois)</div>
                        <div class="text-xs">
                            <a href="{sim.generated_photo_url}" target="_blank" rel="noreferrer" class="text-purple-600 font-bold hover:underline">🎨 Ver Render IA</a>
                        </div>
                    </div>
                </div>

                <div class="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                    <span>Taxa de Consultoria: <strong>R$ {Number(sim.taxa_consultoria_ia).toLocaleString('pt-BR')}</strong></span>
                    <button class="bg-purple-600 text-white text-[11px] font-bold px-3 py-1 rounded-lg" on:click={() => alert('✨ Variação solicitada para o modelo de IA!')}>
                        Nova Variação
                    </button>
                </div>
            </div>
        {/each}
        </div>
    </div>
{/if}
