<script setup lang="ts">
import { INFLUENCE_INFO, INFLUENCE_TYPES, type InfluenceType } from '../../supabase/functions/_shared/game'
import CompanyCard from './CompanyCard.vue'
import VictoryCrown from './VictoryCrown.vue'
import InfluenceCard from './InfluenceCard.vue'
import { purchaseIcon } from '@/game/influenceIcons'
import { COMPANY_IDS, companyMeta } from '@/game/constants'
import { useGameStore } from '@/stores/gameStore'
import { totalCapital } from '@/game/scoring'
import { influenceIcons } from '@/game/influenceIcons'
defineProps<{ reveal?: boolean }>()
const store = useGameStore()
const playerName = (id: string) => store.players.find(p => p.id === id)?.name ?? 'Игрок'
const tv = true
const slotIcon = (cards: InfluenceType[] | undefined, slot: number) => { const card = cards?.[slot - 1]; return card ? influenceIcons[card] : '' }
const stageLabel = (stage: string) => stage === 'ready' ? 'Готов' : 'Делает ход'
const shortPlayerName = (name: string) => { const chars = Array.from(name); return chars.length > 15 ? `${chars.slice(0, 15).join('')}…` : name }
function roundMoney(playerId: string) {
  const player = store.players.find(item => item.id === playerId)
  const taxes = (store.game?.lastReveal?.moneyChanges ?? []).filter(change => change.playerId === playerId)
  const dividends = store.phase === 'reveal' && player?.influenceCards?.includes('dividends') ? Math.min(5, COMPANY_IDS.reduce((sum, id) => sum + player.portfolio[id], 0)) : 0
  const positive = taxes.reduce((sum, change) => sum + Math.max(change.amount, 0), 0) + dividends
  const negative = taxes.reduce((sum, change) => sum + Math.min(change.amount, 0), 0)
  return { positive, negative, total: positive + negative, dividends, taxes, hasCards: !!player?.influenceCards?.length }
}
const signedMoney = (amount: number) => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${Math.abs(amount)}`
</script>
<template>
  <div class="stack market-board">
    <section class="card market-prices"><div v-if="!tv" class="board__status"><span class="status__round">Раунд {{ store.round }}</span><span class="status__phase">{{ store.phase === 'playing' ? 'Игроки делают ходы' : store.phase === 'reveal' ? 'Раскрытие карт' : 'Партия завершена' }}</span></div>
      <div class="company-grid"><CompanyCard v-for="company in store.companies" :key="company.id" :company="company" :delta="reveal ? store.game?.lastReveal?.deltas[company.id] ?? null : store.marketHistory?.deltas?.[company.id] ?? null" :previous-price="reveal ? store.game?.lastReveal?.pricesBefore[company.id] : undefined" :delta-round="store.marketHistory?.deltaRound ?? null" :initial="store.round <= 1 && store.phase === 'playing'" :min="store.minPrice" :max="store.maxPrice" /></div>
    </section>
    <section v-if="!reveal && store.phase === 'playing'" class="card turn-status"><div class="turn-status__heading"><h2>Ходы игроков</h2><span class="badge">{{ store.players.filter(p => p.stage === 'ready').length }} / {{ store.players.length }} готовы</span></div>
      <div class="progress-grid" role="list" aria-label="Готовность игроков"><article v-for="player in store.players" :key="player.id" class="progress-player" :class="{ 'is-ready': player.stage === 'ready' }" role="listitem" :title="`${player.name}: ${stageLabel(player.stage)}`" :aria-label="`${player.name}: ${stageLabel(player.stage)}`"><span class="progress-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><template v-if="player.stage === 'ready'"><circle cx="10" cy="10" r="7.5" /><path d="m6.5 10 2.3 2.3 4.7-4.6" /></template><template v-else><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 1.8" /></template></svg></span><strong>{{ player.name }}</strong></article></div>
    </section>
    <section v-if="!reveal && !tv && store.phase !== 'finished'" class="card"><h2>Карты влияния</h2><p v-for="player in store.players" :key="player.id">{{ player.name }} · {{ (player.influenceCards ?? []).length }}/3: {{ (player.influenceCards ?? []).map(id => INFLUENCE_INFO[id].name).join(', ') || 'нет карт' }}</p><p v-for="entry in store.game?.dividends ?? []" :key="entry.playerId" class="muted">Дивиденды: {{ store.players.find(p => p.id === entry.playerId)?.name }} +${{ entry.amount }}</p></section>
    <section v-if="!reveal" class="card capital-board"><h2 class="card__title">Капитал игроков <span v-if="tv" class="tv-ready-count">Раунд {{ store.round }}</span></h2><p v-if="store.phase === 'playing'" class="muted">Результаты прошлого раунда. Обновятся после хода всех игроков.</p><div class="table-scroll"><table v-if="tv" class="table tv-capital-table">
      <thead><tr><th>Игрок</th><th>Карты</th><th>Акции</th><th>Деньги</th><th>Капитал</th></tr></thead>
      <tbody><tr v-for="player in store.players" :key="player.id">
        <td><span :title="player.name">{{ shortPlayerName(player.name) }}</span><span v-if="store.phase === 'finished' && store.winnerIds?.includes(player.id)" class="winner-crown" aria-label="Победитель"><VictoryCrown /></span><span v-if="store.phase === 'playing'" class="tv-player-status" :class="{ 'is-ready': player.stage === 'ready' }" :aria-label="stageLabel(player.stage)">{{ player.stage === 'ready' ? '✓' : '◷' }}</span></td>
        <td><div class="tv-card-slots" :aria-label="`Карты: ${(player.influenceCards ?? []).map(id => INFLUENCE_INFO[id].name).join(', ') || 'нет'}`"><span v-for="slot in 3" :key="slot" class="tv-card-slot" :class="{ 'is-filled': player.influenceCards?.[slot - 1] }" aria-hidden="true">{{ slotIcon(player.influenceCards, slot) }}</span></div></td>
        <td><div class="tv-shares" :aria-label="COMPANY_IDS.map(id => `${companyMeta(id).name}: ${player.portfolio[id]} из 5`).join(', ')"><span v-for="id in COMPANY_IDS" :key="id" class="tv-share-group" :style="{ '--share-color': companyMeta(id).color }" aria-hidden="true"><span v-for="slot in 5" :key="slot" class="tv-share" :class="{ 'is-owned': slot <= player.portfolio[id] }"></span></span></div></td>
        <td>{{ player.balance }}<span class="money-unit" aria-hidden="true">$</span></td><td><strong>{{ totalCapital(player, store.companies) }}<span class="money-unit" aria-hidden="true">$</span></strong></td>
      </tr></tbody>
    </table><table v-else class="table"><thead><tr><th>Игрок</th><th>Деньги</th><th v-for="id in COMPANY_IDS" :key="id" :style="{ color: companyMeta(id).color }">{{ id }}</th><th>Капитал</th></tr></thead><tbody><tr v-for="player in store.players" :key="player.id"><td><span v-if="store.phase === 'playing'" class="tv-player-status" :class="{ 'is-ready': player.stage === 'ready' }" :aria-label="stageLabel(player.stage)">{{ player.stage === 'ready' ? '✓' : '◷' }}</span>{{ player.name }}<span v-if="store.phase === 'finished' && store.winnerIds?.includes(player.id)" class="winner-crown" aria-label="Победитель"><VictoryCrown /></span></td><td>{{ player.balance }}<span class="money-unit" aria-hidden="true">$</span></td><td v-for="id in COMPANY_IDS" :key="id">{{ player.portfolio[id] }}</td><td><strong>{{ totalCapital(player, store.companies) }}<span class="money-unit" aria-hidden="true">$</span></strong></td></tr></tbody></table></div></section>
    <section v-if="reveal && store.game?.lastReveal" class="board-reveal" aria-label="Раскрытые карты" role="status">
      <p class="eyebrow">Все игроки завершили ход <span class="reveal-round">· раунд {{ store.round }}</span></p>
      <div class="reveal-cards"><article v-for="entry in store.game.lastReveal.cards" :key="entry.playerId"><h3>{{ playerName(entry.playerId) }}</h3><InfluenceCard :card="entry.card" /><div v-for="purchase in (store.game.lastReveal.purchases ?? []).filter(item => item.playerId === entry.playerId)" :key="purchase.playerId" class="reveal-purchase"><span class="tv-card-slot is-filled" aria-hidden="true">{{ purchaseIcon(purchase.purchase) }}</span><span>{{ purchase.purchase === 'victory' ? 'Карта победы' : INFLUENCE_INFO[purchase.purchase].name }}</span></div><div v-if="(store.game.lastReveal.moneyChanges || !(store.game.lastReveal.purchases ?? []).some(item => item.purchase === 'tax')) && (roundMoney(entry.playerId).hasCards || roundMoney(entry.playerId).positive || roundMoney(entry.playerId).negative)" class="reveal-money" :aria-label="`Изменение денег: плюс ${roundMoney(entry.playerId).positive}, минус ${Math.abs(roundMoney(entry.playerId).negative)}, итог ${roundMoney(entry.playerId).total}`"><strong class="delta--up">+{{ roundMoney(entry.playerId).positive }}</strong><strong class="delta--down">−{{ Math.abs(roundMoney(entry.playerId).negative) }}</strong><strong>Итого: {{ signedMoney(roundMoney(entry.playerId).total) }}</strong></div><p v-else-if="!store.game.lastReveal.moneyChanges && (store.game.lastReveal.purchases ?? []).some(item => item.purchase === 'tax')" class="reveal-money">Нет данных об изменении денег</p></article></div>
      <p v-for="(effect, index) in store.game.lastReveal.effects ?? []" :key="index" class="muted">{{ effect }}</p>
    </section>
    <footer v-if="store.phase === 'finished' && !reveal" class="board-winner"><span>{{ (store.winnerIds?.length ?? 0) > 1 ? 'Победители' : 'Победитель' }}: </span><strong>{{ store.players.filter(player => store.winnerIds?.includes(player.id)).map(player => player.name).join(', ') }}</strong></footer>
    <footer v-else-if="tv && !reveal" class="tv-card-legend" aria-label="Обозначения карт влияния"><span v-for="id in INFLUENCE_TYPES" :key="id"><strong aria-hidden="true">{{ influenceIcons[id] }}</strong> {{ INFLUENCE_INFO[id].name }}</span></footer>
  </div>
</template>
