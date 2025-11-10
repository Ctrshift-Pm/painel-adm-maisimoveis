<script lang="ts">
  import { getContext } from 'svelte';
  import { SELECT_CONTEXT_KEY, type SelectContext } from './context';

  const ctx = getContext<SelectContext>(SELECT_CONTEXT_KEY);
  const isOpen = ctx.isOpen;

  export let className = '';
</script>

{#if $isOpen}
  <div
    class={`absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 ${className}`}
    role="listbox"
  >
    <slot />
  </div>
{/if}
