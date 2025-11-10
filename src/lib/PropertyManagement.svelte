<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { exportToCsv } from '$lib/utils/exportUtils';
  import { api } from '$lib/apiClient';
  import PropertyReviewDrawer from '$lib/components/PropertyReviewDrawer.svelte';
  import { baseURL } from './api';
  import { authToken } from './store';
  import type { PropertyStatus, Property, PropertyImage } from './types';

  const API_BASE = `${baseURL}/admin`;

  interface PropertySummary {
    id: number;
    title: string;
    city?: string | null;
    state?: string | null;
    price?: number | null;
    status: PropertyStatus;
    broker_name?: string | null;
  }

  const STATUS_OPTIONS: { value: '' | PropertyStatus; label: string }[] = [
    { value: '', label: 'Todos os status' },
    { value: 'pending_approval', label: 'Pendente de aprovação' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'rejected', label: 'Rejeitado' },
    { value: 'rented', label: 'Alugado' },
    { value: 'sold', label: 'Vendido' }
  ];

  let properties: PropertySummary[] = [];
  let isLoading = false;
  let error: string | null = null;
  let statusFilter: '' | PropertyStatus = '';
  let drawerOpen = false;
  let selectedProperty: Property | null = null;
  let isFetchingDetails = false;
  let pendingPropertyId: number | null = null;

  onMount(() => {
    fetchProperties();
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
      if (statusFilter) {
        params.set('status', statusFilter);
      }

      const response = await fetch(
        `${API_BASE}/properties-with-brokers${params.toString() ? `?${params.toString()}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Não foi possível carregar os imóveis.');
      }

      const payload = await response.json();
      const raw = (payload?.data ?? payload ?? []) as Array<Record<string, unknown>>;

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
      error = err instanceof Error ? err.message : 'Erro inesperado ao carregar imóveis.';
      properties = [];
    } finally {
      isLoading = false;
    }
  }

  function handleFilterChange(event: Event) {
    statusFilter = (event.target as HTMLSelectElement).value as '' | PropertyStatus;
    fetchProperties();
  }

  function formatCurrency(value?: number | null): string {
    if (value == null || Number.isNaN(value)) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  function normalizeImages(images: unknown): PropertyImage[] {
    if (!Array.isArray(images)) {
      return [];
    }

    return images.map((image, index) => {
      if (typeof image === 'string') {
        return { id: index, url: image };
      }
      const maybe = image as Partial<PropertyImage>;
      return {
        id: Number(maybe?.id ?? index),
        url: String(maybe?.url ?? ''),
      };
    });
  }

  function buildPropertyDetails(raw: Partial<Property> | null, fallback: PropertySummary): Property {
    return {
      id: Number(raw?.id ?? fallback.id),
      title: String(raw?.title ?? fallback.title ?? 'Imovel'),
      type: String(raw?.type ?? 'Nao informado'),
      purpose: raw?.purpose ?? null,
      status: (raw?.status as PropertyStatus) ?? fallback.status,
      price: Number(
        raw?.price ??
          fallback.price ??
          0
      ),
      description: raw?.description ?? null,
      address: raw?.address ?? null,
      quadra: raw?.quadra ?? null,
      lote: raw?.lote ?? null,
      numero: raw?.numero ?? null,
      bairro: raw?.bairro ?? null,
      complemento: raw?.complemento ?? null,
      tipo_lote: raw?.tipo_lote ?? null,
      city: raw?.city ?? fallback.city ?? null,
      state: raw?.state ?? fallback.state ?? null,
      bedrooms: raw?.bedrooms ?? null,
      bathrooms: raw?.bathrooms ?? null,
      area_construida: raw?.area_construida ?? null,
      area_terreno: raw?.area_terreno ?? null,
      garage_spots: raw?.garage_spots ?? null,
      has_wifi: raw?.has_wifi ?? undefined,
      tem_piscina: raw?.tem_piscina ?? undefined,
      tem_energia_solar: raw?.tem_energia_solar ?? undefined,
      tem_automacao: raw?.tem_automacao ?? undefined,
      tem_ar_condicionado: raw?.tem_ar_condicionado ?? undefined,
      eh_mobiliada: raw?.eh_mobiliada ?? undefined,
      valor_condominio: raw?.valor_condominio ?? null,
      valor_iptu: raw?.valor_iptu ?? null,
      video_url: raw?.video_url ?? null,
      sale_value: raw?.sale_value ?? null,
      commission_value: raw?.commission_value ?? null,
      commission_rate: raw?.commission_rate ?? null,
      broker_id: raw?.broker_id ?? null,
      broker_name: raw?.broker_name ?? fallback.broker_name ?? null,
      broker_phone: raw?.broker_phone ?? null,
      created_at: raw?.created_at ?? undefined,
      updated_at: raw?.updated_at ?? undefined,
      images: normalizeImages(raw?.images),
    };
  }

  async function reviewProperty(propertySummary: PropertySummary) {
    if (isFetchingDetails) {
      return;
    }
    isFetchingDetails = true;
    pendingPropertyId = propertySummary.id;
    try {
      const details = await api.get<Property>(`/admin/properties/${propertySummary.id}`);
      selectedProperty = buildPropertyDetails(details, propertySummary);
    } catch (err) {
      console.error('Falha ao carregar detalhes do imovel:', err);
      selectedProperty = buildPropertyDetails(null, propertySummary);
    } finally {
      isFetchingDetails = false;
      pendingPropertyId = null;
      drawerOpen = true;
    }
  }

  function handleDrawerClose() {
    drawerOpen = false;
    selectedProperty = null;
  }

  async function handleDataUpdate() {
    await fetchProperties();
  }

  function handleExport() {
    exportToCsv(properties, 'imoveis.csv');
  }
</script>

<div class="space-y-4">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gerenciamento de Imóveis</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Consulte os imóveis cadastrados e acesse a página dedicada para aprovar ou rejeitar cada solicitação.
      </p>
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        bind:value={statusFilter}
        on:change={handleFilterChange}
      >
        {#each STATUS_OPTIONS as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={fetchProperties}
          disabled={isLoading}
        >
          Atualizar
        </button>
        <button
          class="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={handleExport}
        >
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
          Exportar Imoveis (CSV)
        </button>
      </div>
    </div>
  </header>

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
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Imóvel</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Localização</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Corretor</th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          {#each properties as property}
            <tr class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60" on:click={() => reviewProperty(property)}>
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
              <td class="px-6 py-4">
                <button
                  class="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
                  on:click|stopPropagation={() => reviewProperty(property)}
                  disabled={isFetchingDetails && pendingPropertyId === property.id}
                >
                  {#if isFetchingDetails && pendingPropertyId === property.id}
                    <span class="h-3 w-3 animate-spin rounded-full border border-green-500 border-t-transparent"></span>
                  {/if}
                  Revisar
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<PropertyReviewDrawer
  bind:open={drawerOpen}
  property={selectedProperty}
  on:update={handleDataUpdate}
  on:close={handleDrawerClose}
/>
