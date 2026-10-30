<script setup lang="ts">
import { useDisplayMode } from '@/composables/useDisplayMode'
import { onMounted } from 'vue'
import logo from '@/assets/logo.png'
import ManagementScreen from '@/components/ManagementScreen.vue'
import HubScreen from '@/components/HubScreen.vue'
import LobbyScreen from '@/components/LobbyScreen.vue'
import HostScreen from '@/components/HostScreen.vue'
import ClientScreen from '@/components/ClientScreen.vue'
import BoardSettings from '@/components/BoardSettings.vue'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const { phone, tv:tvMode, tablet } = useDisplayMode()
onMounted(async () => {
  if (location.pathname.replace(/\/$/, '') === '/ux/preview') return
  if (tvMode) { await store.openDisplay(); store.restoring = false; return }
  await store.restore()
  if (phone.value) {
    if (!store.restoreFailed && !store.me && (store.hasRoom || store.hasHub)) store.exitHub()
    store.setRole(store.isMain ? 'main' : 'player')
  }
})
</script>
<template>
  <div class="app" :class="{ 'app--personal': store.hasRoom && store.role !== 'board', 'app--player-background': !tvMode && store.role !== 'board', 'app--in-room': store.hasRoom, 'app--tv': tvMode || (store.hasRoom && store.role === 'board'), 'app--tablet': tablet && store.role !== 'board' }">
    <header class="app__header">
      <div class="brand"><img class="brand__mark" :src="logo" alt="" aria-hidden="true" /><div><p class="brand__name">Race to the Bottom</p><p class="brand__caption">{{ !store.hasRoom ? 'Рынок меняете вы' : store.role === 'board' ? 'Доска результатов' : store.isMain ? 'Главный игрок' : 'Игрок' }}</p></div></div>
      <nav v-if="store.hasRoom || store.hasHub" class="app__tools" aria-label="Экраны игры">
        <span v-if="store.hasRoom && store.phase !== 'lobby'" class="header-room" :aria-label="`Код комнаты: ${store.roomCode}`"><span>Комната</span><strong>{{ store.roomCode }}</strong></span>
        <span class="connection" :class="{ 'is-online': store.connection === 'На связи', 'is-offline': store.connection.startsWith('Связь прервана') }" :title="store.connection" :aria-label="store.connection" role="status">{{ store.connection }}</span>
        <BoardSettings v-if="tvMode && store.hub?.isDisplayOwner && store.role === 'board'" compact />
        <button v-if="!phone && !tvMode && (store.hasRoom || store.hasHub) && store.role !== 'board'" class="btn btn--small nav-button" aria-label="Доска результатов" title="Доска результатов" @click="store.setRole('board')"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 19V5m0 14h16M9 16v-5m5 5V7m5 9V3" /></svg><span class="nav-label">Доска результатов</span></button>
        <button v-if="!tvMode && store.hasRoom && store.me && store.role !== 'player' && store.role !== 'main'" class="btn btn--small nav-button" aria-label="Мой экран" title="Мой экран" @click="store.setRole(store.isMain ? 'main' : 'player')"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg><span class="nav-label">Мой экран</span></button>
        <button v-if="!tvMode && (store.isMain || store.hub?.isManager) && store.role !== 'manage'" class="btn btn--small nav-button" aria-label="Управление" title="Управление" @click="store.setRole('manage')"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></svg><span class="nav-label">Управление</span></button>
        <button v-if="!tvMode" class="btn btn--small nav-button" aria-label="Выйти" title="Выйти" @click="store.exitHub()"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M10 4H4v16h6m4-13 5 5-5 5m-6-5h12"/></svg><span class="nav-label">Выйти</span></button>
      </nav>
    </header>
    <p v-if="store.restoring" class="muted" role="status">Подключаемся…</p>
    <template v-else>
      <p v-if="store.error" class="error error-banner" role="alert">{{ store.error }}</p>
      <button v-if="store.restoreFailed && !tvMode" class="btn" @click="store.restore()">Повторить восстановление</button>
      <section v-if="tvMode && !store.hasRoom" class="card stack"><h1>Открываем лобби</h1><p class="muted">Доска подключается к серверу. Код комнаты появится здесь автоматически.</p><button class="btn btn--primary" :disabled="store.busy" @click="store.openDisplay()">{{ store.busy ? 'Подключаемся…' : 'Повторить подключение' }}</button></section>
      <ManagementScreen v-else-if="store.role === 'manage' && (store.isMain || store.hub?.isManager)" />
      <HubScreen v-else-if="store.hasHub && !store.hasRoom" />
      <LobbyScreen v-else-if="!store.hasRoom" />
      <HostScreen v-else-if="store.role === 'board'" />
      <ClientScreen v-else />
    </template>
  </div>
</template>
