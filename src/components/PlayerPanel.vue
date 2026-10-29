<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GameHelp from './GameHelp.vue'
import { influenceIcons } from '@/game/influenceIcons'
import type { InfluenceType } from '../../supabase/functions/_shared/game'
import InfluenceCard from './InfluenceCard.vue'
import InfluencePicker from './InfluencePicker.vue'
import TradeControls from './TradeControls.vue'
import PlayerPortfolio from './PlayerPortfolio.vue'
import { INFLUENCE_INFO, INFLUENCE_TYPES, tradeLimit } from '../../supabase/functions/_shared/game'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const influenceSlots = computed(() => Array.from({ length: 3 }, (_, i) => store.me?.influenceCards?.[i]))
const selectedInfluence = ref<InfluenceType | null>(null)
function toggleInfluence(card: InfluenceType) { selectedInfluence.value = selectedInfluence.value === card ? null : card }
watch(() => [store.phase, store.me?.stage, store.me?.influenceCards?.length, store.availableForPurchase, store.draft?.purchase] as const, ([phase, stage, cards, available, purchase]) => {
  if (phase === 'playing' && stage === 'purchase' && cards === 3 && available >= 30 && purchase !== 'victory') void store.action('choose-purchase', { purchase: 'victory' })
}, { immediate: true })
</script>
<template>
  <div v-if="store.me" class="stack">
    <section class="card player-summary"><div class="player-summary__body"><div class="section-heading"><h2>{{ store.me.name }}</h2><span class="muted">Раунд {{ store.round }}</span></div><PlayerPortfolio :player="store.me" /><div class="player-influences" aria-label="Карты влияния" @keydown.esc="selectedInfluence = null"><div class="player-influences__slots"><template v-for="(card, slot) in influenceSlots" :key="slot"><button v-if="card" class="player-influence-slot is-filled" :aria-label="INFLUENCE_INFO[card].name" :aria-expanded="selectedInfluence === card" @click="toggleInfluence(card)">{{ influenceIcons[card] }}</button><span v-else class="player-influence-slot" role="img" aria-label="Пустая ячейка карты влияния"></span></template></div><div v-if="selectedInfluence" class="player-influences__help" role="note"><strong>{{ INFLUENCE_INFO[selectedInfluence].name }}</strong><p>{{ INFLUENCE_INFO[selectedInfluence].description }}</p><p v-if="selectedInfluence === 'tax' || selectedInfluence === 'theft'" class="muted">Использована</p></div></div></div></section>
    <section class="card player-turn">
      <template v-if="store.phase === 'playing' && store.me.stage === 'trading'">
        <div class="section-heading stage-heading"><div class="stage-heading__title"><p class="eyebrow">1/3</p><h2>Торговля</h2></div><div class="stage-actions"><span class="trade-counter">{{ store.me.tradesUsed }} / {{ tradeLimit(store.game!, store.me) }}</span><GameHelp label="Правила торговли"><p>До {{ tradeLimit(store.game!, store.me) }} покупок и продаж суммарно за раунд. Не больше 5 акций каждой компании.</p><p>Минус — продать одну акцию, плюс — купить. Последнюю сделку можно отменить.</p><p>До отправки хода можно вернуться к торговле, даже после обмена карты. Выбранная карта и использованный обмен сохраняются.</p></GameHelp></div></div>
        <TradeControls :player="store.me" />
        <button class="btn btn--small undo-trade" :disabled="!store.me.tradesUsed || store.busy" @click="store.undoTrade()"><span class="desktop-only">Отменить последнюю сделку</span><span class="mobile-only">↶ Отменить сделку</span></button>
        <div class="planning-hand"><p class="eyebrow"><span class="desktop-only">Ваши карты · планируйте влияние</span><span class="mobile-only">Карты на руке</span></p><div class="mini-hand"><InfluenceCard v-for="card in store.ownCards?.hand" :key="card.id" :card="card" compact /></div></div>
        <button class="btn btn--primary btn--block" :disabled="store.busy" @click="store.action('end-trading')">Перейти к влиянию</button>

      </template>
      <InfluencePicker v-else-if="store.phase === 'playing' && store.me.stage === 'influence'" />
      <section v-else-if="store.phase === 'playing' && store.me.stage === 'purchase'" class="stack influence-purchase">
        <div class="purchase-heading"><h2>{{ (store.me.influenceCards ?? []).length === 3 ? 'Покупка карты победы' : 'Покупка карты влияния' }}</h2></div>
        <template v-if="(store.me.influenceCards ?? []).length < 3"><div class="influence-purchase-grid"><button v-for="id in INFLUENCE_TYPES" :key="id" class="influence-purchase-card" :class="{ 'is-selected': store.draft?.purchase === id, 'is-owned': (store.me.influenceCards ?? []).includes(id) }" :disabled="(store.me.influenceCards ?? []).includes(id) || store.availableForPurchase < 20 || store.busy" :aria-pressed="store.draft?.purchase === id" :aria-label="`${INFLUENCE_INFO[id].name}${(store.me.influenceCards ?? []).includes(id) ? ' — уже куплена' : ' — $20'}`" @click="store.action('choose-purchase', { purchase: store.draft?.purchase === id ? null : id })"><span class="influence-purchase-card__icon" aria-hidden="true">{{ influenceIcons[id] }}</span><span>{{ INFLUENCE_INFO[id].name }}</span></button></div><p class="influence-purchase-description" role="status">{{ store.draft?.purchase && store.draft.purchase !== 'victory' ? INFLUENCE_INFO[store.draft.purchase].description : '' }}</p></template>
        <button v-else class="victory-purchase-card" :class="{ 'is-selected': store.draft?.purchase === 'victory' }" :aria-pressed="store.draft?.purchase === 'victory'" :disabled="store.busy || store.availableForPurchase < 30" @click="store.action('choose-purchase', { purchase: 'victory' })"><span class="victory-purchase-card__crown" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4 15h16l4-15-7 6-5-9-5 9-7-6z"/><path d="M8 28h16"/></svg></span><strong>Карта победы</strong><span class="victory-purchase-card__price">$30</span></button>
        <button class="btn btn--primary" :disabled="store.busy" @click="store.action('finish-turn')">{{ store.draft?.purchase === 'victory' ? 'Купить и закончить игру' : store.draft?.purchase ? 'Купить и закончить ход' : 'Закончить ход' }}</button>
        <div class="influence-purchase__back"><button class="btn btn--block" @click="store.action('back-to-influence')"><span aria-hidden="true">←</span> Вернуться</button></div>
      </section>
      <div v-else-if="store.phase === 'playing'" class="waiting-state"><span aria-hidden="true">✓</span><h2>Ваш ход завершён</h2><p class="muted">Дождитесь общего раскрытия на доске результатов.</p></div>
      <div v-else-if="store.phase === 'reveal'" class="waiting-state"><span aria-hidden="true">↗</span><h2>Карты раскрыты</h2><p class="muted">Результат раунда — на доске. {{ store.isMain ? '' : 'Главный игрок запустит следующий раунд.' }}</p></div>
      <div v-else class="waiting-state"><h2>Партия завершена</h2><p class="muted">Итоги и победитель — на доске результатов.</p></div>
    </section>
    <button v-if="store.isMain && (store.phase === 'reveal' || (store.phase === 'playing' && store.me.stage === 'ready'))" class="btn btn--primary btn--block" :disabled="store.busy || store.phase !== 'reveal'" @click="store.action('continue')">Следующий раунд</button>
  </div>
</template>
