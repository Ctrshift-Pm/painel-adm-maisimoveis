<script lang="ts">
  import { getContext } from 'svelte';
  import { SELECT_CONTEXT_KEY, type SelectContext } from './context';

  const ctx = getContext<SelectContext>(SELECT_CONTEXT_KEY);
  const selectedLabel = ctx.selectedLabel;
  const isOpen = ctx.isOpen;

  export let className = '';
</script>

<button
  type="button"
  class={`flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${className}`}
  on:click={ctx.toggle}
  disabled={ctx.disabled}
>
  {#if $$slots.default}
    <slot />
  {:else}
    <span class="truncate text-left">
      {$selectedLabel || ctx.placeholder}
    </span>
  {/if}
  <svg
    class={`ml-2 h-4 w-4 transform text-gray-500 transition dark:text-gray-300 ${$isOpen ? 'rotate-180' : ''}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>
</button>
