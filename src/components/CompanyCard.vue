<script setup lang="ts">
import { computed } from 'vue'
import { companyMeta } from '@/game/constants'
import type { CompanyState } from '@/game/types'

const props = defineProps<{
  company: CompanyState
  delta: number | null
  deltaRound?: number | null
  initial?: boolean
  min: number
  max: number
}>()
const meta = computed(() => companyMeta(props.company.id))
const priceLevel = computed(() => Math.max(0, Math.min(100, (props.company.price - props.min) / Math.max(1, props.max - props.min) * 100)))
const deltaView = computed(() => {
  if (props.delta === null) return { text: props.initial ? 'Стартовая цена' : 'Ждём раскрытия', className: 'delta--flat' }
  if (props.delta > 0) return { text: `↗ +${props.delta}`, className: 'delta--up' }
  if (props.delta < 0) return { text: `↘ −${Math.abs(props.delta)}`, className: 'delta--down' }
  return { text: '— 0', className: 'delta--flat' }
})
</script>

<template>
  <article class="company-card" :style="{ '--company-color': meta.color, '--price-level': `${priceLevel}%` }" :aria-label="`${meta.name}: цена ${company.price}`">
    <svg class="company-card__silhouette" viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <g v-if="company.id === 'REDSTONE'">
        <path d="m35 130 66-76 12 11-65 77z" fill="currentColor" stroke="none" />
        <path d="M25 49c31-28 70-22 100 9l15 26-30-14C81 46 56 42 25 49Z" fill="currentColor" stroke="none" />
        <path d="m23 112 16-14m69 23 19 17m-3-35 16 3" stroke-width="5" />
      </g>
      <g v-else-if="company.id === 'BLUEWELL'">
        <path d="M63 39h34v27h27v34H97v27H63v-27H36V66h27Z" fill="currentColor" stroke="none" />
        <path d="M48 17H26v26m86-26h22v26M26 119v25h22m64 0h22v-25" stroke-width="5" />
        <circle cx="26" cy="76" r="5" fill="currentColor" stroke="none" /><circle cx="134" cy="76" r="5" fill="currentColor" stroke="none" />
      </g>
      <g v-else>
        <path d="m92 16-57 76h39l-9 53 62-82H86Z" fill="currentColor" stroke="none" />
        <path d="m29 34 9 10m88-17-10 12M18 76h12m101 35 12 5m-23 24-9-9" stroke-width="5" />
      </g>
    </svg>
    <div class="company-card__head">
      <div class="company-card__name">{{ meta.name }}</div>
      <div class="company-card__industry">{{ meta.industry }}</div>
    </div>
    <div class="company-card__bottom">
      <div class="company-card__change">
        <span class="company-card__change-label">{{ deltaRound ? `За раунд ${deltaRound}` : 'Изменение за раунд' }}</span>
        <span class="delta" :class="deltaView.className">{{ deltaView.text }}</span>
      </div>
      <div class="company-card__price">{{ company.price }}<span class="money-unit" aria-hidden="true">$</span></div>
    </div>
    <div class="company-thermometer" role="meter" :aria-label="`Цена ${meta.name}`" :aria-valuemin="min" :aria-valuemax="max" :aria-valuenow="company.price" :aria-valuetext="`${company.price} из ${max}`">
      <span class="company-thermometer__limit" aria-hidden="true">{{ max }}</span>
      <div class="company-thermometer__track" aria-hidden="true"><div class="company-thermometer__fill"></div><span class="company-thermometer__marker"></span></div>
      <span class="company-thermometer__limit" aria-hidden="true">{{ min }}</span>
    </div>
  </article>
</template>
