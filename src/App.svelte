<script lang="ts">
  import Login from './lib/Login.svelte';
  import Dashboard from './lib/Dashboard.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { authToken, theme } from './lib/store';
  import type { View } from './lib/types';

  $: {
    if (typeof window !== 'undefined') {
      const isDark =
        $theme === 'dark' ||
        ($theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }

  let initialView: View = 'dashboard';
  if (typeof window !== 'undefined' && window.location.pathname === '/admin/properties') {
    initialView = 'properties';
  }
</script>

<main class="min-h-screen bg-slate-950 text-slate-100 bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)]">
  {#if $authToken}
    <Dashboard {initialView} />
  {:else}
    <Login />
  {/if}
</main>

<Toaster />
