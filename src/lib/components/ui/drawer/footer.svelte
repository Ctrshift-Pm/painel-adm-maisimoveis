<script lang="ts">
  export let className = '';
</script>

<div class={`flex flex-wrap justify-end gap-3 ${className}`}>
  <slot />
</div>
