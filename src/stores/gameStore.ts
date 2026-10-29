import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { canBuy as mayBuy, canSell as maySell, totalCapital, previewTurn, type Turn, type TradeOrder } from '../../supabase/functions/_shared/game'
import type { CompanyId, GameState, PlayerView } from '@/game/types'
import { readMarketHistory, updateMarketHistory, type MarketHistory } from '@/game/marketHistory'
import { supabase, hasSupabase } from '@/lib/supabase'

export type ScreenRole = 'main' | 'player' | 'board' | 'manage'
interface Session { id: string; code: string; host_user_id: string | null; state: GameState; version: number; status: 'active' | 'closed' }
interface Snapshot { session: Session; playerId: string | null; isHost: boolean; private: PlayerView | null }
const SESSION_KEY = 'race-to-the-bottom:v3:session'
const ROLE_KEY = 'race-to-the-bottom:v3:role'
interface Hub { mode?: 'key' | 'display'; isDisplayOwner?: boolean; id: string; code: string; isManager: boolean; sessionId: string | null; roomCode?: string; key?: string }
interface Draft extends Turn { stage: 'trading' | 'influence' | 'purchase' }
const HUB_KEY = 'race-to-the-bottom:v3:hub'
const DISPLAY_SECRET_KEY = 'race-to-the-bottom:display-secret'
function displaySecret() {
  let secret = localStorage.getItem(DISPLAY_SECRET_KEY)
  if (!secret) { secret = crypto.randomUUID() + crypto.randomUUID(); localStorage.setItem(DISPLAY_SECRET_KEY, secret) }
  return secret
}
export const useGameStore = defineStore('game', () => {
  let savedHub: Hub | null = null
  try { savedHub = JSON.parse(localStorage.getItem(HUB_KEY) || 'null') } catch { localStorage.removeItem(HUB_KEY) }
  const hub = ref<Hub | null>(savedHub)
  const draft = ref<Draft | null>(null)
  let hubTimer: ReturnType<typeof setTimeout> | null = null
  const session = ref<Session | null>(null)
  const ownCards = ref<PlayerView | null>(null)
  const playerId = ref<string | null>(null)
  const isMain = ref(false)
  const savedScreen = sessionStorage.getItem(ROLE_KEY)
  const role = ref<ScreenRole>(savedScreen === 'board' || savedScreen === 'main' || savedScreen === 'manage' ? savedScreen : 'player')
  const error = ref<string | null>(null)
  const busy = ref(false)
  const restoring = ref(true)
  const restoreFailed = ref(false)
  const connection = ref('Подключение…')
  let channel: RealtimeChannel | null = null
  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let privateVersion = 0
  let generation = 0
  let switchingLobby = false
  let loadedDraftKey: string | null = null
  const game = computed(() => session.value?.state ?? null)
  const players = computed(() => game.value?.players ?? [])
  const companies = computed(() => game.value?.companies ?? [])
  const marketHistory = ref<MarketHistory | null>(null)
  let marketRoom: string | null = null
  watch(game, state => {
    const room = session.value && state ? `${session.value.id}:${state.matchId}` : null
    if (!state || !room) { marketRoom = null; marketHistory.value = null; return }
    if (room !== marketRoom) {
      marketRoom = room
      try { marketHistory.value = readMarketHistory(JSON.parse(localStorage.getItem(`race-to-the-bottom:v3:market:${room}`) || 'null')) } catch { marketHistory.value = null }
    }
    marketHistory.value = updateMarketHistory(state,marketHistory.value)
    try { localStorage.setItem(`race-to-the-bottom:v3:market:${room}`,JSON.stringify(marketHistory.value)) } catch { /* Keep the current result in memory when storage is unavailable. */ }
  }, { flush:'sync' })

  const localGame = computed(() => {
    const state = game.value, id = playerId.value
    if (!state || !id || state.phase !== 'playing') return state
    const publicMe = state.players.find(p => p.id === id)
    const orders = publicMe?.stage === 'ready' ? ownCards.value?.pending?.trades : draft.value?.trades
    if (!orders) return state
    const copy = JSON.parse(JSON.stringify(state)) as GameState; const target = copy.players.find(p => p.id === id)
    if (!target) return state
    target.stage = 'trading'
    try {
      const result = previewTurn(copy,id,orders)
      const player = result.players.find(p => p.id === id)!
      const purchase = publicMe?.stage === 'ready' ? ownCards.value?.pending?.purchase : draft.value?.purchase
      if (purchase) player.balance -= purchase === 'victory' ? 30 : 20
      player.stage = publicMe?.stage === 'ready' ? 'ready' : draft.value?.stage ?? 'trading'
      return result
    } catch { return state }
  })
  const me = computed(() => localGame.value?.players.find(p => p.id === playerId.value))
  const availableForPurchase = computed(() => (me.value?.balance ?? 0) + (draft.value?.purchase ? draft.value.purchase === 'victory' ? 30 : 20 : 0))
  const selectedCardId = computed(() => draft.value ? draft.value.cardId || null : ownCards.value?.selectedCardId)
  const hasHub = computed(() => !!hub.value)

  const phase = computed(() => game.value?.phase)
  const round = computed(() => game.value?.round ?? 0)
  const totalRounds = computed(() => game.value?.config.totalRounds ?? 8)
  const roomCode = computed(() => session.value?.code)
  const minPrice = computed(() => game.value?.config.minPrice ?? 1)
  const maxPrice = computed(() => game.value?.config.maxPrice ?? 9)
  const winnerIds = computed(() => game.value?.winnerIds)
  const ranking = computed(() => players.value.map(player => ({ player, capital: totalCapital(player, companies.value) })).sort((a,b) => b.capital - a.capital))
  const hasRoom = computed(() => session.value !== null)

  function leave() {
    generation++
    if (supabase && channel) void supabase.removeChannel(channel)
    channel = null
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = null
    draft.value = null
    loadedDraftKey = null
    session.value = null; ownCards.value = null; playerId.value = null; isMain.value = false; privateVersion = 0
    localStorage.removeItem(SESSION_KEY); if (!hub.value) sessionStorage.removeItem(ROLE_KEY)
  }
  function apply(result: Snapshot) {
    if (result.session.state.schemaVersion !== 3) throw new Error('Создайте комнату в новой версии игры')
    if (result.session.status === 'closed' && switchingLobby) return
    if (result.session.status === 'closed') { leave(); error.value = hub.value ? null : 'Главный игрок закрыл комнату'; return }
    if (session.value && session.value.id !== result.session.id) return
    if (!session.value || result.session.version >= session.value.version) session.value = result.session
    if (result.session.version >= privateVersion) {
      if (playerId.value && !result.playerId && !result.isHost) { leave(); error.value = 'Главный игрок удалил вас из лобби'; return }
      ownCards.value = result.private; playerId.value = result.playerId; isMain.value = result.isHost === true; privateVersion = result.session.version
    }
    localStorage.setItem(SESSION_KEY, result.session.id)
    ensureDraft()
    if (result.session.version >= privateVersion && ownCards.value && draft.value?.cardId && game.value?.phase === 'playing' && game.value.players.find(p => p.id === playerId.value)?.stage !== 'ready' && !ownCards.value.hand.some(card => card.id === draft.value!.cardId)) {
      draft.value.cardId = ''
      if (draft.value.stage === 'purchase') draft.value.stage = 'influence'
      saveDraft()
    }
  }
  function draftKey() { return `race-to-the-bottom:v3:draft:${session.value?.id}:${game.value?.matchId}:${playerId.value}:${game.value?.round}` }
  function ensureDraft() {
    if (!game.value || !playerId.value || game.value.phase !== 'playing') { draft.value = null; return }
    if (draft.value?.round === game.value.round && loadedDraftKey === draftKey()) return
    loadedDraftKey = draftKey()
    try { draft.value = JSON.parse(localStorage.getItem(draftKey()) || 'null') } catch { draft.value = null }
    if (!draft.value || draft.value.round !== game.value.round) draft.value = { round:game.value.round,id:crypto.randomUUID(),trades:[],cardId:ownCards.value?.selectedCardId ?? '',stage:ownCards.value?.selectedCardId ? 'influence' : 'trading' }
  }
  function saveDraft() { if (draft.value) localStorage.setItem(draftKey(),JSON.stringify(draft.value)) }
  function localTrade(companyId: CompanyId, action: 'buy' | 'sell') {
    if (busy.value || !draft.value || !game.value || !playerId.value || me.value?.stage !== 'trading') return
    try { const trades = [...draft.value.trades,{companyId,action} as TradeOrder]; previewTurn(JSON.parse(JSON.stringify(game.value)),playerId.value,trades); draft.value.trades = trades; error.value = null; saveDraft() }
    catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка сделки' }
  }
  function undoTrade() { if (draft.value && me.value?.stage === 'trading') { draft.value.trades.pop(); saveDraft() } }
  async function call(name: string, body: Record<string, unknown>): Promise<any> {
    if (!supabase) throw new Error('Supabase не настроен')
    const { data, error: failure } = await supabase.functions.invoke(name, { body, timeout: 45000 })
    if (failure) {
      const context = (failure as { context?: Response }).context
      const detail = context instanceof Response ? await context.clone().json().catch(() => null) : null
      throw new Error(detail?.error ?? 'Не удалось связаться с сервером. Повторите действие')
    }
    if (data?.error) throw new Error(data.error)
    return data
  }
  async function identity() {
    if (!supabase) throw new Error('Supabase не настроен')
    const { data } = await supabase.auth.getSession()
    if (!data.session) { const { error: authError } = await supabase.auth.signInAnonymously(); if (authError) throw new Error(authError.message) }
  }
  async function sync() {
    if (!session.value) return
    const id = session.value.id; const token = generation
    try { const result = await call('game-action', { action: 'sync', sessionId: id }); if (token === generation) apply(result) }
    catch { if (token === generation) connection.value = 'Связь прервана. Повторяем…' }
  }
  function subscribe() {
    if (!supabase || !session.value) return
    if (channel) void supabase.removeChannel(channel)
    const sessionId = session.value.id
    channel = supabase.channel(`game-v2:${sessionId}`)
      .on('postgres_changes', { event:'UPDATE',schema:'public',table:'game_sessions',filter:`id=eq.${sessionId}` }, payload => {
        const incoming = payload.new as Session
        if (session.value?.id !== sessionId || incoming.version <= session.value.version) return
        if (playerId.value && !incoming.state.players.some(p => p.id === playerId.value)) { leave(); error.value = 'Главный игрок удалил вас из лобби'; return }
        if (incoming.status === 'closed' && switchingLobby) return
        if (incoming.status === 'closed') { leave(); error.value = hub.value ? null : 'Главный игрок закрыл комнату'; return }
        if (incoming.version > session.value.version) session.value = incoming
        void sync()
      }).subscribe(status => { connection.value = status === 'SUBSCRIBED' ? 'На связи' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' ? 'Связь прервана. Повторяем…' : 'Подключение…'; if (status === 'SUBSCRIBED') void sync() })
    function refresh() { refreshTimer = setTimeout(async () => { await sync(); if (session.value?.id === sessionId) refresh() }, 10000) }
    if (refreshTimer) clearTimeout(refreshTimer)
    refresh()
  }
  function setRole(next: ScreenRole) {
    role.value = next; sessionStorage.setItem(ROLE_KEY, next)
  }
  async function connect(nextRole: ScreenRole, code: string, name: string) {
    if (busy.value) return
    busy.value = true; error.value = null
    try {
      await identity()
      if (nextRole === 'main') {
        const result = await call('create-room',{action:'connect-main',key:code})
        hub.value = { ...(hub.value?.id === result.hub.id ? hub.value : {}), ...result.hub, key:result.hub.key ?? code.trim() }; saveHub(); setRole('manage'); await syncHub(); watchHub(); return
      }
      const result = await call('join-room', { code, name, role: nextRole })
      leave(); apply(result); setRole(nextRole === 'board' ? 'board' : result.isHost ? 'main' : 'player'); subscribe()
    } catch (caught) { error.value = caught instanceof Error ? caught.message : 'Ошибка подключения' }
    finally { busy.value = false }
  }
  async function action(actionName: string, details: Record<string, unknown> = {}) {
    if (busy.value || !session.value) return
    if (actionName === 'end-trading' && draft.value && me.value?.stage === 'trading') { draft.value.stage = 'influence'; saveDraft(); return }
    if (actionName === 'back-to-influence' && draft.value) { draft.value.stage = 'influence'; saveDraft(); return }
    if (actionName === 'choose-purchase' && draft.value) { draft.value.purchase = (details.purchase ?? null) as Turn['purchase']; saveDraft(); return }
    if (actionName === 'back-to-trading' && draft.value && me.value?.stage === 'influence') { draft.value.stage = 'trading'; draft.value.purchase = null; saveDraft(); return }
    if (actionName === 'unselect-card') {
      // Cancellation only changes this turn's local choice; never send it to the server.
      if (game.value?.phase !== 'playing' || !playerId.value || game.value.players.find(p => p.id === playerId.value)?.stage === 'ready') return
      ensureDraft()
      if (draft.value) { draft.value.cardId = ''; draft.value.stage = 'influence'; error.value = null; saveDraft() }
      return
    }
    if (actionName === 'select-card' && draft.value && me.value?.stage === 'influence') { draft.value.cardId = String(details.cardId); saveDraft(); return }
    if (actionName === 'finish-turn') {
      if (!draft.value || !selectedCardId.value || !['influence','purchase'].includes(me.value?.stage ?? '')) return
      if (draft.value.stage === 'influence' && me.value && availableForPurchase.value >= ((me.value.influenceCards ?? []).length === 3 ? 30 : 20)) { draft.value.stage = 'purchase'; saveDraft(); return }
      actionName = 'submit-turn'; details = { turn: { ...draft.value, cardId:selectedCardId.value } }
    }
    if (actionName === 'exchange-card' || actionName === 'exchange-hand') details = { ...details, round:round.value, selectedCardId:selectedCardId.value }
    switchingLobby = actionName === 'new-lobby'
    busy.value = true; error.value = null
    const id = session.value.id; const token = generation
    try { const result = await call('game-action', { sessionId: id, matchId:game.value?.matchId, action: actionName, ...details }); if (token === generation) { if (switchingLobby) { leave(); apply(result); setRole('main'); subscribe() } else { apply(result); if (actionName === 'exchange-hand' && !error.value && draft.value) { draft.value.cardId = ''; saveDraft() } } } }
    catch (caught) { error.value = caught instanceof Error ? caught.message : 'Ошибка хода'; await sync() }
    finally { switchingLobby = false; busy.value = false }
  }
  async function restore() {
    restoring.value = true; restoreFailed.value = false; error.value = null
    try {
      const id = localStorage.getItem(SESSION_KEY)
      const desiredRole = sessionStorage.getItem(ROLE_KEY)
      if (!hasSupabase) return
      if (hub.value) { await identity(); await syncHub(); watchHub() }
      if (session.value) {
        if (id === session.value.id && me.value && (desiredRole === 'main' || desiredRole === 'player')) setRole(isMain.value ? 'main' : 'player')
        else if (desiredRole === 'board') setRole('board')
        return
      }
      if (!id) return
      await identity()
      const result = await call('game-action', { sessionId: id, action:'sync' })
      apply(result)
      const savedRole = sessionStorage.getItem(ROLE_KEY)
      setRole(savedRole === 'manage' && result.isHost ? 'manage' : savedRole === 'board' || !result.playerId ? 'board' : result.isHost ? 'main' : 'player')
      if (session.value) subscribe()
    } catch { restoreFailed.value = true; error.value = 'Не удалось восстановить комнату. Проверьте связь и повторите попытку'; connection.value = 'Связь прервана. Повторите подключение' }
    finally { restoring.value = false }
  }
  const canBuy = (id: string, company: CompanyId) => !busy.value && !!localGame.value && mayBuy(localGame.value, id, company)
  const canSell = (id: string, company: CompanyId) => !busy.value && !!localGame.value && maySell(localGame.value, id, company)
  function saveHub() { localStorage.setItem(HUB_KEY, JSON.stringify(hub.value)) }
  async function syncHub() {
    if (!hub.value) return
    const result = await call('create-room',hub.value.mode === 'display' && hub.value.isDisplayOwner ? {action:'open-display',hubId:hub.value.id,displaySecret:displaySecret()} : {action:'hub-sync',hubId:hub.value.id,key:hub.value.key})
    hub.value = { ...hub.value, ...result.hub }; saveHub(); if (!session.value) connection.value = 'На связи'
    if (!hub.value) return
    if (session.value && hub.value.sessionId !== session.value.id) leave()
    if (result.session) {
      const changed = !session.value
      apply(result); setRole('board'); if (changed && session.value) subscribe()
      return
    }
    if (hub.value.isManager && !session.value && role.value !== 'board') setRole('manage')
    if (!session.value && hub.value.sessionId) {
      const result = hub.value.isManager ? await call('game-action',{action:'sync',sessionId:hub.value.sessionId}) : await call('join-room',{role:'board',code:hub.value.roomCode})
      apply(result); setRole(role.value === 'board' ? 'board' : hub.value.isManager ? 'manage' : 'board'); subscribe()
    }
  }
  function watchHub() {
    if (hubTimer) clearTimeout(hubTimer)
    hubTimer = setTimeout(async () => { try { await syncHub() } catch { /* Retry a temporary connection failure. */ } if (hub.value) watchHub() }, hub.value?.mode === 'display' ? 3000 : session.value ? 15000 : 5000)
  }
  async function openDisplay() {
    if (busy.value) return
    busy.value = true; error.value = null
    try {
      await identity()
      const result = await call('create-room',{action:'open-display',hubId:hub.value?.mode === 'display' ? hub.value.id : undefined,displaySecret:displaySecret()})
      if (hubTimer) clearTimeout(hubTimer)
      leave(); hub.value = result.hub; saveHub(); setRole('board')
      if (result.session) { apply(result); subscribe() } else await syncHub()
      watchHub()
    } catch (e) { const detail = e instanceof Error ? e.message : ''; error.value = /fetch|network|timeout|abort|connection|подключения/i.test(detail) ? 'Не удалось подключиться к игровому серверу Supabase. Проверьте сеть и повторите подключение.' : detail || 'Не удалось открыть доску' }
    finally { busy.value = false }
  }
  async function hubAction(actionName: string, details: Record<string, unknown> = {}) {
    if (busy.value) return
    busy.value = true; error.value = null
    try {
      await identity()
      const result = await call('create-room',{action:actionName,hubId:hub.value?.id,...details})
      if (result.hub) { hub.value = { ...hub.value,...result.hub }; saveHub(); setRole(hub.value?.isManager ? 'manage' : 'board'); await syncHub(); watchHub() }
      else { leave(); apply(result); setRole('manage'); subscribe(); await syncHub() }
    } catch(e) { error.value = e instanceof Error ? e.message : 'Ошибка хаба' }
    finally { busy.value = false }
  }
  async function displayAction(actionName: 'rotate-display-code' | 'reset-display') {
    if (busy.value || !hub.value?.isDisplayOwner) return
    busy.value = true; error.value = null
    try {
      await identity()
      const result = await call('create-room',{action:actionName,hubId:hub.value.id,displaySecret:displaySecret()})
      if (session.value?.id !== result.session.id) leave()
      hub.value = result.hub; saveHub(); apply(result); setRole('board'); subscribe(); watchHub()
    } catch (e) { error.value = e instanceof Error ? e.message : 'Не удалось изменить доску' }
    finally { busy.value = false }
  }
  function exitHub() { if (hubTimer) clearTimeout(hubTimer); hubTimer = null; hub.value = null; localStorage.removeItem(HUB_KEY); leave() }
  return { openDisplay, hub, hasHub, marketHistory, draft, availableForPurchase, selectedCardId, hubAction, displayAction, exitHub, undoTrade, game, players, companies, me, phase, round, totalRounds, roomCode, minPrice, maxPrice, winnerIds, ranking, hasRoom, ownCards, isMain, role, error, busy, restoring, restoreFailed, connection, connect, action, restore, leave, setRole, canBuy, canSell,
    buyShare: (companyId: CompanyId) => localTrade(companyId,'buy'), sellShare: (companyId: CompanyId) => localTrade(companyId,'sell') }
})
