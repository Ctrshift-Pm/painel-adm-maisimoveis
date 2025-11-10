<script lang="ts">
  import { createEventDispatcher, setContext } from 'svelte';
  import { DRAWER_CONTEXT_KEY, type DrawerDirection } from './context';

  export let open = false;
  export let direction: DrawerDirection = 'right';

  const dispatch = createEventDispatcher<{ close: void }>();

  function close() {
    dispatch('close');
    open = false;
  }

  setContext(DRAWER_CONTEXT_KEY, {
    get direction() {
      return direction;
    },
    close,
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50" tabindex="-1" role="presentation" on:keydown={handleKeydown}>
    <div class="absolute inset-0 bg-black/60" on:click={close} aria-hidden="true"></div>
    <slot />
  </div>
{/if}
