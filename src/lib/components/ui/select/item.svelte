<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { SELECT_CONTEXT_KEY, type SelectContext } from './context';

  export let value = '';
  export let disabled = false;

  const ctx = getContext<SelectContext>(SELECT_CONTEXT_KEY);
  const valueStore = ctx.value;

  let labelElement: HTMLSpanElement | null = null;
  let labelText = '';

  onMount(() => {
    labelText = (labelElement?.textContent ?? '').trim();
    ctx.registerItem(value, labelText);
  });

  function handleSelect() {
    if (disabled) return;
    labelText = labelText || (labelElement?.textContent ?? '').trim();
    ctx.selectItem(value, labelText);
  }
</script>

<button
  type="button"
  class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:hover:bg-gray-800"
  role="option"
  aria-selected={$valueStore === value}
  on:click={handleSelect}
  disabled={disabled}
>
  <span class="truncate" bind:this={labelElement}>
    <slot />
  </span>
  {#if $valueStore === value}
    <span class="text-green-600 dark:text-green-400" aria-hidden="true">✓</span>
  {/if}
</button>
