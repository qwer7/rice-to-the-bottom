<script setup lang="ts">
import { computed } from 'vue'
import { cardTheme } from '@/game/cardPresentation'
import { companyMeta } from '@/game/constants'
import type { Card, CompanyId } from '@/game/types'
import redstoneImage from '@/assets/game-backgrounds-web-jpeg/redstone-clean.jpg'
import bluewellImage from '@/assets/game-backgrounds-web-jpeg/bluewell-clean.jpg'
import goldsparkImage from '@/assets/game-backgrounds-web-jpeg/goldspark-clean.jpg'
const companyImages: Record<CompanyId, string> = { REDSTONE: redstoneImage, BLUEWELL: bluewellImage, GOLDSPARK: goldsparkImage }
const props = defineProps<{ card: Card; compact?: boolean }>()
const effects = computed<Array<{ company: CompanyId; delta?: number }>>(() => {
  const card = props.card
  return card.kind === 'pair' ? [{company:card.up,delta:card.gain},{company:card.down,delta:-card.loss}] : card.kind === 'single' ? [{company:card.company,delta:card.delta}] : [{company:card.a},{company:card.b}]
})
const rows = computed(() => {
  const c = props.card
  if (c.kind === 'pair') return [{company:c.up,value:`+${c.gain}`,direction:'↑'}, {company:c.down,value:`−${c.loss}`,direction:'↓'}]
  if (c.kind === 'swap') return [{company:c.a,value:'⇄',direction:'⇄'}, {company:c.b,value:'⇄',direction:'⇄'}]
  const effect = {company:c.company,value:c.delta > 0 ? '+3' : '−3',direction:c.delta > 0 ? '↑' : '↓'}
  return c.delta > 0 ? [effect,{company:null,value:'—',direction:'↓'}] : [{company:null,value:'—',direction:'↑'},effect]
})
const description = computed(() => props.card.kind === 'swap' ? `Обмен цен: ${props.card.a} и ${props.card.b}` : effects.value.map(e => `${e.company} ${e.delta! > 0 ? '+' : ''}${e.delta}`).join(', '))
const artwork = computed(() => ({ '--image-a': rows.value[0].company ? `url("${companyImages[rows.value[0].company]}")` : 'none', '--image-b': rows.value[1].company ? `url("${companyImages[rows.value[1].company]}")` : 'none' }))
</script>
<template>
  <div v-if="compact" class="card-mini" :class="{ 'card-mini--single': card.kind === 'single' }" :style="[cardTheme(card), artwork]" role="img" :aria-label="description" :title="description">
    <div class="market-card-art" aria-hidden="true"><span></span><span></span></div>
    <span v-if="card.kind === 'single'" class="card-mini__icon" aria-hidden="true">↓</span>
    <template v-for="(effect,index) in effects" :key="effect.company"><span v-if="card.kind === 'swap' && index === 1" class="card-mini__icon" aria-hidden="true">⇄</span><span class="card-mini__effect" :style="{ color: companyMeta(effect.company).color }" aria-hidden="true"><i v-if="card.kind === 'swap'"></i><strong v-if="effect.delta !== undefined">{{ effect.delta > 0 ? '+' : '−' }}{{ Math.abs(effect.delta) }}</strong></span></template>
  </div>
  <div v-else class="influence-card" :style="[cardTheme(card), artwork]" role="img" :aria-label="description">
    <div class="market-card-art" aria-hidden="true"><span></span><span></span></div>
    <div v-for="(row, index) in rows" :key="index" class="market-card-half" :class="[index === 0 ? 'market-card-half--top' : 'market-card-half--bottom', { 'market-card-half--empty': !row.company }]" :style="{ '--company-color': row.company ? companyMeta(row.company).color : undefined }" aria-hidden="true">
      <span class="market-card-half__label"><span>{{ row.direction }}</span> {{ row.company ?? (index === 0 ? 'Без роста' : 'Без снижения') }}</span>
      <strong class="market-card-half__value">{{ row.value }}</strong>
    </div>
  </div>
</template>
