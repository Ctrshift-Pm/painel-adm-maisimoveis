<script lang="ts">
  export let className = '';
</script>

<div class={`flex flex-col gap-2 border-t border-gray-200 px-6 py-4 text-right dark:border-gray-800 sm:flex-row sm:justify-end ${className}`}>
  <slot />
</div>
