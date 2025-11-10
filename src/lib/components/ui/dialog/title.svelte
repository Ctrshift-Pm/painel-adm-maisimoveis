<script lang="ts">
  export let className = '';
</script>

<h2 class={`text-xl font-semibold leading-tight text-gray-900 dark:text-gray-100 ${className}`}>
  <slot />
</h2>
