export type CompanyId = 'REDSTONE' | 'BLUEWELL' | 'GOLDSPARK'
export const COMPANY_IDS: CompanyId[] = ['REDSTONE', 'BLUEWELL', 'GOLDSPARK']
export const DEFAULT_CONFIG = { minPrice: 1, maxPrice: 9, initialPrice: 4, initialBalance: 30, totalRounds: 8, minPlayers: 2, maxPlayers: 5, maxTrades: 4, handSize: 4, maxShares: 5, maxExchanges: 5 }
export type GameConfig = typeof DEFAULT_CONFIG
export type Card = { id: string; kind: 'pair'; up: CompanyId; down: CompanyId; gain: 1 | 2; loss: 1 | 2 } | { id: string; kind: 'single'; company: CompanyId; delta: 3 | -3 } | { id: string; kind: 'swap'; a: CompanyId; b: CompanyId }
export interface TradeOrder { companyId: CompanyId; action: 'buy' | 'sell' }
export interface Turn { round: number; id: string; trades: TradeOrder[]; cardId: string }
export interface Player { id: string; name: string; balance: number; portfolio: Record<CompanyId, number>; stage: 'trading' | 'influence' | 'ready'; tradesUsed: number }
export interface CompanyState { id: CompanyId; price: number }
export interface Reveal { round: number; cards: Array<{ playerId: string; card: Card }>; pricesBefore: Record<CompanyId, number>; pricesAfter: Record<CompanyId, number>; deltas: Record<CompanyId, number> }
export interface GameState { schemaVersion: 3; matchId: string; lobbyMode?: 'first-player'; config: GameConfig; players: Player[]; companies: CompanyState[]; round: number; phase: 'lobby' | 'playing' | 'reveal' | 'finished'; lastReveal: Reveal | null; winnerIds: string[] | null }
export interface PrivateState { hand: Card[]; deck: Card[]; discard: Card[]; selectedCardId: string | null; exchanged: boolean; exchangesUsed: number; pending: Turn | null; lastSubmissionId: string | null }
export type PlayerView = Pick<PrivateState, 'hand' | 'selectedCardId' | 'exchanged' | 'exchangesUsed' | 'pending'>
export type PrivatePlayers = Record<string, PrivateState>
export const clone = <T>(value: T): T => structuredClone(value)

export function cleanName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Введите своё имя')
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name || name.length > 24) throw new Error('Имя должно содержать от 1 до 24 символов')
  return name
}
export function createPlayer(id: string, name: string): Player {
  return { id, name: cleanName(name), balance: DEFAULT_CONFIG.initialBalance, portfolio: { REDSTONE: 0, BLUEWELL: 0, GOLDSPARK: 0 }, stage: 'trading', tradesUsed: 0 }
}
export function createLobby(id: string, name: string): GameState {
  return { schemaVersion: 3, matchId: crypto.randomUUID(), config: { ...DEFAULT_CONFIG }, players: [createPlayer(id, name)], companies: COMPANY_IDS.map(id => ({ id, price: DEFAULT_CONFIG.initialPrice })), round: 0, phase: 'lobby', lastReveal: null, winnerIds: null }
}
export function createDisplayLobby(): GameState {
  const state = createLobby('display-placeholder','Доска')
  state.players = []; state.lobbyMode = 'first-player'
  return state
}
export function addPlayer(state: GameState, id: string, name: string): GameState {
  if (state.phase !== 'lobby') throw new Error('Партия уже началась. Дождитесь новой игры')
  if (state.players.length >= state.config.maxPlayers) throw new Error('В комнате уже пять игроков')
  const player = createPlayer(id, name)
  if (state.players.some(p => p.name.toLocaleLowerCase() === player.name.toLocaleLowerCase())) throw new Error('Это имя уже занято. Выберите другое')
  const next = clone(state); next.players.push(player); return next
}
export function createDeck(): Card[] {
  const pairs: Card[] = COMPANY_IDS.flatMap(up => COMPANY_IDS.filter(down => down !== up).flatMap(down => ([2, 1] as const).map(gain => ({ id: `${up}-${down}-${gain}`, kind: 'pair' as const, up, down, gain, loss: (gain === 2 ? 1 : 2) as 1 | 2 }))))
  const single: Card[] = COMPANY_IDS.flatMap(company => ([3, -3] as const).map(delta => ({ id: `${company}-${delta}`, kind: 'single' as const, company, delta })))
  const swaps: Card[] = COMPANY_IDS.flatMap((a, i) => COMPANY_IDS.slice(i + 1).map(b => ({ id: `swap-${a}-${b}`, kind: 'swap' as const, a, b })))
  return [...pairs, ...single, ...swaps]
}
export function shuffle<T>(cards: T[], random: () => number = Math.random): T[] {
  const result = [...cards]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}
export function createPrivateState(random: () => number = Math.random): PrivateState {
  const deck = shuffle(createDeck(), random)
  return { hand: deck.splice(0, DEFAULT_CONFIG.handSize), deck, discard: [], selectedCardId: null, exchanged: false, exchangesUsed: 0, pending: null, lastSubmissionId: null }
}
function draw(privateState: PrivateState, random: () => number = Math.random): Card {
  if (privateState.deck.length === 0) { privateState.deck = shuffle(privateState.discard, random); privateState.discard = [] }
  const card = privateState.deck.shift()
  if (!card) throw new Error('В колоде не осталось карт')
  return card
}
export function startGame(state: GameState): GameState {
  if (state.phase !== 'lobby') throw new Error('Партия уже началась')
  if (state.players.length < state.config.minPlayers) throw new Error('Для начала нужно минимум два игрока')
  const next = clone(state); next.phase = 'playing'; next.round = 1; return next
}
export function requirePlayer(state: GameState, playerId: string): Player {
  const player = state.players.find(p => p.id === playerId)
  if (!player) throw new Error('Игрок не найден')
  return player
}
export function requireCompany(state: GameState, id: CompanyId): CompanyState {
  const company = state.companies.find(c => c.id === id)
  if (!company) throw new Error('Компания не найдена')
  return company
}
function requireStage(state: GameState, playerId: string, stage: Player['stage']): Player {
  if (state.phase !== 'playing') throw new Error('Сейчас нельзя совершать ход')
  const player = requirePlayer(state, playerId)
  if (player.stage !== stage) throw new Error(stage === 'trading' ? 'Торговля уже завершена' : 'Сейчас нельзя менять влияние')
  return player
}
export function canBuy(state: GameState, playerId: string, id: CompanyId): boolean {
  const p = requirePlayer(state, playerId)
  return state.phase === 'playing' && p.stage === 'trading' && p.tradesUsed < state.config.maxTrades && p.balance >= requireCompany(state, id).price && p.portfolio[id] < state.config.maxShares
}
export function canSell(state: GameState, playerId: string, id: CompanyId): boolean {
  const p = requirePlayer(state, playerId)
  return state.phase === 'playing' && p.stage === 'trading' && p.tradesUsed < state.config.maxTrades && p.portfolio[id] > 0
}
export function trade(state: GameState, playerId: string, id: CompanyId, action: 'buy' | 'sell'): GameState {
  const player = requireStage(state, playerId, 'trading')
  const company = requireCompany(state, id)
  if (player.tradesUsed >= state.config.maxTrades) throw new Error('За раунд можно купить и продать суммарно не больше четырёх акций')
  if (action === 'buy' && player.portfolio[id] >= state.config.maxShares) throw new Error('Можно иметь не больше пяти акций каждой компании')
  if (action === 'buy' && player.balance < company.price) throw new Error('Недостаточно денег')
  if (action === 'sell' && player.portfolio[id] < 1) throw new Error('Нет акций для продажи')
  const next = clone(state); const target = requirePlayer(next, playerId); const sign = action === 'buy' ? 1 : -1
  target.balance -= sign * company.price; target.portfolio[id] += sign; target.tradesUsed++
  return next
}
export function endTrading(state: GameState, playerId: string): GameState {
  requireStage(state, playerId, 'trading')
  const next = clone(state); requirePlayer(next, playerId).stage = 'influence'; return next
}
export function selectCard(state: GameState, playerId: string, privateState: PrivateState, cardId: string): PrivateState {
  requireStage(state, playerId, 'influence')
  if (!privateState.hand.some(c => c.id === cardId)) throw new Error('Этой карты нет у вас на руке')
  const next = clone(privateState); next.selectedCardId = cardId; return next
}
export function exchangeCard(state: GameState, playerId: string, privateState: PrivateState, cardId: string, random: () => number = Math.random): PrivateState {
  if (state.phase !== 'playing' || requirePlayer(state, playerId).stage === 'ready') throw new Error('Ход уже завершён')
  if (privateState.exchangesUsed >= state.config.maxExchanges) throw new Error('Все пять обменов за партию использованы')
  if (privateState.exchanged) throw new Error('Обмен уже использован в этом раунде')
  if (privateState.selectedCardId === cardId) throw new Error('Можно обменять только карту на руке')
  const index = privateState.hand.findIndex(c => c.id === cardId)
  if (index < 0) throw new Error('Этой карты нет у вас на руке')
  const next = clone(privateState)
  const replacement = draw(next, random)
  next.discard.push(next.hand[index]); next.hand[index] = replacement; next.exchanged = true; next.exchangesUsed++
  return next
}
export function finishTurn(state: GameState, playerId: string, privatePlayers: PrivatePlayers): { state: GameState; privatePlayers: PrivatePlayers } {
  requireStage(state, playerId, 'influence')
  const own = privatePlayers[playerId]
  if (!own?.hand.some(c => c.id === own.selectedCardId)) throw new Error('Сначала выложите одну карту')
  const next = clone(state); const privateNext = clone(privatePlayers)
  requirePlayer(next, playerId).stage = 'ready'
  if (!next.players.every(p => p.stage === 'ready')) return { state: next, privatePlayers: privateNext }
  const before = Object.fromEntries(next.companies.map(c => [c.id, c.price])) as Record<CompanyId, number>
  const totals = { REDSTONE: 0, BLUEWELL: 0, GOLDSPARK: 0 }
  const cards = next.players.map(player => {
    const secret = privateNext[player.id]
    const index = secret.hand.findIndex(c => c.id === secret.selectedCardId)
    if (index < 0) throw new Error('Не удалось прочитать выложенную карту')
    const [card] = secret.hand.splice(index, 1)
    secret.discard.push(card); secret.selectedCardId = null; secret.pending = null
    if (card.kind === 'pair') { totals[card.up] += card.gain; totals[card.down] -= card.loss }
    else if (card.kind === 'single') totals[card.company] += card.delta
    return { playerId: player.id, card }
  })
  for (const c of next.companies) c.price = Math.max(next.config.minPrice, Math.min(next.config.maxPrice, c.price + totals[c.id]))
  for (const { card } of cards) if (card.kind === 'swap') {
    const a = requireCompany(next, card.a), b = requireCompany(next, card.b); [a.price, b.price] = [b.price, a.price]
  }
  const after = Object.fromEntries(next.companies.map(c => [c.id, c.price])) as Record<CompanyId, number>
  const deltas = Object.fromEntries(COMPANY_IDS.map(id => [id, after[id] - before[id]])) as Record<CompanyId, number>
  next.lastReveal = { round: next.round, cards, pricesBefore: before, pricesAfter: after, deltas }; next.phase = 'reveal'
  return { state: next, privatePlayers: privateNext }
}
export function portfolioValue(player: Player, companies: readonly CompanyState[]): number { return companies.reduce((sum, c) => sum + player.portfolio[c.id] * c.price, 0) }
export function totalCapital(player: Player, companies: readonly CompanyState[]): number { return player.balance + portfolioValue(player, companies) }
export function determineWinners(state: GameState): string[] {
  const best = Math.max(...state.players.map(p => totalCapital(p, state.companies)))
  return state.players.filter(p => totalCapital(p, state.companies) === best).map(p => p.id)
}
export function nextRound(state: GameState, privatePlayers: PrivatePlayers): { state: GameState; privatePlayers: PrivatePlayers } {
  if (state.phase !== 'reveal') throw new Error('Сначала все игроки должны завершить ход')
  const next = clone(state); const privateNext = clone(privatePlayers)
  if (next.round >= next.config.totalRounds) { next.phase = 'finished'; next.winnerIds = determineWinners(next); return { state: next, privatePlayers: privateNext } }
  next.round++; next.phase = 'playing'; next.lastReveal = null
  for (const player of next.players) {
    player.stage = 'trading'; player.tradesUsed = 0
    const own = privateNext[player.id]; own.exchanged = false; own.selectedCardId = null; own.pending = null
    while (own.hand.length < next.config.handSize) own.hand.push(draw(own))
  }
  return { state: next, privatePlayers: privateNext }
}
export function resetGame(state: GameState): GameState {
  const next = createLobby(state.players[0].id, state.players[0].name)
  next.players = state.players.map(p => createPlayer(p.id, p.name)); next.lobbyMode = state.lobbyMode; return next
}
export function playerView(privateState?: PrivateState): PlayerView | null {
  return privateState ? { hand: privateState.hand, selectedCardId: privateState.selectedCardId, exchanged: privateState.exchanged, exchangesUsed: privateState.exchangesUsed, pending: privateState.pending } : null
}

export function previewTurn(state: GameState, playerId: string, trades: TradeOrder[]): GameState {
  if (!Array.isArray(trades) || trades.length > state.config.maxTrades) throw new Error('Допустимо до четырёх сделок')
  let next = clone(state)
  for (const order of trades) {
    if (!order || !COMPANY_IDS.includes(order.companyId) || !['buy', 'sell'].includes(order.action)) throw new Error('Некорректная сделка')
    next = trade(next, playerId, order.companyId, order.action)
  }
  return next
}
export function submitTurn(state: GameState, playerId: string, privatePlayers: PrivatePlayers, turn: Turn) {
  const own = privatePlayers[playerId]
  if (!turn || typeof turn.id !== 'string' || turn.id.length < 8 || turn.id.length > 80) throw new Error('Некорректный идентификатор хода')
  if (own?.lastSubmissionId === turn.id) return { state, privatePlayers }
  if (turn.round !== state.round) throw new Error('Этот раунд уже завершён')
  requireStage(state, playerId, 'trading')
  previewTurn(state, playerId, turn.trades)
  if (!own?.hand.some(c => c.id === turn.cardId)) throw new Error('Этой карты нет у вас на руке')
  let next = clone(state); let secrets = clone(privatePlayers)
  secrets[playerId].pending = clone(turn); secrets[playerId].lastSubmissionId = turn.id
  secrets[playerId].selectedCardId = turn.cardId
  requirePlayer(next, playerId).stage = 'ready'
  if (!next.players.every(p => p.stage === 'ready')) return { state: next, privatePlayers: secrets }
  // Every portfolio is committed together. No partial trades enter the public state.
  for (const player of next.players) {
    const pending = secrets[player.id].pending
    if (!pending) throw new Error('Не удалось прочитать ход игрока')
    requirePlayer(next, player.id).stage = 'trading'
    next = previewTurn(next, player.id, pending.trades)
    requirePlayer(next, player.id).stage = 'ready'
  }
  const last = requirePlayer(next, playerId); last.stage = 'influence'
  return finishTurn(next, playerId, secrets)
}
