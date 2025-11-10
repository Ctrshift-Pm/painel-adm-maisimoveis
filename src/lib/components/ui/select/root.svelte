<script lang="ts">
  import { createEventDispatcher, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { SELECT_CONTEXT_KEY, type SelectContext } from './context';

  export let value = '';
  export let placeholder = 'Selecionar';
  export let disabled = false;

  const dispatch = createEventDispatcher<{ valueChange: string }>();

  const valueStore = writable(value);
  const selectedLabelStore = writable('');
  const isOpenStore = writable(false);
  const labelMap = new Map<string, string>();

  $: valueStore.set(value);
  $: selectedLabelStore.set(labelMap.get(value) ?? '');

  function toggle() {
    if (disabled) return;
    isOpenStore.update((open) => !open);
  }

  function close() {
    isOpenStore.set(false);
  }

  function registerItem(itemValue: string, label: string) {
    labelMap.set(itemValue, label);
    if (itemValue === value) {
      selectedLabelStore.set(label);
    }
  }

  function selectItem(itemValue: string, label: string) {
    if (disabled) return;
    value = itemValue;
    labelMap.set(itemValue, label);
    selectedLabelStore.set(label);
    valueStore.set(itemValue);
    dispatch('valueChange', itemValue);
    close();
  }

  setContext<SelectContext>(SELECT_CONTEXT_KEY, {
    value: valueStore,
    selectedLabel: selectedLabelStore,
    placeholder,
    isOpen: isOpenStore,
    disabled,
    toggle,
    close,
    registerItem,
    selectItem,
  });
</script>

<div class="relative" data-disabled={disabled}>
  <slot />
</div>
