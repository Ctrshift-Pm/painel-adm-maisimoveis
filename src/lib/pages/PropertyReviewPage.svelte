<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { get } from 'svelte/store';
  import { authToken } from '$lib/store';
  import { baseURL } from '$lib/api';
  import type { PropertyStatus } from '$lib/types';

  interface PropertyDetails {
    id: number;
    title: string;
    description: string | null;
    status: PropertyStatus;
    price: number | null;
    type: string | null;
    purpose: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_construida: number | null;
    area_terreno: number | null;
    garage_spots: number | null;
    images: string[];
  }

  const API_BASE = baseURL;
  const ADMIN_BASE = `${baseURL}/admin`;
  export let params: { id?: string } = {};

  let propertyId = '';
  let property: PropertyDetails | null = null;
  let isLoading = true;
  let isUpdating = false;
  let loadError: string | null = null;
  let actionError: string | null = null;

  onMount(async () => {
    propertyId = params?.id ?? '';

    if (!propertyId) {
      loadError = 'ID do imovel nao encontrado.';
      isLoading = false;
      return;
    }

    await fetchProperty(propertyId);
  });

  $: if (params?.id && params.id !== propertyId) {
    propertyId = params.id;
    void fetchProperty(propertyId);
  }

  async function fetchProperty(id: string) {
    isLoading = true;
    loadError = null;
    actionError = null;

    try {
      const token = get(authToken);
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/properties/${id}`, { headers });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? 'Nao foi possivel carregar os detalhes do imovel.');
      }

      property = normalizeProperty(payload);
    } catch (err) {
      console.error('Erro ao buscar imovel:', err);
      loadError = err instanceof Error ? err.message : 'Erro inesperado ao carregar o imovel.';
      property = null;
    } finally {
      isLoading = false;
    }
  }

  function normalizeProperty(raw: any): PropertyDetails {
    const priceValue = Number(raw?.price);
    const rawImages = Array.isArray(raw?.images)
      ? raw.images
      : typeof raw?.images === 'string'
      ? raw.images.split(',')
      : [];

    const images = (rawImages as unknown[])
      .map((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed.length > 0 ? trimmed : null;
        }
        if (item && typeof item === 'object' && 'url' in (item as Record<string, unknown>)) {
          const url = (item as Record<string, unknown>).url;
          return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
        }
        return null;
      })
      .filter((url): url is string => Boolean(url));

    return {
      id: Number(raw?.id ?? 0),
      title: String(raw?.title ?? 'Imovel sem titulo'),
      description: raw?.description ? String(raw.description) : null,
      status: (raw?.status ?? 'pending_approval') as PropertyStatus,
      price: Number.isFinite(priceValue) ? priceValue : null,
      type: raw?.type ? String(raw.type) : null,
      purpose: raw?.purpose ? String(raw.purpose) : null,
      address: raw?.address ? String(raw.address) : null,
      city: raw?.city ? String(raw.city) : null,
      state: raw?.state ? String(raw.state) : null,
      bedrooms: raw?.bedrooms != null ? Number(raw.bedrooms) : null,
      bathrooms: raw?.bathrooms != null ? Number(raw.bathrooms) : null,
      area_construida: raw?.area_construida != null ? Number(raw.area_construida) : null,
      area_terreno: raw?.area_terreno != null ? Number(raw.area_terreno) : null,
      garage_spots: raw?.garage_spots != null ? Number(raw.garage_spots) : null,
      images,
    };
  }

  const STATUS_LABELS: Record<PropertyStatus, string> = {
    pending_approval: 'Pendente de aprovacao',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    rented: 'Alugado',
    sold: 'Vendido',
  };

  function statusLabel(status: PropertyStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  function statusBadgeClasses(status: PropertyStatus): string {
    const classes: Record<PropertyStatus, string> = {
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      rented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };

    return classes[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  function formatCurrency(value?: number | null): string {
    if (value == null || Number.isNaN(value)) {
      return '-';
    }

    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatLocation(item: PropertyDetails | null): string | null {
    if (!item) return null;

    const parts = [item.address, item.city, item.state].filter(
      (segment): segment is string => Boolean(segment && segment.trim())
    );

    return parts.length > 0 ? parts.join(' • ') : null;
  }

  function goBack() {
    navigate('/admin/properties');
  }

  async function updateStatus(newStatus: 'approved' | 'rejected') {
    if (!propertyId) return;

    const token = get(authToken);
    if (!token) {
      actionError = 'Sessao expirada. Faca login novamente.';
      return;
    }

    isUpdating = true;
    actionError = null;

    const endpoint =
      newStatus === 'approved'
        ? `${ADMIN_BASE}/properties/${propertyId}/approve`
        : `${ADMIN_BASE}/properties/${propertyId}/reject`;

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error ??
            `Nao foi possivel ${newStatus === 'approved' ? 'aprovar' : 'rejeitar'} o imovel.`
        );
      }

      navigate('/admin/properties');
    } catch (err) {
      console.error('Erro ao atualizar status do imovel:', err);
      actionError =
        err instanceof Error
          ? err.message
          : `Erro ao ${newStatus === 'approved' ? 'aprovar' : 'rejeitar'} o imovel.`;
    } finally {
      isUpdating = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-100 py-6 dark:bg-gray-950">
  <div class="mx-auto flex max-w-6xl flex-col gap-6 px-4">
    <button
      class="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      on:click={goBack}
      type="button"
    >
      <span aria-hidden="true">←</span>
      Voltar para lista
    </button>

    {#if isLoading}
      <div class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        Carregando detalhes do imovel...
      </div>
    {:else if loadError}
      <div class="space-y-4">
        <div class="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {loadError}
        </div>
        <button
          class="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          on:click={goBack}
          type="button"
        >
          Voltar
        </button>
      </div>
    {:else if property}
      <div class="space-y-6">
        {#if actionError}
          <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {actionError}
          </div>
        {/if}

        <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div class="space-y-2">
              <p class="text-sm text-gray-500 dark:text-gray-400">Imovel #{property.id}</p>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{property.title}</h1>
              <div class="flex flex-wrap items-center gap-3 text-sm">
                <span
                  class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(
                    property.status
                  )}`}
                >
                  {statusLabel(property.status)}
                </span>
                {#if property.price != null}
                  <span class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(property.price)}
                  </span>
                {/if}
              </div>
              {#if formatLocation(property)}
                <p class="text-sm text-gray-600 dark:text-gray-300">{formatLocation(property)}</p>
              {/if}
            </div>

            <div class="flex flex-wrap gap-2">
              {#if property.status !== 'approved'}
                <button
                  class="inline-flex items-center justify-center rounded-md border border-green-500 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
                  on:click={() => updateStatus('approved')}
                  disabled={isUpdating}
                  type="button"
                >
                  {isUpdating ? 'Processando...' : 'Aprovar'}
                </button>
              {/if}
              {#if property.status !== 'rejected'}
                <button
                  class="inline-flex items-center justify-center rounded-md border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-400 dark:text-red-200 dark:hover:bg-red-900/40"
                  on:click={() => updateStatus('rejected')}
                  disabled={isUpdating}
                  type="button"
                >
                  {isUpdating ? 'Processando...' : 'Rejeitar'}
                </button>
              {/if}
            </div>
          </div>
        </section>

        <section class="grid gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2">
          <div class="space-y-2">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Detalhes</h2>
            <dl class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div class="flex items-center justify-between">
                <dt class="font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
                <dd>{property.type ?? '-'}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="font-medium text-gray-500 dark:text-gray-400">Finalidade</dt>
                <dd>{property.purpose ?? '-'}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="font-medium text-gray-500 dark:text-gray-400">Quartos</dt>
                <dd>{property.bedrooms ?? '-'}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="font-medium text-gray-500 dark:text-gray-400">Banheiros</dt>
                <dd>{property.bathrooms ?? '-'}</dd>
              </div>
            </dl>
          </div>
          <div class="space-y-2">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Medidas</h2>
            <dl class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div class="flex items-center justify-between">
                <dt class="font-medium text-gray-500 dark:text-gray-400">Area construida</dt>
                <dd>{property.area_construida != null ? `${property.area_construida} m²` : '-'}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="font-medium text-gray-500 dark:text-gray-400">Area terreno</dt>
                <dd>{property.area_terreno != null ? `${property.area_terreno} m²` : '-'}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="font-medium text-gray-500 dark:text-gray-400">Vagas</dt>
                <dd>{property.garage_spots ?? '-'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Descricao</h2>
          <p class="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
            {property.description ?? 'Nenhuma descricao fornecida.'}
          </p>
        </section>

        <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria de fotos</h2>
          {#if property.images.length > 0}
            <div class="flex gap-4 overflow-x-auto pb-2">
              {#each property.images as image}
                <img
                  alt="Foto do imovel"
                  class="h-48 w-auto rounded-md object-cover shadow"
                  src={image}
                />
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-600 dark:text-gray-300">Nenhuma imagem cadastrada.</p>
          {/if}
        </section>
      </div>
    {/if}
  </div>
</div>
