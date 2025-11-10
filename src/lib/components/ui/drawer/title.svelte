<script lang="ts">
  export let className = '';
</script>

<h2 class={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>
  <slot />
</h2>
