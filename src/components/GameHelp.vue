<script setup lang="ts">
defineProps<{ label: string }>()
</script>
<template><details class="game-help"><summary :aria-label="label" :title="label"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg></summary><div class="game-help__content" role="note"><slot /></div></details></template>
