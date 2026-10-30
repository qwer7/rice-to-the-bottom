<script setup lang="ts">
import { computed, ref } from 'vue'
import { INFLUENCE_INFO, type InfluenceType } from '../../supabase/functions/_shared/game'
import InfluenceIcon from './InfluenceIcon.vue'
const props = defineProps<{ cards?: InfluenceType[]; board?: boolean }>()
const influenceSlots = computed(() => Array.from({ length: 3 }, (_, i) => props.cards?.[i]))
const selectedInfluence = ref<InfluenceType | null>(null)
function toggleInfluence(card: InfluenceType) { selectedInfluence.value = selectedInfluence.value === card ? null : card }
</script>
<template>
  <div v-if="board" class="tv-card-slots" :aria-label="`Карты: ${(cards ?? []).map(id => INFLUENCE_INFO[id].name).join(', ') || 'нет'}`"><span v-for="(card, slot) in influenceSlots" :key="slot" class="tv-card-slot" :class="{ 'is-filled': card }" aria-hidden="true"><InfluenceIcon v-if="card" :name="card" /></span></div>
  <div v-else class="player-influences" aria-label="Карты влияния" @keydown.esc="selectedInfluence = null"><div class="player-influences__slots"><template v-for="(card, slot) in influenceSlots" :key="slot"><button v-if="card" class="player-influence-slot is-filled" :aria-label="INFLUENCE_INFO[card].name" :aria-expanded="selectedInfluence === card" @click="toggleInfluence(card)"><InfluenceIcon :name="card" /></button><span v-else class="player-influence-slot" role="img" aria-label="Пустая ячейка карты влияния"></span></template></div><div v-if="selectedInfluence" class="player-influences__help" role="note"><strong>{{ INFLUENCE_INFO[selectedInfluence].name }}</strong><p>{{ INFLUENCE_INFO[selectedInfluence].description }}</p><p v-if="selectedInfluence === 'tax' || selectedInfluence === 'theft'" class="muted">Использована</p></div></div>
</template>
