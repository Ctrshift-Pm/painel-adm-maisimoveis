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

        // Validação básica
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

            console.log('Login response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Login error details:', errorText);
                
                if (response.status === 404) {
                    error = 'Serviço indisponível. Tente novamente mais tarde.';
                } else if (response.status === 401) {
                    error = 'Email ou senha incorretos.';
                } else {
                    error = `Erro ${response.status}: ${errorText}`;
                }
                return;
            }

            const data = await response.json();
            console.log('Login successful, token received');
            
            if (data.token) {
                authToken.set(data.token);
                localStorage.setItem('authToken', data.token);
            } else {
                error = 'Resposta inválida do servidor.';
            }
            
        } catch (err) {
            error = 'Erro de conexão. Verifique sua internet.';
            console.error('Erro completo no login:', err);
        } finally {
            isLoading = false;
        }
    }

    // Enter key support
    function handleKeypress(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleLogin();
        }
    }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
        <div>
            <img src="/logo_circular.png" alt="MaisImóveis" class="mx-auto h-32 w-auto" />
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                Painel Administrativo
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                MaisImóveis
            </p>
        </div>
        
        {#if error}
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong class="font-bold">Erro: </strong>
                <span class="block sm:inline">{error}</span>
            </div>
        {/if}

        <form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
            <div class="rounded-md shadow-sm -space-y-px">
                <div>
                    <label for="email" class="sr-only">Email</label>
                    <input 
                        id="email" 
                        name="email" 
                        type="email" 
                        autocomplete="email" 
                        required 
                        bind:value={email}
                        on:keypress={handleKeypress}
                        class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        placeholder="Email administrativo" 
                    />
                </div>
                <div>
                    <label for="password" class="sr-only">Senha</label>
                    <input 
                        id="password" 
                        name="password" 
                        type="password" 
                        autocomplete="current-password" 
                        required 
                        bind:value={password}
                        on:keypress={handleKeypress}
                        class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        placeholder="Senha" 
                    />
                </div>
            </div>

            <div>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
        </form>

        <div class="text-center text-xs text-gray-500">
            <p>Entre com suas credenciais administrativas</p>
        </div>
    </div>
</div>