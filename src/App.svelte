<script lang="ts">
  import { Router, Route } from 'svelte-routing';
  import Login from './lib/Login.svelte';
  import Dashboard from './lib/Dashboard.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { authToken, theme } from './lib/store';

  $: {
    if (typeof window !== 'undefined') {
      const isDark =
        $theme === 'dark' ||
        ($theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }
</script>

<main class="h-full">
  {#if $authToken}
    <Router>
      <Route path="/admin/properties">
        <Dashboard initialView="properties" />
      </Route>
      <Route path="/">
        <Dashboard />
      </Route>
    </Router>
  {:else}
    <Login />
  {/if}
</main>

<Toaster />
