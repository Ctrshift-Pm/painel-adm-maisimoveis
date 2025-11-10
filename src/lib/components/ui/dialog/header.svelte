<script lang="ts">
  export let className = '';
</script>

<div class={`border-b border-gray-200 px-6 py-4 dark:border-gray-800 ${className}`}>
  <slot />
</div>
