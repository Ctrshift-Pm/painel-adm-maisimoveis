<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import { api } from '$lib/apiClient';
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
    bedrooms?: number | null;
    bathrooms?: number | null;
    area_construida?: number | null;
    area_terreno?: number | null;
    broker_phone?: string | null;
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

  const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos os status' },
    { value: 'pending_approval', label: 'Pendente de aprovação' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'rejected', label: 'Rejeitado' },
    { value: 'rented', label: 'Alugado' },
    { value: 'sold', label: 'Vendido' },
  ];

  let properties: PropertySummary[] = [];
  let isLoading = false;
  let error: string | null = null;
  let cities: string[] = [];
  let filters: PropertyFilters = {
    status: 'approved',
    city: 'all',
    search: '',
  };
  let sortConfig: SortConfig = { key: 'p.created_at', order: 'desc' };
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isModalOpen = false;
  let selectedProperty: PropertyDetails | null = null;
  let isDetailLoading = false;
  let isProcessing = false;

  onMount(() => {
    fetchProperties();
    fetchCities();
  });

  async function fetchProperties() {
    isLoading = true;
    error = null;

    const token = get(authToken);
    if (!token) {
      error = 'Sessão expirada. Faça login novamente.';
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
            title: String(record['title'] ?? 'Imóvel sem título'),
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
        toast.error('Sua sessão expirou. Por favor, faça login novamente.');
        error = 'Sessão expirada. Faça login novamente.';
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

  function normalizeImages(
    images?: Array<NormalizedImage | PropertyImageType | string> | null
  ): NormalizedImage[] {
    if (!images) return [];

    return images
      .map<NormalizedImage | null>((image, index) => {
        if (typeof image === 'string') {
          return { id: index, url: image };
        }
        if (image && typeof image === 'object' && 'url' in image && typeof image.url === 'string') {
          const fallbackId = Number.isFinite(Number(index)) ? index : 0;
          const rawId =
            (image as PropertyImageType).id ??
            (image as NormalizedImage).id ??
            fallbackId;
          const parsedId = Number(rawId);
          return {
            id: Number.isFinite(parsedId) ? parsedId : index,
            url: image.url,
          };
        }
        return null;
      })
      .filter((img): img is NormalizedImage => Boolean(img));
  }

  function selectedPropertyImages() {
    return normalizeImages(selectedProperty?.images ?? null);
  }

  function humanizeStatus(status: PropertyStatus): string {
    const map: Record<PropertyStatus, string> = {
      pending_approval: 'Pendente de aprovação',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      rented: 'Alugado',
      sold: 'Vendido'
    };
    return map[status] ?? status;
  }

  function statusBadgeClasses(status: PropertyStatus): string {
    const classes: Record<PropertyStatus, string> = {
      pending_approval:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      rented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };

    return (
      classes[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
    );
  }

  async function reviewProperty(property: PropertySummary, event?: Event) {
    event?.stopPropagation?.();
    if (isDetailLoading && selectedProperty?.id === property.id) {
      return;
    }

    console.log('Abrindo modal para:', property);
    isDetailLoading = true;
    selectedProperty = property;

    try {
      const details = await api.get<PropertyDetails>(`/admin/properties/${property.id}`);
      selectedProperty = { ...property, ...details };
      isModalOpen = true;
    } catch (err) {
      console.error('Falha ao buscar detalhes do imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faça login novamente.');
      } else {
        toast.error('Não foi possível carregar os detalhes do imóvel.');
      }
    } finally {
      isDetailLoading = false;
    }
  }

  function closeModal() {
    if (isProcessing) return;
    isModalOpen = false;
    selectedProperty = null;
  }

  async function handleStatusUpdate(newStatus: 'approved' | 'rejected') {
    if (!selectedProperty) {
      toast.error('Erro: Nenhuma propriedade selecionada');
      return;
    }

    console.log('Clicou em atualizar status:', { selectedProperty, newStatus });
    isProcessing = true;
    try {
      await api.patch(`/admin/properties/${selectedProperty.id}/status`, { status: newStatus });
      toast.success(`Imóvel ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}!`);
      isModalOpen = false;
      selectedProperty = null;
      await fetchProperties();
    } catch (err) {
      console.error('Falha ao atualizar status do imóvel:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Sua sessão expirou. Por favor, faça login novamente.');
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

  function onFilterChange() {
    fetchProperties();
  }

  function handleExport() {
    exportToCsv(properties, `imoveis_${new Date().toISOString().split('T')[0]}.csv`);
  }

  function onSearchInput() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      fetchProperties();
    }, 500);
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
        {:else}
          <span aria-hidden="true">🔄</span>
        {/if}
        Recarregar
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
    />
  </div>

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <div class="relative">
      <Select.Root bind:value={filters.status} on:valueChange={onFilterChange}>
        <Select.Trigger>
          <Select.Value placeholder="Filtrar por status" />
        </Select.Trigger>
        <Select.Content>
          {#each STATUS_FILTERS as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

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
                {property.broker_name ?? '—'}
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
  <Dialog.Content className="max-h-[85vh] overflow-hidden">
    {#if selectedProperty}
      <Dialog.Header>
        <Dialog.Title>{selectedProperty.title}</Dialog.Title>
        <Dialog.Description>
          Status:
          <span class={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(selectedProperty.status)}`}>
            {humanizeStatus(selectedProperty.status)}
          </span>
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 overflow-y-auto px-6 py-4">
        <p class="text-3xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(selectedProperty.price)}
        </p>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria</h3>
          {#if selectedPropertyImages().length > 0}
            <div class="mt-2 flex gap-3 overflow-x-auto rounded-md bg-gray-50 p-3 dark:bg-gray-800/60">
              {#each selectedPropertyImages() as image (image.id)}
                <img
                  src={image.url}
                  alt="Foto do imóvel"
                  class="h-32 w-auto rounded-md object-cover shadow"
                  loading="lazy"
                />
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400">Nenhuma imagem cadastrada.</p>
          {/if}
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Descrição</h3>
          <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {selectedProperty.description ?? 'Sem descrição.'}
          </p>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Detalhes</h3>
          <ul class="mt-2 grid gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
            <li><strong>Finalidade:</strong> {selectedProperty.purpose ?? '-'}</li>
            <li><strong>Cidade:</strong> {selectedProperty.city ?? '-'}</li>
            <li><strong>Estado:</strong> {selectedProperty.state ?? '-'}</li>
            <li><strong>Quartos:</strong> {selectedProperty.bedrooms ?? '-'}</li>
            <li><strong>Banheiros:</strong> {selectedProperty.bathrooms ?? '-'}</li>
            <li><strong>Área construída:</strong> {selectedProperty.area_construida ?? '-'} m²</li>
            <li><strong>Área terreno:</strong> {selectedProperty.area_terreno ?? '-'} m²</li>
            <li><strong>Corretor:</strong> {selectedProperty.broker_name ?? '-'}</li>
            <li><strong>Telefone:</strong> {selectedProperty.broker_phone ?? '-'}</li>
          </ul>
        </div>
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
        {#if selectedProperty.status !== 'approved'}
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
