<script lang="ts">
    import { authToken } from './store';
    
    let email = '';
    let password = '';
    let error = '';
    let isLoading = false;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

    async function handleLogin() {
        isLoading = true;
        error = '';

        if (!email || !password) {
            error = 'Por favor, preencha email e senha.';
            isLoading = false;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    error = 'Email ou senha incorretos.';
                } else {
                    error = 'Erro ao fazer login. Tente novamente.';
                }
                return;
            }

            const data = await response.json();
            authToken.set(data.token);
            localStorage.setItem('authToken', data.token);
            
        } catch (err) {
            error = 'Erro de conexão. Verifique sua internet.';
            console.error('Erro no login:', err);
        } finally {
            isLoading = false;
        }
    }

    function handleKeypress(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleLogin();
        }
    }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full space-y-8 p-8">
        <div class="text-center">
            <img src="/logo_circular.png" alt="MaisImóveis" class="mx-auto h-24 w-24 mb-4" />
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white">MaisImóveis</h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Painel Administrativo</p>
        </div>
        
        <form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
            <div class="space-y-4">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </label>
                    <input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required 
                        bind:value={email}
                        on:keypress={handleKeypress}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        placeholder="seu@email.com"
                    />
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Senha
                    </label>
                    <input 
                        id="password" 
                        name="password" 
                        type="password" 
                        required 
                        bind:value={password}
                        on:keypress={handleKeypress}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        placeholder="Sua senha"
                    />
                </div>
            </div>

            {#if error}
                <div class="bg-red-50 border border-red-200 rounded-md p-3">
                    <p class="text-red-700 text-sm">{error}</p>
                </div>
            {/if}

            <button 
                type="submit" 
                disabled={isLoading}
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {#if isLoading}
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                {:else}
                    Entrar
                {/if}
            </button>
        </form>
    </div>
</div>

<style>
    :global(.dark) input {
        color-scheme: dark;
    }
</style>