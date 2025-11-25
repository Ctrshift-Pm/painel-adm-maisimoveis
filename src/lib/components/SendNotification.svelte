<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { api } from '$lib/apiClient';
  import { authToken } from '../store';

  interface Client {
    id: number;
    name?: string | null;
    email?: string | null;
  }

  const RECIPIENT_FIELD_ID = 'recipient';

  let clients: Client[] = [];
  let clientsLoading = false;
  let clientsError: string | null = null;

  let sendToAll = true;
  let selectedRecipients = new Set<string>();
  let message = '';
  let isSubmitting = false;
  let feedback: { type: 'success' | 'error'; text: string } | null = null;

  onMount(loadClients);

  async function loadClients() {
    clientsLoading = true;
    clientsError = null;

    try {
      const response = await api.get<{ data?: Client[] } | Client[]>('/admin/users');
      const raw = Array.isArray(response) ? response : response?.data ?? [];

      if (Array.isArray(raw)) {
        const normalized = raw
          .map((item: any): Client => ({
            id: Number(item?.id),
            name: typeof item?.name === 'string' ? item.name : null,
            email: typeof item?.email === 'string' ? item.email : null
          }))
          .filter((client) => Number.isFinite(client.id));
        clients = normalized;
      } else {
        clients = [];
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      clientsError =
        error instanceof Error
          ? error.message
          : 'Falha ao carregar clientes.';
    } finally {
      clientsLoading = false;
    }
  }

  function toggleRecipient(id: string) {
    if (selectedRecipients.has(id)) {
      selectedRecipients.delete(id);
    } else {
      selectedRecipients.add(id);
    }
    selectedRecipients = new Set(selectedRecipients);
  }

  async function handleSubmit() {
    feedback = null;
    if (!message.trim()) {
      feedback = { type: 'error', text: 'A mensagem não pode estar vazia.' };
      return;
    }

    isSubmitting = true;
    try {
      const token = get(authToken);
      if (!token) {
        feedback = { type: 'error', text: 'Sessão expirada. Faça login novamente.' };
        isSubmitting = false;
        return;
      }

      const recipientIds =
        sendToAll || selectedRecipients.size === 0
          ? null
          : Array.from(selectedRecipients).map((id) => Number(id));

      const payload = {
        message: message.trim(),
        recipientIds
      };

      await api.post('/admin/notifications/send', payload);
      toast.success('Notificação enviada com sucesso!');
      feedback = { type: 'success', text: 'Notificação enviada com sucesso!' };
      message = '';
      selectedRecipients = new Set();
      sendToAll = true;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
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
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <input
            id="send-all"
            type="checkbox"
            class="rounded border-gray-300 text-green-600 shadow-sm focus:ring-green-500"
            bind:checked={sendToAll}
            disabled={isSubmitting}
          />
          <label for="send-all" class="text-sm font-medium text-gray-700 dark:text-gray-200">
            Enviar para todos os clientes
          </label>
        </div>

        {#if !sendToAll}
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200" for={RECIPIENT_FIELD_ID}>
            Selecionar clientes
          </label>
          {#if clientsLoading}
            <div class="text-sm text-gray-500 dark:text-gray-400">Carregando clientes...</div>
          {:else if clientsError}
            <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-200">
              {clientsError}
            </div>
          {:else if clients.length === 0}
            <div class="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente disponível.</div>
          {:else}
            <div class="max-h-48 overflow-y-auto rounded-md border border-gray-200 p-3 space-y-2 dark:border-gray-700">
              {#each clients as client}
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 text-green-600 shadow-sm focus:ring-green-500"
                    checked={selectedRecipients.has(client.id.toString())}
                    on:change={() => toggleRecipient(client.id.toString())}
                    disabled={isSubmitting}
                  />
                  <span>
                    {(client.name && client.name.trim()) ? client.name : 'Cliente sem nome'}
                    {#if client.email} ({client.email}){/if}
                  </span>
                </label>
              {/each}
            </div>
          {/if}
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
      selectedRecipients = new Set();
      sendToAll = true;
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
