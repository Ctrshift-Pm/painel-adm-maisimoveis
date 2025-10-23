<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { baseURL } from './api';
  import { authToken } from './store';
  import type { Property, PropertyImage, PropertyStatus } from './types';

  const API_BASE = `${baseURL}/admin`;

  const STATUS_OPTIONS: { value: '' | PropertyStatus; label: string }[] = [
    { value: '', label: 'Todos os status' },
    { value: 'pending_approval', label: 'Pendente de aprovaÃ§Ã£o' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'rejected', label: 'Rejeitado' },
    { value: 'rented', label: 'Alugado' },
    { value: 'sold', label: 'Vendido' }
  ];

  const NUMERIC_FIELDS: (keyof Property)[] = [
    'price',
    'bedrooms',
    'bathrooms',
    'garage_spots',
    'area_construida',
    'area_terreno',
    'valor_condominio',
    'valor_iptu',
    'sale_value',
    'commission_rate',
    'commission_value'
  ];

  const BOOLEAN_FIELDS: (keyof Property)[] = [
    'has_wifi',
    'tem_piscina',
    'tem_energia_solar',
    'tem_automacao',
    'tem_ar_condicionado',
    'eh_mobiliada'
  ];

  const TEXT_FIELDS: (keyof Property)[] = [
    'title',
    'description',
    'type',
    'purpose',
    'code',
    'address',
    'quadra',
    'lote',
    'numero',
    'bairro',
    'complemento',
    'tipo_lote',
    'city',
    'state',
    'video_url'
  ];

  let properties: Property[] = [];
  let isLoading = false;
  let listError: string | null = null;
  let statusFilter: '' | PropertyStatus = '';
  let selectedProperty: Property | null = null;
  let propertyLoading = false;

  let formData: Partial<Property> = {};
  let isSaving = false;
  let detailError: string | null = null;

  let message: { type: 'success' | 'error'; text: string } | null = null;

  let imageFiles: File[] = [];
  let imagesLoading = false;
  let imageInput: HTMLInputElement | null = null;

  function showMessage(type: 'success' | 'error', text: string) {
    message = { type, text };
    setTimeout(() => (message = null), 4000);
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
      classes[status] ??
      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
    );
  }

  function humanizeStatus(status: PropertyStatus): string {
    const map: Record<PropertyStatus, string> = {
      pending_approval: 'Pendente de aprovaÃ§Ã£o',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      rented: 'Alugado',
      sold: 'Vendido'
    };
    return map[status] ?? status;
  }

  async function loadProperties(filter: '' | PropertyStatus = statusFilter) {
    isLoading = true;
    listError = null;
    const token = get(authToken);

    if (!token) {
      listError = 'SessÃ£o expirada. FaÃ§a login novamente.';
      isLoading = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filter) {
        params.set('status', filter);
      }

      const response = await fetch(
        `${API_BASE}/properties-with-brokers${
          params.toString() ? `?${params}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error ?? 'NÃ£o foi possÃ­vel carregar os imÃ³veis.'
        );
      }

      const payload = await response.json();
      properties = payload.data ?? payload.properties ?? payload ?? [];
    } catch (err) {
      console.error('Erro ao carregar imÃ³veis:', err);
      listError =
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro inesperado ao carregar os imÃ³veis.';
    } finally {
      isLoading = false;
    }
  }

  function resetSelection() {
    selectedProperty = null;
    propertyLoading = false;
    formData = {};
    detailError = null;
    imageFiles = [];
    if (imageInput) {
      imageInput.value = '';
    }
  }

  function mapPropertyToForm(data: Property) {
    formData = {
      ...data,
      has_wifi: Boolean(data.has_wifi),
      tem_piscina: Boolean(data.tem_piscina),
      tem_energia_solar: Boolean(data.tem_energia_solar),
      tem_automacao: Boolean(data.tem_automacao),
      tem_ar_condicionado: Boolean(data.tem_ar_condicionado),
      eh_mobiliada: Boolean(data.eh_mobiliada)
    };
  }

  async function fetchPropertyDetail(id: number) {
    propertyLoading = true;
    detailError = null;

    const token = get(authToken);
    if (!token) {
      detailError = 'SessÃ£o expirada. FaÃ§a login novamente.';
      propertyLoading = false;
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/properties/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error ?? 'NÃ£o foi possÃ­vel carregar os dados do imÃ³vel.'
        );
      }

      const payload = await response.json();
      const property: Property = payload.property ?? payload;
      selectedProperty = property;
      mapPropertyToForm(property);
    } catch (err) {
      console.error('Erro ao carregar imÃ³vel:', err);
      detailError =
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar os dados do imÃ³vel.';
    } finally {
      propertyLoading = false;
    }
  }

  async function handleSelectProperty(property: Property) {
    await fetchPropertyDetail(property.id);
  }

  function handleStatusFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement)
      .value as '' | PropertyStatus;
    statusFilter = value;
    loadProperties(value);
  }

  function isFieldDisabled(field: keyof Property): boolean {
    if (!selectedProperty) return false;
    if (selectedProperty.status === 'approved' && field !== 'status') {
      return true;
    }
    return false;
  }

  function parseNumericValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!selectedProperty) return;

    const token = get(authToken);
    if (!token) {
      showMessage('error', 'SessÃ£o expirada. FaÃ§a login novamente.');
      return;
    }

    isSaving = true;
    detailError = null;

    const payload: Record<string, unknown> = {};
    const isApproved = selectedProperty.status === 'approved';

    if (formData.status !== undefined) {
      payload.status = formData.status;
    }

    if (!isApproved) {
      for (const field of TEXT_FIELDS) {
        if (formData[field] !== undefined) {
          payload[field as string] =
            formData[field] === null || formData[field] === ''
              ? null
              : formData[field];
        }
      }

      for (const field of NUMERIC_FIELDS) {
        if (formData[field] !== undefined) {
          payload[field as string] = parseNumericValue(formData[field]);
        }
      }

      for (const field of BOOLEAN_FIELDS) {
        if (formData[field] !== undefined) {
          payload[field as string] = Boolean(formData[field]);
        }
      }
    }

    try {
      const response = await fetch(`${API_BASE}/properties/${selectedProperty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'NÃ£o foi possÃ­vel salvar o imÃ³vel.');
      }

      showMessage('success', 'ImÃ³vel atualizado com sucesso.');
      await Promise.all([
        loadProperties(statusFilter),
        fetchPropertyDetail(selectedProperty.id)
      ]);
    } catch (err) {
      console.error('Erro ao salvar imÃ³vel:', err);
      detailError =
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao salvar os dados do imÃ³vel.';
      showMessage('error', detailError);
    } finally {
      isSaving = false;
    }
  }

  async function updatePropertyStatus(
    property: Property,
    action: 'approve' | 'reject'
  ) {
    const token = get(authToken);
    if (!token) {
      showMessage('error', 'SessÃ£o expirada. FaÃ§a login novamente.');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/properties/${property.id}/${action}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? 'NÃ£o foi possÃ­vel atualizar o status do imÃ³vel.'
        );
      }

      showMessage(
        'success',
        `ImÃ³vel ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso.`
      );

      await loadProperties(statusFilter);
      if (selectedProperty?.id === property.id) {
        await fetchPropertyDetail(property.id);
      }
    } catch (err) {
      console.error('Erro ao atualizar status do imÃ³vel:', err);
      showMessage(
        'error',
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar o status do imÃ³vel.'
      );
    }
  }

  function handleInputChange(field: keyof Property, value: unknown) {
    if (isFieldDisabled(field)) {
      return;
    }
    formData = { ...formData, [field]: value };
  }

  function handleBooleanChange(field: keyof Property, checked: boolean) {
    if (isFieldDisabled(field)) {
      return;
    }
    formData = { ...formData, [field]: checked };
  }

  function handleImageSelection(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    imageFiles = files ? Array.from(files) : [];
  }

  async function uploadImages() {
    if (!selectedProperty || imageFiles.length === 0) return;

    const token = get(authToken);
    if (!token) {
      showMessage('error', 'SessÃ£o expirada. FaÃ§a login novamente.');
      return;
    }

    imagesLoading = true;

    const data = new FormData();
    imageFiles.forEach((file) => data.append('images', file));

    try {
      const response = await fetch(
        `${API_BASE}/properties/${selectedProperty.id}/images`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: data
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'NÃ£o foi possÃ­vel enviar as imagens.');
      }

      showMessage('success', 'Imagens adicionadas com sucesso.');
      imageFiles = [];
      if (imageInput) {
        imageInput.value = '';
      }
      await fetchPropertyDetail(selectedProperty.id);
    } catch (err) {
      console.error('Erro ao enviar imagens:', err);
      showMessage(
        'error',
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao enviar as imagens.'
      );
    } finally {
      imagesLoading = false;
    }
  }

  async function removeImage(image: PropertyImage) {
    if (!selectedProperty) return;

    const token = get(authToken);
    if (!token) {
      showMessage('error', 'SessÃ£o expirada. FaÃ§a login novamente.');
      return;
    }

    imagesLoading = true;

    try {
      const response = await fetch(
        `${API_BASE}/properties/${selectedProperty.id}/images/${image.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'NÃ£o foi possÃ­vel remover a imagem.');
      }

      showMessage('success', 'Imagem removida com sucesso.');
      await fetchPropertyDetail(selectedProperty.id);
    } catch (err) {
      console.error('Erro ao remover imagem:', err);
      showMessage(
        'error',
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao remover a imagem.'
      );
    } finally {
      imagesLoading = false;
    }
  }

  onMount(() => {
    loadProperties();
  });
</script>


<section class="space-y-6">
  <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Gestão de Imóveis</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Aprove ou rejeite imóveis, atualize seus dados e gerencie as imagens cadastradas.
      </p>
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span>Status:</span>
        <select
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          on:change={handleStatusFilterChange}
          bind:value={statusFilter}
        >
          {#each STATUS_OPTIONS as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <button
        class="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
        on:click={() => loadProperties(statusFilter)}
        disabled={isLoading}
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M4 20v-5h.581m15.357-2A8.003 8.003 0 014.582 15"
          />
        </svg>
        Atualizar lista
      </button>
    </div>
  </header>

  {#if message}
    <div
      class="rounded-md px-4 py-3 text-sm font-medium text-white shadow-sm {message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}"
    >
      {message.text}
    </div>
  {/if}

  <div class="grid gap-6 lg:grid-cols-[2fr,1.35fr]">
    <div class="space-y-4">
      {#if listError}
        <div class="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
          {listError}
        </div>
      {:else if isLoading}
        <div class="flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Carregando imóveis...
        </div>
      {:else if properties.length === 0}
        <div class="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <svg class="mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7l1.664 9.317A2 2 0 006.64 18h10.72a2 2 0 001.976-1.683L21 7M5 7h14M9 10v4m6-4v4"
            />
          </svg>
          <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Nenhum imóvel encontrado com o filtro selecionado
          </h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ajuste os filtros para visualizar outros resultados.
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Imóvel
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Cidade
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Valor
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Corretor
                </th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {#each properties as property}
                <tr class="{selectedProperty?.id === property.id ? 'bg-green-50/60 dark:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'} transition-colors">
                  <td class="px-6 py-4">
                    <div class="font-semibold text-gray-900 dark:text-white">{property.title}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      Código: {property.code ?? '—'} • Tipo: {property.type}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {property.city ?? '—'}{#if property.state} / {property.state}{/if}
                  </td>
                  <td class="px-6 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {property.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—'}
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold {statusBadgeClasses(property.status)}">
                      {humanizeStatus(property.status)}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <div class="font-medium text-gray-800 dark:text-gray-100">
                      {property.broker_name ?? '—'}
                    </div>
                    {#if property.broker_phone}
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {property.broker_phone}
                      </div>
                    {/if}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex flex-col items-end gap-2 sm:flex-row">
                      <button
                        class="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-400 dark:text-green-200 dark:hover:bg-green-900/40"
                        on:click={() => updatePropertyStatus(property, 'approve')}
                        disabled={property.status === 'approved'}
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Aprovar
                      </button>
                      <button
                        class="inline-flex items-center justify-center gap-2 rounded-md border border-red-500 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-900/40"
                        on:click={() => updatePropertyStatus(property, 'reject')}
                        disabled={property.status === 'rejected'}
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rejeitar
                      </button>
                      <button
                        class="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500"
                        on:click={() => handleSelectProperty(property)}
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0A9 9 0 113 12a9 9 0 0118 0z" />
                        </svg>
                        Detalhes
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <div class="space-y-4">
      {#if selectedProperty}
        <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <header class="mb-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Editar imóvel #{selectedProperty.id}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {selectedProperty.title}
                </p>
              </div>
              <button
                class="rounded-md bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                on:click={resetSelection}
                aria-label="Fechar painel de edição"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Status atual: {humanizeStatus(selectedProperty.status)}
            </p>
          </header>

          {#if detailError}
            <div class="mb-4 rounded-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
              {detailError}
            </div>
          {/if}

          <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label for="property-title" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                <input
                  id="property-title"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.title}
                  on:input={(event) => handleInputChange('title', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('title')}
                  required
                />
              </div>
              <div class="md:col-span-2">
                <label for="property-description" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                <textarea
                  id="property-description"
                  rows="3"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.description}
                  on:input={(event) =>
                    handleInputChange('description', (event.target as HTMLTextAreaElement).value)}
                  disabled={isFieldDisabled('description')}
                ></textarea>
              </div>
              <div>
                <label for="property-type" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                <input
                  id="property-type"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.type}
                  on:input={(event) => handleInputChange('type', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('type')}
                  required
                />
              </div>
              <div>
                <label for="property-purpose" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Finalidade</label>
                <input
                  id="property-purpose"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.purpose}
                  on:input={(event) =>
                    handleInputChange('purpose', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('purpose')}
                />
              </div>
              <div>
                <label for="property-code" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Código</label>
                <input
                  id="property-code"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.code}
                  on:input={(event) => handleInputChange('code', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('code')}
                />
              </div>
              <div>
                <label for="property-price" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Preço</label>
                <input
                  id="property-price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.price}
                  on:input={(event) =>
                    handleInputChange('price', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('price')}
                  required
                />
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label for="property-address" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Endereço</label>
                <input
                  id="property-address"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.address}
                  on:input={(event) =>
                    handleInputChange('address', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('address')}
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="property-quadra" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Quadra</label>
                  <input
                    id="property-quadra"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    bind:value={formData.quadra}
                    on:input={(event) =>
                      handleInputChange('quadra', (event.target as HTMLInputElement).value)}
                    disabled={isFieldDisabled('quadra')}
                  />
                </div>
                <div>
                  <label for="property-lote" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Lote</label>
                  <input
                    id="property-lote"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    bind:value={formData.lote}
                    on:input={(event) =>
                      handleInputChange('lote', (event.target as HTMLInputElement).value)}
                    disabled={isFieldDisabled('lote')}
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="property-numero" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
                  <input
                    id="property-numero"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    bind:value={formData.numero}
                    on:input={(event) =>
                      handleInputChange('numero', (event.target as HTMLInputElement).value)}
                    disabled={isFieldDisabled('numero')}
                  />
                </div>
                <div>
                  <label for="property-complemento" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Complemento</label>
                  <input
                    id="property-complemento"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    bind:value={formData.complemento}
                    on:input={(event) =>
                      handleInputChange('complemento', (event.target as HTMLInputElement).value)}
                    disabled={isFieldDisabled('complemento')}
                  />
                </div>
              </div>
              <div>
                <label for="property-bairro" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bairro</label>
                <input
                  id="property-bairro"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.bairro}
                  on:input={(event) =>
                    handleInputChange('bairro', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('bairro')}
                />
              </div>
              <div>
                <label for="property-tipo-lote" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Lote</label>
                <input
                  id="property-tipo-lote"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.tipo_lote}
                  on:input={(event) =>
                    handleInputChange('tipo_lote', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('tipo_lote')}
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="property-city" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Cidade</label>
                  <input
                    id="property-city"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    bind:value={formData.city}
                    on:input={(event) =>
                      handleInputChange('city', (event.target as HTMLInputElement).value)}
                    disabled={isFieldDisabled('city')}
                  />
                </div>
                <div>
                  <label for="property-state" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                  <input
                    id="property-state"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    bind:value={formData.state}
                    on:input={(event) =>
                      handleInputChange('state', (event.target as HTMLInputElement).value)}
                    disabled={isFieldDisabled('state')}
                  />
                </div>
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-3">
              <div>
                <label for="property-bedrooms" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Dormitórios</label>
                <input
                  id="property-bedrooms"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.bedrooms}
                  on:input={(event) =>
                    handleInputChange('bedrooms', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('bedrooms')}
                />
              </div>
              <div>
                <label for="property-bathrooms" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Banheiros</label>
                <input
                  id="property-bathrooms"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.bathrooms}
                  on:input={(event) =>
                    handleInputChange('bathrooms', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('bathrooms')}
                />
              </div>
              <div>
                <label for="property-garage-spots" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vagas</label>
                <input
                  id="property-garage-spots"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.garage_spots}
                  on:input={(event) =>
                    handleInputChange('garage_spots', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('garage_spots')}
                />
              </div>
              <div>
                <label for="property-area-construida" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Área construída (m²)</label>
                <input
                  id="property-area-construida"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.area_construida}
                  on:input={(event) =>
                    handleInputChange('area_construida', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('area_construida')}
                />
              </div>
              <div>
                <label for="property-area-terreno" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Área do terreno (m²)</label>
                <input
                  id="property-area-terreno"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.area_terreno}
                  on:input={(event) =>
                    handleInputChange('area_terreno', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('area_terreno')}
                />
              </div>
              <div>
                <label for="property-valor-condominio" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor do condomínio</label>
                <input
                  id="property-valor-condominio"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.valor_condominio}
                  on:input={(event) =>
                    handleInputChange('valor_condominio', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('valor_condominio')}
                />
              </div>
              <div>
                <label for="property-valor-iptu" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor do IPTU</label>
                <input
                  id="property-valor-iptu"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.valor_iptu}
                  on:input={(event) =>
                    handleInputChange('valor_iptu', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('valor_iptu')}
                />
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-3">
              {#each [
                { key: 'has_wifi', label: 'Wi-Fi' },
                { key: 'tem_piscina', label: 'Piscina' },
                { key: 'tem_energia_solar', label: 'Energia solar' },
                { key: 'tem_automacao', label: 'Automação' },
                { key: 'tem_ar_condicionado', label: 'Ar condicionado' },
                { key: 'eh_mobiliada', label: 'Mobiliada' }
              ] as feature}
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900"
                    checked={Boolean(formData[feature.key as keyof Property])}
                    on:change={(event) =>
                      handleBooleanChange(
                        feature.key as keyof Property,
                        (event.target as HTMLInputElement).checked
                      )}
                    disabled={isFieldDisabled(feature.key as keyof Property)}
                  />
                  {feature.label}
                </label>
              {/each}
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label for="property-video-url" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">URL do vídeo</label>
                <input
                  id="property-video-url"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.video_url}
                  on:input={(event) =>
                    handleInputChange('video_url', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('video_url')}
                />
              </div>
              <div>
                <label for="property-status" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status do imóvel</label>
                <select
                  id="property-status"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.status}
                  on:change={(event) =>
                    handleInputChange('status', (event.target as HTMLSelectElement).value)}
                >
                  {#each STATUS_OPTIONS.slice(1) as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div>
                <label for="property-sale-value" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor da venda</label>
                <input
                  id="property-sale-value"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.sale_value}
                  on:input={(event) =>
                    handleInputChange('sale_value', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('sale_value')}
                />
              </div>
              <div>
                <label for="property-commission-rate" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Taxa de comissão (%)</label>
                <input
                  id="property-commission-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.commission_rate}
                  on:input={(event) =>
                    handleInputChange('commission_rate', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('commission_rate')}
                />
              </div>
              <div>
                <label for="property-commission-value" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor da comissão</label>
                <input
                  id="property-commission-value"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  bind:value={formData.commission_value}
                  on:input={(event) =>
                    handleInputChange('commission_value', (event.target as HTMLInputElement).value)}
                  disabled={isFieldDisabled('commission_value')}
                />
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                on:click={resetSelection}
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                disabled={isSaving}
              >
                {#if isSaving}
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                {/if}
                Salvar alterações
              </button>
            </div>
          </form>
        </section>
        <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">Imagens do imóvel</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Visualize, remova ou inclua novas imagens na galeria.
              </p>
            </div>
          </header>

          {#if imagesLoading}
            <div class="mb-4 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Processando imagens...
            </div>
          {/if}

          {#if selectedProperty.images && selectedProperty.images.length > 0}
            <div class="grid gap-4 sm:grid-cols-2">
              {#each selectedProperty.images as image}
                <div class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <img
                    src={image.url}
                    alt={`Imagem do imóvel ${selectedProperty?.title ?? ''}`}
                    class="h-40 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                  <button
                    class="w-full rounded-md border border-red-500 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-900/40"
                    on:click={() => removeImage(image)}
                    type="button"
                  >
                    Remover imagem
                  </button>
                </div>
              {/each}
            </div>
          {:else}
            <div class="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Nenhuma imagem cadastrada para este imóvel.
            </div>
          {/if}

          <div class="mt-4 space-y-3">
            <div>
              <label for="property-image-upload" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Adicionar novas imagens
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                on:change={handleImageSelection}
                bind:this={imageInput}
                disabled={imagesLoading}
                id="property-image-upload"
              />
            </div>
            <div class="flex justify-end">
              <button
                class="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                type="button"
                on:click={uploadImages}
                disabled={imageFiles.length === 0 || imagesLoading}
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v8m-4-4h8" />
                </svg>
                Enviar imagens
              </button>
            </div>
          </div>
        </section>
      {:else if propertyLoading}
        <div class="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Carregando detalhes do imóvel...
        </div>
      {:else}
        <div class="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Selecione um imóvel para visualizar detalhes e realizar alterações.
        </div>
      {/if}
    </div>
  </div>
</section>
