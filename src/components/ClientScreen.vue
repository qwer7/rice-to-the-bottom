<script setup lang="ts">
import PlayerPanel from './PlayerPanel.vue'
import RoomLobby from './RoomLobby.vue'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
</script>
<template><main class="client-screen"><div v-if="store.phase === 'lobby'" class="room-card"><div><p class="eyebrow">Код комнаты</p><strong>{{ store.roomCode }}</strong></div></div><RoomLobby v-if="store.phase === 'lobby'" /><PlayerPanel v-else /></main></template>
