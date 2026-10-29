<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useDisplayMode } from '@/composables/useDisplayMode'
import RoomLobby from './RoomLobby.vue'
import BoardSettings from './BoardSettings.vue'
import RoomQr from './RoomQr.vue'
import MarketBoard from './MarketBoard.vue'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const { tv } = useDisplayMode()
const dismissedRound = ref(0)
const showReveal = computed(() => store.phase === 'reveal' && store.game?.lastReveal && dismissedRound.value !== store.round)
let revealTimer: ReturnType<typeof setTimeout> | undefined
watch(() => [store.phase, store.round, store.game?.lastReveal?.round] as const, ([phase, round, revealedRound]) => {
  if (revealTimer) clearTimeout(revealTimer)
  dismissedRound.value = 0
  if (location.pathname.replace(/\/$/, '') !== '/ux/preview' && phase === 'reveal' && revealedRound != null) {
    revealTimer = setTimeout(() => { dismissedRound.value = round }, 16000)
  }
}, { immediate: true })
onBeforeUnmount(() => { if (revealTimer) clearTimeout(revealTimer) })
</script>
<template>
  <main class="host-screen" :class="{ 'host-screen--lobby': store.phase === 'lobby', 'host-screen--finished': store.phase === 'finished' }">
    <BoardSettings v-if="!tv && store.hub?.isDisplayOwner" />
    <div v-if="store.phase === 'lobby'" class="board-lobby">
      <header class="board-lobby__header"><h1>Доска результатов</h1><strong :aria-label="`Код комнаты: ${store.roomCode}`">{{ store.roomCode }}</strong></header>
      <div class="board-lobby__content">
        <div class="board-lobby__code"><RoomQr :code="store.roomCode ?? ''" tv /></div>
        <RoomLobby board />
      </div>
    </div>
    <template v-else><MarketBoard :reveal="!!showReveal" /></template>
  </main>
</template>
