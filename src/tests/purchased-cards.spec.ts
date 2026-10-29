import { describe, it, expect } from 'vitest'
import { addPlayer, createLobby, startGame, createPrivateState, submitTurn, previewTurn, nextRound, exchangeCard, influenceCardPrice, validatePurchase, dividendAmount, type GameState, type PrivatePlayers, type Purchase } from '../../supabase/functions/_shared/game'

function setup(n = 2) {
  let state = createLobby('a', 'А')
  for (let i = 1; i < n; i++) state = addPlayer(state, String.fromCharCode(97 + i), String.fromCharCode(65 + i))
  state = startGame(state)
  const privatePlayers = Object.fromEntries(state.players.map(p => [p.id, createPrivateState()])) as PrivatePlayers
  return { state, privatePlayers }
}
function play(state: GameState, privatePlayers: PrivatePlayers, purchases: Record<string, Purchase | null> = {}) {
  let result = { state, privatePlayers }
  for (const player of state.players) result = submitTurn(result.state, player.id, result.privatePlayers, { id: `round-${state.round}-${player.id}`, round: state.round, trades: [], cardId: result.privatePlayers[player.id].hand[0].id, purchase: purchases[player.id] })
  return result
}

describe('Influence cards and victory', () => {
  it('prices cards by owned count and requires capital strictly over 50 and enough cash', () => {
    const { state } = setup(); const player = state.players[0]
    player.balance = 60
    expect(influenceCardPrice(state, player)).toBe(20)
    expect(() => validatePurchase(player, 'tax', 20, 50)).toThrow('капитал')
    expect(() => validatePurchase(player, 'tax', 20, 51)).not.toThrow()
    player.influenceCards = ['tax']; expect(influenceCardPrice(state, player)).toBe(30)
    player.influenceCards.push('broker'); expect(influenceCardPrice(state, player)).toBe(40)
    player.balance = 39; expect(() => validatePurchase(player, 'lucky', 40, 60)).toThrow('денег')
    player.influenceCards.push('lucky'); player.balance = 49
    expect(() => validatePurchase(player, 'victory', 40, 60)).toThrow('денег')
    player.balance = 50; expect(() => validatePurchase(player, 'victory', 40, 60)).not.toThrow()
  })
  it('takes half rounded down and pays the largest tax payment', () => {
    const { state, privatePlayers } = setup(4)
    state.players[0].balance = 80
    state.players[1].balance = 7; state.players[2].balance = 31; state.players[3].balance = 20
    const result = play(state, privatePlayers, { a: 'tax' })
    expect(result.state.players.map(p => p.balance)).toEqual([75, 4, 16, 10])
    expect(result.state.lastReveal?.moneyChanges).toEqual(expect.arrayContaining([{ playerId: 'b', source: 'tax', amount: -3 }, { playerId: 'a', source: 'tax', amount: 15 }]))
  })
  it('takes one share of each available color from each opponent and keeps one per color', () => {
    const { state, privatePlayers } = setup(3)
    state.players[0].balance = 80
    state.players[1].portfolio = { REDSTONE: 1, BLUEWELL: 1, GOLDSPARK: 0 }
    state.players[2].portfolio = { REDSTONE: 2, BLUEWELL: 1, GOLDSPARK: 1 }
    const result = play(state, privatePlayers, { a: 'theft' })
    expect(result.state.players.map(p => p.portfolio)).toEqual([
      { REDSTONE: 1, BLUEWELL: 1, GOLDSPARK: 1 },
      { REDSTONE: 0, BLUEWELL: 0, GOLDSPARK: 0 },
      { REDSTONE: 1, BLUEWELL: 0, GOLDSPARK: 0 },
    ])
  })
  it('pays unlimited dividends only for shares priced above five', () => {
    const { state, privatePlayers } = setup(); state.phase = 'reveal'
    state.players[0].influenceCards = ['dividends']
    state.players[0].portfolio = { REDSTONE: 5, BLUEWELL: 5, GOLDSPARK: 4 }
    state.companies[0].price = 6; state.companies[1].price = 5; state.companies[2].price = 9
    expect(dividendAmount(state, state.players[0])).toBe(9)
    expect(nextRound(state, privatePlayers).state.players[0].balance).toBe(39)
  })
  it('pays lucky on every sale, including shares above five', () => {
    const { state } = setup(); state.players[0].influenceCards = ['lucky']; state.players[0].portfolio.REDSTONE = 1; state.companies[0].price = 6
    expect(previewTurn(state, 'a', [{ companyId: 'REDSTONE', action: 'sell' }]).players[0].balance).toBe(37)
  })
  it('lets the analyst exchange after five exchanges and pays 3 only when unused', () => {
    const first = setup(); first.state.players[0].influenceCards = ['analyst']; first.privatePlayers.a.exchangesUsed = 5
    const exchanged = exchangeCard(first.state, 'a', first.privatePlayers.a, first.privatePlayers.a.hand[0].id)
    expect(exchanged.exchangesUsed).toBe(6)
    first.privatePlayers.a = exchanged
    const used = play(first.state, first.privatePlayers)
    expect(used.state.lastReveal?.moneyChanges?.some(change => change.playerId === 'a' && change.source === 'analyst')).toBe(false)
    const second = setup(); second.state.players[0].influenceCards = ['analyst']
    const unused = play(second.state, second.privatePlayers)
    expect(unused.state.players[0].balance).toBe(33)
    expect(unused.state.lastReveal?.moneyChanges).toContainEqual({ playerId: 'a', source: 'analyst', amount: 3 })
  })
  it('waits for the leader to open the results after simultaneous victory purchases', () => {
    const { state, privatePlayers } = setup()
    for (const player of state.players) { player.balance = 60; player.influenceCards = ['tax', 'theft', 'broker'] }
    const result = play(state, privatePlayers, { a: 'victory', b: 'victory' })
    expect(result.state.phase).toBe('reveal'); expect(result.state.winnerIds).toEqual(['a', 'b'])
    const final = nextRound(result.state, result.privatePlayers)
    expect(final.state.phase).toBe('finished'); expect(final.state.round).toBe(result.state.round)
  })
})
