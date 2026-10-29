<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const confirmation = ref<'reset' | 'close' | 'new-lobby' | null>(null)
const name = ref(localStorage.getItem('race-to-the-bottom:display-name') || '')
async function confirmAction() { if (confirmation.value) await store.action(confirmation.value); confirmation.value = null }
async function create() { localStorage.setItem('race-to-the-bottom:display-name', name.value.trim()); await store.hubAction('create-room',{name:name.value}) }
</script>
<template>
  <main class="stack management-screen">
    <div><p class="eyebrow">Лидер комнаты {{ store.roomCode }}</p><h1>Управление</h1></div>
    <form v-if="!store.hasRoom" class="card stack" @submit.prevent="create"><h2>Новое лобби</h2><label class="field"><span>Ваше имя в игре</span><input v-model="name" maxlength="24" required autocomplete="nickname"></label><button class="btn btn--primary" :disabled="store.busy || !name.trim()">Создать лобби</button></form>
    <section v-else-if="store.isMain" class="card stack">
      <p class="eyebrow">Код комнаты</p><h2>{{ store.roomCode }}</h2>
      <template v-if="!confirmation">
        <template v-if="store.phase === 'lobby'">
          <h3>Игроки · {{ store.players.length }} / 5</h3>
          <ul class="lobby-roster"><li v-for="player in store.players" :key="player.id"><strong>{{ player.name }}</strong><span v-if="player.id === store.me?.id" class="badge">Вы</span><button v-else class="btn btn--small btn--danger" :disabled="store.busy" @click="store.action('remove-player',{targetPlayerId:player.id})">Удалить</button></li></ul>
          <button class="btn btn--primary" :disabled="store.busy || store.players.length < 2" @click="store.action('start')">Начать партию</button>
        </template>
        <p v-else class="muted">Раунд {{ store.round }} · {{ store.phase === 'playing' ? 'игроки делают ходы' : store.phase === 'reveal' ? 'карты раскрыты' : 'партия завершена' }}</p>
        <button v-if="store.phase !== 'lobby'" class="btn" :disabled="store.busy" @click="confirmation = 'reset'">{{ store.phase === 'finished' ? 'Играть снова' : 'Сбросить партию' }}</button>
        <button v-if="store.game?.lobbyMode !== 'first-player'" class="btn btn--danger" :disabled="store.busy" @click="confirmation = 'close'">Закрыть лобби</button>
      </template>
      <div v-else role="alertdialog" aria-label="Подтверждение управления партией" class="stack"><p>{{ confirmation === 'new-lobby' ? 'Открыть новое лобби с новым кодом? Вы останетесь лидером, остальные игроки подключатся заново. Доска переключится автоматически.' : confirmation === 'close' ? 'Закрыть лобби для всех участников?' : 'Вернуть всех в лобби? Капитал и карты будут выданы заново.' }}</p><button class="btn" @click="confirmation = null">Отмена</button><button class="btn btn--danger" :disabled="store.busy" @click="confirmAction">Подтвердить</button></div>
    </section>
    <p v-else class="muted">Управление доступно лидеру комнаты.</p>
  </main>
</template>
