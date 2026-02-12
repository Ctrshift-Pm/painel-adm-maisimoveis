<script lang="ts">
  import { onMount } from 'svelte';
  import { authToken } from './store';
  import ThemeToggle from './ThemeToggle.svelte';
  import type { View } from './types';
  import encontreaquiimoveis from '../static/logo_principal.svg';

  export let isOpen = false;
  export let activeView: View;
  export let onNavigate: (view: View) => void = () => {};
  export let pendingCounts: {
    propertyRequests: number;
    brokerRequests: number;
  } = { propertyRequests: 0, brokerRequests: 0 };

  const validViews: View[] = [
    'dashboard',
    'properties',
    'property_requests',
    'sold_properties',
    'create_property',
    'create_user',
    'brokers',
    'clients',
    'verification',
    'notifications'
  ];

  type GroupKey = 'imoveis' | 'usuarios' | 'verificacao';

  const imoveisItems = [
    {
      view: 'properties',
      label: 'Imoveis',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1m-1-8h1m-5 8h1m-1-4h1" />`
    },
    {
      view: 'sold_properties',
      label: 'Imoveis vendidos',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`
    },
    {
      view: 'create_property',
      label: 'Cadastrar Imovel',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />`
    },
    {
      view: 'property_requests',
      label: 'Solicitacoes (Imoveis)',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a1 1 0 00-1-1h-2a1 1 0 00-1 1v2H10V3a1 1 0 00-1-1H7a1 1 0 00-1 1v2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />`
    }
  ] as const;

  const usuariosItems = [
    {
      view: 'brokers',
      label: 'Corretores',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />`
    },
    {
      view: 'clients',
      label: 'Clientes',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />`
    },
    {
      view: 'create_user',
      label: 'Cadastrar Usuario',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v6m3-3h-6M5 7a4 4 0 118 0 4 4 0 01-8 0zm-2 14a6 6 0 0112 0" />`
    }
  ] as const;

  const verificacaoItems = [
    {
      view: 'verification',
      label: 'Solicitacoes de Corretores',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />`
    }
  ] as const;

  const storageKey = 'sidebar_open_groups';

  let openGroups: Record<GroupKey, boolean> = {
    imoveis: false,
    usuarios: false,
    verificacao: false
  };

  const navItemBase =
    'w-full text-left flex items-center px-4 py-2 rounded-lg transition';
  const navItemActive =
    'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20';
  const navItemInactive =
    'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white';

  const groupButtonBase =
    'w-full text-left flex items-center justify-between px-4 py-2 rounded-lg transition text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white';

  function isValidView(view: string): view is View {
    return validViews.includes(view as View);
  }

  function persistOpenGroups() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(openGroups));
  }

  function toggleGroup(group: GroupKey) {
    openGroups = { ...openGroups, [group]: !openGroups[group] };
    persistOpenGroups();
  }

  function getGroupForView(view: View | string | null): GroupKey | null {
    if (!view || !isValidView(view)) return null;
    if (imoveisItems.some((item) => item.view === view)) return 'imoveis';
    if (usuariosItems.some((item) => item.view === view)) return 'usuarios';
    if (verificacaoItems.some((item) => item.view === view)) return 'verificacao';
    return null;
  }

  function updateHash(view: View) {
    if (typeof window === 'undefined') return;
    if (window.location.hash.replace('#', '') === view) return;
    window.location.hash = view;
  }

  function handleNavigation(view: string) {
    if (isValidView(view)) {
      onNavigate(view);
      updateHash(view);
    } else {
      console.error(`Tentativa de navegar para view invalida: ${view}`);
      onNavigate('dashboard');
      updateHash('dashboard');
    }
  }

  function navItemClass(view: View, extra = '') {
    return `${navItemBase} ${activeView === view ? navItemActive : navItemInactive} ${extra}`.trim();
  }

  function handleHashChange() {
    if (typeof window === 'undefined') return;
    const hashView = window.location.hash.replace('#', '');
    if (hashView && isValidView(hashView) && hashView !== activeView) {
      onNavigate(hashView);
    }
  }

  $: {
    const activeGroup = getGroupForView(activeView);
    if (activeGroup && !openGroups[activeGroup]) {
      openGroups = { ...openGroups, [activeGroup]: true };
      persistOpenGroups();
    }
  }

  onMount(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Record<GroupKey, boolean>>;
        openGroups = { ...openGroups, ...parsed };
      } catch {
        // ignore corrupt storage
      }
    }

    const hashView = window.location.hash.replace('#', '');
    if (hashView && isValidView(hashView)) {
      onNavigate(hashView);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });
</script>

<div
  class="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden {isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
  on:click={() => (isOpen = false)}
  on:keydown|self={(e) => {
    if (e.key === 'Enter' || e.key === ' ') isOpen = false;
  }}
  role="button"
  tabindex="0"
  aria-label="Fechar menu"
></div>

<aside
  class="fixed inset-y-0 left-0 z-30 w-64 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 {isOpen ? 'translate-x-0' : '-translate-x-full'} bg-white text-slate-900 border-r border-slate-200 shadow-lg shadow-black/5 dark:bg-slate-950 dark:text-white dark:border-white/5 dark:shadow-xl dark:shadow-black/40"
>
  <div class="h-16 flex items-center px-4 border-b border-slate-200 dark:border-white/5">
    <div class="w-full">
      <div
        class="flex items-center justify-center h-12 w-full rounded-xl bg-white ring-1 ring-black/10 dark:bg-white/95 dark:ring-black/5 overflow-hidden"
      >
        <img
          src={encontreaquiimoveis}
          alt="Encontre Aqui Imoveis"
          class="h-10 w-auto max-w-[90%] object-contain"
          loading="lazy"
          draggable="false"
        />
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
    <nav class="space-y-2">
    <button
      class={navItemClass('dashboard')}
      on:click={() => handleNavigation('dashboard')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
      Dashboard
    </button>

    <div class="space-y-1">
      <button
        class={groupButtonBase}
        on:click={() => toggleGroup('imoveis')}
        aria-expanded={openGroups.imoveis}
      >
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7h6l2 2h10a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"
            />
          </svg>
          Imoveis
        </span>
        <span class="flex items-center gap-2">
          {#if !openGroups.imoveis && pendingCounts.propertyRequests > 0}
            <span class="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {pendingCounts.propertyRequests}
            </span>
          {/if}
          <svg
            class="h-4 w-4 transition-transform {openGroups.imoveis ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {#if openGroups.imoveis}
        <div class="space-y-1">
          {#each imoveisItems as item}
            <button
              class={navItemClass(item.view, 'pl-10')}
              on:click={() => handleNavigation(item.view)}
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html item.icon}
              </svg>
              {item.label}
              {#if item.view === 'property_requests' && pendingCounts.propertyRequests > 0}
                <span
                  class="ml-auto inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                >
                  {pendingCounts.propertyRequests}
                </span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="space-y-1">
      <button
        class={groupButtonBase}
        on:click={() => toggleGroup('usuarios')}
        aria-expanded={openGroups.usuarios}
      >
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Usuarios
        </span>
        <svg
          class="h-4 w-4 transition-transform {openGroups.usuarios ? 'rotate-180' : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {#if openGroups.usuarios}
        <div class="space-y-1">
          {#each usuariosItems as item}
            <button
              class={navItemClass(item.view, 'pl-10')}
              on:click={() => handleNavigation(item.view)}
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html item.icon}
              </svg>
              {item.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="space-y-1">
      <button
        class={groupButtonBase}
        on:click={() => toggleGroup('verificacao')}
        aria-expanded={openGroups.verificacao}
      >
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Verificacao
        </span>
        <span class="flex items-center gap-2">
          {#if !openGroups.verificacao && pendingCounts.brokerRequests > 0}
            <span class="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {pendingCounts.brokerRequests}
            </span>
          {/if}
          <svg
            class="h-4 w-4 transition-transform {openGroups.verificacao ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {#if openGroups.verificacao}
        <div class="space-y-1">
          {#each verificacaoItems as item}
            <button
              class={navItemClass(item.view, 'pl-10')}
              on:click={() => handleNavigation(item.view)}
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html item.icon}
              </svg>
              {item.label}
              {#if pendingCounts.brokerRequests > 0}
                <span
                  class="ml-auto inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                >
                  {pendingCounts.brokerRequests}
                </span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <button
      class={navItemClass('notifications')}
      on:click={() => handleNavigation('notifications')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V6a2 2 0 00-2-2H3a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      Notificacoes
    </button>
    </nav>

    <div class="pt-4 border-t border-white/10 space-y-4">
      <ThemeToggle />
      <button
        on:click={() => authToken.set(null)}
        class="w-full flex items-center justify-center px-4 py-2 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-colors"
      >
        <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Sair
      </button>
    </div>
  </div>
</aside>
