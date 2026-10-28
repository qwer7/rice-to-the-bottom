<script setup lang="ts">
import { computed } from 'vue'
import { companyMeta, COMPANY_IDS } from '@/game/constants'
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
      <div class="portfolio-holdings"><div v-for="id in COMPANY_IDS" :key="id" class="portfolio-holding" :style="{ '--company-color': companyMeta(id).color }"><span>{{ companyMeta(id).name }}</span><strong>{{ player.portfolio[id] }}</strong><div class="share-dots" aria-hidden="true"><i v-for="n in player.portfolio[id]" :key="n"></i></div></div></div>
    </div>
    <div class="portfolio-capital"><span>Капитал</span><strong>{{ capital }}<span class="money-unit" aria-hidden="true">$</span></strong></div>
  </div>
</template>
