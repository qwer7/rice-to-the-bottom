<script setup lang="ts">
import { INFLUENCE_INFO, INFLUENCE_TYPES } from '../../supabase/functions/_shared/game'
import CompanyCard from './CompanyCard.vue'
import CapitalBoard from './CapitalBoard.vue'
import BoardReveal from './BoardReveal.vue'
import { useGameStore } from '@/stores/gameStore'
import { influenceIcons } from '@/game/influenceIcons'
defineProps<{ reveal?: boolean }>()
const store = useGameStore()
const stageLabel = (stage: string) => stage === 'ready' ? 'Готов' : 'Делает ход'
</script>
<template>
  <div class="stack market-board">
    <section class="card market-prices">
      <div class="company-grid"><CompanyCard v-for="company in store.companies" :key="company.id" :company="company" :delta="reveal ? store.game?.lastReveal?.deltas[company.id] ?? null : store.marketHistory?.deltas?.[company.id] ?? null" :previous-price="reveal ? store.game?.lastReveal?.pricesBefore[company.id] : undefined" :delta-round="store.marketHistory?.deltaRound ?? null" :initial="store.round <= 1 && store.phase === 'playing'" :min="store.minPrice" :max="store.maxPrice" /></div>
    </section>
    <section v-if="!reveal && store.phase === 'playing'" class="card turn-status"><div class="turn-status__heading"><h2>Ходы игроков</h2><span class="badge">{{ store.players.filter(p => p.stage === 'ready').length }} / {{ store.players.length }} готовы</span></div>
      <div class="progress-grid" role="list" aria-label="Готовность игроков"><article v-for="player in store.players" :key="player.id" class="progress-player" :class="{ 'is-ready': player.stage === 'ready' }" role="listitem" :title="`${player.name}: ${stageLabel(player.stage)}`" :aria-label="`${player.name}: ${stageLabel(player.stage)}`"><span class="progress-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><template v-if="player.stage === 'ready'"><circle cx="10" cy="10" r="7.5" /><path d="m6.5 10 2.3 2.3 4.7-4.6" /></template><template v-else><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 1.8" /></template></svg></span><strong>{{ player.name }}</strong></article></div>
    </section>
    <CapitalBoard v-if="!reveal" />
    <BoardReveal v-if="reveal" />
    <footer v-if="store.phase === 'finished' && !reveal" class="board-winner"><span>{{ (store.winnerIds?.length ?? 0) > 1 ? 'Победители' : 'Победитель' }}: </span><strong>{{ store.players.filter(player => store.winnerIds?.includes(player.id)).map(player => player.name).join(', ') }}</strong></footer>
    <footer v-else-if="!reveal" class="tv-card-legend" aria-label="Обозначения карт влияния"><span v-for="id in INFLUENCE_TYPES" :key="id"><strong aria-hidden="true">{{ influenceIcons[id] }}</strong> {{ INFLUENCE_INFO[id].name }}</span></footer>
  </div>
</template>
