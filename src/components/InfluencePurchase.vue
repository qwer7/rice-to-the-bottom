<script setup lang="ts">
import VictoryCrown from './VictoryCrown.vue'
import { influenceIcons } from '@/game/influenceIcons'
import { INFLUENCE_INFO, INFLUENCE_TYPES } from '../../supabase/functions/_shared/game'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
</script>
<template>
  <section  class="stack influence-purchase">
        <div class="purchase-heading"><h2>{{ (store.me!.influenceCards ?? []).length === 3 ? 'Покупка карты победы' : 'Покупка карты влияния' }}</h2></div>
        <template v-if="(store.me!.influenceCards ?? []).length < 3"><div class="influence-purchase-grid"><button v-for="id in INFLUENCE_TYPES" :key="id" class="influence-purchase-card" :class="{ 'is-selected': store.draft?.purchase === id, 'is-owned': (store.me!.influenceCards ?? []).includes(id) }" :disabled="(store.me!.influenceCards ?? []).includes(id) || store.availableForPurchase < store.influenceCardPrice || store.busy" :aria-pressed="store.draft?.purchase === id" :aria-label="`${INFLUENCE_INFO[id].name}${(store.me!.influenceCards ?? []).includes(id) ? ' — уже куплена' : ` — $${store.influenceCardPrice}`}`" @click="store.action('choose-purchase', { purchase: store.draft?.purchase === id ? null : id })"><span class="influence-purchase-card__icon" aria-hidden="true">{{ influenceIcons[id] }}</span><span>{{ INFLUENCE_INFO[id].name }}</span></button></div><p class="influence-purchase-description" role="status">{{ store.draft?.purchase && store.draft.purchase !== 'victory' ? INFLUENCE_INFO[store.draft.purchase].description : `Карта влияния стоит $${store.influenceCardPrice}` }}</p></template>
        <button v-else class="victory-purchase-card" :class="{ 'is-selected': store.draft?.purchase === 'victory' }" :aria-pressed="store.draft?.purchase === 'victory'" :disabled="store.busy || store.availableForPurchase < store.victoryCardPrice" @click="store.action('choose-purchase', { purchase: 'victory' })"><span class="victory-purchase-card__crown" aria-hidden="true"><VictoryCrown /></span><strong>Карта победы</strong><span class="victory-purchase-card__price">${{ store.victoryCardPrice }}</span></button>
        <button class="btn btn--primary" :disabled="store.busy" @click="store.action('finish-turn')">{{ store.draft?.purchase === 'victory' ? 'Купить и закончить игру' : store.draft?.purchase ? `Заплатить ${store.influenceCardPrice}$ и закончить ход` : 'Закончить ход' }}</button>
        <div class="influence-purchase__back"><button class="btn btn--block" @click="store.action('back-to-influence')"><span aria-hidden="true">←</span> Вернуться</button></div>
      </section>
</template>
