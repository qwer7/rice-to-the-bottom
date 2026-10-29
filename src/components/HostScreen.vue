<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplayMode } from '@/composables/useDisplayMode'
import RoomLobby from './RoomLobby.vue'
import BoardSettings from './BoardSettings.vue'
import RoomQr from './RoomQr.vue'
import MarketBoard from './MarketBoard.vue'
import GameOver from './GameOver.vue'
import InfluenceCard from './InfluenceCard.vue'
import CompanyCard from './CompanyCard.vue'
import { purchaseIcon } from '@/game/influenceIcons'
import { INFLUENCE_INFO } from '../../supabase/functions/_shared/game'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const { tv } = useDisplayMode()
const dismissedRound = ref(0)
const showReveal = computed(() => (store.phase === 'reveal' || store.phase === 'finished') && store.game?.lastReveal && dismissedRound.value !== store.round)
watch(() => store.phase, phase => { if (phase !== 'reveal' && phase !== 'finished') dismissedRound.value = 0 })
const playerName = (id: string) => store.players.find(p => p.id === id)?.name ?? 'Игрок'
</script>
<template>
  <main class="host-screen" :class="{ 'host-screen--lobby': store.phase === 'lobby', 'host-screen--finished': store.phase === 'finished' }">
    <BoardSettings v-if="!tv && store.hub?.isDisplayOwner" />
    <template v-if="store.phase === 'lobby'">
      <div v-if="tv" class="tv-lobby">
        <h1 class="tv-lobby__title">Доска результатов</h1>
        <div class="tv-lobby__join"><RoomQr :code="store.roomCode ?? ''" tv /><strong class="tv-lobby__code">{{ store.roomCode }}</strong></div>
        <RoomLobby board />
      </div>
      <template v-else><div class="room-card"><div><p class="eyebrow">Доска результатов · код комнаты</p><strong>{{ store.roomCode }}</strong></div><p>Введите этот код на телефоне и выберите имя. Первый игрок станет лидером.</p></div><div class="board-lobby-join"><RoomQr :code="store.roomCode ?? ''" /><RoomLobby board /></div></template>
    </template>
    <template v-else><MarketBoard /><GameOver v-if="store.phase === 'finished'" />
      <button v-if="(store.phase === 'reveal' || store.phase === 'finished') && !showReveal" class="btn" @click="dismissedRound = 0">Показать раскрытые карты</button>
    </template>
    <Teleport to="body"><div v-if="showReveal && store.game?.lastReveal" class="reveal-backdrop" :class="{ 'reveal-backdrop--tv': tv }"><section class="reveal-dialog" role="dialog" aria-modal="true" aria-labelledby="reveal-title" @keydown.esc="dismissedRound = store.round">
      <div class="section-heading"><div><p id="reveal-title" class="eyebrow">Все игроки завершили ход <span class="reveal-round">· раунд {{ store.round }}</span></p></div><button class="btn" autofocus @click="dismissedRound = store.round">Вернуться к доске</button></div>
      <div class="reveal-cards"><article v-for="entry in store.game.lastReveal.cards" :key="entry.playerId"><h3>{{ playerName(entry.playerId) }}</h3><InfluenceCard :card="entry.card" /><div v-for="purchase in (store.game.lastReveal.purchases ?? []).filter(item => item.playerId === entry.playerId)" :key="purchase.playerId" class="reveal-purchase"><span class="tv-card-slot is-filled" aria-hidden="true">{{ purchaseIcon(purchase.purchase) }}</span><span>{{ purchase.purchase === 'victory' ? 'Карта победы' : INFLUENCE_INFO[purchase.purchase].name }}</span></div></article></div>
      <hr class="reveal-divider">
      <div class="reveal-prices"><CompanyCard v-for="company in store.companies" :key="company.id" :company="company" :previous-price="store.game.lastReveal.pricesBefore[company.id]" :delta="store.game.lastReveal.deltas[company.id]" :delta-round="store.game.lastReveal.round" :min="store.minPrice" :max="store.maxPrice" /></div>
      <div><p v-for="(effect, index) in store.game.lastReveal.effects ?? []" :key="index">{{ effect }}</p></div>
      <p v-if="store.phase === 'reveal'" class="muted">Следующий раунд запускает главный игрок со своего экрана.</p>
    </section></div></Teleport>
  </main>
</template>
