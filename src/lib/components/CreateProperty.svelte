<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { api, apiClient } from '$lib/apiClient';
  import { Button } from '$lib/components/ui/button';
  import type { Broker } from '$lib/types';
  import {
    formatCep,
    formatCurrencyInput,
    formatPhoneBr,
    hasValidPhoneBr,
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
    'Flat',
    'Condomínio Fechado',
    'Área rural',
    'Rancho',
    'Galpão / Barracão',
    'Chácara',
    'Imóvel comercial',
    'Área comercial',
    'Cobertura / Penthouse',
    'Sobrado',
    'Kitnet',
    'Sala comercial',
    'Empresa',
    'Prédio',
  ];
  const purposes = ['Venda', 'Aluguel', 'Venda e Aluguel'];
  const lotTypes = ['meio', 'inteiro'];
  const MAX_IMAGE_SIZE_MB = 15;
  const MAX_VIDEO_SIZE_MB = 100;
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
  const IMAGE_OPTIMIZATION_MIN_BYTES = 1024 * 1024;
  const IMAGE_OPTIMIZATION_MAX_DIMENSION = 1920;
  const IMAGE_OPTIMIZATION_QUALITY = 0.82;
  const IMAGE_UPLOAD_BATCH_SIZE = 4;
  const CREATE_REQUEST_TIMEOUT_MS = 420000;
  const VIDEO_REQUEST_TIMEOUT_MS = 600000;
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
  let status = 'approved';
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
  let semNumero = false;
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
  let brokerQuery = '';
  let brokerSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let brokerDropdownOpen = false;
  let selectedBroker: Broker | null = null;

  let imagesInput: HTMLInputElement | null = null;
  let videoInput: HTMLInputElement | null = null;
  let selectedImages: File[] = [];
  let imagePreviewUrls: string[] = [];
  let video: File | null = null;
  let videoPreviewUrl: string | null = null;
  let isImageDropActive = false;
  let isVideoDropActive = false;
  let isSubmitting = false;
  let uploadProgress = 0;
  let uploadStatus = '';
  let hasWifi = false;
  let temPiscina = false;
  let temEnergiaSolar = false;
  let temAutomacao = false;
  let temArCondicionado = false;
  let ehMobiliada = false;

  const cityCache: Record<string, string[]> = {};
  let cities: string[] = [];
  let citiesLoading = false;
  let citiesError: string | null = null;
  let cepLookupError: string | null = null;
  let lastCepLookup = '';

  async function fetchBrokers(searchTerm = '') {
    brokersLoading = true;
    brokersError = null;
    try {
      const params = new URLSearchParams();
      params.append('status', 'approved');
      params.append('page', '1');
      params.append('limit', '20');
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch.length >= 2) {
        params.append('search', trimmedSearch);
      }
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

  function clearBrokerSelection() {
    brokerId = '';
    brokerPhone = '';
    selectedBroker = null;
    brokerQuery = '';
  }

  function selectBroker(broker: Broker) {
    selectedBroker = broker;
    brokerId = String(broker.id);
    brokerPhone = formatPhoneBr(broker.phone ?? '');
    brokerQuery = broker.name ?? '';
    brokerDropdownOpen = false;
  }

  function handleBrokerQueryInput(value: string) {
    brokerQuery = value;
    brokerDropdownOpen = true;
    if (selectedBroker && value.trim() !== (selectedBroker.name ?? '').trim()) {
      brokerId = '';
      selectedBroker = null;
      brokerPhone = '';
    }
    if (brokerSearchTimer) {
      clearTimeout(brokerSearchTimer);
    }
    brokerSearchTimer = setTimeout(() => {
      fetchBrokers(value);
    }, 300);
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
      if (data?.logradouro) {
        address = String(data.logradouro);
      }
      if (data?.bairro) {
        bairro = String(data.bairro);
      }
      if (data?.localidade) {
        city = String(data.localidade);
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      cepLookupError = 'CEP não encontrado.';
    }
  }

  function revokeImagePreviews() {
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    imagePreviewUrls = [];
  }

  function refreshImagePreviews() {
    revokeImagePreviews();
    imagePreviewUrls = selectedImages.map((file) => URL.createObjectURL(file));
  }

  function loadImageFromObjectUrl(objectUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao processar imagem.'));
      image.src = objectUrl;
    });
  }

  async function optimizeImageForUpload(file: File): Promise<File> {
    const isImage = file.type.startsWith('image/');
    const isOptimizableType = !['image/gif', 'image/svg+xml'].includes(file.type);

    if (!isImage || !isOptimizableType || file.size < IMAGE_OPTIMIZATION_MIN_BYTES) {
      return file;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImageFromObjectUrl(objectUrl);
      const originalWidth = image.naturalWidth || image.width;
      const originalHeight = image.naturalHeight || image.height;

      if (!originalWidth || !originalHeight) {
        return file;
      }

      const resizeRatio = Math.min(
        1,
        IMAGE_OPTIMIZATION_MAX_DIMENSION / originalWidth,
        IMAGE_OPTIMIZATION_MAX_DIMENSION / originalHeight
      );
      const targetWidth = Math.max(1, Math.round(originalWidth * resizeRatio));
      const targetHeight = Math.max(1, Math.round(originalHeight * resizeRatio));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        return file;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', IMAGE_OPTIMIZATION_QUALITY);
      });

      if (!blob || blob.size >= file.size * 0.98) {
        return file;
      }

      return new File([blob], file.name, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      });
    } catch (error) {
      console.warn('Falha ao otimizar imagem, enviando original:', error);
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function addSelectedImages(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Selecione apenas arquivos de imagem.');
      return;
    }

    const current = [...selectedImages];
    const existingKeys = new Set(current.map((file) => `${file.name}:${file.lastModified}`));
    const candidates: File[] = [];
    const maxImages = 20;
    let ignoredCount = 0;

    for (const file of imageFiles) {
      if (current.length + candidates.length >= maxImages) {
        ignoredCount++;
        continue;
      }
      const fileKey = `${file.name}:${file.lastModified}`;
      if (existingKeys.has(fileKey)) {
        ignoredCount++;
        continue;
      }
      existingKeys.add(fileKey);
      candidates.push(file);
    }

    const optimizedImages = await Promise.all(candidates.map((file) => optimizeImageForUpload(file)));
    const compressedCount = optimizedImages.reduce((count, optimized, index) => {
      const original = candidates[index];
      return optimized.size < original.size ? count + 1 : count;
    }, 0);

    for (const optimizedFile of optimizedImages) {
      current.push(optimizedFile);
    }

    selectedImages = current;
    refreshImagePreviews();

    if (ignoredCount > 0) {
      toast.warning('Algumas imagens foram ignoradas por duplicidade ou limite de 20 arquivos.');
    }
    if (compressedCount > 0) {
      toast.success(`${compressedCount} imagem(ns) foram otimizadas para acelerar o envio.`);
    }
  }

  async function handleImagesChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    if (files.length === 0) return;
    await addSelectedImages(files);
    target.value = '';
  }

  async function handleImagesDrop(event: DragEvent) {
    event.preventDefault();
    isImageDropActive = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    await addSelectedImages(files);
  }

  function removeSelectedImage(index: number) {
    selectedImages = selectedImages.filter((_, fileIndex) => fileIndex !== index);
    refreshImagePreviews();
  }

  function revokeVideoPreview() {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      videoPreviewUrl = null;
    }
  }

  function setVideoFile(file: File | null) {
    revokeVideoPreview();
    video = file;
    videoPreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  function handleVideoChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files && target.files.length > 0 ? target.files[0] : null;
    setVideoFile(file);
  }

  function handleVideoDrop(event: DragEvent) {
    event.preventDefault();
    isVideoDropActive = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    const videoFile = files.find((file) => file.type.startsWith('video/')) ?? null;
    if (!videoFile) {
      toast.error('Selecione um arquivo de video valido.');
      return;
    }
    setVideoFile(videoFile);
  }

  function clearVideoSelection() {
    video = null;
    revokeVideoPreview();
    if (videoInput) {
      videoInput.value = '';
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    const numeroDigits = onlyDigits(numero);
    const requiredMessage =
      !title.trim()
        ? 'Informe o título do imóvel.'
        : !description.trim()
          ? 'Informe a descrição do imóvel.'
          : !type
            ? 'Informe o tipo do imóvel.'
            : !purpose
              ? 'Informe a finalidade do imóvel.'
              : ownerPhone.trim() && !hasValidPhoneBr(ownerPhone)
                ? 'Informe o telefone do proprietário no formato (00)00000-0000.'
                : !address.trim()
                    ? 'Informe o endereço.'
                    : !semNumero && !numero.trim()
                      ? 'Informe o número do endereço ou marque "Sem número".'
                      : !semNumero && numeroDigits.length === 0
                        ? 'Número do endereço deve conter apenas dígitos.'
                        : !bairro.trim()
                          ? 'Informe o bairro.'
                          : cep.trim() && onlyDigits(cep).length !== 8
                            ? 'Informe um CEP válido.'
                            : !city.trim()
                              ? 'Informe a cidade.'
                              : !state.trim()
                                ? 'Informe o estado.'
                                : !quadra.trim()
                                  ? 'Informe a quadra.'
                                  : !lote.trim()
                                    ? 'Informe o lote.'
                                    : !tipoLote.trim()
                                      ? 'Informe o tipo do lote.'
                                      : !bedrooms.trim()
                                        ? 'Informe a quantidade de quartos.'
                                        : !bathrooms.trim()
                                          ? 'Informe a quantidade de banheiros.'
                                          : !garageSpots.trim()
                                            ? 'Informe a quantidade de garagens.'
                                            : !areaConstruida.trim()
                                              ? 'Informe a área construída.'
                                    : !areaTerreno.trim()
                                        ? 'Informe a área do terreno.'
                                        : null;
    if (requiredMessage) {
      toast.error(requiredMessage);
      return;
    }

    if (selectedImages.length < 1) {
      toast.error('Envie pelo menos 1 imagem do imóvel.');
      return;
    }
    if (selectedImages.length > 20) {
      toast.error('Limite máximo de 20 imagens por imóvel.');
      return;
    }
    const oversizedImage = selectedImages.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversizedImage) {
      toast.error(
        `A imagem "${oversizedImage.name}" excede ${MAX_IMAGE_SIZE_MB}MB. Reduza o arquivo e tente novamente.`
      );
      return;
    }
    if (video && video.size > MAX_VIDEO_SIZE_BYTES) {
      toast.error(`O vídeo excede ${MAX_VIDEO_SIZE_MB}MB. Reduza o arquivo e tente novamente.`);
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
    if (ownerPhone.trim()) form.append('owner_phone', onlyDigits(ownerPhone));
    form.append('description', description.trim());
    form.append('bairro', bairro.trim());
    form.append('sem_numero', semNumero ? '1' : '0');
    if (semNumero) {
      // Compatibilidade com backends legados que exigem "numero" não vazio.
      form.append('numero', '0');
    } else {
      form.append('numero', numeroDigits);
    }
    form.append('quadra', quadra.trim());
    form.append('lote', lote.trim());
    if (complemento.trim()) form.append('complemento', complemento.trim());
    form.append('tipo_lote', tipoLote.trim());
    if (brokerId) form.append('broker_id', brokerId);

    if (price != null) form.append('price', String(price));
    if (resolvedSale != null) form.append('price_sale', String(resolvedSale));
    if (resolvedRent != null) form.append('price_rent', String(resolvedRent));
    form.append('has_wifi', hasWifi ? '1' : '0');
    form.append('tem_piscina', temPiscina ? '1' : '0');
    form.append('tem_energia_solar', temEnergiaSolar ? '1' : '0');
    form.append('tem_automacao', temAutomacao ? '1' : '0');
    form.append('tem_ar_condicionado', temArCondicionado ? '1' : '0');
    form.append('eh_mobiliada', ehMobiliada ? '1' : '0');

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

    const primaryImage = selectedImages[0] ?? null;
    const remainingImages = selectedImages.slice(1);
    if (primaryImage) {
      form.append('images', primaryImage);
    }

    isSubmitting = true;
    uploadProgress = 0;
    uploadStatus = 'Enviando...';
    try {
      const syncBrokerPhoneIfNeeded = async () => {
        if (!brokerId) return;
        const broker =
          selectedBroker ?? brokers.find((item) => item.id === Number(brokerId)) ?? null;
        if (!broker || onlyDigits(brokerPhone) === onlyDigits(broker.phone ?? '')) {
          return;
        }
        try {
          await api.put(`/admin/brokers/${brokerId}`, {
            name: broker.name,
            email: broker.email,
            phone: onlyDigits(brokerPhone),
          });
          brokers = brokers.map((entry) =>
            entry.id === Number(brokerId)
              ? { ...entry, phone: onlyDigits(brokerPhone) }
              : entry
          );
        } catch (updateBrokerError) {
          console.error('Erro ao atualizar telefone do corretor:', updateBrokerError);
          toast.warning(
            'Não foi possível atualizar o telefone do corretor. O imóvel será enviado mesmo assim.'
          );
        }
      };

      const createResponse = await apiClient.post<{ propertyId?: number }>('/admin/properties', form, {
        timeout: CREATE_REQUEST_TIMEOUT_MS,
        onUploadProgress: (event) => {
          if (!event.total) {
            uploadStatus = 'Criando imóvel...';
            return;
          }
          uploadProgress = Math.round((event.loaded / event.total) * 100);
          uploadStatus = `Criando imóvel... ${uploadProgress}%`;
        },
      });

      const propertyId = Number(createResponse?.data?.propertyId ?? 0);
      if (remainingImages.length > 0 && Number.isFinite(propertyId) && propertyId > 0) {
        uploadStatus = 'Enviando fotos adicionais...';
        uploadProgress = 0;
        let uploadedImages = 0;
        let failedImages = 0;
        for (let index = 0; index < remainingImages.length; index += IMAGE_UPLOAD_BATCH_SIZE) {
          const batch = remainingImages.slice(index, index + IMAGE_UPLOAD_BATCH_SIZE);
          const batchForm = new FormData();
          batch.forEach((file) => batchForm.append('images', file));
          try {
            await apiClient.post(`/admin/properties/${propertyId}/images`, batchForm, {
              timeout: CREATE_REQUEST_TIMEOUT_MS,
              onUploadProgress: (event) => {
                if (!event.total) {
                  return;
                }
                const batchProgress = event.loaded / event.total;
                const totalProgress = (uploadedImages + batch.length * batchProgress) / remainingImages.length;
                uploadProgress = Math.round(totalProgress * 100);
                uploadStatus = `Enviando fotos adicionais... ${uploadProgress}%`;
              },
            });
            uploadedImages += batch.length;
          } catch (imageUploadError) {
            failedImages += batch.length;
            console.error('Erro ao enviar lote de imagens:', imageUploadError);
          }
        }
        if (failedImages > 0) {
          toast.warning(
            `${failedImages} foto(s) não foram enviadas. Abra o imóvel e tente enviar novamente as pendentes.`
          );
        }
      }

      if (video && Number.isFinite(propertyId) && propertyId > 0) {
        const videoForm = new FormData();
        videoForm.append('video', video);
        uploadStatus = 'Enviando vídeo...';
        uploadProgress = 0;
        try {
          await apiClient.post(`/admin/properties/${propertyId}/video`, videoForm, {
            timeout: VIDEO_REQUEST_TIMEOUT_MS,
            onUploadProgress: (event) => {
              if (!event.total) {
                uploadStatus = 'Enviando vídeo...';
                return;
              }
              uploadProgress = Math.round((event.loaded / event.total) * 100);
              uploadStatus = `Enviando vídeo... ${uploadProgress}%`;
            },
          });
        } catch (videoUploadError) {
          console.error('Erro ao enviar vídeo do imóvel:', videoUploadError);
          toast.warning('Imóvel criado, mas o vídeo não foi enviado. Edite o imóvel para tentar novamente.');
        }
      }

      void syncBrokerPhoneIfNeeded();
      toast.success('Imóvel criado com sucesso.');
      title = '';
      description = '';
      purpose = 'Venda';
      type = 'Casa';
      status = 'approved';
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
      semNumero = false;
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
      selectedImages = [];
      revokeImagePreviews();
      video = null;
      hasWifi = false;
      temPiscina = false;
      temEnergiaSolar = false;
      temAutomacao = false;
      temArCondicionado = false;
      ehMobiliada = false;
      if (imagesInput) imagesInput.value = '';
      clearVideoSelection();
    } catch (error) {
      console.error('Erro ao criar imóvel:', error);
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      const backendMessage = apiError?.response?.data?.error ?? apiError?.response?.data?.message;
      if (selectedImages.length > 0 && imagePreviewUrls.length === 0) {
        refreshImagePreviews();
      }
      if (video && !videoPreviewUrl) {
        videoPreviewUrl = URL.createObjectURL(video);
      }
      toast.error(backendMessage || 'Não foi possível criar o imóvel.');
    } finally {
      isSubmitting = false;
      uploadStatus = '';
    }
  }

  onMount(() => {
    fetchBrokers('');
    fetchCitiesForState(state);
  });

  onDestroy(() => {
    if (brokerSearchTimer) {
      clearTimeout(brokerSearchTimer);
    }
    revokeImagePreviews();
    revokeVideoPreview();
  });
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
          Título *
          <input
            id="create-property-title"
            name="title"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={title}
            placeholder="Ex: Casa no Canaã 2"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Tipo *
          <select
            id="create-property-type"
            name="type"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={type}
          >
            {#each propertyTypes as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Finalidade *
          <select
            id="create-property-purpose"
            name="purpose"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={purpose}
          >
            {#each purposes as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Status inicial *
          <select
            id="create-property-status"
            name="status"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={status}
          >
            <option value="approved">Aprovado</option>
            <option value="pending_approval">Pendente</option>
          </select>
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Proprietário do imóvel (opcional)
          <input
            id="create-property-owner-name"
            name="owner_name"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={ownerName}
            placeholder="Nome do proprietário"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Telefone do proprietário (opcional)
          <input
            id="create-property-owner-phone"
            name="owner_phone"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={ownerPhone}
            inputmode="numeric"
            placeholder="(00)00000-0000"
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              ownerPhone = formatPhoneBr(target.value);
            }}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Corretor responsável
          <div class="relative">
            <input
              id="create-property-broker-query"
              name="broker_query"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              bind:value={brokerQuery}
              placeholder="Digite ao menos 2 letras para buscar corretor"
              on:focus={() => (brokerDropdownOpen = true)}
              on:blur={() =>
                setTimeout(() => {
                  brokerDropdownOpen = false;
                }, 120)}
              on:input={(event) => {
                const target = event.target as HTMLInputElement;
                handleBrokerQueryInput(target.value);
              }}
            />
            {#if brokerDropdownOpen}
              <div class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <button
                  type="button"
                  class="w-full border-b border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  on:click={clearBrokerSelection}
                >
                  Sem corretor
                </button>
                {#if brokersLoading}
                  <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Buscando corretores...</p>
                {:else if brokers.length === 0}
                  <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum corretor encontrado.</p>
                {:else}
                  {#each brokers as broker}
                    <button
                      type="button"
                      class="w-full border-t border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                      on:click={() => selectBroker(broker)}
                    >
                      <span class="block font-medium text-gray-900 dark:text-gray-100">{broker.name}</span>
                      <span class="block text-xs text-gray-500 dark:text-gray-400">{broker.email} {broker.phone ? `· ${broker.phone}` : ''}</span>
                    </button>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>
          {#if selectedBroker}
            <span class="text-xs text-emerald-600 dark:text-emerald-400">
              Selecionado: {selectedBroker.name} (ID {selectedBroker.id})
            </span>
          {/if}
          {#if brokersError}
            <span class="text-xs text-red-500 dark:text-red-400">{brokersError}</span>
          {/if}
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Telefone do corretor responsável
          <input
            id="create-property-broker-phone"
            name="broker_phone"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={brokerPhone}
            inputmode="numeric"
            placeholder="(00)00000-0000"
            disabled={!brokerId}
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              brokerPhone = formatPhoneBr(target.value);
            }}
          />
        </label>
      </div>

      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Descrição *
        <textarea
          id="create-property-description"
          name="description"
          class="min-h-[110px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={description}
          placeholder="Descreva o imóvel"
        ></textarea>
      </label>

      <div class="grid gap-4 md:grid-cols-2">
        {#if purpose !== 'Aluguel'}
          <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Preço de venda *
            <input
              id="create-property-price-sale"
              name="price_sale_display"
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
            Preço do aluguel *
            <input
              id="create-property-price-rent"
              name="price_rent_display"
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
          Quartos *
          <input
            id="create-property-bedrooms"
            name="bedrooms"
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
          Banheiros *
          <input
            id="create-property-bathrooms"
            name="bathrooms"
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
          Garagens *
          <input
            id="create-property-garage-spots"
            name="garage_spots"
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
          Área construída (m²) *
          <input
            id="create-property-area-construida"
            name="area_construida"
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
          Área do terreno (m²) *
          <input
            id="create-property-area-terreno"
            name="area_terreno"
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
          CEP (opcional)
          <input
            id="create-property-cep"
            name="cep"
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
          {#if cepLookupError}
            <span class="text-xs text-red-500 dark:text-red-400">{cepLookupError}</span>
          {/if}
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Estado *
          <select
            id="create-property-state"
            name="state"
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
          Cidade *
          <input
            id="create-property-city"
            name="city"
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
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Endereço *
          <input
            id="create-property-address"
            name="address"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={address}
            placeholder="Rua, avenida, etc."
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Bairro *
          <input
            id="create-property-bairro"
            name="bairro"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={bairro}
          />
        </label>
        <div class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <label for="numero-input">Número {semNumero ? '(opcional)' : '*'}</label>
          <input
            id="numero-input"
            name="numero"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900"
            bind:value={numero}
            inputmode="numeric"
            disabled={semNumero}
            on:input={(event) => {
              const target = event.target as HTMLInputElement;
              numero = sanitizeDigitsInput(target.value);
            }}
          />
          <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              id="create-property-sem-numero"
              name="sem_numero"
              class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              bind:checked={semNumero}
              on:change={() => {
                if (semNumero) numero = '';
              }}
            />
            Sem número
          </label>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-4">
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Quadra *
          <input
            id="create-property-quadra"
            name="quadra"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={quadra}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Lote *
          <input
            id="create-property-lote"
            name="lote"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={lote}
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Tipo do lote *
          <select
            id="create-property-tipo-lote"
            name="tipo_lote"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={tipoLote}
          >
            <option value="">Selecione</option>
            {#each lotTypes as lotType}
              <option value={lotType}>{lotType}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Complemento (opcional)
          <input
            id="create-property-complemento"
            name="complemento"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={complemento}
            placeholder="Apartamento, bloco, referência..."
          />
        </label>
      </div>

      <div class="rounded-md border border-gray-200 p-4 dark:border-gray-700">
        <p class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">Comodidades</p>
        <div class="grid gap-3 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2 lg:grid-cols-3">
          <label class="inline-flex items-center gap-2">
            <input id="create-property-has-wifi" name="has_wifi" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" bind:checked={hasWifi} />
            Wi-Fi
          </label>
          <label class="inline-flex items-center gap-2">
            <input id="create-property-tem-piscina" name="tem_piscina" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" bind:checked={temPiscina} />
            Piscina
          </label>
          <label class="inline-flex items-center gap-2">
            <input id="create-property-tem-energia-solar" name="tem_energia_solar" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" bind:checked={temEnergiaSolar} />
            Energia solar
          </label>
          <label class="inline-flex items-center gap-2">
            <input id="create-property-tem-automacao" name="tem_automacao" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" bind:checked={temAutomacao} />
            Automação
          </label>
          <label class="inline-flex items-center gap-2">
            <input id="create-property-tem-ar-condicionado" name="tem_ar_condicionado" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" bind:checked={temArCondicionado} />
            Ar condicionado
          </label>
          <label class="inline-flex items-center gap-2">
            <input id="create-property-eh-mobiliada" name="eh_mobiliada" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" bind:checked={ehMobiliada} />
            Mobiliada
          </label>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="create-images-input">
          Fotos do imóvel *
        </label>
        <div
          class={`rounded-md border-2 border-dashed p-3 transition ${
            isImageDropActive
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
          }`}
          role="group"
          aria-label="Envio de imagens do imóvel"
          on:dragover|preventDefault={() => (isImageDropActive = true)}
          on:dragenter|preventDefault={() => (isImageDropActive = true)}
          on:dragleave={() => (isImageDropActive = false)}
          on:drop={handleImagesDrop}
        >
          <input
            id="create-images-input"
            name="images"
            bind:this={imagesInput}
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            type="file"
            accept="image/*"
            multiple
            on:change={handleImagesChange}
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Arraste e solte imagens aqui ou clique para selecionar.
          </p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Mínimo de 1 imagem e máximo de 20. Tamanho máximo por imagem: {MAX_IMAGE_SIZE_MB}MB.
        </p>
        {#if selectedImages.length > 0}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {#each selectedImages as file, index}
              <div class="rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
                <div class="aspect-[4/3] overflow-hidden rounded">
                  {#if imagePreviewUrls[index]}
                    <img
                      src={imagePreviewUrls[index]}
                      alt={file.name}
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                  {/if}
                </div>
                <p class="mt-2 truncate text-xs text-gray-600 dark:text-gray-300">{file.name}</p>
                <button
                  type="button"
                  class="mt-2 w-full rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600"
                  on:click={() => removeSelectedImage(index)}
                >
                  Remover
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="create-video-input">
          Vídeo (opcional)
        </label>
        <div
          class={`rounded-md border-2 border-dashed p-3 transition ${
            isVideoDropActive
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
          }`}
          role="group"
          aria-label="Envio de video do imóvel"
          on:dragover|preventDefault={() => (isVideoDropActive = true)}
          on:dragenter|preventDefault={() => (isVideoDropActive = true)}
          on:dragleave={() => (isVideoDropActive = false)}
          on:drop={handleVideoDrop}
        >
          <input
            id="create-video-input"
            name="video"
            bind:this={videoInput}
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            type="file"
            accept="video/*"
            on:change={handleVideoChange}
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Arraste e solte um video aqui ou clique para selecionar.
          </p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Tamanho máximo do vídeo: {MAX_VIDEO_SIZE_MB}MB.
        </p>
        {#if videoPreviewUrl}
          <div class="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            <video src={videoPreviewUrl} controls class="max-h-64 w-full rounded-md bg-black">
              <track kind="captions" srclang="pt-BR" label="Sem legendas disponíveis" />
            </video>
            <button
              type="button"
              class="mt-3 rounded-md bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600"
              on:click={clearVideoSelection}
            >
              Remover vídeo
            </button>
          </div>
        {/if}
      </div>

      <div class="flex justify-end">
        <Button on:click={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Cadastrar imóvel'}
        </Button>
      </div>
      {#if uploadStatus}
        <p class="text-xs text-gray-500 dark:text-gray-400">{uploadStatus}</p>
      {/if}
    </div>
  </div>
</div>
