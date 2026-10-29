<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplayMode } from '@/composables/useDisplayMode'
import RoomLobby from './RoomLobby.vue'
import RoomQr from './RoomQr.vue'
import MarketBoard from './MarketBoard.vue'
import GameOver from './GameOver.vue'
import InfluenceCard from './InfluenceCard.vue'
import { INFLUENCE_INFO } from '../../supabase/functions/_shared/game'
import { COMPANY_IDS, companyMeta } from '@/game/constants'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const { tv } = useDisplayMode()
const dismissedRound = ref(0)
const settingsOpen = ref(false)
const confirmation = ref<'rotate-display-code' | 'reset-display' | null>(null)
async function confirmDisplayAction() {
  if (!confirmation.value) return
  await store.displayAction(confirmation.value)
  if (!store.error) { confirmation.value = null; settingsOpen.value = false }
}
const showReveal = computed(() => (store.phase === 'reveal' || store.phase === 'finished') && store.game?.lastReveal && dismissedRound.value !== store.round)
watch(() => store.phase, phase => { if (phase !== 'reveal' && phase !== 'finished') dismissedRound.value = 0 })
const playerName = (id: string) => store.players.find(p => p.id === id)?.name ?? 'Игрок'
</script>
<template>
  <main class="host-screen" :class="{ 'host-screen--lobby': store.phase === 'lobby', 'host-screen--finished': store.phase === 'finished' }">
    <section v-if="store.hub?.isDisplayOwner" class="card stack">
      <button v-if="!settingsOpen" class="btn" @click="settingsOpen = true">Настройки доски</button>
      <template v-else>
        <h2>Настройки доски</h2>
        <template v-if="!confirmation">
          <button class="btn" :disabled="store.busy" @click="confirmation = 'rotate-display-code'">Обновить код доски</button>
          <button class="btn btn--danger" :disabled="store.busy" @click="confirmation = 'reset-display'">Сбросить доску и участников</button>
          <button class="btn" @click="settingsOpen = false">Закрыть</button>
        </template>
        <div v-else role="alertdialog" aria-label="Подтверждение настроек доски" class="stack">
          <p v-if="confirmation === 'reset-display'">Сбросить доску? Текущая партия завершится без результата, все участники будут отключены. Появится новый код.</p>
          <p v-else>Обновить код доски? Прежний код больше не подойдёт для подключения. Участники и партия сохранятся.</p>
          <button class="btn" @click="confirmation = null">Отмена</button>
          <button class="btn btn--danger" :disabled="store.busy" @click="confirmDisplayAction">Подтвердить</button>
        </div>
      </template>
    </section>
    <div v-if="store.phase === 'lobby'" class="room-card"><div><p class="eyebrow">Доска результатов · код комнаты</p><strong>{{ store.roomCode }}</strong></div><p>Введите этот код на телефоне и выберите имя. Первый игрок станет лидером.</p></div>
    <div v-if="store.phase === 'lobby'" class="board-lobby-join"><RoomQr :code="store.roomCode ?? ''" /><RoomLobby board /></div>
    <template v-else><MarketBoard /><GameOver v-if="store.phase === 'finished'" />
      <button v-if="(store.phase === 'reveal' || store.phase === 'finished') && !showReveal" class="btn" @click="dismissedRound = 0">Показать раскрытые карты</button>
    </template>
    <Teleport to="body"><div v-if="showReveal && store.game?.lastReveal" class="reveal-backdrop" :class="{ 'reveal-backdrop--tv': tv }"><section class="reveal-dialog" role="dialog" aria-modal="true" aria-labelledby="reveal-title" @keydown.esc="dismissedRound = store.round">
      <div class="section-heading"><div><p class="eyebrow">Все игроки завершили ход</p><h2 id="reveal-title">Раскрытие · раунд {{ store.round }}</h2></div><button class="btn" autofocus @click="dismissedRound = store.round">Вернуться к доске</button></div>
      <div class="reveal-cards"><article v-for="entry in store.game.lastReveal.cards" :key="entry.playerId"><h3>{{ playerName(entry.playerId) }}</h3><InfluenceCard :card="entry.card" /></article></div>
      <div class="reveal-prices"><div v-for="id in COMPANY_IDS" :key="id"><span :style="{ color: companyMeta(id).color }">{{ id }}</span><strong>{{ store.game.lastReveal.pricesBefore[id] }}<span class="money-unit" aria-hidden="true">$</span> → {{ store.game.lastReveal.pricesAfter[id] }}<span class="money-unit" aria-hidden="true">$</span></strong><span :class="store.game.lastReveal.deltas[id] >= 0 ? 'delta--up' : 'delta--down'">{{ store.game.lastReveal.deltas[id] > 0 ? '+' : '' }}{{ store.game.lastReveal.deltas[id] }}</span></div></div>
      <div><p v-for="entry in store.game.lastReveal.purchases ?? []" :key="entry.playerId">{{ playerName(entry.playerId) }}: куплена {{ entry.purchase === 'victory' ? 'карта победы' : INFLUENCE_INFO[entry.purchase].name }}</p><p v-for="(effect, index) in store.game.lastReveal.effects ?? []" :key="index">{{ effect }}</p></div>
      <p v-if="store.phase === 'reveal'" class="muted">Следующий раунд запускает главный игрок со своего экрана.</p>
    </section></div></Teleport>
  </main>
</template>
