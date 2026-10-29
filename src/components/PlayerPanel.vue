<script setup lang="ts">
import GameHelp from './GameHelp.vue'
import InfluenceCard from './InfluenceCard.vue'
import InfluencePicker from './InfluencePicker.vue'
import TradeControls from './TradeControls.vue'
import PlayerPortfolio from './PlayerPortfolio.vue'
import { INFLUENCE_INFO, INFLUENCE_TYPES, tradeLimit } from '../../supabase/functions/_shared/game'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
</script>
<template>
  <div v-if="store.me" class="stack">
    <section class="card player-summary"><div class="section-heading"><h2>{{ store.me.name }}</h2><span class="muted">Раунд {{ store.round }}</span></div><PlayerPortfolio :player="store.me" /><div><strong>Карты влияния {{ (store.me.influenceCards ?? []).length }}/3</strong><p v-for="card in store.me.influenceCards ?? []" :key="card" class="muted">{{ INFLUENCE_INFO[card].name }} — {{ INFLUENCE_INFO[card].description }} {{ card === 'tax' || card === 'theft' ? '(использована)' : '(постоянная)' }}</p></div></section>
    <section class="card player-turn">
      <template v-if="store.phase === 'playing' && store.me.stage === 'trading'">
        <div class="section-heading stage-heading"><div class="stage-heading__title"><p class="eyebrow">1/3</p><h2>Торговля</h2></div><div class="stage-actions"><span class="trade-counter">{{ store.me.tradesUsed }} / {{ tradeLimit(store.game!, store.me) }}</span><GameHelp label="Правила торговли"><p>До {{ tradeLimit(store.game!, store.me) }} покупок и продаж суммарно за раунд. Не больше 5 акций каждой компании.</p><p>Минус — продать одну акцию, плюс — купить. Последнюю сделку можно отменить.</p><p>До отправки хода можно вернуться к торговле, даже после обмена карты. Выбранная карта и использованный обмен сохраняются.</p></GameHelp></div></div>
        <TradeControls :player="store.me" />
        <button class="btn btn--small undo-trade" :disabled="!store.me.tradesUsed || store.busy" @click="store.undoTrade()"><span class="desktop-only">Отменить последнюю сделку</span><span class="mobile-only">↶ Отменить сделку</span></button>
        <div class="planning-hand"><p class="eyebrow"><span class="desktop-only">Ваши карты · планируйте влияние</span><span class="mobile-only">Карты на руке</span></p><div class="mini-hand"><InfluenceCard v-for="card in store.ownCards?.hand" :key="card.id" :card="card" compact /></div></div>
        <button class="btn btn--primary btn--block" :disabled="store.busy" @click="store.action('end-trading')">Перейти к влиянию</button>

      </template>
      <InfluencePicker v-else-if="store.phase === 'playing' && store.me.stage === 'influence'" />
      <section v-else-if="store.phase === 'playing' && store.me.stage === 'purchase'" class="stack">
        <div><p class="eyebrow">3/3</p><h2>Покупка карты</h2><p>Карт влияния: {{ (store.me.influenceCards ?? []).length }}/3 · остаток ${{ store.me.balance }}</p></div>
        <template v-if="(store.me.influenceCards ?? []).length < 3"><button v-for="id in INFLUENCE_TYPES.filter(id => !(store.me?.influenceCards ?? []).includes(id))" :key="id" class="btn" :class="{ 'is-selected': store.draft?.purchase === id }" @click="store.action('choose-purchase', { purchase: id })"><strong>{{ INFLUENCE_INFO[id].name }} · $20</strong><br>{{ INFLUENCE_INFO[id].description }}</button></template>
        <button v-else class="btn" :class="{ 'is-selected': store.draft?.purchase === 'victory' }" @click="store.action('choose-purchase', { purchase: 'victory' })">Карта победы · $30</button>
        <button class="btn" @click="store.action('choose-purchase', { purchase: null })">Пропустить покупку</button>
        <p>Выбор: {{ store.draft?.purchase === 'victory' ? 'карта победы' : store.draft?.purchase ? INFLUENCE_INFO[store.draft.purchase].name : 'без покупки' }}</p>
        <button class="btn" @click="store.action('back-to-influence')">Вернуться к рыночной карте</button><button class="btn btn--primary" :disabled="store.busy" @click="store.action('finish-turn')">Закончить ход</button>
      </section>
      <div v-else-if="store.phase === 'playing'" class="waiting-state"><span aria-hidden="true">✓</span><h2>Ваш ход завершён</h2><p class="muted">Дождитесь общего раскрытия на доске результатов.</p></div>
      <div v-else-if="store.phase === 'reveal'" class="waiting-state"><span aria-hidden="true">↗</span><h2>Карты раскрыты</h2><p class="muted">Результат раунда — на доске. {{ store.isMain ? '' : 'Главный игрок запустит следующий раунд.' }}</p></div>
      <div v-else class="waiting-state"><h2>Партия завершена</h2><p class="muted">Итоги и победитель — на доске результатов.</p></div>
    </section>
    <button v-if="store.isMain && (store.phase === 'reveal' || (store.phase === 'playing' && store.me.stage === 'ready'))" class="btn btn--primary btn--block" :disabled="store.busy || store.phase !== 'reveal'" @click="store.action('continue')">Следующий раунд</button>
  </div>
</template>
