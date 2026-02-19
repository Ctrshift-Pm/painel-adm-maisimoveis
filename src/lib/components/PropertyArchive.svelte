<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';

  type ArchiveStatus = 'sold' | 'rented';

  type ArchiveItem = {
    id: number;
    code?: string | null;
    title: string;
    brokerName?: string | null;
    status: ArchiveStatus;
    transactionDate?: string | null;
  };

  let rows: ArchiveItem[] = [];
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let search = '';
  let searchDraft = '';
  let isRelisting = false;
  let selected: ArchiveItem | null = null;
  let showModal = false;

  function formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('pt-BR');
  }

  function statusLabel(status: ArchiveStatus): string {
    return status === 'sold' ? 'Vendido' : 'Alugado';
  }

  function statusClass(status: ArchiveStatus): string {
    if (status === 'sold') {
      return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
    return 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100';
  }

  function openRelistModal(item: ArchiveItem) {
    selected = item;
    showModal = true;
  }

  function closeModal(force = false) {
    if (isRelisting && !force) return;
    showModal = false;
    selected = null;
  }

  function requestFetch(resetPage = false) {
    if (resetPage) currentPage = 1;
    refreshKey += 1;
  }

  async function fetchArchive() {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await api.get<{
        data?: ArchiveItem[];
        total?: number;
      }>(`/admin/properties/archive?${params.toString()}`);

      rows = Array.isArray(response?.data) ? response.data : [];
      totalItems = Number(response?.total ?? rows.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar arquivo de imóveis:', error);
      rows = [];
      totalItems = 0;
      totalPages = 1;
      toast.error('Não foi possível carregar o arquivo de imóveis.');
    } finally {
      isLoading = false;
    }
  }

  async function confirmRelist() {
    if (!selected) return;
    isRelisting = true;
    try {
      await api.put(`/admin/properties/${selected.id}/relist`, {});
      toast.success('Imóvel disponibilizado novamente com sucesso.');
      rows = rows.filter((item) => item.id !== selected!.id);
      totalItems = Math.max(0, totalItems - 1);
      closeModal(true);
      requestFetch();
    } catch (error) {
      console.error('Erro ao disponibilizar imóvel novamente:', error);
      toast.error('Não foi possível disponibilizar o imóvel novamente.');
    } finally {
      isRelisting = false;
    }
  }

  onMount(() => {
    hasMounted = true;
    requestFetch();
  });

  $: if (hasMounted) {
    currentPage;
    itemsPerPage;
    refreshKey;
    fetchArchive();
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Imóveis Vendidos/Alugados</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Histórico de imóveis finalizados. Imóveis alugados podem ser disponibilizados novamente.
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <input
        type="text"
        bind:value={searchDraft}
        placeholder="Buscar por código, título ou corretor"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <Button
        variant="outline"
        on:click={() => {
          search = searchDraft.trim();
          requestFetch(true);
        }}
      >
        Buscar
      </Button>
      <Button variant="outline" on:click={() => requestFetch()} disabled={isLoading}>
        {#if isLoading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Atualizar
      </Button>
    </div>
  </div>

  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Código
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Título
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Corretor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Status
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data da Transação
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ação
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if isLoading}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando imóveis...
            </td>
          </tr>
        {:else if rows.length === 0}
          <tr>
            <td colspan="6" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum imóvel vendido ou alugado encontrado.
            </td>
          </tr>
        {:else}
          {#each rows as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                {item.code ? item.code : `#${item.id}`}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.title}</td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.brokerName ?? '-'}</td>
              <td class="px-6 py-4">
                <span class={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.transactionDate)}
              </td>
              <td class="px-6 py-4 text-right">
                {#if item.status === 'rented'}
                  <Button size="sm" variant="outline" on:click={() => openRelistModal(item)}>
                    Disponibilizar Novamente
                  </Button>
                {:else}
                  <span class="text-sm text-gray-400 dark:text-gray-500">-</span>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <Pagination bind:currentPage {totalPages} {totalItems} {itemsPerPage} />
  </div>
</div>

{#if showModal && selected}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    }}
    on:keydown={() => {}}
  >
    <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Disponibilizar Imóvel</h3>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Tem certeza que deseja disponibilizar este imóvel novamente? Ele retornará imediatamente para o catálogo do aplicativo de todos os corretores.
      </p>
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        <strong>Imóvel:</strong> {selected.code ? `${selected.code} - ` : ''}{selected.title}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <Button
          variant="outline"
          className="bg-blue-600 text-white hover:bg-blue-700"
          on:click={confirmRelist}
          disabled={isRelisting}
        >
          {#if isRelisting}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Confirmar
        </Button>
      </div>
    </div>
  </div>
{/if}
