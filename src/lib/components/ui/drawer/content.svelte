<script lang="ts">
  import { getContext } from 'svelte';
  import { DRAWER_CONTEXT_KEY, type DrawerContextValue } from './context';

  const ctx = (getContext(DRAWER_CONTEXT_KEY) as DrawerContextValue | undefined) ?? {
    direction: 'right',
    close: () => undefined,
  };

  export let className = '';

  const baseClasses =
    'pointer-events-auto bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col';

  const positionClasses: Record<string, string> = {
    right: 'fixed inset-y-0 right-0 w-full max-w-xl animate-slide-in-right',
    left: 'fixed inset-y-0 left-0 w-full max-w-xl animate-slide-in-left',
    top: 'fixed inset-x-0 top-0 w-full max-h-[90vh] animate-slide-in-down',
    bottom: 'fixed inset-x-0 bottom-0 w-full max-h-[90vh] animate-slide-in-up',
  };

  const currentPosition = positionClasses[ctx.direction] ?? positionClasses.right;
</script>

<div
  class={`${baseClasses} ${currentPosition} ${className}`}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  on:click|stopPropagation
  on:keydown={(event) => {
    if (event.key === 'Escape') {
      ctx.close();
    }
  }}
>
  <slot />
</div>

<style>
  @keyframes drawer-slide-right {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
  @keyframes drawer-slide-left {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
  @keyframes drawer-slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  @keyframes drawer-slide-down {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .animate-slide-in-right {
    animation: drawer-slide-right 0.25s ease-out;
  }
  .animate-slide-in-left {
    animation: drawer-slide-left 0.25s ease-out;
  }
  .animate-slide-in-up {
    animation: drawer-slide-up 0.25s ease-out;
  }
  .animate-slide-in-down {
    animation: drawer-slide-down 0.25s ease-out;
  }
</style>
