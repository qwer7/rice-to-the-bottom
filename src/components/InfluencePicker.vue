<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { cardTheme } from '@/game/cardPresentation'
import { useDisplayMode } from '@/composables/useDisplayMode'
import InfluenceCard from './InfluenceCard.vue'
import { useGameStore } from '@/stores/gameStore'
const store = useGameStore()
const { tablet } = useDisplayMode()
const selected = computed(() => store.ownCards?.hand.find(c => c.id === store.selectedCardId))
const hand = computed(() => store.ownCards?.hand.filter(c => c.id !== store.selectedCardId) ?? [])
const mobile = ref(false)
const armedCardId = ref<string | null>(null)
const armedCard = computed(() => hand.value.find(c => c.id === armedCardId.value))
const tableZone = ref<HTMLElement | null>(null)
const exchangeZone = ref<HTMLElement | null>(null)
const hasAnalyst = computed(() => store.me?.influenceCards?.includes('analyst') ?? false)
const canExchange = computed(() => !!store.ownCards && !store.busy && !store.ownCards.exchanged && (hasAnalyst.value || store.ownCards.exchangesUsed < 5))
const drag = ref<{cardId:string;x:number;y:number;width:number;height:number;offsetX:number;offsetY:number} | null>(null)
const draggingCard = computed(() => hand.value.find(c => c.id === drag.value?.cardId))
const dropTarget = ref<'table' | 'exchange' | null>(null)
let gesture: {id:number;cardId:string;startX:number;startY:number;element:HTMLElement;wasArmed:boolean;width:number;height:number;offsetX:number;offsetY:number} | null = null
let suppressClickUntil = 0
let media: MediaQueryList | null = null
function clearGesture() {
  const active = gesture
  gesture = null; drag.value = null; dropTarget.value = null
  if (active?.element.hasPointerCapture(active.id)) active.element.releasePointerCapture(active.id)
}
function updateMobile() { mobile.value = (media?.matches ?? false) || tablet; armedCardId.value = null; clearGesture() }
onMounted(() => { media = window.matchMedia('(max-width:600px)'); updateMobile(); media.addEventListener('change',updateMobile) })
onBeforeUnmount(() => { media?.removeEventListener('change',updateMobile); clearGesture() })
watch(() => hand.value.map(c => c.id).join('|'), () => {
  if (armedCardId.value && !hand.value.some(c => c.id === armedCardId.value)) armedCardId.value = null
  if (gesture && !hand.value.some(c => c.id === gesture?.cardId)) clearGesture()
})
watch(() => store.busy, busy => { if (busy) clearGesture() })
function armCard(id: string) {
  if (!mobile.value || store.busy) return
  armedCardId.value = armedCardId.value === id ? null : id
}
function clickCard(id: string) { if (Date.now() >= suppressClickUntil) armCard(id) }
function pointInside(x:number,y:number,element:HTMLElement | null) {
  if (!element) return false
  const r = element.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}
function targetAt(x:number,y:number) {
  if (pointInside(x,y,tableZone.value)) return 'table' as const
  if (canExchange.value && pointInside(x,y,exchangeZone.value)) return 'exchange' as const
  return null
}
function pointerDown(event: PointerEvent, id: string) {
  if (!mobile.value || store.busy || !event.isPrimary || event.button !== 0 || gesture) return
  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  gesture = {id:event.pointerId,cardId:id,startX:event.clientX,startY:event.clientY,element,wasArmed:armedCardId.value===id,width:rect.width,height:rect.height,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top}
  armedCardId.value = id
  element.setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent) {
  const active = gesture
  if (!active || active.id !== event.pointerId) return
  if (!drag.value && Math.hypot(event.clientX-active.startX,event.clientY-active.startY) < 8) return
  event.preventDefault()
  drag.value = {cardId:active.cardId,x:event.clientX,y:event.clientY,width:active.width,height:active.height,offsetX:active.offsetX,offsetY:active.offsetY}
  dropTarget.value = targetAt(event.clientX,event.clientY)
}
async function useCard(target: 'table' | 'exchange', id = armedCardId.value) {
  if (!id || store.busy || !hand.value.some(c => c.id === id) || (target === 'exchange' && !canExchange.value)) return
  await store.action(target === 'table' ? 'select-card' : 'exchange-card',{cardId:id})
  if (target === 'table' ? store.selectedCardId === id : store.ownCards?.exchanged) armedCardId.value = null
}
function pointerUp(event: PointerEvent) {
  const active = gesture
  if (!active || active.id !== event.pointerId) return
  const moved = !!drag.value
  const target = moved ? targetAt(event.clientX,event.clientY) : null
  suppressClickUntil = Date.now()+400
  clearGesture()
  if (moved && target) void useCard(target,active.cardId)
  else if (!moved) armedCardId.value = active.wasArmed ? null : active.cardId
}
function pointerCancel(event: PointerEvent) { if (gesture?.id === event.pointerId) { suppressClickUntil = Date.now()+400; clearGesture() } }
</script>
<template>
  <section class="stack influence-picker">
    <div class="section-heading stage-heading"><div class="stage-heading__title"><p class="eyebrow">2/3</p><h2>Рыночная карта</h2></div><div class="stage-actions"><span class="badge">{{ hasAnalyst ? 'Обмен или 3$' : `Обмены ${store.ownCards?.exchangesUsed ?? 0}/5` }}</span></div></div>
    <div ref="tableZone" class="table-slot" :class="{ 'table-slot--filled': selected, 'is-drop-target': dropTarget === 'table', 'is-drop-available': mobile && armedCard }">
      <div class="table-slot__heading"><p v-if="!selected" class="eyebrow">На столе</p><div class="table-slot__actions"><button v-if="mobile && armedCard" class="btn btn--primary zone-play" :disabled="store.busy" @click="useCard('table')">Выложить</button><button v-if="selected" class="btn btn--small cancel-card" :disabled="store.busy" @click="store.action('unselect-card')">Отменить</button></div></div>
      <div v-if="selected" class="table-slot__played"><span class="table-slot__vertical-label">На столе</span><InfluenceCard :card="selected" class="table-influence" /></div>
    </div>
    <div class="hand-grid" :class="{ 'has-armed-card': mobile && armedCard }">
      <article v-for="card in hand" :key="card.id" class="hand-item" :style="cardTheme(card)" :class="{ 'is-armed': mobile && armedCardId === card.id, 'is-dragging': drag?.cardId === card.id }" :role="mobile ? 'button' : undefined" :tabindex="mobile ? 0 : undefined" :aria-pressed="mobile ? armedCardId === card.id : undefined" :aria-disabled="mobile ? store.busy : undefined" :aria-label="mobile ? `Выбрать карту ${card.id}` : undefined" @click="clickCard(card.id)" @keydown.enter.self.prevent="armCard(card.id)" @keydown.space.self.prevent="armCard(card.id)" @pointerdown="pointerDown($event,card.id)" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerCancel" @contextmenu="mobile && $event.preventDefault()">
        <InfluenceCard :card="card" />
        <div class="hand-item__actions"><button class="btn btn--primary play-card" :aria-label="`Выложить карту ${card.id}`" :disabled="store.busy" @click="store.action('select-card', { cardId: card.id })">Выложить</button><button class="btn exchange-card" :aria-label="`Обменять карту ${card.id}`" title="Обменять карту" :disabled="!canExchange" @click="store.action('exchange-card', { cardId: card.id })"><span aria-hidden="true">↻</span><span class="exchange-card__label">Обменять</span></button></div>
      </article>
    </div>
    <div v-if="mobile && (armedCard || drag)" ref="exchangeZone" class="table-slot exchange-slot" :class="{ 'is-drop-target': dropTarget === 'exchange', 'is-drop-available': armedCard && canExchange, 'is-unavailable': !canExchange }"><div class="table-slot__heading"><p class="eyebrow">Обмен карты</p><button class="btn zone-exchange" :disabled="!armedCard || !canExchange" @click="useCard('exchange')">Обменять карту</button></div></div>
    <button class="btn btn--primary btn--block finish-turn" :disabled="store.busy || !selected" @click="store.action('finish-turn')">{{ store.busy ? 'Сохраняем…' : (store.canPurchase ? 'Перейти к покупке карты' : 'Закончить ход') }}</button>
    <div class="influence-picker__back"><button class="btn btn--block" :disabled="store.busy" @click="store.action('back-to-trading')"><span aria-hidden="true">←</span> Вернуться</button></div>

  </section>
  <Teleport to="body"><div v-if="drag && draggingCard" class="card-drag-ghost" :style="{left:drag.x-drag.offsetX+'px',top:drag.y-drag.offsetY+'px',width:drag.width+'px',height:drag.height+'px'}" aria-hidden="true"><InfluenceCard :card="draggingCard" /></div></Teleport>
</template>
