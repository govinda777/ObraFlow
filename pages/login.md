---
title: Login Local - ObraFlow
hide_title: true
hide_sidebar: true
sidebar_link: false
---

<script>
    let email = 'marina.costa@email.com';
    let isLoading = false;
    let errorMsg = '';

    const demoAccounts = [
        { label: '👤 Marina (Cliente)', email: 'marina.costa@email.com', role: 'CLIENT' },
        { label: '🏢 Maria (Empreiteira)', email: 'maria@alphaengenharia.com.br', role: 'CONTRACTOR' },
        { label: '📐 Carlos (Orçamentista)', email: 'carlos@alphaengenharia.com.br', role: 'ENGINEER' },
        { label: '🏗️ José (Mestre)', email: 'jose.mestre@alphaengenharia.com.br', role: 'FOREMAN' },
        { label: '🎨 Beatriz (Designer)', email: 'beatriz@estudiodecor.com.br', role: 'DESIGNER' }
    ];

    async function handleLogin(selectedEmail = null, preferredRole = null) {
        const targetEmail = (selectedEmail || email || '').trim();
        if (!targetEmail) {
            errorMsg = 'Informe um e-mail válido.';
            return;
        }
        isLoading = true;
        errorMsg = '';
        try {
            const res = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, role: preferredRole || 'CLIENT' })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Falha ao autenticar localmente.');
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem('obraflow_active_user', JSON.stringify(data.user));
                localStorage.setItem('obraflow_active_role', preferredRole || data.user.role || 'CLIENT');
                window.location.href = '/onboarding/';
            }
        } catch (err) {
            console.warn('Login fallback em memória:', err);
            if (typeof window !== 'undefined') {
                const fallbackUser = {
                    id: 'usr_local',
                    name: targetEmail.split('@')[0],
                    email: targetEmail,
                    role: preferredRole || 'CLIENT'
                };
                localStorage.setItem('obraflow_active_user', JSON.stringify(fallbackUser));
                localStorage.setItem('obraflow_active_role', fallbackUser.role);
                window.location.href = '/onboarding/';
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="flex flex-col items-center justify-center min-h-[78vh] px-4">
  <div class="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-200 max-w-md w-full text-center">
    <div class="mb-7">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 text-3xl mb-4 border border-indigo-100">
        🏗️⚡
      </div>
      <h1 class="text-2xl font-black text-gray-900 tracking-tight m-0">OBRAFLOW</h1>
      <p class="text-gray-500 text-xs mt-2">Acesse a sua gestão de obras no ambiente local</p>
    </div>

    <form class="space-y-4 text-left" on:submit|preventDefault={() => handleLogin()}>
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
            bind:value={email}
            placeholder="Digite seu e-mail (qualquer novo e-mail cria conta local)" 
            class="w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-xs bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {#if errorMsg}
        <div class="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5 font-semibold">
          ⚠️ {errorMsg}
        </div>
      {/if}

      <button 
        type="submit"
        disabled={isLoading}
        class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 text-center text-xs tracking-wide uppercase transition-all mt-4 cursor-pointer disabled:opacity-50"
      >
        {isLoading ? 'Autenticando localmente...' : 'Entrar com E-mail →'}
      </button>
    </form>

    <!-- Atalhos de 1 clique para testes locais das 5 personas -->
    <div class="pt-5 border-t border-gray-100 mt-6 text-left">
      <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
        ⚡ Acesso Rápido Local (Contas Pré-Configuradas)
      </div>
      <div class="flex flex-wrap justify-center gap-1.5">
        {#each demoAccounts as acc}
          <button
            type="button"
            on:click={() => { email = acc.email; handleLogin(acc.email, acc.role); }}
            class="text-[11px] bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer"
          >
            {acc.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="pt-4 mt-4 text-center">
      <p class="text-[11px] text-gray-400 m-0 flex items-center justify-center gap-1.5">
        <span>🔒</span> Sessão local persistida em mock_data/users.json
      </p>
    </div>
  </div>

  <div class="mt-6 text-center">
    <a href="/" class="text-xs text-gray-500 hover:text-indigo-600 font-semibold no-underline">
      ← Voltar para a Apresentação
    </a>
  </div>
</div>
