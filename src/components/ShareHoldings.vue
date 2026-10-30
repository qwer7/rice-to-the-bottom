<script setup lang="ts">
import { COMPANY_IDS, companyMeta } from '@/game/constants'
import type { Player } from '@/game/types'
defineProps<{ player: Player; board?: boolean }>()
</script>
<template>
  <div :class="board ? 'tv-shares' : 'portfolio-holdings'" :aria-label="COMPANY_IDS.map(id => `${companyMeta(id).name}: ${player.portfolio[id]} из 5`).join(', ')"><span v-for="id in COMPANY_IDS" :key="id" class="tv-share-group" :style="{ '--share-color': companyMeta(id).color }" aria-hidden="true"><span v-for="slot in 5" :key="slot" class="tv-share" :class="{ 'is-owned': slot <= player.portfolio[id] }"></span></span></div>
</template>
