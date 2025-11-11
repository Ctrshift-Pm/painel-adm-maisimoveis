<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { api } from '$lib/apiClient';
  import { exportToCsv } from '$lib/utils/exportUtils';

  type Client = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    created_at?: string;
  };

  let clients: Client[] = [];
  let isLoading = true;
  let error = '';
  let searchTerm = '';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function fetchClients() {
    isLoading = true;
    error = '';

    try {
      const params = new URLSearchParams();
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        params.set('search', trimmedSearch);
      }

      const response = await api.get<{ data?: Client[] } | Client[]>(
        params.size > 0 ? `/admin/users?${params.toString()}` : '/admin/users'
      );
      const list = Array.isArray(response) ? response : response?.data;
      clients = Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      error = err instanceof Error ? err.message : 'Não foi possível carregar os clientes.';
      clients = [];
    } finally {
      isLoading = false;
    }
  }

  onMount(fetchClients);

  function formatDate(value?: string) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function handleExport() {
    if (!clients.length) return;

    const dataToExport = clients.map((client) => ({
      id: client.id,
      nome: client.name,
      email: client.email,
      telefone: client.phone ?? 'N/A',
      data_cadastro: client.created_at ?? '',
    }));

    exportToCsv(dataToExport, 'clientes.csv');
  }

  function handleSearchInput() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      fetchClients();
    }, 500);
  }
</script>

<section class="space-y-4">
  <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gestão de Clientes</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Consulte, filtre e exporte os clientes cadastrados na plataforma.
      </p>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        className="w-full sm:w-64"
        type="search"
        placeholder="Buscar por nome ou email..."
        bind:value={searchTerm}
        on:input={handleSearchInput}
      />
      <Button variant="outline" on:click={handleExport} disabled={clients.length === 0 || isLoading}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exportar Clientes (CSV)
      </Button>
    </div>
  </header>

  {#if isLoading}
    <div class="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600"></span>
        Carregando clientes...
      </div>
    </div>
  {:else if error}
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {error}
    </div>
  {:else if clients.length === 0}
    <div class="rounded-md border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <p class="text-sm text-gray-600 dark:text-gray-300">Nenhum cliente encontrado.</p>
    </div>
  {:else}
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-900/70">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Cliente
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Email
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Telefone
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Cadastrado em
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          {#each clients as client (client.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{client.name}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{client.email}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{client.phone ?? 'N/A'}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(client.created_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
