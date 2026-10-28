<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const winners = computed(() => store.ranking.filter(row => store.winnerIds?.includes(row.player.id)).map(row => row.player.name))
</script>
<template>
  <section class="card game-over"><p class="eyebrow">Итоги партии</p><h2 class="winner">{{ winners.length > 1 ? 'Ничья' : 'Победитель' }}: {{ winners.join(', ') }}</h2><div class="podium"><div v-for="row in store.ranking" :key="row.player.id" class="podium__item" :class="{ 'is-winner': store.winnerIds?.includes(row.player.id) }"><strong>{{ row.player.name }}</strong><span>{{ row.capital }}<span class="money-unit" aria-hidden="true">$</span></span></div></div></section>
</template>
