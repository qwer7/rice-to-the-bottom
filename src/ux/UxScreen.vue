<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { boardScenarios, playerScenarios } from './scenarios'

const devices = [
  { id: 'iphone', label: 'iPhone', width: 393, height: 852, kind: 'player' },
  { id: 'android', label: 'Android · realme C55', width: 360, height: 800, kind: 'player' },
  { id: 'ipad', label: 'iPad', width: 768, height: 1024, kind: 'player' },
  { id: 'tv', label: 'ТВ', width: 960, height: 540, kind: 'board' },
  { id: 'desktop', label: 'Десктоп', width: 1440, height: 900, kind: 'board' },
] as const
const query = new URLSearchParams(location.search)
const deviceId = ref(devices.some(d => d.id === query.get('device')) ? query.get('device')! : 'iphone')
const device = computed(() => devices.find(d => d.id === deviceId.value)!)
const scenarios = computed(() => device.value.kind === 'board' ? boardScenarios : playerScenarios)
const state = ref(query.get('state') || 'trading')
if (!scenarios.value.some(s => s[0] === state.value)) state.value = scenarios.value[0][0]
const frameWidth = computed(() => device.value.width)
const frameHeight = computed(() => device.value.height)
const player = ref(Math.max(0, Math.min(3, Number(query.get('player')) || 0)))
const revision = ref(0)
const viewport = ref<HTMLElement | null>(null)
const availableWidth = ref(800)
let observer: ResizeObserver | undefined
const scale = computed(() => Math.min(1, Math.max(0.1, (availableWidth.value - 24) / frameWidth.value)))
const frameSrc = computed(() => `/ux/preview?${new URLSearchParams({ device: deviceId.value, state: state.value, player: String(player.value), revision: String(revision.value), ...(deviceId.value === 'tv' ? { screen: 'tv' } : {}) })}`)
watch(deviceId, () => { if (!scenarios.value.some(s => s[0] === state.value)) state.value = scenarios.value[0][0] })
watch([deviceId, state, player], () => {
  const url = new URL(location.href)
  url.search = new URLSearchParams({ device: deviceId.value, state: state.value, player: String(player.value) }).toString()
  history.replaceState(null, '', url)
})
onMounted(() => { observer = new ResizeObserver(entries => { availableWidth.value = entries[0].contentRect.width }); if (viewport.value) observer.observe(viewport.value) })
onBeforeUnmount(() => observer?.disconnect())
</script>
<template>
  <div class="ux">
    <div class="ux-layout">
      <aside class="ux-controls" aria-label="Настройки просмотра">
        <div><span class="ux-label">Устройство</span><div class="ux-devices"><button v-for="item in devices" :key="item.id" :class="{ active: deviceId === item.id }" @click="deviceId = item.id">{{ item.label }}</button></div></div>
        <label v-if="device.kind === 'player'" class="ux-field"><span class="ux-label">Игрок</span><select v-model.number="player"><option :value="0">Александра · лидер</option><option :value="1">Михаил</option><option :value="2">София</option><option :value="3">Даниил</option></select></label>
        <button class="ux-reset" @click="revision++">↻ Сбросить экран</button>
        <div class="ux-states"><span id="ux-states-label" class="ux-label">Состояние экрана</span><div class="ux-state-list" role="group" aria-labelledby="ux-states-label"><button v-for="item in scenarios" :key="item[0]" :class="{ active: state === item[0] }" :aria-pressed="state === item[0]" @click="state = item[0]"><span>{{ item[1] }}</span><span v-if="state === item[0]" aria-hidden="true">✓</span></button></div></div>
      </aside>
      <main ref="viewport" class="ux-preview"><div class="ux-preview-heading"><div><span class="ux-label">Предпросмотр</span><h2>{{ device.label }} <span>· {{ scenarios.find(s => s[0] === state)?.[1] }}</span></h2></div><span class="ux-dimensions">{{ frameWidth }} × {{ frameHeight }} px · {{ Math.round(scale * 100) }}%</span></div><div class="ux-stage"><div class="ux-frame-shell" :style="{ width: `${frameWidth * scale}px`, height: `${frameHeight * scale}px` }"><iframe :key="frameSrc" title="Предпросмотр интерфейса игры" :src="frameSrc" :style="{ width: `${frameWidth}px`, height: `${frameHeight}px`, transform: `scale(${scale})` }" /></div></div></main>
    </div>
  </div>
</template>
<style scoped>
.ux{height:100dvh;display:flex;flex-direction:column;background:#f3f4f2;color:#18261f;font-family:Inter,system-ui,sans-serif}.ux-layout{display:grid;grid-template-columns:270px minmax(0,1fr);flex:1;min-height:0}.ux-controls{padding:24px 20px 0;background:#fff;border-right:1px solid #dce2dd;display:flex;flex-direction:column;gap:20px;min-height:0}.ux-label{display:block;text-transform:uppercase;letter-spacing:.09em;font-size:11px;font-weight:800;color:#748178;margin-bottom:10px}.ux-devices{display:grid;grid-template-columns:1fr 1fr;gap:7px}.ux-devices button,.ux-reset{font:inherit;font-size:13px;font-weight:700;text-align:left;color:#304139;background:#f5f7f5;border:1px solid #e1e7e2;border-radius:8px;padding:11px;cursor:pointer}.ux-devices button.active{color:#126b42;background:#e5f5eb;border-color:#66b987}.ux-field{display:block}.ux-field select{width:100%;font:inherit;font-size:13px;color:#1c3025;border:1px solid #d3ded5;border-radius:8px;background:#fff;padding:11px}.ux-reset{text-align:center;background:#fff}.ux-states{display:flex;flex-direction:column;flex:1;min-height:0}.ux-state-list{overflow-y:auto;min-height:0;padding-bottom:20px;display:flex;flex-direction:column;gap:5px}.ux-state-list button{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;padding:10px 11px;text-align:left;font:inherit;font-size:13px;line-height:1.35;color:#304139;background:transparent;border:1px solid transparent;border-radius:8px;cursor:pointer}.ux-state-list button:hover{background:#f5f7f5}.ux-state-list button.active{background:#e5f5eb;border-color:#66b987;color:#126b42;font-weight:700}.ux-preview{min-width:0;overflow:auto;padding:28px}.ux-preview-heading{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:0 0 18px}.ux-preview-heading h2{margin:0;font-size:18px}.ux-preview-heading h2 span{font-weight:400;color:#6b796f}.ux-dimensions{font-size:12px;color:#6b796f;white-space:nowrap}.ux-stage{display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:12px 0 30px}.ux-frame-shell{position:relative;overflow:hidden;border-radius:12px;background:#fff;box-shadow:0 8px 32px #263f3026;flex:none}.ux-frame-shell iframe{position:absolute;top:0;left:0;border:0;transform-origin:top left;background:#fff}@media(max-width:700px){.ux{height:auto;min-height:100dvh}.ux-layout{display:block}.ux-controls{border-right:0;border-bottom:1px solid #dce2dd;padding:20px;gap:15px}.ux-devices{grid-template-columns:repeat(3,1fr)}.ux-states{min-height:0}.ux-state-list{max-height:45vh}.ux-preview{padding:20px 10px}.ux-preview-heading{align-items:start;flex-direction:column}}
</style>
