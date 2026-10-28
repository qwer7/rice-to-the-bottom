<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'
defineProps<{ board?: boolean }>()
const store = useGameStore()
</script>
<template>
  <section class="card room-lobby">
    <p class="eyebrow">Лобби комнаты</p><h2>{{ board ? 'Собираем игроков' : 'Вы в комнате' }}</h2>
    <p class="muted">{{ !store.players.length ? 'Первый подключившийся игрок станет лидером.' : store.isMain && !board ? 'Вы — лидер. Начните партию, когда все соберутся.' : 'Лидер начнёт партию, когда все соберутся.' }}</p>
    <ul v-if="board || store.isMain" class="lobby-roster"><li v-for="(player,index) in store.players" :key="player.id"><span class="player-number">{{ String(index + 1).padStart(2,'0') }}</span><strong>{{ player.name }}</strong><span v-if="index === 0" class="badge">Лидер</span></li></ul>
    <button v-if="store.isMain && !board" class="btn btn--primary" :disabled="store.busy || store.players.length < 2" @click="store.action('start')">Начать партию</button>
    <p class="muted">Подключено: {{ store.players.length }} из 5 · нужно минимум 2.</p>

  </section>
</template>
