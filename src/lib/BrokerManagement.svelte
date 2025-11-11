<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import { api } from '$lib/apiClient';
  import { authToken } from './store';
  import type { Broker, BrokerDocuments, Property } from './types';

  let brokers: Broker[] = [];
  let isLoading = false;
  let error: string | null = null;
  let feedback: { type: 'success' | 'error'; text: string } | null = null;
  let actionBrokerId: number | null = null;

  let isDocumentsModalOpen = false;
  let selectedBroker: Broker | null = null;
  let selectedDocuments: BrokerDocuments | null = null;
  let docsError: string | null = null;

  let isPropertiesModalOpen = false;
  let brokerProperties: Property[] = [];
  let propertiesLoading = false;
  let propertiesError: string | null = null;
  let propertiesModalTitle = '';

  const DOCUMENT_TILES: ReadonlyArray<{ key: keyof BrokerDocuments; label: string }> = [
    { key: 'creci_front_url', label: 'Frente do CRECI' },
    { key: 'creci_back_url', label: 'Verso do CRECI' },
    { key: 'selfie_url', label: 'Selfie com documento' },
  ];

  function showFeedback(type: 'success' | 'error', text: string) {
    feedback = { type, text };
    setTimeout(() => (feedback = null), 4000);
  }

  function formatStatus(status: Broker['status']): string {
    const map: Record<Broker['status'], string> = {
      pending_verification: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado'
    };
    return map[status] ?? status;
  }

  function statusBadgeClasses(status: Broker['status']): string {
    const map: Record<Broker['status'], string> = {
      pending_verification:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return map[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatCurrency(value: unknown): string {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return '—';
    }
    return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatPropertyStatus(status?: string | null): string {
    if (!status) {
      return '—';
    }
    const map: Record<string, string> = {
      pending_approval: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      rented: 'Alugado',
      sold: 'Vendido'
    };
    return map[status] ?? status;
  }

  function propertyStatusBadge(status?: string | null): string {
    if (!status) {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    }
    const map: Record<string, string> = {
      pending_approval:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      rented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return map[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  async function fetchBrokers() {
    isLoading = true;
    error = null;

    const token = get(authToken);
    if (!token) {
      error = 'Sessão expirada. Faça login novamente.';
      isLoading = false;
      return;
    }

    try {
      const response = await api.get<{ data?: Broker[] } | Broker[]>(`/admin/brokers?status=approved`);
      const data = Array.isArray(response) ? response : response?.data;
      brokers = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Erro ao buscar corretores:', err);
      error =
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro inesperado ao carregar os corretores.';
    } finally {
      isLoading = false;
    }
  }

  async function updateBrokerStatus(broker: Broker, action: 'approve' | 'reject') {
    if (!get(authToken)) {
      showFeedback('error', 'Sessão expirada. Faça login novamente.');
      return;
    }

    actionBrokerId = broker.id;

    try {
      await api.patch(`/admin/brokers/${broker.id}/status`, {
        status: action === 'approve' ? 'approved' : 'rejected'
      });

      showFeedback(
        'success',
        `Corretor ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso.`
      );
      await fetchBrokers();
    } catch (err) {
      console.error('Erro ao atualizar corretor:', err);
      showFeedback(
        'error',
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao atualizar o status do corretor.'
      );
    } finally {
      actionBrokerId = null;
    }
  }

  function openDocumentModal(broker: Broker) {
    const baseDocs = broker.documents ?? {
      creci_front_url: (broker as unknown as Record<string, string | null>)?.creci_front_url ?? null,
      creci_back_url: (broker as unknown as Record<string, string | null>)?.creci_back_url ?? null,
      selfie_url: (broker as unknown as Record<string, string | null>)?.selfie_url ?? null
    };

    selectedBroker = broker;
    selectedDocuments = {
      creci_front_url: baseDocs.creci_front_url ?? null,
      creci_back_url: baseDocs.creci_back_url ?? null,
      selfie_url: baseDocs.selfie_url ?? null
    };

    const hasDocs =
      Boolean(selectedDocuments?.creci_front_url) ||
      Boolean(selectedDocuments?.creci_back_url) ||
      Boolean(selectedDocuments?.selfie_url);

    docsError = hasDocs ? null : 'Documentos não disponíveis para este corretor.';
    isDocumentsModalOpen = true;
  }

  async function openPropertiesModal(broker: Broker) {
    if (!get(authToken)) {
      showFeedback('error', 'Sessão expirada. Faça login novamente.');
      return;
    }

    propertiesModalTitle = broker.name;
    isPropertiesModalOpen = true;
    propertiesLoading = true;
    propertiesError = null;
    brokerProperties = [];

    try {
      const payload = await api.get<{ data?: Property[] } | Property[]>(
        `/admin/brokers/${broker.id}/properties`
      );
      const data = Array.isArray(payload) ? payload : payload?.data;
      brokerProperties = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Erro ao carregar imóveis do corretor:', err);
      propertiesError =
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar os imóveis deste corretor.';
    } finally {
      propertiesLoading = false;
    }
  }

  function closeDocumentsModal() {
    isDocumentsModalOpen = false;
    selectedBroker = null;
    selectedDocuments = null;
    docsError = null;
  }

  function closePropertiesModal() {
    isPropertiesModalOpen = false;
    brokerProperties = [];
    propertiesError = null;
    propertiesModalTitle = '';
  }

  onMount(() => {
    fetchBrokers();
  });

  function handleExportClients() {
    const dataToExport = brokers.map((broker) => ({
      id: broker.id,
      nome: broker.name,
      email: broker.email,
      telefone: broker.phone ?? '',
      creci: broker.creci ?? '',
    }));

    exportToCsv(dataToExport, 'corretores_aprovados.csv');
  }
</script>

<section class="space-y-6">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Corretores</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Consulte os corretores cadastrados, aprove ou rejeite solicitações e visualize os documentos enviados.
      </p>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        class="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
        on:click={fetchBrokers}
        disabled={isLoading}
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M4 20v-5h.581m15.357-2A8.003 8.003 0 014.582 15" />
        </svg>
        Recarregar lista
      </button>
      <button
        class="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        on:click={handleExportClients}
      >
        Exportar Corretores (CSV)
      </button>
    </div>
  </header>

  {#if feedback}
    <div
      class="rounded-md px-4 py-3 text-sm font-medium text-white shadow-sm {feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'}"
    >
      {feedback.text}
    </div>
  {/if}

  {#if error}
    <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
      {error}
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      Carregando corretores...
    </div>
  {:else if brokers.length === 0}
    <div class="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
      <svg class="mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16h8m-4-4h4m-5-8a3 3 0 016 0v12a5 5 0 01-5 5H7a5 5 0 01-5-5V7a3 3 0 016 0" />
      </svg>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Nenhum corretor encontrado</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Novos corretores aparecerão aqui assim que forem cadastrados.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900/60">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Corretor</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Telefone</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">CRECI</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Imobiliária</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Qtd. Imóveis</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Criado em</th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          {#each brokers as broker}
            <tr class="hover:bg-gray-50 transition-colors dark:hover:bg-gray-900/50">
              <td class="px-6 py-4">
                <div class="font-semibold text-gray-900 dark:text-white">{broker.name}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">{broker.email}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{broker.phone ?? '—'}</td>
              <td class="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{broker.creci}</td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {#if broker.agency?.name}
                  <div class="font-medium text-gray-800 dark:text-gray-100">{broker.agency.name}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {#if broker.agency.city}{broker.agency.city}{/if}
                    {#if broker.agency.state}
                      {#if broker.agency.city}, {/if}{broker.agency.state}
                    {/if}
                  </div>
                  {#if broker.agency.phone}
                    <div class="text-xs text-gray-500 dark:text-gray-400">{broker.agency.phone}</div>
                  {/if}
                {:else}
                  <span class="text-gray-400">—</span>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{broker.property_count ?? 0}</td>
              <td class="px-6 py-4">
                <span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(broker.status)}`}>
                  {formatStatus(broker.status)}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {broker.created_at ? formatDate(broker.created_at) : '—'}
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col items-end gap-2 sm:flex-row">
                  <button
                    class="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
                    on:click={() => updateBrokerStatus(broker, 'approve')}
                    disabled={actionBrokerId === broker.id}
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Aprovar
                  </button>
                  <button
                    class="inline-flex items-center justify-center gap-2 rounded-md border border-red-500 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-900/40"
                    on:click={() => updateBrokerStatus(broker, 'reject')}
                    disabled={actionBrokerId === broker.id}
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rejeitar
                  </button>
                  <button
                    class="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500"
                    on:click={() => openDocumentModal(broker)}
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c1.38 0 2.5-1.12 2.5-2.5S13.38 3 12 3s-2.5 1.12-2.5 2.5S10.62 8 12 8zm0 0c2.21 0 4 1.79 4 4v1a2 2 0 002 2v3h-12v-3a2 2 0 002-2v-1c0-2.21 1.79-4 4-4z" />
                    </svg>
                    Ver documentos
                  </button>
                  <button
                    class="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                    on:click={() => openPropertiesModal(broker)}
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9-4 9 4-9 4-9-4zm9 10l-9-4v-6l9 4 9-4v6l-9 4z" />
                    </svg>
                    Ver imóveis
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

{#if isDocumentsModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
    role="dialog"
    aria-modal="true"
  >
    <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Documentos do corretor {selectedBroker?.name}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Visualize os arquivos enviados para validação.
          </p>
        </div>
        <button
          class="rounded-md bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          on:click={closeDocumentsModal}
          aria-label="Fechar modal de documentos"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {#if docsError}
        <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
          {docsError}
        </div>
      {:else if !selectedDocuments}
        <div class="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nenhum documento disponível para este corretor.
        </div>
      {:else}
        <div class="grid gap-6 md:grid-cols-3">
          {#each DOCUMENT_TILES as doc}
            {@const docValue = selectedDocuments?.[doc.key] ?? null}
            <div class="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">{doc.label}</div>
              {#if docValue}
                <a
                  class="block overflow-hidden rounded-md border border-gray-200 transition-transform hover:scale-[1.02] dark:border-gray-700"
                  href={docValue ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={docValue ?? ''}
                    alt={`Documento - ${doc.label}`}
                    class="h-48 w-full object-cover"
                    loading="lazy"
                  />
                </a>
              {:else}
                <div class="flex h-48 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  Documento não disponível
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if isPropertiesModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
    role="dialog"
    aria-modal="true"
  >
    <div class="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Imóveis do corretor {propertiesModalTitle}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Lista dos imóveis associados a este corretor.
          </p>
        </div>
        <button
          class="rounded-md bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          on:click={closePropertiesModal}
          aria-label="Fechar modal de imóveis"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {#if propertiesLoading}
        <div class="flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Carregando imóveis...
        </div>
      {:else if propertiesError}
        <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
          {propertiesError}
        </div>
      {:else if brokerProperties.length === 0}
        <div class="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Este corretor ainda não possui imóveis cadastrados.
        </div>
      {:else}
        <ul class="space-y-4">
          {#each brokerProperties as property}
            <li class="rounded-lg border border-gray-200 p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-700/60">
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{property.title ?? `Imóvel #${property.id}`}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {property.city ?? '—'}{#if property.state} / {property.state}{/if}
                  </p>
                </div>
                <div class="flex items-center gap-3 text-sm">
                  <span class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${propertyStatusBadge(property.status ?? null)}`}>
                    {formatPropertyStatus(property.status ?? null)}
                  </span>
                  <span class="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(property.price)}</span>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}
