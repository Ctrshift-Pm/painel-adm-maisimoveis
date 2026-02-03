<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import type { Broker } from '$lib/types';

  const propertyTypes = [
    'Casa',
    'Apartamento',
    'Terreno',
    'Propriedade Rural',
    'Propriedade Comercial'
  ];
  const purposes = ['Venda', 'Aluguel', 'Venda e Aluguel'];
  const states = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO'
  ];

  let brokers: Broker[] = [];
  let brokersLoading = false;
  let brokersError: string | null = null;

  let title = '';
  let description = '';
  let type = 'Casa';
  let purpose = 'Venda';
  let status = 'pending_approval';
  let priceSale = '';
  let priceRent = '';
  let address = '';
  let city = '';
  let state = 'GO';
  let bairro = '';
  let numero = '';
  let quadra = '';
  let lote = '';
  let complemento = '';
  let tipoLote = '';
  let bedrooms = '';
  let bathrooms = '';
  let garageSpots = '';
  let areaConstruida = '';
  let areaTerreno = '';
  let valorCondominio = '';
  let ownerName = '';
  let ownerPhone = '';
  let brokerId = '';

  let imagesInput: HTMLInputElement | null = null;
  let videoInput: HTMLInputElement | null = null;
  let images: FileList | null = null;
  let video: File | null = null;
  let isSubmitting = false;

  function normalizeNumber(value: string) {
    if (!value) return null;
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function resolvePrices() {
    const normalizedPurpose = purpose.toLowerCase();
    const supportsSale = normalizedPurpose.includes('vend');
    const supportsRent = normalizedPurpose.includes('alug');
    const saleValue = normalizeNumber(priceSale);
    const rentValue = normalizeNumber(priceRent);

    if (supportsSale && (!saleValue || saleValue <= 0)) {
      return { error: 'Informe o preço de venda.' };
    }
    if (supportsRent && (!rentValue || rentValue <= 0)) {
      return { error: 'Informe o preço do aluguel.' };
    }

    if (supportsSale && supportsRent) {
      if (!saleValue || !rentValue) {
        return { error: 'Informe os preços de venda e aluguel.' };
      }
      return {
        price: saleValue,
        priceSale: saleValue,
        priceRent: rentValue
      };
    }

    if (supportsSale) {
      return { price: saleValue, priceSale: saleValue };
    }
    if (supportsRent) {
      return { price: rentValue, priceRent: rentValue };
    }
    return { error: 'Finalidade inválida.' };
  }

  async function fetchBrokers() {
    brokersLoading = true;
    brokersError = null;
    try {
      const params = new URLSearchParams();
      params.append('status', 'approved');
      params.append('page', '1');
      params.append('limit', '200');
      const response = await api.get<{ data?: Broker[]; total?: number } | Broker[]>(
        `/admin/brokers?${params.toString()}`
      );
      const data = Array.isArray(response) ? response : response?.data;
      brokers = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar corretores:', error);
      brokersError = 'Não foi possível carregar corretores aprovados.';
    } finally {
      brokersLoading = false;
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!title.trim() || !type || !purpose || !address.trim() || !city.trim() || !state) {
      toast.error('Preencha título, tipo, finalidade, endereço, cidade e estado.');
      return;
    }

    const { error, price, priceSale: resolvedSale, priceRent: resolvedRent } = resolvePrices();
    if (error) {
      toast.error(error);
      return;
    }

    const form = new FormData();
    form.append('title', title.trim());
    form.append('type', type);
    form.append('purpose', purpose);
    form.append('status', status);
    form.append('address', address.trim());
    form.append('city', city.trim());
    form.append('state', state);
    if (description.trim()) form.append('description', description.trim());
    if (bairro.trim()) form.append('bairro', bairro.trim());
    if (numero.trim()) form.append('numero', numero.trim());
    if (quadra.trim()) form.append('quadra', quadra.trim());
    if (lote.trim()) form.append('lote', lote.trim());
    if (complemento.trim()) form.append('complemento', complemento.trim());
    if (tipoLote.trim()) form.append('tipo_lote', tipoLote.trim());
    if (ownerName.trim()) form.append('owner_name', ownerName.trim());
    if (ownerPhone.trim()) form.append('owner_phone', ownerPhone.trim());
    if (brokerId) form.append('broker_id', brokerId);

    if (price != null) form.append('price', String(price));
    if (resolvedSale != null) form.append('price_sale', String(resolvedSale));
    if (resolvedRent != null) form.append('price_rent', String(resolvedRent));

    const parsedBedrooms = normalizeNumber(bedrooms);
    if (parsedBedrooms != null) form.append('bedrooms', String(parsedBedrooms));
    const parsedBathrooms = normalizeNumber(bathrooms);
    if (parsedBathrooms != null) form.append('bathrooms', String(parsedBathrooms));
    const parsedGarage = normalizeNumber(garageSpots);
    if (parsedGarage != null) form.append('garage_spots', String(parsedGarage));
    const parsedAreaConstruida = normalizeNumber(areaConstruida);
    if (parsedAreaConstruida != null)
      form.append('area_construida', String(parsedAreaConstruida));
    const parsedAreaTerreno = normalizeNumber(areaTerreno);
    if (parsedAreaTerreno != null) form.append('area_terreno', String(parsedAreaTerreno));
    const parsedCondo = normalizeNumber(valorCondominio);
    if (parsedCondo != null) form.append('valor_condominio', String(parsedCondo));

    if (images && images.length > 0) {
      Array.from(images).forEach((file) => form.append('images', file));
    }
    if (video) {
      form.append('video', video);
    }

    isSubmitting = true;
    try {
      await apiClient.post('/admin/properties', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Imóvel criado com sucesso.');
      title = '';
      description = '';
      purpose = 'Venda';
      type = 'Casa';
      status = 'pending_approval';
      priceSale = '';
      priceRent = '';
      address = '';
      city = '';
      state = 'GO';
      bairro = '';
      numero = '';
      quadra = '';
      lote = '';
      complemento = '';
      tipoLote = '';
      bedrooms = '';
      bathrooms = '';
      garageSpots = '';
      areaConstruida = '';
      areaTerreno = '';
      valorCondominio = '';
      ownerName = '';
      ownerPhone = '';
      brokerId = '';
      images = null;
      video = null;
      if (imagesInput) imagesInput.value = '';
      if (videoInput) videoInput.value = '';
    } catch (error) {
      console.error('Erro ao criar imóvel:', error);
      toast.error('Não foi possível criar o imóvel.');
    } finally {
      isSubmitting = false;
    }
  }

  onMount(fetchBrokers);
</script>

<div class="space-y-6">
  <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Cadastrar imóvel</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Preencha os dados principais do imóvel, envie fotos e finalize o cadastro.
      </p>
    </div>
    <div class="space-y-6 p-6">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Título
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={title}
            placeholder="Ex: Casa no Canaã 2"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Tipo
          <select
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={type}
          >
            {#each propertyTypes as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Finalidade
          <select
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={purpose}
          >
            {#each purposes as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Status inicial
          <select
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={status}
          >
            <option value="pending_approval">Pendente</option>
            <option value="approved">Aprovado</option>
          </select>
        </label>
      </div>

      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Descrição
        <textarea
          class="min-h-[110px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={description}
          placeholder="Descreva o imóvel"
        ></textarea>
      </label>

      <div class="grid gap-4 md:grid-cols-2">
        {#if purpose !== 'Aluguel'}
          <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Preço de venda
            <input
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={priceSale}
              placeholder="Ex: 450000"
            />
          </label>
        {/if}
        {#if purpose !== 'Venda'}
          <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Preço do aluguel
            <input
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={priceRent}
              placeholder="Ex: 2500"
            />
          </label>
        {/if}
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Quartos
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={bedrooms}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Banheiros
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={bathrooms}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Garagens
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={garageSpots}
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Área construída (m²)
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={areaConstruida}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Área do terreno (m²)
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={areaTerreno}
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Endereço
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={address}
            placeholder="Rua, avenida, etc."
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Número
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={numero}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Bairro
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={bairro}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Cidade
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={city}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Estado
          <select
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={state}
          >
            {#each states as uf}
              <option value={uf}>{uf}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Condomínio (opcional)
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={valorCondominio}
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Nome do proprietário
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={ownerName}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Telefone do proprietário
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={ownerPhone}
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Corretor responsável (opcional)
          <select
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={brokerId}
          >
            <option value="">Sem corretor</option>
            {#if brokersLoading}
              <option disabled>Carregando...</option>
            {:else}
              {#each brokers as broker}
                <option value={broker.id}>{broker.name}</option>
              {/each}
            {/if}
          </select>
          {#if brokersError}
            <span class="text-xs text-red-500 dark:text-red-400">{brokersError}</span>
          {/if}
        </label>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="create-images-input">
          Fotos do imóvel
        </label>
        <input
          id="create-images-input"
          bind:this={imagesInput}
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          type="file"
          accept="image/*"
          multiple
          on:change={(e) => {
            const target = e.target as HTMLInputElement;
            images = target.files;
          }}
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="create-video-input">
          Vídeo (opcional)
        </label>
        <input
          id="create-video-input"
          bind:this={videoInput}
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          type="file"
          accept="video/*"
          on:change={(e) => {
            const target = e.target as HTMLInputElement;
            video = target.files && target.files.length > 0 ? target.files[0] : null;
          }}
        />
      </div>

      <div class="flex justify-end">
        <Button on:click={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Cadastrar imóvel'}
        </Button>
      </div>
    </div>
  </div>
</div>
