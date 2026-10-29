<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'

defineProps<{ compact?: boolean }>()
const store = useGameStore()
const settingsOpen = ref(false)
const confirmation = ref<'rotate-display-code' | 'reset-display' | null>(null)
function close() { settingsOpen.value = false; confirmation.value = null }
async function confirmDisplayAction() {
  if (!confirmation.value) return
  await store.displayAction(confirmation.value)
  if (!store.error) close()
}
</script>
<template>
  <div class="board-settings" :class="{ 'board-settings--compact': compact }" @keydown.esc.stop="close">
    <button class="btn" :class="{ 'btn--small': compact }" :aria-expanded="settingsOpen" aria-controls="board-settings-panel" @click="settingsOpen = !settingsOpen; confirmation = null">Настройки доски</button>
    <section v-if="settingsOpen" id="board-settings-panel" class="card stack board-settings__panel" aria-label="Настройки доски">
      <h2>Настройки доски</h2>
      <template v-if="!confirmation">
        <button class="btn" :disabled="store.busy" @click="confirmation = 'rotate-display-code'">Обновить код доски</button>
        <button class="btn btn--danger" :disabled="store.busy" @click="confirmation = 'reset-display'">Сбросить доску и участников</button>
        <button class="btn" @click="close">Закрыть</button>
      </template>
      <div v-else role="alertdialog" aria-label="Подтверждение настроек доски" class="stack">
        <p v-if="confirmation === 'reset-display'">Сбросить доску? Текущая партия завершится без результата, все участники будут отключены. Появится новый код.</p>
        <p v-else>Обновить код доски? Прежний код больше не подойдёт для подключения. Участники и партия сохранятся.</p>
        <button class="btn" @click="confirmation = null">Отмена</button>
        <button class="btn btn--danger" :disabled="store.busy" @click="confirmDisplayAction">Подтвердить</button>
      </div>
    </section>
  </div>
</template>
