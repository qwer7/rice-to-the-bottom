import { computed, ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { addPlayer, canBuy, canSell, createDeck, createDisplayLobby, createLobby, createPrivateState, playerView, startGame, totalCapital, trade, type CompanyId, type PlayerView, type Turn } from '../../supabase/functions/_shared/game'
import { updateMarketHistory } from '@/game/marketHistory'

// Register a store with the same id before mounting the real components. It never
// reads or writes a live session, and its actions only change this iframe's data.
export const usePreviewStore = defineStore('game', () => {
  const params = new URLSearchParams(location.search)
  const scenario = params.get('state') || 'trading'
  const device = params.get('device') || 'iphone'
  const board = device === 'tv' || device === 'desktop'
  const index = Math.max(0, Math.min(3, Number(params.get('player')) || 0))
  const names = ['Александра', 'Михаил', 'София', 'Даниил']
  let initial = createLobby('player-1', names[0])
  for (let i = 1; i < names.length; i++) initial = addPlayer(initial, `player-${i + 1}`, names[i])
  if (scenario === 'empty-lobby') initial = createDisplayLobby()
  else if (!['entry', 'lobby', 'manage-lobby'].includes(scenario)) initial = startGame(initial)
  if (!['entry', 'lobby', 'empty-lobby', 'manage-lobby', 'playing'].includes(scenario)) {
    initial.round = 3
    initial.companies[0].price = 6; initial.companies[1].price = 3; initial.companies[2].price = 7
    initial.players.forEach((p, i) => { p.balance = 35 + i * 5; p.portfolio = { REDSTONE: i + 1, BLUEWELL: 3 - i, GOLDSPARK: i }; p.influenceCards = i === 0 ? ['analyst'] : i === 1 ? ['broker', 'lucky'] : [] })
  }
  if (scenario === 'playing-progress') initial.players.slice(0, 2).forEach(p => { p.stage = 'ready' })
  if (scenario === 'ready') initial.players[index].stage = 'ready'
  if (['reveal', 'finished', 'tie', 'manage-finished'].includes(scenario)) {
    initial.phase = scenario === 'reveal' ? 'reveal' : 'finished'
    initial.players.forEach(p => { p.stage = 'ready' })
    initial.lastReveal = { round: 3, cards: initial.players.map((p, i) => ({ playerId: p.id, card: createDeck()[i] })), pricesBefore: { REDSTONE: 4, BLUEWELL: 5, GOLDSPARK: 6 }, pricesAfter: { REDSTONE: 6, BLUEWELL: 3, GOLDSPARK: 7 }, deltas: { REDSTONE: 2, BLUEWELL: -2, GOLDSPARK: 1 }, purchases: [{ playerId: 'player-2', purchase: 'broker' }], effects: ['Дивиденды начислены в начале раунда.'] }
    if (initial.phase === 'finished') initial.winnerIds = scenario === 'tie' ? ['player-1', 'player-2'] : ['player-1']
  }
  const game = ref(initial)
  const playerId = `player-${index + 1}`
  const ownCards = ref<PlayerView>(playerView(createPrivateState(() => 0.42))!)
  const stage = scenario.startsWith('influence') ? 'influence' : scenario.includes('purchase') ? 'purchase' : 'trading'
  const draft = ref<{round:number;id:string;trades:Turn['trades'];cardId:string;stage:'trading'|'influence'|'purchase';purchase?:Turn['purchase']}>({ round: initial.round, id: 'preview', trades: [], cardId: scenario === 'influence-selected' || scenario.includes('purchase') ? ownCards.value.hand[0].id : '', stage, purchase: scenario === 'purchase-selected' ? 'broker' : null })
  if (scenario === 'trading-empty') initial.players[index].balance = 0
  if (scenario === 'influence-limit') ownCards.value.exchangesUsed = 5
  if (scenario === 'influence-exchanged') { ownCards.value.exchanged = true; ownCards.value.exchangesUsed = 2 }
  if (scenario === 'victory-purchase') initial.players[index].influenceCards = ['analyst', 'broker', 'lucky']
  if (scenario === 'trading-limit') initial.players[index].tradesUsed = initial.config.maxTrades + (initial.players[index].influenceCards?.includes('broker') ? 1 : 0)
  const role = ref(board ? 'board' : scenario.startsWith('manage-') ? 'manage' : index === 0 ? 'main' : 'player')
  const isMain = ref(index === 0 || scenario.startsWith('manage-'))
  const hasRoom = ref(scenario !== 'entry')
  const hub = ref(board && device === 'tv' ? { isDisplayOwner: true } : null)
  const busy = ref(false), error = ref<string | null>(null)
  const me = computed(() => {
    const p = game.value.players.find(p => p.id === playerId)
    return p && game.value.phase === 'playing' && p.stage !== 'ready' ? { ...p, stage: draft.value.stage } : p
  })
  const selectedCardId = computed(() => draft.value.cardId || null)
  const marketHistory = computed(() => updateMarketHistory(game.value, null))
  const action = async (name: string, details: Record<string, any> = {}) => {
    if (name === 'end-trading') draft.value.stage = 'influence'
    else if (name === 'back-to-trading') draft.value.stage = 'trading'
    else if (name === 'back-to-influence') draft.value.stage = 'influence'
    else if (name === 'select-card') draft.value.cardId = details.cardId
    else if (name === 'unselect-card') draft.value.cardId = ''
    else if (name === 'choose-purchase') draft.value.purchase = details.purchase
    else if (name === 'exchange-card' || name === 'exchange-hand') { ownCards.value.exchanged = true; ownCards.value.exchangesUsed++ }
    else if (name === 'finish-turn' && draft.value.stage === 'influence' && (me.value?.balance ?? 0) >= ((me.value?.influenceCards?.length ?? 0) === 3 ? 30 : 20)) draft.value.stage = 'purchase'
    else if (name === 'finish-turn') { const p = game.value.players.find(p => p.id === playerId); if (p) p.stage = 'ready' }
    else if (name === 'start') game.value = startGame(toRaw(game.value))
  }
  const tradeHistory: typeof initial[] = []
  function changeTrade(id: CompanyId, kind: 'buy' | 'sell') { try { const next = trade(toRaw(game.value), playerId, id, kind); tradeHistory.push(game.value); game.value = next } catch { /* disabled controls cover invalid trades */ } }
  return { game, players: computed(() => game.value.players), companies: computed(() => game.value.companies), me, phase: computed(() => game.value.phase), round: computed(() => game.value.round), totalRounds: computed(() => game.value.config.totalRounds), minPrice: computed(() => game.value.config.minPrice), maxPrice: computed(() => game.value.config.maxPrice), roomCode: 'ABC234', winnerIds: computed(() => game.value.winnerIds), ranking: computed(() => game.value.players.map(player => ({ player, capital: totalCapital(player, game.value.companies) })).sort((a,b) => b.capital-a.capital)), hasRoom, hasHub: false, hub, isMain, role, busy, error, restoring: false, restoreFailed: false, connection: 'На связи', ownCards, draft, selectedCardId, availableForPurchase: computed(() => me.value?.balance ?? 0), marketHistory, action, setRole: (value: string) => { role.value = value }, exitHub: () => { hasRoom.value = false }, restore: async () => {}, openDisplay: async () => {}, connect: async () => {}, displayAction: async () => {}, hubAction: async () => {}, canBuy: (id: string, company: CompanyId) => canBuy(game.value,id,company), canSell: (id: string, company: CompanyId) => canSell(game.value,id,company), buyShare: (id: CompanyId) => changeTrade(id,'buy'), sellShare: (id: CompanyId) => changeTrade(id,'sell'), undoTrade: () => { const previous = tradeHistory.pop(); if (previous) game.value = previous } }
})
