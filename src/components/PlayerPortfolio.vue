<script setup lang="ts">
import { computed } from 'vue'
import ShareHoldings from './ShareHoldings.vue'
import { portfolioValue, totalCapital } from '@/game/scoring'
import { useGameStore } from '@/stores/gameStore'
import type { Player } from '@/game/types'

const props = defineProps<{ player: Player }>()

const store = useGameStore()

const portfolio = computed(() => portfolioValue(props.player, store.companies))
const capital = computed(() => totalCapital(props.player, store.companies))
</script>

<template>
  <div class="portfolio-summary">
    <div class="portfolio-money"><span>Баланс</span><strong>{{ player.balance }}<span class="money-unit" aria-hidden="true">$</span></strong></div>
    <div class="portfolio-shares">
      <div class="portfolio-shares__heading"><span>Акции</span><span>Стоимость <strong>{{ portfolio }}<span class="money-unit" aria-hidden="true">$</span></strong></span></div>
      <ShareHoldings :player="player" />
    </div>
    <div class="portfolio-capital"><span>Капитал</span><strong>{{ capital }}<span class="money-unit" aria-hidden="true">$</span></strong></div>
  </div>
</template>
