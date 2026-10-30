<script setup lang="ts">
import VictoryCrown from './VictoryCrown.vue'
import InfluenceSlots from './InfluenceSlots.vue'
import ShareHoldings from './ShareHoldings.vue'
import { useGameStore } from '@/stores/gameStore'
import { totalCapital } from '@/game/scoring'
const store = useGameStore()
const stageLabel = (stage: string) => stage === 'ready' ? 'Готов' : 'Делает ход'
const shortPlayerName = (name: string) => { const chars = Array.from(name); return chars.length > 15 ? `${chars.slice(0, 15).join('')}…` : name }
</script>
<template>
    <section class="card capital-board"><h2 class="card__title">Капитал игроков <span class="tv-ready-count">Раунд {{ store.round }}</span></h2><p v-if="store.phase === 'playing'" class="muted">Результаты прошлого раунда. Обновятся после хода всех игроков.</p><div class="table-scroll"><table class="table tv-capital-table">
      <thead><tr><th>Игрок</th><th>Карты</th><th>Акции</th><th>Деньги</th><th>Капитал</th></tr></thead>
      <tbody><tr v-for="player in store.players" :key="player.id">
        <td><span :title="player.name">{{ shortPlayerName(player.name) }}</span><span v-if="store.phase === 'finished' && store.winnerIds?.includes(player.id)" class="winner-crown" aria-label="Победитель"><VictoryCrown /></span><span v-if="store.phase === 'playing'" class="tv-player-status" :class="{ 'is-ready': player.stage === 'ready' }" :aria-label="stageLabel(player.stage)">{{ player.stage === 'ready' ? '✓' : '◷' }}</span></td>
        <td><InfluenceSlots :cards="player.influenceCards" board /></td>
        <td><ShareHoldings :player="player" board /></td>
        <td>{{ player.balance }}<span class="money-unit" aria-hidden="true">$</span></td><td><strong>{{ totalCapital(player, store.companies) }}<span class="money-unit" aria-hidden="true">$</span></strong></td>
      </tr></tbody>
    </table></div></section>
</template>
