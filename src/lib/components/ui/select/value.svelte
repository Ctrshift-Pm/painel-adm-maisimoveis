<script lang="ts">
  import { getContext } from 'svelte';
  import { SELECT_CONTEXT_KEY, type SelectContext } from './context';

  const ctx = getContext<SelectContext>(SELECT_CONTEXT_KEY);
  const selectedLabel = ctx.selectedLabel;

  export let placeholder: string | undefined = undefined;
</script>

<span class="block truncate text-sm text-gray-700 dark:text-gray-100">
  {#if $selectedLabel}
    {$selectedLabel}
  {:else}
    {placeholder ?? ctx.placeholder}
  {/if}
</span>
