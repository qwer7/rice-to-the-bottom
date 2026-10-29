<script setup lang="ts">
import { INFLUENCE_INFO, INFLUENCE_TYPES, type InfluenceType } from '../../supabase/functions/_shared/game'
import CompanyCard from './CompanyCard.vue'
import { COMPANY_IDS, companyMeta } from '@/game/constants'
import { useGameStore } from '@/stores/gameStore'
import { totalCapital } from '@/game/scoring'
import { useDisplayMode } from '@/composables/useDisplayMode'
import { influenceIcons } from '@/game/influenceIcons'
const store = useGameStore()
const { tv } = useDisplayMode()
const slotIcon = (cards: InfluenceType[] | undefined, slot: number) => { const card = cards?.[slot - 1]; return card ? influenceIcons[card] : '' }
const stageLabel = (stage: string) => stage === 'ready' ? 'Готов' : 'Делает ход'
</script>
<template>
  <div class="stack market-board">
    <section class="card market-prices"><div v-if="!tv" class="board__status"><span class="status__round">Раунд {{ store.round }}</span><span class="status__phase">{{ store.phase === 'playing' ? 'Игроки делают ходы' : store.phase === 'reveal' ? 'Раскрытие карт' : 'Партия завершена' }}</span></div>
      <div class="company-grid"><CompanyCard v-for="company in store.companies" :key="company.id" :company="company" :delta="store.marketHistory?.deltas?.[company.id] ?? null" :delta-round="store.marketHistory?.deltaRound ?? null" :initial="store.round <= 1 && store.phase === 'playing'" :min="store.minPrice" :max="store.maxPrice" /></div>
    </section>
    <section v-if="store.phase === 'playing'" class="card turn-status"><div class="turn-status__heading"><h2>Ходы игроков</h2><span class="badge">{{ store.players.filter(p => p.stage === 'ready').length }} / {{ store.players.length }} готовы</span></div>
      <div class="progress-grid" role="list" aria-label="Готовность игроков"><article v-for="player in store.players" :key="player.id" class="progress-player" :class="{ 'is-ready': player.stage === 'ready' }" role="listitem" :title="`${player.name}: ${stageLabel(player.stage)}`" :aria-label="`${player.name}: ${stageLabel(player.stage)}`"><span class="progress-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><template v-if="player.stage === 'ready'"><circle cx="10" cy="10" r="7.5" /><path d="m6.5 10 2.3 2.3 4.7-4.6" /></template><template v-else><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 1.8" /></template></svg></span><strong>{{ player.name }}</strong></article></div>
    </section>
    <section v-if="!tv" class="card"><h2>Карты влияния</h2><p v-for="player in store.players" :key="player.id">{{ player.name }} · {{ (player.influenceCards ?? []).length }}/3: {{ (player.influenceCards ?? []).map(id => INFLUENCE_INFO[id].name).join(', ') || 'нет карт' }}</p><p v-for="entry in store.game?.dividends ?? []" :key="entry.playerId" class="muted">Дивиденды: {{ store.players.find(p => p.id === entry.playerId)?.name }} +${{ entry.amount }}</p></section>
    <section class="card capital-board"><h2 class="card__title">Капитал игроков <span v-if="tv" class="tv-ready-count">Раунд {{ store.round }}</span></h2><p v-if="store.phase === 'playing'" class="muted">Результаты прошлого раунда. Обновятся после хода всех игроков.</p><div class="table-scroll"><table v-if="tv" class="table tv-capital-table">
      <thead><tr><th>Игрок</th><th>Карты</th><th>Акции</th><th>Деньги</th><th>Капитал</th></tr></thead>
      <tbody><tr v-for="player in store.players" :key="player.id">
        <td>{{ player.name }}<span v-if="store.phase === 'playing'" class="tv-player-status" :class="{ 'is-ready': player.stage === 'ready' }" :aria-label="stageLabel(player.stage)">{{ player.stage === 'ready' ? '✓' : '◷' }}</span></td>
        <td><div class="tv-card-slots" :aria-label="`Карты: ${(player.influenceCards ?? []).map(id => INFLUENCE_INFO[id].name).join(', ') || 'нет'}`"><span v-for="slot in 3" :key="slot" class="tv-card-slot" :class="{ 'is-filled': player.influenceCards?.[slot - 1] }" aria-hidden="true">{{ slotIcon(player.influenceCards, slot) }}</span></div></td>
        <td><div class="tv-shares" :aria-label="COMPANY_IDS.map(id => `${companyMeta(id).name}: ${player.portfolio[id]} из 5`).join(', ')"><span v-for="id in COMPANY_IDS" :key="id" class="tv-share-group" :style="{ '--share-color': companyMeta(id).color }" aria-hidden="true"><span v-for="slot in 5" :key="slot" class="tv-share" :class="{ 'is-owned': slot <= player.portfolio[id] }"></span></span></div></td>
        <td>{{ player.balance }}<span class="money-unit" aria-hidden="true">$</span></td><td><strong>{{ totalCapital(player, store.companies) }}<span class="money-unit" aria-hidden="true">$</span></strong></td>
      </tr></tbody>
    </table><table v-else class="table"><thead><tr><th>Игрок</th><th>Деньги</th><th v-for="id in COMPANY_IDS" :key="id" :style="{ color: companyMeta(id).color }">{{ id }}</th><th>Капитал</th></tr></thead><tbody><tr v-for="player in store.players" :key="player.id"><td><span v-if="store.phase === 'playing'" class="tv-player-status" :class="{ 'is-ready': player.stage === 'ready' }" :aria-label="stageLabel(player.stage)">{{ player.stage === 'ready' ? '✓' : '◷' }}</span>{{ player.name }}</td><td>{{ player.balance }}<span class="money-unit" aria-hidden="true">$</span></td><td v-for="id in COMPANY_IDS" :key="id">{{ player.portfolio[id] }}</td><td><strong>{{ totalCapital(player, store.companies) }}<span class="money-unit" aria-hidden="true">$</span></strong></td></tr></tbody></table></div></section>
    <footer v-if="tv" class="tv-card-legend" aria-label="Обозначения карт влияния"><span v-for="id in INFLUENCE_TYPES" :key="id"><strong aria-hidden="true">{{ influenceIcons[id] }}</strong> {{ INFLUENCE_INFO[id].name }}</span></footer>
  </div>
</template>
