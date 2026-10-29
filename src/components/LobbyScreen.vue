<script setup lang="ts">
import { ref } from 'vue'
import { readPlayerName, rememberPlayerName } from '@/lib/playerName'
import { roomFromSearch } from '@/lib/joinLink'
import { useDisplayMode } from '@/composables/useDisplayMode'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const { phone } = useDisplayMode()
const role = ref<'player' | 'board'>('player')
const name = ref(readPlayerName())
const code = ref(roomFromSearch(location.search))
async function enter() {
  await store.connect(phone.value ? 'player' : role.value,code.value,name.value)
  if (store.hasRoom && !store.error) rememberPlayerName(name.value)
}
</script>
<template>
  <main class="lobby-screen" :class="{ 'lobby-screen--client': phone }">
    <section v-if="!phone" class="lobby-intro"><p class="eyebrow">2–5 игроков · гонка за картой победы</p><h1>Рынок меняете вы</h1><p class="muted">Откройте доску на общем экране, затем подключайтесь с телефонов.</p></section>
    <div v-if="!phone" class="role-grid role-grid--two" aria-label="Выбор роли"><button class="role-card" :class="{ 'is-selected': role === 'player' }" @click="role = 'player'"><span class="role-card__symbol" aria-hidden="true">♠</span><strong>Игрок</strong><span>Войти по коду комнаты и выбрать имя.</span></button><button class="role-card" :class="{ 'is-selected': role === 'board' }" @click="role = 'board'"><span class="role-card__symbol" aria-hidden="true">↗</span><strong>Доска результатов</strong><span>Открыть лобби на общем экране.</span></button></div>
    <section v-if="!phone && role === 'board'" class="card stack lobby-form"><h2>Общий экран</h2><p class="muted">На доске появится код комнаты. Первый подключившийся игрок станет лидером и запустит партию.</p><button class="btn btn--primary" :disabled="store.busy" @click="store.openDisplay()">{{ store.busy ? 'Открываем…' : 'Открыть лобби' }}</button><details><summary>Подключить ещё одну доску</summary><form class="stack" @submit.prevent="store.connect('board',code,'')"><label class="field"><span>Код комнаты</span><input v-model="code" maxlength="6" required autocapitalize="characters" autocomplete="off"></label><button class="btn" :disabled="store.busy || code.trim().length !== 6">Подключиться</button></form></details></section>
    <form v-else class="card lobby-form" @submit.prevent="enter"><div><p class="eyebrow">Вход игрока</p><h2>Присоединиться к игре</h2></div><label class="field"><span>Код с доски</span><input v-model="code" maxlength="6" placeholder="ABC234" autocapitalize="characters" autocomplete="off" required></label><label class="field"><span>Ваше имя</span><input v-model="name" maxlength="24" placeholder="Например, Саша" autocomplete="nickname" required></label><button class="btn btn--primary" :disabled="store.busy || code.trim().length !== 6 || !name.trim()">{{ store.busy ? 'Подключаемся…' : 'Войти в игру' }}</button><p class="muted">Первый игрок станет лидером. Остальные просто присоединяются.</p></form>
  </main>
</template>
