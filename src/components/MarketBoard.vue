<script setup lang="ts">
import { INFLUENCE_INFO } from '../../supabase/functions/_shared/game'
import CompanyCard from './CompanyCard.vue'
import { COMPANY_IDS, companyMeta } from '@/game/constants'
import { useGameStore } from '@/stores/gameStore'
import { totalCapital } from '@/game/scoring'
const store = useGameStore()
const stageLabel = (stage: string) => stage === 'ready' ? 'Готов' : 'Делает ход'
</script>
<template>
  <div class="stack market-board">
    <section class="card market-prices"><div class="board__status"><span class="status__round">Раунд {{ store.round }}</span><span class="status__phase">{{ store.phase === 'playing' ? 'Игроки делают ходы' : store.phase === 'reveal' ? 'Раскрытие карт' : 'Партия завершена' }}</span></div>
      <div class="company-grid"><CompanyCard v-for="company in store.companies" :key="company.id" :company="company" :delta="store.marketHistory?.deltas?.[company.id] ?? null" :delta-round="store.marketHistory?.deltaRound ?? null" :initial="store.round <= 1 && store.phase === 'playing'" :min="store.minPrice" :max="store.maxPrice" /></div>
    </section>
    <section v-if="store.phase === 'playing'" class="card turn-status"><div class="turn-status__heading"><h2>Ходы игроков</h2><span class="badge">{{ store.players.filter(p => p.stage === 'ready').length }} / {{ store.players.length }} готовы</span></div>
      <div class="progress-grid" role="list" aria-label="Готовность игроков"><article v-for="player in store.players" :key="player.id" class="progress-player" :class="{ 'is-ready': player.stage === 'ready' }" role="listitem" :title="`${player.name}: ${stageLabel(player.stage)}`" :aria-label="`${player.name}: ${stageLabel(player.stage)}`"><span class="progress-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><template v-if="player.stage === 'ready'"><circle cx="10" cy="10" r="7.5" /><path d="m6.5 10 2.3 2.3 4.7-4.6" /></template><template v-else><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 1.8" /></template></svg></span><strong>{{ player.name }}</strong></article></div>
    </section>
    <section class="card"><h2>Карты влияния</h2><p v-for="player in store.players" :key="player.id">{{ player.name }} · {{ (player.influenceCards ?? []).length }}/3: {{ (player.influenceCards ?? []).map(id => INFLUENCE_INFO[id].name).join(', ') || 'нет карт' }}</p><p v-for="entry in store.game?.dividends ?? []" :key="entry.playerId" class="muted">Дивиденды: {{ store.players.find(p => p.id === entry.playerId)?.name }} +${{ entry.amount }}</p></section>
    <section class="card capital-board"><h2 class="card__title">Капитал игроков <span v-if="store.phase === 'playing'" class="tv-ready-count">{{ store.players.filter(p => p.stage === 'ready').length }} / {{ store.players.length }} готовы</span></h2><p v-if="store.phase === 'playing'" class="muted">Результаты прошлого раунда. Обновятся после хода всех игроков.</p><div class="table-scroll"><table class="table"><thead><tr><th>Игрок</th><th>Деньги</th><th v-for="id in COMPANY_IDS" :key="id" :style="{ color: companyMeta(id).color }">{{ id }}</th><th>Капитал</th></tr></thead><tbody><tr v-for="player in store.players" :key="player.id"><td><span v-if="store.phase === 'playing'" class="tv-player-status" :class="{ 'is-ready': player.stage === 'ready' }" :aria-label="stageLabel(player.stage)">{{ player.stage === 'ready' ? '✓' : '◷' }}</span>{{ player.name }}</td><td>{{ player.balance }}<span class="money-unit" aria-hidden="true">$</span></td><td v-for="id in COMPANY_IDS" :key="id">{{ player.portfolio[id] }}</td><td><strong>{{ totalCapital(player, store.companies) }}<span class="money-unit" aria-hidden="true">$</span></strong></td></tr></tbody></table></div></section>
  </div>
</template>
