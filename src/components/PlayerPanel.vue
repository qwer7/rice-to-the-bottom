<script setup lang="ts">
import { watch } from 'vue'
import GameHelp from './GameHelp.vue'
import InfluenceSlots from './InfluenceSlots.vue'
import InfluencePurchase from './InfluencePurchase.vue'
import InfluenceCard from './InfluenceCard.vue'
import InfluencePicker from './InfluencePicker.vue'
import TradeControls from './TradeControls.vue'
import PlayerPortfolio from './PlayerPortfolio.vue'
import { tradeLimit } from '../../supabase/functions/_shared/game'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
watch(() => [store.phase, store.me?.stage, store.me?.influenceCards?.length, store.canPurchase, store.draft?.purchase] as const, ([phase, stage, cards, canPurchase, purchase]) => {
  if (phase !== 'playing' || stage !== 'purchase') return
  if (!canPurchase) {
    if (purchase) void store.action('choose-purchase', { purchase: null })
    void store.action('back-to-influence')
    return
  }
  if (cards === 3 && purchase !== 'victory') void store.action('choose-purchase', { purchase: 'victory' })
}, { immediate: true })
</script>
<template>
  <div v-if="store.me" class="stack">
    <section class="card player-summary"><div class="player-summary__body"><div class="section-heading"><h2>{{ store.me.name }}</h2><span class="muted">Раунд {{ store.round }}</span></div><PlayerPortfolio :player="store.me" /><InfluenceSlots :cards="store.me.influenceCards" /></div></section>
    <section class="card player-turn">
      <template v-if="store.phase === 'playing' && store.me.stage === 'trading'">
        <div class="section-heading stage-heading"><div class="stage-heading__title"><p class="eyebrow">1/3</p><h2>Торговля</h2></div><div class="stage-actions"><span class="trade-counter">{{ store.me.tradesUsed }} / {{ tradeLimit(store.game!, store.me) }}</span><GameHelp label="Правила торговли"><p>До {{ tradeLimit(store.game!, store.me) }} покупок и продаж суммарно за раунд. Не больше 5 акций каждой компании.</p><p>Минус — продать одну акцию, плюс — купить. Последнюю сделку можно отменить.</p><p>До отправки хода можно вернуться к торговле, даже после обмена карты. Выбранная карта и использованный обмен сохраняются.</p></GameHelp></div></div>
        <TradeControls :player="store.me" />
        <button class="btn btn--small undo-trade" :disabled="!store.me.tradesUsed || store.busy" @click="store.undoTrade()"><span class="desktop-only">Отменить последнюю сделку</span><span class="mobile-only">↶ Отменить сделку</span></button>
        <div class="planning-hand"><p class="eyebrow"><span class="desktop-only">Ваши карты · планируйте влияние</span><span class="mobile-only">Карты на руке</span></p><div class="mini-hand"><InfluenceCard v-for="card in store.ownCards?.hand" :key="card.id" :card="card" compact /></div></div>
        <button class="btn btn--primary btn--block" :disabled="store.busy" @click="store.action('end-trading')">Перейти к влиянию</button>

      </template>
      <InfluencePicker v-else-if="store.phase === 'playing' && store.me.stage === 'influence'" />
      <InfluencePurchase v-else-if="store.phase === 'playing' && store.me.stage === 'purchase'" />
      <div v-else-if="store.phase === 'playing'" class="waiting-state"><span aria-hidden="true">✓</span><h2>Ваш ход завершён</h2><p class="muted">Дождитесь общего раскрытия на доске результатов.</p></div>
      <div v-else-if="store.phase === 'reveal'" class="waiting-state"><span aria-hidden="true">↗</span><h2>Карты раскрыты</h2><p class="muted">Результат раунда — на доске. {{ store.isMain ? '' : 'Главный игрок запустит следующий раунд.' }}</p></div>
      <div v-else class="waiting-state"><h2>Партия завершена</h2><p class="muted">Итоги и победитель — на доске результатов.</p></div>
    </section>
    <button v-if="store.isMain && store.phase === 'finished'" class="btn btn--primary btn--block" @click="store.setRole('board')">Посмотреть итоги</button>
    <button v-if="store.isMain && (store.phase === 'reveal' || (store.phase === 'playing' && store.me.stage === 'ready'))" class="btn btn--primary btn--block" :disabled="store.busy || store.phase !== 'reveal'" @click="store.action('continue')">{{ store.winnerIds?.length ? 'Посмотреть итоги' : 'Следующий раунд' }}</button>
  </div>
</template>
