<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import type { Broker } from '$lib/types';
  import {
    formatCep,
    formatCurrencyInput,
    normalizeDecimal,
    onlyDigits,
    resolveCreatePropertyPrices,
    sanitizeDecimalInput,
    sanitizeDigitsInput,
  } from '$lib/components/create-property-helpers';

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
  let ownerName = '';
  let ownerPhone = '';
  let address = '';
  let city = '';
  let state = 'GO';
  let cep = '';
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
  let brokerId = '';
  let brokerPhone = '';
  let selectedBroker: Broker | null = null;

  let imagesInput: HTMLInputElement | null = null;
  let videoInput: HTMLInputElement | null = null;
  let images: FileList | null = null;
  let video: File | null = null;
  let isSubmitting = false;

  const cityCache: Record<string, string[]> = {};
  let cities: string[] = [];
  let citiesLoading = false;
  let citiesError: string | null = null;
  let cepLookupError: string | null = null;
  let lastCepLookup = '';

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

  async function fetchCitiesForState(uf: string) {
    if (!uf) {
      cities = [];
      return;
    }
    if (cityCache[uf]) {
      cities = cityCache[uf];
      return;
    }
    citiesLoading = true;
    citiesError = null;
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
      );
      if (!response.ok) throw new Error('Falha ao carregar cidades.');
      const payload = await response.json();
      const names = Array.isArray(payload)
        ? payload.map((item) => String(item?.nome ?? '')).filter(Boolean)
        : [];
      cities = names.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      cityCache[uf] = cities;
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
      citiesError = 'Não foi possível carregar cidades.';
      cities = [];
    } finally {
      citiesLoading = false;
    }
  }

  async function lookupCep(value: string) {
    const digits = onlyDigits(value);
    if (digits.length !== 8) return;
    if (digits === lastCepLookup) return;
    lastCepLookup = digits;
    cepLookupError = null;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('Falha ao consultar CEP.');
      const data = await response.json();
      if (data?.erro) return;
      if (data?.uf) {
        state = String(data.uf);
        await fetchCitiesForState(state);
      }
      if (data?.localidade) {
        city = String(data.localidade);
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      cepLookupError = 'CEP não encontrado.';
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!title.trim() || !type || !purpose || !address.trim() || !city.trim() || !state || !cep.trim()) {
      toast.error('Preencha título, tipo, finalidade, endereço, CEP, cidade e estado.');
      return;
    }

    const {
      error,
      price,
      priceSale: resolvedSale,
      priceRent: resolvedRent,
    } = resolveCreatePropertyPrices(purpose, priceSale, priceRent);
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
    form.append('cep', onlyDigits(cep));
    if (ownerName.trim()) form.append('owner_name', ownerName.trim());
    if (ownerPhone.trim()) form.append('owner_phone', ownerPhone.trim());
    form.append('description', description.trim() || 'Sem descrição informada.');
    if (bairro.trim()) form.append('bairro', bairro.trim());
    if (numero.trim()) form.append('numero', numero.trim());
    if (quadra.trim()) form.append('quadra', quadra.trim());
    if (lote.trim()) form.append('lote', lote.trim());
    if (complemento.trim()) form.append('complemento', complemento.trim());
    if (tipoLote.trim()) form.append('tipo_lote', tipoLote.trim());
    if (brokerId) form.append('broker_id', brokerId);

    if (price != null) form.append('price', String(price));
    if (resolvedSale != null) form.append('price_sale', String(resolvedSale));
    if (resolvedRent != null) form.append('price_rent', String(resolvedRent));

    const parsedBedrooms = bedrooms ? Number(bedrooms) : null;
    if (parsedBedrooms != null && Number.isFinite(parsedBedrooms)) {
      form.append('bedrooms', String(parsedBedrooms));
    }
    const parsedBathrooms = bathrooms ? Number(bathrooms) : null;
    if (parsedBathrooms != null && Number.isFinite(parsedBathrooms)) {
      form.append('bathrooms', String(parsedBathrooms));
    }
    const parsedGarage = garageSpots ? Number(garageSpots) : null;
    if (parsedGarage != null && Number.isFinite(parsedGarage)) {
      form.append('garage_spots', String(parsedGarage));
    }
    const parsedAreaConstruida = normalizeDecimal(areaConstruida);
    if (parsedAreaConstruida != null)
      form.append('area_construida', String(parsedAreaConstruida));
    const parsedAreaTerreno = normalizeDecimal(areaTerreno);
    if (parsedAreaTerreno != null) form.append('area_terreno', String(parsedAreaTerreno));

    if (images && images.length > 0) {
      Array.from(images).forEach((file) => form.append('images', file));
    }
    if (video) {
      form.append('video', video);
    }

    isSubmitting = true;
    try {
      if (brokerId) {
        const broker =
          selectedBroker ?? brokers.find((item) => item.id === Number(brokerId)) ?? null;
        if (broker && brokerPhone.trim() !== (broker.phone ?? '')) {
          try {
            await api.put(`/admin/brokers/${brokerId}`, {
              name: broker.name,
              email: broker.email,
              phone: brokerPhone.trim(),
            });
            brokers = brokers.map((entry) =>
              entry.id === Number(brokerId)
                ? { ...entry, phone: brokerPhone.trim() }
                : entry
            );
          } catch (updateBrokerError) {
            console.error('Erro ao atualizar telefone do corretor:', updateBrokerError);
            toast.warning('Não foi possível atualizar o telefone do corretor. O imóvel será enviado mesmo assim.');
          }
        }
      }
      await apiClient.post('/admin/properties', form);
      toast.success('Imóvel criado com sucesso.');
      title = '';
      description = '';
      purpose = 'Venda';
      type = 'Casa';
      status = 'pending_approval';
      priceSale = '';
      priceRent = '';
      ownerName = '';
      ownerPhone = '';
      address = '';
      city = '';
      state = 'GO';
      cep = '';
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
      brokerId = '';
      brokerPhone = '';
      selectedBroker = null;
      images = null;
      video = null;
      if (imagesInput) imagesInput.value = '';
      if (videoInput) videoInput.value = '';
    } catch (error) {
      console.error('Erro ao criar imóvel:', error);
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      const backendMessage = apiError?.response?.data?.error ?? apiError?.response?.data?.message;
      toast.error(backendMessage || 'Não foi possível criar o imóvel.');
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    fetchBrokers();
    fetchCitiesForState(state);
  });

  function handleBrokerChange(value: string) {
    brokerId = value;
    const broker = brokers.find((item) => item.id === Number(value)) ?? null;
    selectedBroker = broker;
    brokerPhone = broker?.phone ?? '';
  }
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

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Proprietário do imóvel
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={ownerName}
            placeholder="Nome do proprietário"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Telefone do proprietário
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={ownerPhone}
            inputmode="numeric"
            placeholder="Telefone do proprietário"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              ownerPhone = sanitizeDigitsInput(target.value);
            }}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Corretor responsável
            <select
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={brokerId}
              on:change={(event) => handleBrokerChange((event.target as HTMLSelectElement).value)}
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
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Telefone do corretor responsável
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={brokerPhone}
            inputmode="numeric"
            placeholder="Telefone do corretor"
            disabled={!brokerId}
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              brokerPhone = sanitizeDigitsInput(target.value);
            }}
          />
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
              inputmode="numeric"
              placeholder="R$ 450.000,00"
              on:input={(event) => {
                const target = event.target as HTMLInputElement;
                priceSale = formatCurrencyInput(target.value);
              }}
            />
          </label>
        {/if}
        {#if purpose !== 'Venda'}
          <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Preço do aluguel
            <input
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={priceRent}
              inputmode="numeric"
              placeholder="R$ 2.500,00"
              on:input={(event) => {
                const target = event.target as HTMLInputElement;
                priceRent = formatCurrencyInput(target.value);
              }}
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
            inputmode="numeric"
            pattern="\d*"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              bedrooms = sanitizeDigitsInput(target.value);
            }}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Banheiros
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={bathrooms}
            inputmode="numeric"
            pattern="\d*"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              bathrooms = sanitizeDigitsInput(target.value);
            }}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Garagens
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={garageSpots}
            inputmode="numeric"
            pattern="\d*"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              garageSpots = sanitizeDigitsInput(target.value);
            }}
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Área construída (m²)
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={areaConstruida}
            inputmode="decimal"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              areaConstruida = sanitizeDecimalInput(target.value);
            }}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Área do terreno (m²)
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={areaTerreno}
            inputmode="decimal"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              areaTerreno = sanitizeDecimalInput(target.value);
            }}
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
          Estado
          <select
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={state}
            on:change={() => fetchCitiesForState(state)}
          >
            {#each states as uf}
              <option value={uf}>{uf}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          CEP
          <input
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={cep}
            placeholder="00000-000"
            inputmode="numeric"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              cep = formatCep(target.value);
              if (onlyDigits(cep).length === 8) {
                lookupCep(cep);
              }
            }}
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Cidade
          <input
            list="cities-list"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={city}
            placeholder={citiesLoading ? 'Carregando cidades...' : 'Digite ou selecione'}
          />
          <datalist id="cities-list">
            {#each cities as option}
              <option value={option}></option>
            {/each}
          </datalist>
          {#if citiesError}
            <span class="text-xs text-red-500 dark:text-red-400">{citiesError}</span>
          {/if}
          {#if cepLookupError}
            <span class="text-xs text-red-500 dark:text-red-400">{cepLookupError}</span>
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
