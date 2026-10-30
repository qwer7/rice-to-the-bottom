<script setup lang="ts">
import { INFLUENCE_INFO, dividendAmount } from '../../supabase/functions/_shared/game'
import InfluenceCard from './InfluenceCard.vue'
import { purchaseIcon } from '@/game/influenceIcons'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const playerName = (id: string) => store.players.find(p => p.id === id)?.name ?? 'Игрок'
function roundMoney(playerId: string) {
  const player = store.players.find(item => item.id === playerId)
  const taxes = (store.game?.lastReveal?.moneyChanges ?? []).filter(change => change.playerId === playerId)
  const dividends = store.phase === 'reveal' && !store.winnerIds?.length && player?.influenceCards?.includes('dividends') && store.game ? dividendAmount(store.game, player) : 0
  const positive = taxes.reduce((sum, change) => sum + Math.max(change.amount, 0), 0) + dividends
  const negative = taxes.reduce((sum, change) => sum + Math.min(change.amount, 0), 0)
  return { positive, negative, total: positive + negative, dividends, taxes, hasCards: !!player?.influenceCards?.length }
}
const signedMoney = (amount: number) => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${Math.abs(amount)}`
</script>
<template>
    <section v-if="store.game?.lastReveal" class="board-reveal" aria-label="Раскрытые карты" role="status">
      <p class="eyebrow">Все игроки завершили ход <span class="reveal-round">· раунд {{ store.round }}</span></p>
      <div class="reveal-cards"><article v-for="entry in store.game.lastReveal.cards" :key="entry.playerId"><h3>{{ playerName(entry.playerId) }}</h3><InfluenceCard :card="entry.card" /><div v-for="purchase in (store.game.lastReveal.purchases ?? []).filter(item => item.playerId === entry.playerId)" :key="purchase.playerId" class="reveal-purchase"><span class="tv-card-slot is-filled" aria-hidden="true">{{ purchaseIcon(purchase.purchase) }}</span><span>{{ purchase.purchase === 'victory' ? 'Карта победы' : INFLUENCE_INFO[purchase.purchase].name }}</span></div><div v-if="(store.game.lastReveal.moneyChanges || !(store.game.lastReveal.purchases ?? []).some(item => item.purchase === 'tax')) && (roundMoney(entry.playerId).hasCards || roundMoney(entry.playerId).positive || roundMoney(entry.playerId).negative)" class="reveal-money" :aria-label="`Изменение денег: плюс ${roundMoney(entry.playerId).positive}, минус ${Math.abs(roundMoney(entry.playerId).negative)}, итог ${roundMoney(entry.playerId).total}`"><strong class="delta--up">+{{ roundMoney(entry.playerId).positive }}</strong><strong class="delta--down">−{{ Math.abs(roundMoney(entry.playerId).negative) }}</strong><strong>Итого: {{ signedMoney(roundMoney(entry.playerId).total) }}</strong></div><p v-else-if="!store.game.lastReveal.moneyChanges && (store.game.lastReveal.purchases ?? []).some(item => item.purchase === 'tax')" class="reveal-money">Нет данных об изменении денег</p></article></div>
      <p v-for="(effect, index) in store.game.lastReveal.effects ?? []" :key="index" class="muted">{{ effect }}</p>
    </section>
</template>
