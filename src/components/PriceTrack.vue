<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  price: number
  min: number
  max: number
  color: string
}>()

const percent = computed(() => {
  const range = props.max - props.min
  if (range <= 0) return 0
  return ((props.price - props.min) / range) * 100
})

const ticks = computed(() =>
  Array.from({ length: props.max - props.min + 1 }, (_, index) => props.min + index),
)
</script>

<template>
  <div class="price-track">
    <div class="price-track__bar">
      <span
        class="price-track__marker"
        :style="{ left: `${percent}%`, background: color }"
        :title="`Цена: ${price}`"
      />
    </div>
    <div class="price-track__ticks">
      <span v-for="tick in ticks" :key="tick">{{ tick }}</span>
    </div>
  </div>
</template>
