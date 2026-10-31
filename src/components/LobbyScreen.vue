<script setup lang="ts">
import { ref } from 'vue'
import { readPlayerName, rememberPlayerName } from '@/lib/playerName'
import { roomFromSearch } from '@/lib/joinLink'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const role = ref<'player' | 'board'>('player')
const name = ref(readPlayerName().slice(0, 14))
const code = ref(roomFromSearch(location.search))
async function enter() {
  await store.connect('player', code.value, name.value)
  if (store.hasRoom && !store.error) rememberPlayerName(name.value)
}
</script>
<template>
  <main class="lobby-screen">
    <section class="lobby-intro"><h1>Начать игру</h1><p class="muted">Откройте доску на общем экране и подключайтесь с телефонов.</p></section>
    <div class="lobby-roles" role="group" aria-label="Выбор роли">
        <button type="button" :class="{ 'is-selected': role === 'player' }" :aria-pressed="role === 'player'" @click="role = 'player'"><span aria-hidden="true">♠</span> Игрок</button>
        <button type="button" :class="{ 'is-selected': role === 'board' }" :aria-pressed="role === 'board'" @click="role = 'board'"><span aria-hidden="true">↗</span> Доска результатов</button>
    </div>
    <section class="card lobby-panel">
      <template v-if="role === 'board'">
        <div class="lobby-board-form"><p class="muted">На доске появится код комнаты. Первый подключившийся игрок станет лидером и запустит партию.</p><button class="btn btn--primary" :disabled="store.busy" @click="store.openDisplay()">{{ store.busy ? 'Открываем…' : 'Открыть лобби' }}</button><details><summary>Подключить ещё одну доску</summary><form class="stack" @submit.prevent="store.connect('board', code, '')"><label class="field"><span>Код комнаты</span><input v-model="code" maxlength="6" required autocapitalize="characters" autocomplete="off"></label><button class="btn" :disabled="store.busy || code.trim().length !== 6">Подключиться</button></form></details></div>
      </template>
      <form v-else class="lobby-form" @submit.prevent="enter">
        <label class="field"><span>Код с доски</span><input v-model="code" maxlength="6" placeholder="ABC234" autocapitalize="characters" autocomplete="off" required></label>
        <label class="field"><span>Ваше имя</span><input v-model="name" maxlength="14" placeholder="Например, Саша" autocomplete="nickname" required></label>
        <button class="btn btn--primary" :disabled="store.busy || code.trim().length !== 6 || !name.trim()">{{ store.busy ? 'Подключаемся…' : 'Войти в игру' }}</button>
        <p class="muted lobby-panel__hint">Первый игрок станет лидером.</p>
      </form>
    </section>
  </main>
</template>
