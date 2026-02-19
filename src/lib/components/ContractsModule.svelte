<script lang="ts">
  import { onMount } from 'svelte';
  import { Loader2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import Pagination from '$lib/Pagination.svelte';

  type ContractStatus =
    | 'AWAITING_DOCS'
    | 'IN_DRAFT'
    | 'AWAITING_SIGNATURES'
    | 'FINALIZED';

  type ContractDocument = {
    id: number;
    documentType?: string | null;
    downloadUrl?: string | null;
    createdAt?: string | null;
  };

  type ContractItem = {
    id: string;
    status: ContractStatus;
    negotiationId: string;
    propertyId: number;
    propertyCode?: string | null;
    propertyTitle?: string | null;
    capturingBrokerName?: string | null;
    sellingBrokerName?: string | null;
    sellerInfo?: Record<string, unknown> | null;
    buyerInfo?: Record<string, unknown> | null;
    documents?: ContractDocument[];
    createdAt?: string | null;
  };

  const tabs: { key: ContractStatus; label: string }[] = [
    { key: 'AWAITING_DOCS', label: 'Aguardando Documentação' },
    { key: 'IN_DRAFT', label: 'Em Confecção' },
    { key: 'AWAITING_SIGNATURES', label: 'Aguardando Assinaturas' },
    { key: 'FINALIZED', label: 'Finalizados' },
  ];

  const firstStatus: ContractStatus = 'AWAITING_DOCS';
  const lastStatus: ContractStatus = 'FINALIZED';
  const statusFlow: ContractStatus[] = tabs.map((tab) => tab.key);

  const documentTypeLabels: Record<string, string> = {
    doc_identidade: 'Documento de Identidade',
    comprovante_endereco: 'Comprovante de Endereço',
    certidao_casamento_nascimento: 'Certidão de Casamento/Nascimento',
    certidao_inteiro_teor: 'Certidão de Inteiro Teor',
    certidao_onus_acoes: 'Certidão de Ônus/Ações',
    comprovante_renda: 'Comprovante de Renda',
    contrato_minuta: 'Contrato (Minuta)',
    contrato_assinado: 'Contrato Assinado',
    comprovante_pagamento: 'Comprovante de Pagamento',
    boleto_vistoria: 'Boleto de Vistoria',
  };

  let activeTab: ContractStatus = 'AWAITING_DOCS';
  let items: ContractItem[] = [];
  let selected: ContractItem | null = null;
  let showModal = false;
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let transitioning = false;
  let downloadingDocumentId: number | null = null;

  function getRecordValue(
    source: Record<string, unknown> | null | undefined,
    keys: string[]
  ): string {
    if (!source) return '-';
    for (const key of keys) {
      const value = source[key];
      if (value != null && String(value).trim().length > 0) {
        return String(value).trim();
      }
    }
    return '-';
  }

  function formatDate(value?: string | null): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  }

  function documentLabel(type?: string | null): string {
    if (!type) return 'Documento';
    return documentTypeLabels[type] ?? type;
  }

  function actionLabel(status: ContractStatus): string {
    return status === 'AWAITING_DOCS' ? 'Analisar Documentação' : 'Gerenciar Etapa';
  }

  async function fetchContracts() {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        status: activeTab,
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      const response = await api.get<{ data?: ContractItem[]; total?: number }>(
        `/admin/contracts?${params.toString()}`
      );

      const data = Array.isArray(response?.data) ? response.data : [];
      items = data;
      totalItems = Number(response?.total ?? data.length);
      totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast.error('Não foi possível carregar os contratos.');
      items = [];
      totalItems = 0;
      totalPages = 1;
    } finally {
      isLoading = false;
    }
  }

  function refresh(resetPage = false) {
    if (resetPage) currentPage = 1;
    refreshKey += 1;
  }

  function changeTab(status: ContractStatus) {
    if (activeTab === status) return;
    activeTab = status;
    selected = null;
    showModal = false;
    refresh(true);
  }

  function openModal(item: ContractItem) {
    selected = item;
    showModal = true;
  }

  function closeModal(force = false) {
    if (transitioning && !force) return;
    showModal = false;
    selected = null;
  }

  function selectedIndex(): number {
    if (!selected) return -1;
    return statusFlow.indexOf(selected.status);
  }

  function canGoPrevious(): boolean {
    return selectedIndex() > 0;
  }

  function canGoNext(): boolean {
    const index = selectedIndex();
    return index >= 0 && index < statusFlow.length - 1;
  }

  async function transition(direction: 'next' | 'previous') {
    if (!selected) return;

    if (direction === 'next' && !canGoNext()) return;
    if (direction === 'previous' && !canGoPrevious()) return;

    transitioning = true;
    try {
      await api.put(`/admin/contracts/${selected.id}/transition`, { direction });
      toast.success(
        direction === 'next'
          ? 'Contrato avançado para a próxima etapa.'
          : 'Contrato retornado para a etapa anterior.'
      );
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao transicionar contrato:', error);
      toast.error('Não foi possível atualizar a etapa do contrato.');
    } finally {
      transitioning = false;
    }
  }

  async function viewDocument(document: ContractDocument, contract: ContractItem) {
    if (!document.downloadUrl) {
      toast.error('Documento sem URL de download.');
      return;
    }

    downloadingDocumentId = document.id;
    try {
      const response = await apiClient.get(document.downloadUrl, {
        responseType: 'blob',
      });
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/octet-stream' });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error('Erro ao baixar documento do contrato:', error);
      toast.error(
        `Não foi possível abrir o documento do contrato ${contract.propertyCode ?? contract.propertyId}.`
      );
    } finally {
      downloadingDocumentId = null;
    }
  }

  onMount(() => {
    hasMounted = true;
    refresh(true);
  });

  $: if (hasMounted) {
    activeTab;
    currentPage;
    itemsPerPage;
    refreshKey;
    fetchContracts();
  }
</script>

<div class="space-y-4">
  <div>
    <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Contratos</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Acompanhe a esteira de contratos e avance/retorne etapas conforme a documentação.
    </p>
  </div>

  <div class="flex flex-wrap gap-2">
    {#each tabs as tab}
      <button
        type="button"
        on:click={() => changeTab(tab.key)}
        class={`rounded-full px-4 py-2 text-sm font-medium transition ${
          activeTab === tab.key
            ? 'bg-emerald-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        }`}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-sm text-gray-600 dark:text-gray-300">
      {tabs.find((tab) => tab.key === activeTab)?.label}
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <label for="contracts-items-per-page" class="font-medium">Mostrar</label>
      <select
        id="contracts-items-per-page"
        bind:value={itemsPerPage}
        on:change={() => refresh(true)}
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      <span>entradas</span>
    </div>
    <Button variant="outline" on:click={() => refresh()} disabled={isLoading}>
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
            Código Imóvel
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Captador
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Vendedor
          </th>
          <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data Criação
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
              Carregando contratos...
            </td>
          </tr>
        {:else if items.length === 0}
          <tr>
            <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum contrato encontrado nesta etapa.
            </td>
          </tr>
        {:else}
          {#each items as item (item.id)}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                <div class="font-semibold">
                  {item.propertyCode ? item.propertyCode : `#${item.propertyId}`}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {item.propertyTitle ?? '-'}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.capturingBrokerName ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {item.sellingBrokerName ?? '-'}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(item.createdAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button size="sm" variant="outline" on:click={() => openModal(item)}>
                  {actionLabel(item.status)}
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
    <div class="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Análise de Contrato
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {selected.propertyCode ? selected.propertyCode : `#${selected.propertyId}`}
          {#if selected.propertyTitle}
            {' - '}{selected.propertyTitle}
          {/if}
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Dados do Captador
          </p>
          <div class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
            <p><span class="font-semibold">Estado Civil:</span> {getRecordValue(selected.sellerInfo, ['estado_civil', 'estadoCivil'])}</p>
            <p><span class="font-semibold">Profissão:</span> {getRecordValue(selected.sellerInfo, ['profissao'])}</p>
            <p><span class="font-semibold">E-mail:</span> {getRecordValue(selected.sellerInfo, ['email'])}</p>
            <p><span class="font-semibold">Telefone:</span> {getRecordValue(selected.sellerInfo, ['telefone', 'phone'])}</p>
            <p><span class="font-semibold">Banco:</span> {getRecordValue(selected.sellerInfo, ['dados_bancarios', 'dadosBancarios'])}</p>
          </div>
        </div>
        <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Dados do Cliente
          </p>
          <div class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
            <p><span class="font-semibold">Estado Civil:</span> {getRecordValue(selected.buyerInfo, ['estado_civil', 'estadoCivil'])}</p>
            <p><span class="font-semibold">Profissão:</span> {getRecordValue(selected.buyerInfo, ['profissao'])}</p>
            <p><span class="font-semibold">E-mail:</span> {getRecordValue(selected.buyerInfo, ['email'])}</p>
            <p><span class="font-semibold">Telefone:</span> {getRecordValue(selected.buyerInfo, ['telefone', 'phone'])}</p>
            <p><span class="font-semibold">Garantia:</span> {getRecordValue(selected.buyerInfo, ['garantia_locacao', 'garantiaLocacao'])}</p>
          </div>
        </div>
      </div>

      <div class="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
        <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Documentos Anexados
        </p>
        {#if (selected.documents ?? []).length === 0}
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Nenhum documento anexado até o momento.
          </p>
        {:else}
          <div class="mt-2 space-y-2">
            {#each selected.documents ?? [] as doc (doc.id)}
              <div class="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                <div>
                  <p class="font-medium text-gray-900 dark:text-gray-100">{documentLabel(doc.documentType)}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{formatDate(doc.createdAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  on:click={() => selected && viewDocument(doc, selected)}
                  disabled={downloadingDocumentId === doc.id}
                >
                  {#if downloadingDocumentId === doc.id}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Baixar/Visualizar
                </Button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          on:click={() => transition('previous')}
          disabled={!canGoPrevious() || transitioning}
        >
          {#if transitioning}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Voltar Etapa
        </Button>
        <Button
          variant="outline"
          className="bg-green-600 text-white hover:bg-green-700"
          on:click={() => transition('next')}
          disabled={!canGoNext() || transitioning}
        >
          {#if transitioning}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          {selected.status === 'AWAITING_DOCS' ? 'Aprovar Documentos (Avançar)' : 'Avançar Etapa'}
        </Button>
      </div>
    </div>
  </div>
{/if}
