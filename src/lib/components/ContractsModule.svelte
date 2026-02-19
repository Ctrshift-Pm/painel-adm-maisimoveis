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
    type?: string | null;
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
    commissionData?: Record<string, unknown> | null;
    documents?: ContractDocument[];
    createdAt?: string | null;
    updatedAt?: string | null;
  };

  type ModalMode = 'review_docs' | 'upload_draft' | 'finalize' | 'view';

  const tabs: { key: ContractStatus; label: string }[] = [
    { key: 'AWAITING_DOCS', label: 'Aguardando Documentação' },
    { key: 'IN_DRAFT', label: 'Em Confecção' },
    { key: 'AWAITING_SIGNATURES', label: 'Aguardando Assinaturas' },
    { key: 'FINALIZED', label: 'Finalizados' },
  ];

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

  const signedReviewDocTypes = new Set([
    'contrato_assinado',
    'comprovante_pagamento',
    'boleto_vistoria',
  ]);

  let activeTab: ContractStatus = 'AWAITING_DOCS';
  let items: ContractItem[] = [];
  let selected: ContractItem | null = null;
  let showModal = false;
  let modalMode: ModalMode = 'review_docs';
  let isLoading = true;
  let hasMounted = false;
  let refreshKey = 0;
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let totalPages = 1;
  let transitioning = false;
  let downloadingDocumentId: number | null = null;
  let selectedDraftFile: File | null = null;
  let uploadingDraft = false;
  let finalizingContract = false;
  let finalizeForm = {
    valorVenda: '',
    comissaoCaptador: '',
    comissaoVendedor: '',
    taxaPlataforma: '',
  };

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

  function tableActionLabel(status: ContractStatus): string {
    if (status === 'AWAITING_DOCS') return 'Analisar Documentação';
    if (status === 'IN_DRAFT') return 'Anexar Minuta';
    if (status === 'AWAITING_SIGNATURES') return 'Finalizar Venda/Locação';
    return 'Visualizar';
  }

  function statusLabel(status: ContractStatus): string {
    return tabs.find((tab) => tab.key === status)?.label ?? status;
  }

  function readCommissionValue(
    source: Record<string, unknown> | null | undefined,
    key: string
  ): string {
    if (!source) return '';
    const value = source[key];
    if (value == null) return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '';
    return parsed.toFixed(2);
  }

  function hydrateFinalizeForm(contract: ContractItem | null): void {
    const data = contract?.commissionData ?? null;
    finalizeForm = {
      valorVenda: readCommissionValue(data, 'valorVenda'),
      comissaoCaptador: readCommissionValue(data, 'comissaoCaptador'),
      comissaoVendedor: readCommissionValue(data, 'comissaoVendedor'),
      taxaPlataforma: readCommissionValue(data, 'taxaPlataforma'),
    };
  }

  function parseMoney(value: string): number | null {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Number(parsed.toFixed(2));
  }

  function getDocumentsForFinalize(contract: ContractItem): ContractDocument[] {
    return (contract.documents ?? []).filter((doc) =>
      signedReviewDocTypes.has((doc.documentType ?? '').trim().toLowerCase())
    );
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
    closeModal(true);
    refresh(true);
  }

  function resolveModalMode(item: ContractItem): ModalMode {
    if (item.status === 'AWAITING_DOCS') return 'review_docs';
    if (item.status === 'IN_DRAFT') return 'upload_draft';
    if (item.status === 'AWAITING_SIGNATURES') return 'finalize';
    return 'view';
  }

  function openModal(item: ContractItem) {
    selected = item;
    modalMode = resolveModalMode(item);
    showModal = true;
    selectedDraftFile = null;
    uploadingDraft = false;
    finalizingContract = false;
    transitioning = false;
    hydrateFinalizeForm(item);
  }

  function closeModal(force = false) {
    if (!force && (transitioning || uploadingDraft || finalizingContract)) {
      return;
    }
    showModal = false;
    selected = null;
    selectedDraftFile = null;
    modalMode = 'review_docs';
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

  function handleDraftFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;
    selectedDraftFile = file;
  }

  async function submitDraft() {
    if (!selected) return;
    if (!selectedDraftFile) {
      toast.error('Selecione um PDF da minuta para continuar.');
      return;
    }

    uploadingDraft = true;
    try {
      const form = new FormData();
      form.append('file', selectedDraftFile);
      await apiClient.post(`/admin/contracts/${selected.id}/draft`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Minuta anexada e contrato avançado para assinaturas.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao anexar minuta:', error);
      toast.error('Não foi possível anexar a minuta.');
    } finally {
      uploadingDraft = false;
    }
  }

  async function submitFinalize() {
    if (!selected) return;

    const valorVenda = parseMoney(finalizeForm.valorVenda);
    const comissaoCaptador = parseMoney(finalizeForm.comissaoCaptador);
    const comissaoVendedor = parseMoney(finalizeForm.comissaoVendedor);
    const taxaPlataforma = parseMoney(finalizeForm.taxaPlataforma);

    if (
      valorVenda == null ||
      comissaoCaptador == null ||
      comissaoVendedor == null ||
      taxaPlataforma == null
    ) {
      toast.error('Preencha todos os campos de comissão com valores válidos.');
      return;
    }

    finalizingContract = true;
    try {
      await api.post(`/admin/contracts/${selected.id}/finalize`, {
        commission_data: {
          valorVenda,
          comissaoCaptador,
          comissaoVendedor,
          taxaPlataforma,
        },
      });
      toast.success('Contrato finalizado com sucesso.');
      closeModal(true);
      refresh();
    } catch (error) {
      console.error('Erro ao finalizar contrato:', error);
      toast.error('Não foi possível finalizar o contrato.');
    } finally {
      finalizingContract = false;
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
      Gerencie o pipeline completo de contratos.
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
            Data
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
                {formatDate(item.updatedAt ?? item.createdAt)}
              </td>
              <td class="px-6 py-4 text-right">
                <Button size="sm" variant="outline" on:click={() => openModal(item)}>
                  {tableActionLabel(item.status)}
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
          {modalMode === 'review_docs'
            ? 'Análise de Documentação'
            : modalMode === 'upload_draft'
            ? 'Anexar Minuta'
            : modalMode === 'finalize'
            ? 'Finalizar Venda/Locação'
            : 'Contrato Finalizado'}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {selected.propertyCode ? selected.propertyCode : `#${selected.propertyId}`}
          {#if selected.propertyTitle}
            {' - '}{selected.propertyTitle}
          {/if}
        </p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Etapa: {statusLabel(selected.status)}
        </p>
      </div>

      {#if modalMode === 'review_docs'}
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
            Aprovar Documentos (Avançar)
          </Button>
        </div>
      {:else if modalMode === 'upload_draft'}
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Faça o upload do PDF da minuta (<code>contrato_minuta</code>). Ao enviar, o contrato será movido automaticamente para
            <span class="font-semibold"> Aguardando Assinaturas</span>.
          </p>

          <div class="rounded-md border border-dashed border-gray-300 p-4 dark:border-gray-700">
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200" for="draft-pdf">
              PDF da minuta
            </label>
            <input
              id="draft-pdf"
              type="file"
              accept="application/pdf,.pdf"
              on:change={handleDraftFileChange}
              class="block w-full text-sm text-gray-700 dark:text-gray-200"
            />
            {#if selectedDraftFile}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Selecionado: {selectedDraftFile.name}
              </p>
            {/if}
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" on:click={() => closeModal()} disabled={uploadingDraft}>
              Fechar
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              on:click={submitDraft}
              disabled={uploadingDraft || !selectedDraftFile}
            >
              {#if uploadingDraft}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Anexar Minuta
            </Button>
          </div>
        </div>
      {:else if modalMode === 'finalize'}
        <div class="space-y-4">
          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Documentos para conferência
            </p>
            {#if getDocumentsForFinalize(selected).length === 0}
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Nenhum contrato assinado/comprovante anexado.
              </p>
            {:else}
              <div class="mt-2 space-y-2">
                {#each getDocumentsForFinalize(selected) as doc (doc.id)}
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

          <div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Formulário de Comissões
            </p>
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Valor de Venda/Locação (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.valorVenda}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Comissão Captador (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.comissaoCaptador}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Comissão Vendedor (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.comissaoVendedor}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label class="text-sm text-gray-700 dark:text-gray-200">
                Taxa Encontre Aqui (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  bind:value={finalizeForm.taxaPlataforma}
                  class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" on:click={() => closeModal()} disabled={finalizingContract}>
              Fechar
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              on:click={submitFinalize}
              disabled={finalizingContract}
            >
              {#if finalizingContract}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Finalizar Venda/Locação
            </Button>
          </div>
        </div>
      {:else}
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Este contrato já está finalizado e está disponível apenas para consulta.
          </p>

          <div class="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
            <p><span class="font-semibold">Status:</span> {statusLabel(selected.status)}</p>
            <p><span class="font-semibold">Atualizado em:</span> {formatDate(selected.updatedAt ?? selected.createdAt)}</p>
            <p><span class="font-semibold">Valor:</span> {readCommissionValue(selected.commissionData ?? null, 'valorVenda') || '-'}</p>
          </div>

          <div class="flex justify-end">
            <Button variant="outline" on:click={() => closeModal()}>Fechar</Button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
