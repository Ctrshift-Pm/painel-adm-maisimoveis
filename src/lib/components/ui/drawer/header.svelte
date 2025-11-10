<script lang="ts">
  export let className = '';
</script>

<div class={`flex flex-col gap-1 ${className}`}>
  <slot />
</div>
