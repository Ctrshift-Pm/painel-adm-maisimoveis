<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';

  type NegotiationItem = {
    id: string;
    status: string;
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    brokerName?: string | null;
    clientName?: string | null;
    approvedAt?: string | null;
  };

  let negotiations: NegotiationItem[] = [];
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let selected: NegotiationItem | null = null;
  let showConfirm = false;
  let processing = false;

  function requestFetch(resetPage = false) {
    if (resetPage) currentPage = 1;
    refreshKey += 1;
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  }

  async function fetchNegotiations() {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      params.set('status', 'APPROVED');
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));

      const response = await api.get<{ data?: NegotiationItem[]; total?: number } | NegotiationItem[]>(
        `/admin/negotiations?${params.toString()}`
      );
      const data = Array.isArray(response) ? response : response?.data;
      negotiations = Array.isArray(data) ? data : [];
      totalItems = Number((response as { total?: number })?.total ?? negotiations.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao listar negociações em andamento:', error);
      toast.error('Não foi possível carregar negociações em andamento.');
      negotiations = [];
    } finally {
      isLoading = false;
    }
  }

  function openCancelModal(item: NegotiationItem) {
    selected = item;
    showConfirm = true;
  }

  function closeCancelModal(force = false) {
    if (processing && !force) return;
    showConfirm = false;
    selected = null;
  }

  async function confirmCancel() {
    if (!selected) return;
    processing = true;
    try {
      await api.put(`/admin/negotiations/${selected.id}/cancel`, {});
      toast.success('Negociação cancelada e imóvel devolvido para a vitrine.');
      negotiations = negotiations.filter((item) => item.id !== selected!.id);
      closeCancelModal(true);
      requestFetch();
    } catch (error) {
      console.error('Erro ao cancelar negociação em andamento:', error);
      toast.error('Falha ao cancelar negociação.');
    } finally {
      processing = false;
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
    fetchNegotiations();
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Imóveis em Negociação</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Negociações aprovadas que já retiraram o imóvel da vitrine.
      </p>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="negotiation-progress-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="negotiation-progress-items-per-page"
        bind:value={itemsPerPage}
        on:change={() => requestFetch(true)}
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      <span>entradas</span>
    </div>
    <Button variant="outline" on:click={() => requestFetch()} disabled={isLoading}>
      {#if isLoading}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {/if}
      Atualizar
    </Button>
  </div>

  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
      <thead class="bg-gray-50 dark:bg-gray-900/70">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Código / Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Corretor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Cliente
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data Aprovação
          </th>
          <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ação
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
        {#if isLoading}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando negociações em andamento...
            </td>
          </tr>
        {:else if negotiations.length === 0}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma negociação em andamento.
            </td>
          </tr>
        {:else}
          {#each negotiations as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-semibold">
                  {item.propertyCode ? `${item.propertyCode}` : `#${item.propertyId}`}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? '-'}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.brokerName ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.clientName ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.approvedAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-red-600 text-white hover:bg-red-700"
                  on:click={() => openCancelModal(item)}
                >
                  Voltar para Disponível
                </Button>
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

{#if showConfirm && selected}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Voltar para Disponível</h3>
      <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Tem certeza? Isso cancelará a negociação atual e devolverá o imóvel para a vitrine.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" on:click={() => closeCancelModal()} disabled={processing}>
          Não
        </Button>
        <Button
          variant="destructive"
          className="bg-red-600 text-white hover:bg-red-700"
          on:click={confirmCancel}
          disabled={processing}
        >
          {#if processing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Sim, cancelar
        </Button>
      </div>
    </div>
  </div>
{/if}
