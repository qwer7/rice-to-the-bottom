<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ value: string }>()
const copied = ref(false)
const message = ref('')
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); copied.value = true; message.value = ''; setTimeout(() => copied.value = false, 2000) }
  catch { message.value = 'Нажмите на ключ, чтобы выделить и скопировать его.' }
}
</script>
<template><div class="stack"><label class="field"><span>Ключ главного игрока</span><input :value="value" readonly aria-label="Ключ главного игрока" class="hub-key" @click="($event.target as HTMLInputElement).select()"></label><button type="button" class="btn btn--small" @click="copy(value)">{{ copied ? 'Скопировано' : 'Скопировать ключ' }}</button><p v-if="message" class="muted" role="status">{{ message }}</p></div></template>
<style scoped>.hub-key { font-family:monospace; font-size:24px; letter-spacing:0.16em; }</style>
