<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import { formatCep, onlyDigits } from './create-property-helpers';

  type UserKind = 'client' | 'broker';

  const states = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS',
    'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC',
    'SE', 'SP', 'TO',
  ];

  let isSubmitting = false;
  let userKind: UserKind = 'client';

  let name = '';
  let email = '';
  let phone = '';
  let password = '';
  let creci = '';

  let street = '';
  let number = '';
  let complement = '';
  let bairro = '';
  let city = '';
  let state = 'GO';
  let cep = '';

  let creciFrontFile: File | null = null;
  let creciBackFile: File | null = null;
  let selfieFile: File | null = null;

  function resetForm() {
    name = '';
    email = '';
    phone = '';
    password = '';
    creci = '';
    street = '';
    number = '';
    complement = '';
    bairro = '';
    city = '';
    state = 'GO';
    cep = '';
    creciFrontFile = null;
    creciBackFile = null;
    selfieFile = null;
  }

  function readFile(event: Event): File | null {
    const target = event.target as HTMLInputElement;
    return target.files && target.files.length > 0 ? target.files[0] : null;
  }

  function validateCommonFields(): string | null {
    if (!name.trim()) return 'Informe o nome.';
    if (!email.trim()) return 'Informe o email.';
    if (!street.trim()) return 'Informe o endereço.';
    if (!number.trim()) return 'Informe o número.';
    if (!bairro.trim()) return 'Informe o bairro.';
    if (!city.trim()) return 'Informe a cidade.';
    if (!state.trim()) return 'Informe o estado.';
    if (!onlyDigits(cep).trim()) return 'Informe o CEP.';
    return null;
  }

  async function handleSubmit() {
    const commonError = validateCommonFields();
    if (commonError) {
      toast.error(commonError);
      return;
    }

    isSubmitting = true;
    try {
      if (userKind === 'client') {
        await api.post('/admin/users', {
          name: name.trim(),
          email: email.trim(),
          phone: onlyDigits(phone),
          password: password.trim() || undefined,
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim() || undefined,
          bairro: bairro.trim(),
          city: city.trim(),
          state: state.trim(),
          cep: onlyDigits(cep),
        });
        toast.success('Cliente cadastrado com sucesso.');
        resetForm();
        return;
      }

      if (!creci.trim()) {
        toast.error('Informe o CRECI para o corretor.');
        return;
      }
      if (!creciFrontFile || !creciBackFile || !selfieFile) {
        toast.error('Envie os 3 documentos: frente do CRECI, verso do CRECI e selfie.');
        return;
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('phone', onlyDigits(phone));
      if (password.trim()) {
        formData.append('password', password.trim());
      }
      formData.append('creci', creci.trim());
      formData.append('street', street.trim());
      formData.append('number', number.trim());
      if (complement.trim()) {
        formData.append('complement', complement.trim());
      }
      formData.append('bairro', bairro.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('cep', onlyDigits(cep));
      formData.append('creciFront', creciFrontFile);
      formData.append('creciBack', creciBackFile);
      formData.append('selfie', selfieFile);

      await api.post('/admin/brokers', formData);
      toast.success('Corretor cadastrado com sucesso.');
      resetForm();
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Cadastrar usuário</h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Selecione o tipo de usuário. Para corretor, CRECI e os 3 documentos são obrigatórios.
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Tipo de usuário
      <select
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={userKind}
      >
        <option value="client">Cliente</option>
        <option value="broker">Corretor</option>
      </select>
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Nome
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={name}
        placeholder="Nome completo"
      />
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Email
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        type="email"
        bind:value={email}
        placeholder="email@dominio.com"
      />
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Telefone
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={phone}
        inputmode="numeric"
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          phone = onlyDigits(target.value);
        }}
        placeholder="Somente números"
      />
    </label>

    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Senha (opcional)
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        type="password"
        bind:value={password}
        placeholder="Senha inicial"
      />
    </label>

    {#if userKind === 'broker'}
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        CRECI
        <input
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={creci}
          placeholder="Número do CRECI"
        />
      </label>
    {/if}
  </div>

  <div class="mt-6 grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Endereço
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={street}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Número
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={number}
      />
    </label>
    <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      Complemento
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={complement}
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
      CEP
      <input
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        bind:value={cep}
        inputmode="numeric"
        placeholder="00000-000"
        on:input={(event) => {
          const target = event.target as HTMLInputElement;
          cep = formatCep(target.value);
        }}
      />
    </label>
  </div>

  {#if userKind === 'broker'}
    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Documento CRECI (frente)
        <input
          type="file"
          accept="image/*"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          on:change={(event) => {
            creciFrontFile = readFile(event);
          }}
        />
      </label>
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Documento CRECI (verso)
        <input
          type="file"
          accept="image/*"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          on:change={(event) => {
            creciBackFile = readFile(event);
          }}
        />
      </label>
      <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Selfie
        <input
          type="file"
          accept="image/*"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          on:change={(event) => {
            selfieFile = readFile(event);
          }}
        />
      </label>
    </div>
  {/if}

  <div class="mt-6 flex justify-end">
    <button
      type="button"
      class="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      on:click={handleSubmit}
      disabled={isSubmitting}
    >
      {isSubmitting ? 'Salvando...' : 'Cadastrar usuário'}
    </button>
  </div>
</div>
