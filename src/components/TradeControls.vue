<script setup lang="ts">
import { salePrice } from '../../supabase/functions/_shared/game'
import { companyMeta } from '@/game/constants'
import { useGameStore } from '@/stores/gameStore'
import type { Player } from '@/game/types'
defineProps<{ player: Player }>()
const store = useGameStore()
</script>
<template>
  <div class="trade-cards">
    <article v-for="company in store.companies" :key="company.id" class="trade-card" :style="{ '--company-color': companyMeta(company.id).color }" :aria-label="companyMeta(company.id).name">
      <h3><span class="trade-card__label">Акция</span>{{ companyMeta(company.id).name }}</h3>
      <div class="trade-card__stats"><div><span>Цена</span><strong>{{ company.price }}<span class="money-unit" aria-hidden="true">$</span></strong></div><div><span>У вас</span><strong>{{ player.portfolio[company.id] }}<small> / 5</small></strong></div></div>
      <div class="trade-card__buttons"><button class="btn btn--buy" :aria-label="`Купить акцию ${company.id}`" :disabled="!store.canBuy(player.id, company.id)" @click="store.buyShare(company.id)"><span class="desktop-only">Купить</span><span class="mobile-only" aria-hidden="true">+</span></button><button class="btn btn--sell" :aria-label="`Продать акцию ${company.id}`" :disabled="!store.canSell(player.id, company.id)" @click="store.sellShare(company.id)"><span class="desktop-only">Продать за ${{ salePrice(player, company.price) }}</span><span class="mobile-only">${{ salePrice(player, company.price) }}</span><span class="mobile-only" aria-hidden="true">−</span></button></div>
    </article>
  </div>
</template>
