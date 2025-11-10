<script lang="ts">
  import { navigate } from 'svelte-routing';
  import { api } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';
  import { Loader2 } from 'lucide-svelte';
  import type { Property, PropertyImage } from '$lib/types';

  export let params: { id?: string } = {};
  let propertyId = '';
  let property: Property | null = null;
  let isLoading = true;
  let isProcessing = false;
  let error = '';
  let lastLoadedId = '';

  $: currentRouteId = params?.id ?? '';
  $: if (currentRouteId !== lastLoadedId) {
    if (!currentRouteId) {
      propertyId = '';
      property = null;
      error = 'ID do imóvel não encontrado.';
      isLoading = false;
      lastLoadedId = currentRouteId;
    } else {
      propertyId = currentRouteId;
      lastLoadedId = currentRouteId;
      void fetchProperty(propertyId);
    }
  }

  async function fetchProperty(id: string) {
    isLoading = true;
    error = '';
    property = null;

    try {
      property = await api.get<Property>(`/admin/properties/${id}`);
    } catch (err) {
      console.error('Erro ao buscar detalhes do imóvel:', err);
      error = 'Erro ao buscar detalhes do imóvel.';
    } finally {
      isLoading = false;
    }
  }

  function formatCurrency(value?: number | null) {
    if (value == null || Number.isNaN(Number(value))) {
      return '-';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  }

  function normalizeImages(images?: PropertyImage[] | string[]) {
    if (!images) return [];
    return images.map((image, index) => {
      if (typeof image === 'string') {
        return { id: index, url: image };
      }
      return image;
    });
  }

  async function handleStatusUpdate(newStatus: 'approved' | 'rejected') {
    if (!property) return;

    isProcessing = true;
    try {
      await api.patch(`/admin/properties/${property.id}/status`, { status: newStatus });
      toast.success(`Imóvel ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'}!`);
      navigate('/admin/properties');
    } catch (err) {
      console.error('Falha ao atualizar status do imóvel:', err);
      toast.error('Falha ao atualizar o status.');
    } finally {
      isProcessing = false;
    }
  }
</script>

<div class="mx-auto max-w-5xl space-y-6 p-6">
  <Button variant="outline" on:click={() => navigate('/admin/properties')}>
    ← Voltar
  </Button>

  {#if isLoading}
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-700 dark:text-gray-300">Carregando detalhes...</p>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {error}
    </div>
  {:else if property}
    <div class="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Imóvel #{property.id}</p>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{property.title}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {property.city ?? '-'}{#if property.state} / {property.state}{/if}
          </p>
        </div>
        <div class="flex gap-2">
          {#if property.status !== 'approved'}
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
          {#if property.status !== 'rejected'}
            <Button variant="destructive" on:click={() => handleStatusUpdate('rejected')} disabled={isProcessing}>
              {#if isProcessing}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Rejeitar
            </Button>
          {/if}
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-sm text-gray-500 dark:text-gray-400">Status atual</p>
        <p class="text-lg font-semibold capitalize text-gray-900 dark:text-gray-100">{property.status}</p>
      </div>

      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Valor divulgado</p>
        <p class="text-2xl font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(property.price)}
        </p>
      </div>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria</h2>
        {#if normalizeImages(property.images).length > 0}
          <div class="flex gap-3 overflow-x-auto rounded-md bg-gray-50 p-3 dark:bg-gray-800/60">
            {#each normalizeImages(property.images) as image (image.id ?? image.url)}
              <img
                src={image.url}
                alt="Foto do imóvel"
                class="h-40 w-auto rounded-md object-cover shadow"
                loading="lazy"
              />
            {/each}
          </div>
        {:else}
          <p class="text-sm text-gray-600 dark:text-gray-300">Nenhuma imagem cadastrada.</p>
        {/if}
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Descrição</h2>
        <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {property.description ?? 'Sem descrição.'}
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Detalhes</h2>
        <ul class="grid gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
          <li><strong>Tipo:</strong> {property.type ?? 'N/A'}</li>
          <li><strong>Finalidade:</strong> {property.purpose ?? 'N/A'}</li>
          <li><strong>Quartos:</strong> {property.bedrooms ?? 'N/A'}</li>
          <li><strong>Banheiros:</strong> {property.bathrooms ?? 'N/A'}</li>
          <li><strong>Área construída:</strong> {property.area_construida ?? 'N/A'} m²</li>
          <li><strong>Área terreno:</strong> {property.area_terreno ?? 'N/A'} m²</li>
          <li><strong>Corretor:</strong> {property.broker_name ?? '-'}</li>
          <li><strong>Telefone:</strong> {property.broker_phone ?? '-'}</li>
        </ul>
      </section>
    </div>
  {/if}
</div>
