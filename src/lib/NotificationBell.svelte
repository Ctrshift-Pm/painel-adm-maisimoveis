<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { api } from '$lib/apiClient';
  import { authToken } from './store';
  import type { Notification } from './types';

  let isOpen = false;
  let isLoading = false;
  let notifications: Notification[] = [];
  let totalCount = 0;
  let error: string | null = null;
  let hasFetched = false;
  let container: HTMLDivElement | null = null;
  let pollingId: ReturnType<typeof setInterval> | null = null;

  function toggle() {
    isOpen = !isOpen;
    if (isOpen && !hasFetched) {
      fetchNotifications();
    }
  }

  function close() {
    isOpen = false;
  }

  function formatDate(value: string): string {
    try {
      return new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return value;
    }
  }

  function badgeLabel(type: Notification['related_entity_type']): string {
    if (type === 'property') return 'Imóveis';
    if (type === 'broker') return 'Corretor';
    if (type === 'agency') return 'Imobiliária';
    if (type === 'user') return 'Usuário';
    return 'Aviso';
  }
  async function fetchNotifications() {
    const token = get(authToken);
    if (!token) {
      error = 'Sessão expirada. Faça login novamente.';
      return;
    }

    isLoading = true;
    error = null;

    try {
      const payload = await api.get<{
        data?: Notification[];
        total?: number;
      } | { notifications?: Notification[] } | Notification[]>('/admin/notifications?limit=10&page=1');
      if (Array.isArray(payload)) {
        notifications = payload;
        totalCount = payload.length;
      } else if (payload && 'data' in payload && Array.isArray(payload.data)) {
        notifications = payload.data;
        totalCount = Number(payload.total ?? payload.data.length);
      } else if (payload && 'notifications' in payload && Array.isArray(payload.notifications)) {
        notifications = payload.notifications;
        totalCount = payload.notifications.length;
      } else {
        notifications = Array.isArray(payload) ? payload : [];
        totalCount = notifications.length;
      }
      hasFetched = true;
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
      error =
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar as notificações.';
    } finally {
      isLoading = false;
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (!container) return;
    if (!container.contains(event.target as Node)) {
      close();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside, true);
    pollingId = setInterval(() => {
      if (isOpen) {
        fetchNotifications();
      }
    }, 60000);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      if (pollingId) {
        clearInterval(pollingId);
      }
    };
  });
</script>

<div class="relative" bind:this={container}>
  <button
    class="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
    on:click={toggle}
    aria-haspopup="true"
    aria-expanded={isOpen}
    aria-label="Notificações"
  >
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
    {#if totalCount > 0}
      <span class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
        {totalCount > 9 ? '9+' : totalCount}
      </span>
    {/if}
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 z-50 mt-3 w-80 max-w-xs rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
      role="dialog"
      aria-label="Notificações do administrador"
    >
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Notificações</h3>
        <button
          class="rounded-md bg-gray-100 p-1 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          on:click={close}
          aria-label="Fechar notificações"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="max-h-72 overflow-y-auto px-4 py-3">
        {#if isLoading}
          <div class="flex items-center justify-center py-6 text-sm text-gray-500 dark:text-gray-400">
            Carregando notificações...
          </div>
        {:else if error}
          <div class="rounded-md bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-200">
            {error}
          </div>
        {:else if notifications.length === 0}
          <div class="flex flex-col items-center justify-center gap-1 py-6 text-sm text-gray-500 dark:text-gray-400">
            <svg class="h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Nenhuma notificação por aqui.
          </div>
        {:else}
          <ul class="space-y-3">
            {#each notifications as item}
              <li class="rounded-lg border border-gray-100 px-3 py-3 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700/70">
                <div class="flex items-center justify-between">
                  <span class="rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {badgeLabel(item.related_entity_type)}
                  </span>
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(item.created_at)}
                  </span>
                </div>
                <p class="mt-2 text-sm text-gray-700 dark:text-gray-100">{item.message}</p>
                {#if item.related_entity_id}
                  <span class="mt-2 inline-block text-[11px] text-gray-400 dark:text-gray-500">
                    ID relacionado: {item.related_entity_id}
                  </span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  {/if}
</div>
