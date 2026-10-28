<script setup lang="ts">
import HubKey from './HubKey.vue'
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const key = ref('')
const signingIn = ref(false)
</script>
<template><main class="stack hub-screen"><section class="card stack"><p class="eyebrow">Хаб · {{ store.hub?.code }}</p><h1>Собираем игроков</h1><template v-if="store.hub?.key"><HubKey :value="store.hub.key" /><p class="muted">Сохраните ключ и откройте «Главный игрок» на своём устройстве. Ключ даёт управление этим хабом.</p></template><p class="muted">Ждём, когда главный игрок создаст лобби. Доска подключится автоматически.</p><button class="btn" @click="signingIn = !signingIn">Главный игрок</button><form v-if="signingIn" class="stack" @submit.prevent="store.connect('main',key,'')"><label class="field"><span>Ключ главного игрока</span><input v-model="key" autocomplete="off" required></label><button class="btn btn--primary" :disabled="store.busy || !key.trim()">Открыть управление</button></form></section></main></template>
