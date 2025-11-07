<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { baseURL } from '../api';
  import { authToken } from '../store';

  interface Client {
    id: number;
    name?: string | null;
    email?: string | null;
  }

  const API_BASE = `${baseURL}/admin`;

  let clients: Client[] = [];
  let clientsLoading = false;
  let clientsError: string | null = null;

  let selectedRecipient = 'all';
  let message = '';
  let isSubmitting = false;
  let feedback: { type: 'success' | 'error'; text: string } | null = null;

  onMount(loadClients);

  async function loadClients() {
    clientsLoading = true;
    clientsError = null;

    const token = get(authToken);
    if (!token) {
      clientsError = 'Sessão expirada. Faça login novamente.';
      clientsLoading = false;
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Não foi possível carregar os clientes.');
      }

      const payload = await response.json();
      const raw = payload?.data ?? payload ?? [];

      clients = Array.isArray(raw)
        ? raw
            .map((item: Record<string, unknown>) => ({
              id: Number(item.id),
              name: typeof item.name === 'string' ? item.name : null,
              email: typeof item.email === 'string' ? item.email : null
            }))
            .filter((client) => Number.isFinite(client.id))
        : [];
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      clientsError =
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro inesperado ao carregar os clientes.';
    } finally {
      clientsLoading = false;
    }
  }

  async function handleSubmit() {
    feedback = null;
    if (!message.trim()) {
      feedback = { type: 'error', text: 'A mensagem não pode estar vazia.' };
      return;
    }

    const token = get(authToken);
    if (!token) {
      feedback = { type: 'error', text: 'Sessão expirada. Faça login novamente.' };
      return;
    }

    isSubmitting = true;
    try {
      const payload = {
        message: message.trim(),
        recipientId: selectedRecipient === 'all' ? null : Number(selectedRecipient)
      };

      const response = await fetch(`${API_BASE}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Não foi possível enviar a notificação.');
      }

      feedback = { type: 'success', text: 'Notificação enviada com sucesso!' };
      message = '';
      selectedRecipient = 'all';
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      feedback = {
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro ao enviar a notificação.'
      };
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Enviar Notificação
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Envie uma mensagem manual para clientes específicos ou para todos os usuários do sistema.
      </p>
    </div>

    <form class="px-6 py-6 space-y-5" on:submit|preventDefault={handleSubmit}>
      <div class="space-y-2">
        <label for="recipient" class="text-sm font-medium text-gray-700 dark:text-gray-200">
          Destinatário
        </label>

        {#if clientsLoading}
          <div class="text-sm text-gray-500 dark:text-gray-400">Carregando clientes...</div>
        {:else if clientsError}
          <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-200">
            {clientsError}
          </div>
        {:else}
          <select
            id="recipient"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            bind:value={selectedRecipient}
            disabled={isSubmitting}
          >
            <option value="all">Todos os clientes (broadcast)</option>
            {#if clients.length === 0}
              <option value="" disabled>Nenhum cliente disponível</option>
            {:else}
              {#each clients as client}
                <option value={client.id.toString()}>
                  {(client.name && client.name.trim()) ? client.name : 'Cliente sem nome'}
                  {#if client.email} ({client.email}){/if}
                </option>
              {/each}
            {/if}
          </select>
        {/if}
      </div>

      <div class="space-y-2">
        <label for="message" class="text-sm font-medium text-gray-700 dark:text-gray-200">
          Mensagem
        </label>
        <textarea
          id="message"
          class="w-full min-h-[140px] resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          bind:value={message}
          placeholder="Digite a mensagem que será enviada aos clientes..."
          rows={6}
          maxlength={2000}
          disabled={isSubmitting}
        ></textarea>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          A mensagem será entregue imediatamente aos destinatários selecionados.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-gray-900"
          disabled={isSubmitting || clientsLoading || Boolean(clientsError)}
        >
          {#if isSubmitting}
            Enviando...
          {:else}
            Enviar Notificação
          {/if}
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-offset-gray-900"
          on:click={() => {
            message = '';
            selectedRecipient = 'all';
            feedback = null;
          }}
          disabled={isSubmitting}
        >
          Limpar
        </button>
      </div>
    </form>
  </div>

  {#if feedback}
    <div
      class={`rounded-md px-4 py-3 text-sm ${
        feedback.type === 'success'
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
      }`}
    >
      {feedback.text}
    </div>
  {/if}
</div>
