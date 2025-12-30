<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import { Input } from '$lib/components/ui/input';
  import { baseURL } from './api';
  import { authToken } from './store';
  import type { PropertyStatus, PropertyImage as PropertyImageType } from './types';

  interface PropertySummary {
    id: number;
    title: string;
    city?: string | null;
    state?: string | null;
    price?: number | null;
    status: PropertyStatus;
    broker_name?: string | null;
  }

  type NormalizedImage = PropertyImageType;

  type PropertyDetails = PropertySummary & {
    description?: string | null;
    purpose?: string | null;
    address?: string | null;
    quadra?: string | null;
    lote?: string | null;
    numero?: string | null;
    bairro?: string | null;
    complemento?: string | null;
    tipo_lote?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    area_construida?: number | null;
    area_terreno?: number | null;
    broker_phone?: string | null;
    valor_condominio?: number | null;
    valor_iptu?: number | null;
    video_url?: string | null;
    has_wifi?: boolean | null;
    tem_piscina?: boolean | null;
    tem_energia_solar?: boolean | null;
    tem_automacao?: boolean | null;
    tem_ar_condicionado?: boolean | null;
    eh_mobiliada?: boolean | null;
    images?: Array<NormalizedImage | PropertyImageType | string> | null;
  };

  type SortConfig = {
    key: string;
    order: 'asc' | 'desc';
  };

  type PropertyFilters = {
    status: PropertyStatus | 'all';
    city: string;
    search: string;
  };

  export let initialStatus: PropertyStatus | 'all' = 'approved';
  export let allowApproval = false;

    let properties: PropertySummary[] = [];
  let isLoading = false;
  let error: string | null = null;
  let cities: string[] = [];
  let filters: PropertyFilters = {
    status: initialStatus,
    city: 'all',
    search: '',
  };
  let sortConfig: SortConfig = { key: 'p.created_at', order: 'desc' };
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isModalOpen = false;
  let selectedProperty: PropertyDetails | null = null;
  let isDetailLoading = false;
  let isProcessing = false;
  let isEditMode = false;
  let editableProperty: PropertyDetails | null = null;
  let isSavingEdit = false;
  let editError: string | null = null;
  let imageUploading = false;
  let imageUploadError: string | null = null;
  let imageDeleteError: string | null = null;
  let videoDeleting = false;
  let videoDeleteError: string | null = null;
  let videoInputEl: HTMLInputElement | null = null;

  onMount(() => {
    fetchProperties();
    fetchCities();
  });

  async function fetchProperties() {
    isLoading = true;
    error = null;

    const token = get(authToken);
    if (!token) {
      error = 'Sessao expirada. Faca login novamente.';
      authToken.set(null);
      isLoading = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.city !== 'all') {
        params.append('city', filters.city);
      }
      params.append('sortBy', sortConfig.key);
      params.append('sortOrder', sortConfig.order);
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }

      const query = params.toString();
      const response = await api.get<{ data: Array<Record<string, unknown>> }>(
        `/admin/properties-with-brokers${query ? `?${query}` : ''}`
      );

      const raw = (response?.data ?? response ?? []) as Array<Record<string, unknown>>;

      properties = raw
        .map((item) => {
          const record = item as Record<string, unknown>;
          const idValue = record['id'];
          const id = idValue != null ? Number(idValue) : NaN;
          if (!Number.isFinite(id)) return null;

          const priceValue = record['price'];

          return {
            id,
            title: String(record['title'] ?? 'Imovel sem titulo'),
            city: (record['city'] as string | null | undefined) ?? null,
            state: (record['state'] as string | null | undefined) ?? null,
            price: priceValue != null ? Number(priceValue) : null,
            status: (record['status'] as PropertyStatus) ?? 'pending_approval',
            broker_name: (record['broker_name'] as string | null | undefined) ?? null,
          } as PropertySummary;
        })
        .filter((item): item is PropertySummary => item !== null);
    } catch (err) {
      console.error('Erro ao carregar imóveis:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessao expirou. Por favor, faca login novamente.');
        error = 'Sessao expirada. Faca login novamente.';
        authToken.set(null);
      } else {
        error = err instanceof Error ? err.message : 'Erro inesperado ao carregar imóveis.';
      }
      properties = [];
    } finally {
      isLoading = false;
    }
  }

  async function fetchCities() {
    try {
      const response = await fetch(`${baseURL}/properties/cities`);
      if (!response.ok) {
        const errorMsg = await response.text();
        toast.error('Erro ao buscar cidades.', {
          description: errorMsg || 'A solicitação retornou erro.',
        });
        cities = [];
        return;
      }

      const payload = await response.json();
      const list = Array.isArray(payload) ? payload : payload?.data;
      cities = Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
      toast.error('Erro ao buscar cidades.', {
        description: err instanceof Error ? err.message : 'Falha inesperada.',
      });
      cities = [];
    }
  }

  function formatCurrency(value?: number | null): string {
    if (value == null || Number.isNaN(value)) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function normalizeImageUrl(rawUrl: unknown): string | null {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) return null;
    const cleaned = rawUrl.trim();
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    // fallback: assume relative path from API
    return `${baseURL.replace(/\/+$/, '')}/${cleaned.replace(/^\/+/, '')}`;
  }

  function parseDelimitedImages(raw: string): NormalizedImage[] {
    const tokens = raw.split(/;|,/).map((t) => t.trim()).filter(Boolean);
    return tokens
      .map((token, idx) => {
        const [maybeId, maybeUrl] = token.split('|');
        const urlPart = maybeUrl ? maybeUrl : maybeId;
        const parsedUrl = normalizeImageUrl(urlPart);
        if (!parsedUrl) return null;
        const parsedId = maybeUrl ? Number(maybeId) : idx;
        return { id: Number.isFinite(parsedId) ? parsedId : idx, url: parsedUrl };
      })
      .filter((img): img is NormalizedImage => Boolean(img));
  }

  function normalizeImages(
    images?: Array<NormalizedImage | PropertyImageType | Record<string, unknown> | string> | string | null
  ): NormalizedImage[] {
    if (!images) return [];

    // Backend pode enviar string delimitada por ";" ou "," contendo id|url
    if (typeof images === 'string') {
      return parseDelimitedImages(images);
    }

    const list = Array.isArray(images) ? images : [images];

    return list
      .flatMap<NormalizedImage | null>((image, index) => {
        if (typeof image === 'string') {
          // Se a string tiver vários itens, faça split
          if (image.includes('|') || image.includes(';') || image.includes(',')) {
            return parseDelimitedImages(image);
          }
          const url = normalizeImageUrl(image);
          if (!url) return null;
          return [{ id: index, url }];
        }
        if (image && typeof image === 'object') {
          const anyImg = image as Record<string, unknown>;
          const candidateUrl =
            normalizeImageUrl((anyImg.url as string | undefined) ?? null) ||
            normalizeImageUrl((anyImg.image_url as string | undefined) ?? null);
          if (!candidateUrl) return null;
          const fallbackId = Number.isFinite(Number(index)) ? index : 0;
          const rawId = (anyImg.id as number | undefined) ?? fallbackId;
          const parsedId = Number(rawId);
          return [{
            id: Number.isFinite(parsedId) ? parsedId : index,
            url: candidateUrl,
          }];
        }
        return null;
      })
      .filter((img): img is NormalizedImage => Boolean(img));
  }

  function selectedPropertyImages() {
    return normalizeImages(selectedProperty?.images ?? null);
  }

  function humanizeStatus(status: PropertyStatus): string {
    const map: Record<string, string> = {
      approved: 'Disponível',
      rented: 'Alugado',
      sold: 'Vendido',
    };
    return map[status] ?? status ?? 'Indefinido';
  }

  function statusBadgeClasses(status: PropertyStatus): string {
    const classes: Record<string, string> = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rented: 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
      sold: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };

    return classes[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  const booleanKeys = [
    'has_wifi',
    'tem_piscina',
    'tem_energia_solar',
    'tem_automacao',
    'tem_ar_condicionado',
    'eh_mobiliada'
  ] as const;

  function sanitizeEditable(data: Partial<PropertyDetails>): PropertyDetails {
    const coerced: Record<string, unknown> = { ...data };
    for (const key of booleanKeys) {
      coerced[key] = Boolean((data as any)?.[key]);
    }
    return coerced as unknown as PropertyDetails;
  }

  async function reviewProperty(property: PropertySummary, event?: Event) {
    event?.stopPropagation?.();
    if (isDetailLoading && selectedProperty?.id === property.id) {
      return;
    }

    isDetailLoading = true;
    selectedProperty = property;
    editableProperty = sanitizeEditable({ ...property } as PropertyDetails);

    try {
      const details = await api.get<PropertyDetails>(`/admin/properties/${property.id}`);
      const merged = { ...property, ...details } as PropertyDetails;
      selectedProperty = merged;
      editableProperty = sanitizeEditable(merged);
      isModalOpen = true;
    } catch (err) {
      console.error('Falha ao buscar detalhes do imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessao expirou. Por favor, faca login novamente.');
        authToken.set(null);
      } else {
        toast.error('Nao foi possivel carregar os detalhes do imovel.');
      }
    } finally {
      isDetailLoading = false;
    }
  }

  function closeModal() {
    if (isProcessing) return;
    isModalOpen = false;
    selectedProperty = null;
    editableProperty = null;
    isEditMode = false;
    editError = null;
  }

  async function handleStatusUpdate(newStatus: 'approved' | 'rejected') {
    if (!selectedProperty) {
      toast.error('Erro de estado: o imovel selecionado esta nulo. Tente fechar e reabrir o modal.');
      return;
    }
    if (newStatus === 'rejected') {
      const confirmed = window.confirm('Tem certeza que deseja rejeitar este imovel?');
      if (!confirmed) return;
    }
    isProcessing = true;
    try {
      await api.patch(`/admin/properties/${selectedProperty.id}/status`, { status: newStatus });
      await api.post('/admin/notifications/send', {
        message: `Status do imovel #${selectedProperty.id} alterado para ${newStatus}.`,
        related_entity_type: 'property',
        related_entity_id: selectedProperty.id,
        recipientId: null,
      });

      toast.success(`Imovel ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}!`);
      isModalOpen = false;
      selectedProperty = null;
      await fetchProperties();
    } catch (err) {
      console.error('Falha ao atualizar status do imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessao expirou. Por favor, faca login novamente.');
        authToken.set(null);
      } else {
        toast.error('Falha ao atualizar o status.');
      }
    } finally {
      isProcessing = false;
    }
  }

  function handleSort(column: string) {
    if (sortConfig.key === column) {
      sortConfig = {
        ...sortConfig,
        order: sortConfig.order === 'asc' ? 'desc' : 'asc',
      };
    } else {
      sortConfig = { key: column, order: 'desc' };
    }
    fetchProperties();
  }

  function sortAlphabetical() {
    sortConfig = { key: 'p.title', order: 'asc' };
    fetchProperties();
  }

  function sortByCreatedDesc() {
    sortConfig = { key: 'p.created_at', order: 'desc' };
    fetchProperties();
  }

  function getSortIndicator(column: string) {
    if (sortConfig.key !== column) {
      return '';
    }
    return sortConfig.order === 'asc' ? '▲' : '▼';
  }

  function handleRefresh() {
    fetchProperties();
  }

  function handleKeydown(event: KeyboardEvent | CustomEvent<KeyboardEvent>) {
    const key = event instanceof CustomEvent ? event.detail?.key : event.key;
    if (key === 'Enter') {
      fetchProperties();
    }
  }

  function handleKeyup(event: KeyboardEvent | CustomEvent<KeyboardEvent>) {
    const key = event instanceof CustomEvent ? event.detail?.key : event.key;
    const target = event instanceof CustomEvent ? (event.detail as any)?.target : (event.target as HTMLInputElement | undefined);
    if (key === 'Enter') {
      fetchProperties();
    } else if (target && target.value.trim() === '') {
      fetchProperties();
    }
  }

  function onFilterChange() {
    fetchProperties();
  }

  function handleExport() {
    exportToCsv(properties, `imoveis_${new Date().toISOString().split('T')[0]}.csv`);
  }

  async function saveEdits() {
    if (!selectedProperty || !editableProperty) return;

    isSavingEdit = true;
    editError = null;

    try {
      const numericKeys = new Set([
        'price',
        'area_construida',
        'area_terreno',
        'valor_condominio',
        'valor_iptu',
        'bedrooms',
        'bathrooms',
        'garage_spots',
        'sale_value',
        'commission_rate',
        'commission_value',
      ]);

      const normalizeValue = (key: string, value: unknown) => {
        if (value === undefined) return undefined;
        if (value === '' || value === null) return null;
        if (key === 'description' && (value === null || value === undefined)) {
          return '';
        }
        if (booleanKeys.includes(key as any)) {
          return Boolean(value) ? 1 : 0;
        }
        if (numericKeys.has(key)) {
          const num = Number(value);
          return Number.isFinite(num) ? num : null;
        }
        return value;
      };

      const basePayload = {
        title: editableProperty.title,
        description: editableProperty.description,
        purpose: editableProperty.purpose,
        price: editableProperty.price,
        address: editableProperty.address,
        city: editableProperty.city,
        state: editableProperty.state,
        bairro: editableProperty.bairro,
        numero: editableProperty.numero,
        complemento: editableProperty.complemento,
        quadra: editableProperty.quadra,
        lote: editableProperty.lote,
        tipo_lote: editableProperty.tipo_lote,
        bedrooms: editableProperty.bedrooms,
        bathrooms: editableProperty.bathrooms,
        area_construida: editableProperty.area_construida,
        area_terreno: editableProperty.area_terreno,
        valor_condominio: editableProperty.valor_condominio,
        valor_iptu: editableProperty.valor_iptu,
        has_wifi: editableProperty.has_wifi,
        tem_piscina: editableProperty.tem_piscina,
        tem_energia_solar: editableProperty.tem_energia_solar,
        tem_automacao: editableProperty.tem_automacao,
        tem_ar_condicionado: editableProperty.tem_ar_condicionado,
        eh_mobiliada: editableProperty.eh_mobiliada,
        video_url: editableProperty.video_url,
        status: editableProperty.status ?? selectedProperty.status,
      };

      // Enviar todos os campos normalizados (inclusive booleans) para garantir persistência
      const payload = Object.fromEntries(
        Object.entries(basePayload)
          .map(([key, value]) => [key, normalizeValue(key, value)])
          .filter(([, value]) => value !== undefined)
      );

      // Validação específica para vendido
      if ((payload as any).status === 'sold') {
        const cond = (payload as any).valor_condominio ?? selectedProperty.valor_condominio;
        const iptu = (payload as any).valor_iptu ?? selectedProperty.valor_iptu;
        const condOk = cond !== null && cond !== undefined && Number(cond) > 0;
        const iptuOk = iptu !== null && iptu !== undefined && Number(iptu) > 0;
        if (!condOk || !iptuOk) {
          editError =
            'Para marcar como Vendido, preencha os valores de Condominio e IPTU (maiores que 0).';
          isSavingEdit = false;
          return;
        }
      }

      const original = selectedProperty as PropertyDetails;
      const statusChanged =
        (payload as any).status && (payload as any).status !== original.status;

      const fieldsBesidesStatus = Object.keys(payload).filter((k) => k !== 'status');
      const onlyStatusChanged =
        statusChanged && fieldsBesidesStatus.every((k) => (payload as any)[k] === (original as any)[k]);

      if (onlyStatusChanged) {
        await api.patch(`/admin/properties/${selectedProperty.id}/status`, {
          status: (payload as any).status,
        });
      } else {
        await apiClient.put(`/admin/properties/${selectedProperty.id}`, payload);
      }
      toast.success('Imovel atualizado com sucesso.');
      isEditMode = false;
      await fetchProperties();
      // Atualiza estado local para refletir a última versao
      selectedProperty = { ...(selectedProperty as PropertySummary), ...(payload as any) } as PropertySummary;
      editableProperty = sanitizeEditable(selectedProperty as any);
    } catch (err: any) {
      console.error('Erro ao salvar imovel:', err);
      const status = err?.response?.status;
      if (status === 403) {
        editError =
          err?.response?.data?.error ||
          'Permissao negada pelo servidor para atualizar este imovel. Verifique campos obrigatorios e permissao do usuario.';
      } else if (status === 404) {
        editError =
          err?.response?.data?.error ||
          'Imovel nao encontrado ou rota de atualizacao ausente no servidor.';
      } else if (status === 500) {
        editError =
          err?.response?.data?.error ||
          'Erro interno no servidor ao salvar o imovel. Tente novamente e revise os campos.';
      } else {
        editError =
          err?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Nao foi possivel salvar o imovel.');
      }
    } finally {
      isSavingEdit = false;
    }
  }

  async function handleImageUpload(event: Event) {
    if (!selectedProperty) return;
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      return;
    }

    imageUploading = true;
    imageUploadError = null;

    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('images', file));

      await apiClient.post(`/admin/properties/${selectedProperty.id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Imagens enviadas com sucesso.');
      await reviewProperty(selectedProperty as PropertySummary);
    } catch (err: any) {
      console.error('Erro ao enviar imagens:', err);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Sua sessao expirou. Por favor, faca login novamente.');
        authToken.set(null);
      }
      imageUploadError =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Falha ao enviar imagens.');
    } finally {
      imageUploading = false;
      if (input) {
        input.value = '';
      }
    }
  }

  async function handleImageDelete(imageId: number) {
    if (!selectedProperty) return;
    imageDeleteError = null;
    try {
      await api.delete(`/admin/properties/${selectedProperty.id}/images/${imageId}`);
      toast.success('Imagem removida com sucesso.');
      await reviewProperty(selectedProperty as PropertySummary);
    } catch (err: any) {
      console.error('Erro ao remover imagem:', err);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Sua sessao expirou. Por favor, faca login novamente.');
        authToken.set(null);
      }
      imageDeleteError =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Falha ao remover imagem.');
    }
  }

  async function handleVideoDelete() {
    if (!selectedProperty) return;
    const confirmed = window.confirm('Confirma remover o video atual?');
    if (!confirmed) return;
    videoDeleting = true;
    videoDeleteError = null;
    try {
      await api.delete(`/admin/properties/${selectedProperty.id}/video`);
      toast.success('Video removido com sucesso.');
      await reviewProperty(selectedProperty as PropertySummary);
      if (videoInputEl) {
        videoInputEl.value = '';
      }
    } catch (err: any) {
      console.error('Erro ao remover video:', err);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Sua sessao expirou. Por favor, faca login novamente.');
        authToken.set(null);
      }
      videoDeleteError =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Falha ao remover video.');
    } finally {
      videoDeleting = false;
    }
  }

  function onSearchInput(event?: Event) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const target = event?.target as HTMLInputElement | undefined;
    if (target && target.value.trim() === '') {
      fetchProperties();
      return;
    }
    debounceTimer = setTimeout(() => {
      fetchProperties();
    }, 300);
  }
</script>

<div class="space-y-4">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gerenciamento de Imóveis</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Consulte os imóveis cadastrados e utilize filtros rápidos para priorizar as análises.
      </p>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        variant="outline"
        className="flex items-center gap-2"
        on:click={handleRefresh}
        disabled={isLoading}
      >
        {#if isLoading}
          <Loader2 class="h-4 w-4 animate-spin" />
        {/if}
        Recarregar
      </Button>
      <Button variant="outline" on:click={sortAlphabetical} disabled={isLoading}>
        Ordenar A-Z
      </Button>
      <Button variant="outline" on:click={sortByCreatedDesc} disabled={isLoading}>
        Mais recentes
      </Button>
      <Button variant="outline" on:click={handleExport}>

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
        Exportar Imóveis (CSV)
      </Button>
    </div>
  </header>

  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <Input
      className="w-full md:w-80"
      type="search"
      placeholder="Buscar por título, cidade, ID..."
      bind:value={filters.search}
      on:input={onSearchInput}
      on:keydown={handleKeydown}
      on:keyup={handleKeyup}
    />
  </div>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <div class="relative">
      <Select.Root bind:value={filters.city} on:valueChange={onFilterChange}>
        <Select.Trigger>
          <Select.Value placeholder="Filtrar por cidade" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="all">Todas as cidades</Select.Item>
          {#each cities as city (city)}
            <Select.Item value={city}>{city}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>
  {#if isLoading}
    <div class="flex h-48 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600"></span>
        Carregando imóveis...
      </div>
    </div>
  {:else if error}
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {error}
    </div>
  {:else if properties.length === 0}
    <div class="rounded-md border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Nenhum imóvel encontrado</h2>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Ajuste os filtros para visualizar outros resultados.</p>
    </div>
  {:else}
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-900/70">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.title')}>
                Imóvel
                <span>{getSortIndicator('p.title')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.city')}>
                Localização
                <span>{getSortIndicator('p.city')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.price')}>
                Valor
                <span>{getSortIndicator('p.price')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <button type="button" class="flex items-center gap-1" on:click={() => handleSort('p.status')}>
                Status
                <span>{getSortIndicator('p.status')}</span>
              </button>
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Corretor</th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          {#each properties as property}
            <tr
              class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              on:click={(event) => reviewProperty(property, event)}
            >
              <td class="px-6 py-4">
                <div class="font-semibold text-gray-900 dark:text-gray-100">{property.title}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">ID: {property.id}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                {property.city ?? '-'}{#if property.state} / {property.state}{/if}
              </td>
              <td class="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {formatCurrency(property.price)}
              </td>
              <td class="px-6 py-4">
                <span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(property.status)}`}>
                  {humanizeStatus(property.status)}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {property.broker_name ?? '-'}
              </td>
              <td class="px-6 py-4 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
                  on:click={(event) => reviewProperty(property, event)}
                  disabled={isDetailLoading && selectedProperty?.id === property.id}
                >
                  {#if isDetailLoading && selectedProperty?.id === property.id}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  {:else}
                    Revisar
                  {/if}
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<Dialog.Root bind:open={isModalOpen}>
  <Dialog.Content className="max-h-[85vh] overflow-y-auto">
    {#if selectedProperty}
      <Dialog.Header>
        <Dialog.Title>{selectedProperty.title}</Dialog.Title>
        <Dialog.Description>
          Status:
          <span class={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(selectedProperty.status)}`}>
            {humanizeStatus(selectedProperty.status)}
          </span>
        </Dialog.Description>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Dashboard / Imóveis / Revisão #{selectedProperty.id}
        </p>
      </Dialog.Header>

      <div class="space-y-6 overflow-y-auto px-6 py-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">Finalidade</p>
            {#if isEditMode && editableProperty}
              <div class="flex flex-col gap-2">
                <label class="text-xs text-gray-500 dark:text-gray-400" for="purpose-select">Finalidade</label>
                <select
                  id="purpose-select"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  bind:value={editableProperty.purpose}
                >
                  <option value="Venda">Venda</option>
                  <option value="Aluguel">Aluguel</option>
                </select>
              </div>
              <input
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-green-300"
                type="number"
                step="0.01"
                bind:value={editableProperty.price}
                placeholder="Preco"
              />
            {:else}
              <p class="text-base text-gray-800 dark:text-gray-200">{selectedProperty.purpose ?? '-'} </p>
              <p class="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(selectedProperty.price)}
              </p>
            {/if}
            <div class="flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-300">
              {#if isEditMode && editableProperty}
                <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                  Condomínio:
                  <input class="w-24 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                    type="number" step="0.01" bind:value={editableProperty.valor_condominio} />
                </label>
                <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                  IPTU:
                  <input class="w-24 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                    type="number" step="0.01" bind:value={editableProperty.valor_iptu} />
                </label>
              {:else}
                {#if selectedProperty.valor_condominio != null}
                  <span class="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                    Condomínio: {formatCurrency(selectedProperty.valor_condominio ?? undefined)}
                  </span>
                {/if}
                {#if selectedProperty.valor_iptu != null}
                  <span class="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
                    IPTU: {formatCurrency(selectedProperty.valor_iptu ?? undefined)}
                  </span>
                {/if}
              {/if}
            </div>
          </div>

            <div class="flex items-center gap-2">
              <Button variant="outline" on:click={() => { isEditMode = !isEditMode; editError = null; }} disabled={isSavingEdit}>
                {isEditMode ? 'Cancelar edicao' : 'Editar dados'}
              </Button>
              {#if isEditMode && editableProperty}
                <div class="flex items-center gap-2">
                  <label class="text-xs text-gray-500 dark:text-gray-400" for="status-select">Status</label>
                  <select
                    id="status-select"
                    class="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    bind:value={editableProperty.status}
                  >
                    <option value="approved">Disponível</option>
                    <option value="rented">Alugado</option>
                    <option value="sold">Vendido</option>
                  </select>
                </div>
                <Button on:click={saveEdits} disabled={isSavingEdit}>
                  {#if isSavingEdit}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Salvar
                </Button>
              {/if}
            </div>
          </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria</h3>
          {#if selectedPropertyImages().length > 0}
            <div class="mt-2 flex gap-3 overflow-x-auto rounded-md bg-gray-50 p-3 dark:bg-gray-800/60">
              {#each selectedPropertyImages() as image (image.id)}
                <div class="relative flex flex-col gap-2 items-center">
                  <img
                    src={image.url}
                    alt="Foto do imovel"
                    class="h-32 w-auto rounded-md object-cover shadow"
                    loading="lazy"
                  />
                  {#if image.id != null}
                    <Button variant="destructive" size="sm" on:click={() => handleImageDelete(image.id!)}>
                      Remover
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma imagem cadastrada.</p>
          {/if}
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="upload-images-input">Enviar novas imagens</label>
          <input
            id="upload-images-input"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            type="file"
            accept="image/*"
            multiple
            on:change={handleImageUpload}
            disabled={imageUploading}
          />
          {#if imageUploading}
            <p class="text-xs text-gray-500 dark:text-gray-400">Enviando imagens...</p>
          {/if}
          {#if imageUploadError}
            <p class="text-xs text-red-500 dark:text-red-400">{imageUploadError}</p>
          {/if}
        </div>

          {#if selectedProperty.video_url}
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Video</h3>
              <div class="mt-2 overflow-hidden rounded-lg bg-black/10 dark:bg-gray-800">
                <video
                  class="h-64 w-full rounded-lg object-cover"
                  src={selectedProperty.video_url}
                  controls
                  preload="metadata"
                >
                  <track kind="captions" srclang="pt" label="Portugues" />
                </video>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="outline" on:click={handleVideoDelete} disabled={videoDeleting}>
                  {#if videoDeleting}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Remover vídeo
                </Button>
                {#if videoDeleteError}
                  <span class="text-xs text-red-500 dark:text-red-400">{videoDeleteError}</span>
                {/if}
              </div>
            </div>
          {:else if isEditMode}
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="upload-video-input">Enviar vídeo</label>
              <input
                id="upload-video-input"
                bind:this={videoInputEl}
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                type="file"
                accept="video/*"
                on:change={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (!target.files || target.files.length === 0 || !selectedProperty) return;
                  const form = new FormData();
                  form.append('video', target.files[0]);
                  apiClient
                    .post(`/admin/properties/${selectedProperty.id}/video`, form, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    })
                    .then(() => {
                      toast.success('Video enviado com sucesso.');
                      return reviewProperty(selectedProperty as PropertySummary);
                    })
                    .catch((err) => {
                      console.error('Erro ao enviar video:', err);
                      videoDeleteError =
                        err?.response?.data?.error ||
                        (err instanceof Error ? err.message : 'Falha ao enviar video.');
                    })
                    .finally(() => {
                      if (videoInputEl) videoInputEl.value = '';
                    });
                }}
              />
            </div>
          {/if}

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Descrição</h3>
          {#if isEditMode && editableProperty}
            <textarea
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              rows="3"
              bind:value={editableProperty.description}
              placeholder="Descricao do imovel"
            ></textarea>
          {:else}
            <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {selectedProperty.description ?? 'Sem descricao.'}
            </p>
          {/if}
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Localização e atributos</h3>
          {#if isEditMode && editableProperty}
            <div class="mt-2 grid gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
              <label class="flex flex-col gap-1">
                <strong>Cidade:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.city} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Estado:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.state} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Bairro:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.bairro} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Endereço:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.address} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Número:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.numero} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Complemento:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.complemento} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Quadra:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.quadra} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Lote:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.lote} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Tipo do lote:</strong>
                <input class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.tipo_lote} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Quartos:</strong>
                <input type="number" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.bedrooms} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Banheiros:</strong>
                <input type="number" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.bathrooms} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Área construida:</strong>
                <input type="number" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.area_construida} />
              </label>
              <label class="flex flex-col gap-1">
                <strong>Área terreno:</strong>
                <input type="number" class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700" bind:value={editableProperty.area_terreno} />
              </label>
              <p><strong>Corretor:</strong> {selectedProperty.broker_name ?? '-'}</p>
              <p><strong>Telefone:</strong> {selectedProperty.broker_phone ?? '-'}</p>
            </div>
          {:else}
            <ul class="mt-2 grid gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
              <li><strong>Cidade:</strong> {selectedProperty.city ?? '-'}</li>
              <li><strong>Estado:</strong> {selectedProperty.state ?? '-'}</li>
              <li><strong>Bairro:</strong> {selectedProperty.bairro ?? '-'}</li>
              <li><strong>Endereco:</strong> {selectedProperty.address ?? '-'}</li>
              <li><strong>Numero:</strong> {selectedProperty.numero ?? '-'}</li>
              <li><strong>Complemento:</strong> {selectedProperty.complemento ?? '-'}</li>
              <li><strong>Quadra:</strong> {selectedProperty.quadra ?? '-'}</li>
              <li><strong>Lote:</strong> {selectedProperty.lote ?? '-'}</li>
              <li><strong>Tipo do lote:</strong> {selectedProperty.tipo_lote ?? '-'}</li>
              <li><strong>Quartos:</strong> {selectedProperty.bedrooms ?? '-'}</li>
              <li><strong>Banheiros:</strong> {selectedProperty.bathrooms ?? '-'}</li>
              <li><strong>Área construida:</strong> {selectedProperty.area_construida ?? '-'} m2</li>
              <li><strong>Área terreno:</strong> {selectedProperty.area_terreno ?? '-'} m2</li>
              <li><strong>Corretor:</strong> {selectedProperty.broker_name ?? '-'}</li>
              <li><strong>Telefone:</strong> {selectedProperty.broker_phone ?? '-'}</li>
            </ul>
          {/if}
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Comodidades</h3>
          <div class="mt-2 flex flex-wrap gap-2 text-sm">
            {#if isEditMode && editableProperty}
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" bind:checked={editableProperty.has_wifi} />
                Wi-Fi
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" bind:checked={editableProperty.tem_piscina} />
                Piscina
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" bind:checked={editableProperty.tem_energia_solar} />
                Energia solar
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" bind:checked={editableProperty.tem_automacao} />
                Automação
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" bind:checked={editableProperty.tem_ar_condicionado} />
                Ar-condicionado
              </label>
              <label class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">
                <input type="checkbox" bind:checked={editableProperty.eh_mobiliada} />
                Mobiliada
              </label>
            {:else}
              {#each [
                { label: 'Wi-Fi', value: selectedProperty.has_wifi },
                { label: 'Piscina', value: selectedProperty.tem_piscina },
                { label: 'Energia solar', value: selectedProperty.tem_energia_solar },
                { label: 'Automacao', value: selectedProperty.tem_automacao },
                { label: 'Ar condicionado', value: selectedProperty.tem_ar_condicionado },
                { label: 'Mobiliada', value: selectedProperty.eh_mobiliada }
              ] as amenity}
                <span class={`rounded-full px-3 py-1 ${amenity.value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {amenity.label}: {amenity.value ? 'Sim' : 'Nao'}
                </span>
              {/each}
            {/if}
          </div>
        </div>

        {#if editError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {editError}
          </div>
        {/if}
        {#if imageDeleteError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {imageDeleteError}
          </div>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="outline" on:click={closeModal} disabled={isProcessing}>
          Cancelar
        </Button>
        {#if selectedProperty.status !== 'rejected'}
          <Button variant="destructive" on:click={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Rejeitar
          </Button>
        {/if}
        {#if allowApproval && selectedProperty.status !== 'approved'}
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            on:click={() => handleStatusUpdate('approved')}
            disabled={isProcessing}
          >
            {#if isProcessing}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Aprovar
          </Button>
        {/if}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

