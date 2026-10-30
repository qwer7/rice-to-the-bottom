<script setup lang="ts">
import { computed } from 'vue'
import { companyMeta } from '@/game/constants'
import type { CompanyState } from '@/game/types'

const props = defineProps<{
  company: CompanyState
  delta: number | null
  deltaRound?: number | null
  initial?: boolean
  previousPrice?: number
  min: number
  max: number
}>()
const meta = computed(() => companyMeta(props.company.id))
const previousPrice = computed(() => props.previousPrice ?? (props.delta === null ? null : props.company.price - props.delta))
const priceLevel = computed(() => Math.max(0, Math.min(100, (props.company.price - props.min) / Math.max(1, props.max - props.min) * 100)))
const deltaView = computed(() => {
  if (props.delta === null) return { text: props.initial ? 'Стартовая цена' : 'Ждём раскрытия', className: 'delta--flat' }
  if (props.delta > 0) return { text: `↗ +${props.delta}`, className: 'delta--up' }
  if (props.delta < 0) return { text: `↘ −${Math.abs(props.delta)}`, className: 'delta--down' }
  return { text: '— 0', className: 'delta--flat' }
})
</script>

<template>
  <article class="company-card" :class="`company-card--${company.id}`" :style="{ '--company-color': meta.color, '--price-level': `${priceLevel}%` }" :aria-label="`${meta.name}: цена ${company.price}`">
    <div class="company-card__head">
      <div class="company-card__name">{{ meta.name }}</div>
      <div class="company-card__industry">{{ meta.industry }}</div>
    </div>
    <div class="company-card__bottom">
      <div class="company-card__change">
        <span v-if="previousPrice !== null" class="company-card__change-label">{{ previousPrice }}$ → {{ company.price }}$</span>
        <span v-if="delta !== null" class="delta" :class="deltaView.className">{{ deltaView.text }}</span>
      </div>
      <div class="company-card__price"><span class="company-card__price-value">{{ company.price }}</span><span class="money-unit" aria-hidden="true">$</span></div>
    </div>
    <div class="company-thermometer" role="meter" :aria-label="`Цена ${meta.name}`" :aria-valuemin="min" :aria-valuemax="max" :aria-valuenow="company.price" :aria-valuetext="`${company.price} из ${max}`">
      <span class="company-thermometer__limit" aria-hidden="true">{{ max }}</span>
      <div class="company-thermometer__track" aria-hidden="true"><div class="company-thermometer__fill"></div><span class="company-thermometer__marker"></span></div>
      <span class="company-thermometer__limit" aria-hidden="true">{{ min }}</span>
    </div>
  </article>
</template>
