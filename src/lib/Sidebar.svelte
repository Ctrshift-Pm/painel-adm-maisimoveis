<script lang="ts">
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

  function isValidView(view: string): view is View {
    return validViews.includes(view as View);
  }

  function handleNavigation(view: string) {
    if (isValidView(view)) {
      onNavigate(view);
    } else {
      console.error(`Tentativa de navegar para view invalida: ${view}`);
      onNavigate('dashboard');
    }
  }
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
  <nav class="flex-1 px-4 py-4 space-y-2">
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'dashboard' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('dashboard')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
      </svg>
      Dashboard
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'properties' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('properties')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-4h1m-1 4h1m-1-8h1m-5 8h1m-1-4h1"
        ></path>
      </svg>
      Imóveis
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'sold_properties' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('sold_properties')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Imóveis vendidos
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'create_property' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('create_property')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Cadastrar Imóvel
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'create_user' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('create_user')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v6m3-3h-6M5 7a4 4 0 118 0 4 4 0 01-8 0zm-2 14a6 6 0 0112 0"></path>
      </svg>
      Cadastrar Usuário
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'property_requests' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('property_requests')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a1 1 0 00-1-1h-2a1 1 0 00-1 1v2H10V3a1 1 0 00-1-1H7a1 1 0 00-1 1v2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        ></path>
      </svg>
      Solicitações (Imóveis)
      {#if pendingCounts.propertyRequests > 0}
        <span class="ml-auto inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
          {pendingCounts.propertyRequests}
        </span>
      {/if}
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'brokers' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('brokers')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        ></path>
      </svg>
      Corretores
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'clients' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('clients')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"
        ></path>
      </svg>
      Clientes
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'verification' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
      on:click={() => handleNavigation('verification')}
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      Solicitações de Corretores
      {#if pendingCounts.brokerRequests > 0}
        <span class="ml-auto inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
          {pendingCounts.brokerRequests}
        </span>
      {/if}
    </button>
    <button
      class="w-full text-left flex items-center px-4 py-2 rounded-lg transition {activeView === 'notifications' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white'}"
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
      Notificações
    </button>
  </nav>
  <div class="px-4 py-4 border-t border-white/10 space-y-4">
    <ThemeToggle />
    <button
      on:click={() => authToken.set(null)}
      class="w-full flex items-center justify-center px-4 py-2 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-colors"
    >
      <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Sair
    </button>
  </div>
</aside>
