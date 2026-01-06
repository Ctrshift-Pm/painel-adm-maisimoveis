<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { api } from '$lib/apiClient';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import Pagination from '$lib/Pagination.svelte';

  type Client = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    created_at?: string;
  };

  type SortConfig = {
    key: string;
    order: 'asc' | 'desc';
  };

  type ClientFilters = {
    search: string;
  };

  let clients: Client[] = [];
  let isLoading = true;
  let error = '';
  let filters: ClientFilters = { search: '' };
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let fetchKey = 0;
  let hasMounted = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let sortConfig: SortConfig = { key: 'created_at', order: 'desc' };
  let isModalOpen = false;
  let selectedClient: Client | null = null;
  let isProcessing = false;

  function requestFetch(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }
    fetchKey += 1;
  }

  async function fetchClients() {
    isLoading = true;
    error = '';

    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }
      params.append('sortBy', sortConfig.key);
      params.append('sortOrder', sortConfig.order);

      const response = await api.get<{ data?: Client[]; total?: number } | Client[]>(
        `/admin/users?${params.toString()}`
      );
      const list = Array.isArray(response) ? response : response?.data;
      clients = Array.isArray(list) ? list : [];
      totalItems = Number((response as { total?: number })?.total ?? clients.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      error = err instanceof Error ? err.message : 'Não foi possível carregar os clientes.';
      clients = [];
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    hasMounted = true;
    requestFetch();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    fetchKey;
    fetchClients();
  }

  function handleRefresh() {
    requestFetch();
  }

  function handleKeydown(event: KeyboardEvent | CustomEvent<KeyboardEvent>) {
    const key = event instanceof CustomEvent ? event.detail?.key : event.key;
    if (key === 'Enter') {
      requestFetch(true);
    }
  }

  function handleKeyup(event: KeyboardEvent | CustomEvent<KeyboardEvent>) {
    const key = event instanceof CustomEvent ? event.detail?.key : event.key;
    const target = event instanceof CustomEvent ? (event.detail as any)?.target : (event.target as HTMLInputElement | undefined);
    if (key === 'Enter') {
      requestFetch(true);
    } else if (target && target.value.trim() === '') {
      requestFetch(true);
    }
  }

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

    exportToCsv(dataToExport, `clientes_${new Date().toISOString().split('T')[0]}.csv`);
  }

  function onSearchInput(event?: Event) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const target = event?.target as HTMLInputElement | undefined;
    if (target && target.value.trim() === '') {
      requestFetch(true);
      return;
    }
    debounceTimer = setTimeout(() => {
      requestFetch(true);
    }, 300);
  }

  function handleSort(newKey: string) {
    if (sortConfig.key === newKey) {
      sortConfig = {
        ...sortConfig,
        order: sortConfig.order === 'asc' ? 'desc' : 'asc',
      };
    } else {
      sortConfig = { key: newKey, order: 'desc' };
    }
    requestFetch(true);
  }

  function getSortIndicator(column: string) {
    if (sortConfig.key !== column) {
      return '';
    }
    return sortConfig.order === 'asc' ? '▲' : '▼';
  }

  function openClientModal(client: Client) {
    selectedClient = client;
    isModalOpen = true;
  }

  function closeModal() {
    if (isProcessing) return;
    isModalOpen = false;
    selectedClient = null;
  }

  async function deleteClient() {
    if (!selectedClient) return;
    const confirmed = window.confirm(`Excluir o cliente ${selectedClient.name}?`);
    if (!confirmed) return;

    isProcessing = true;
    try {
      await api.delete(`/admin/clients/${selectedClient.id}`);
      toast.success('Cliente excluido.');
      clients = clients.filter((c) => c.id !== selectedClient?.id);
      closeModal();
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      toast.error('Falha ao excluir cliente.');
    } finally {
      isProcessing = false;
    }
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
        bind:value={filters.search}
        on:input={onSearchInput}
        on:keydown={handleKeydown}
        on:keyup={handleKeyup}
      />
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <label for="clients-items-per-page" class="font-medium">Mostrar</label>
        <select
          id="clients-items-per-page"
          bind:value={itemsPerPage}
          on:change={() => requestFetch(true)}
          class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>entradas</span>
      </div>
      <Button variant="outline" on:click={handleRefresh} disabled={isLoading}>
        Recarregar
      </Button>
      <Button variant="outline" on:click={() => handleSort('name')} disabled={isLoading}>
        Ordenar A-Z
      </Button>
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
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('name')}>
                Cliente
                <span aria-hidden="true">{getSortIndicator('name')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('email')}>
                Email
                <span aria-hidden="true">{getSortIndicator('email')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Telefone
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('created_at')}>
                Cadastrado em
                <span aria-hidden="true">{getSortIndicator('created_at')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ações
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
              <td class="px-6 py-4 text-right">
                <Button size="sm" variant="outline" on:click={() => openClientModal(client)}>
                  Revisar
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="mt-4">
      <Pagination bind:currentPage {totalPages} {totalItems} {itemsPerPage} />
    </div>
  {/if}
</section>

<Dialog.Root bind:open={isModalOpen}>
  <Dialog.Content className="max-w-md">
    {#if selectedClient}
      <Dialog.Header>
        <Dialog.Title>Revisar Cliente</Dialog.Title>
        <Dialog.Description>
          Consulte os dados do cliente e exclua se necessário.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-2 py-4 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Nome:</strong> {selectedClient.name}</p>
        <p><strong>Email:</strong> {selectedClient.email}</p>
        <p><strong>Telefone:</strong> {selectedClient.phone ?? 'N/A'}</p>
        <p><strong>Cadastrado em:</strong> {formatDate(selectedClient.created_at)}</p>
      </div>

      <Dialog.Footer className="flex gap-2">
        <Button variant="outline" on:click={closeModal} disabled={isProcessing}>Cancelar</Button>
        <Button variant="destructive" on:click={deleteClient} disabled={isProcessing}>
          {#if isProcessing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Excluir cliente
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
