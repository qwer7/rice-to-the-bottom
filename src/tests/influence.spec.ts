import { describe, expect, it } from 'vitest'
import { addPlayer, createLobby, startGame, endTrading, createDeck, createPrivateState, selectCard, exchangeCard, finishTurn, nextRound, type PrivatePlayers, type GameState } from '../../supabase/functions/_shared/game'
function setup() {
  let state = startGame(addPlayer(createLobby('a','Аня'),'b','Борис'))
  state = endTrading(endTrading(state,'a'),'b')
  const privatePlayers: PrivatePlayers = { a: createPrivateState(() => 0.4), b: createPrivateState(() => 0.7) }
  return { state, privatePlayers }
}
function selectAll(state: GameState, privatePlayers: PrivatePlayers) { for (const p of state.players) privatePlayers[p.id] = selectCard(state,p.id,privatePlayers[p.id],privatePlayers[p.id].hand[0].id) }
describe('Asymmetric cards', () => {
  it('has 21 card types including asymmetric pairs', () => { const deck = createDeck(); expect(new Set(deck.map(c => c.id)).size).toBe(21); expect(deck.filter(c => c.kind === 'pair').every(c => c.up !== c.down && c.gain + c.loss === 3 && c.gain !== c.loss)).toBe(true) })
  it('deals four unique cards per personal deck', () => { const p = createPrivateState(); expect(p.hand).toHaveLength(4); expect(p.deck).toHaveLength(17); expect(new Set([...p.hand,...p.deck].map(c=>c.id)).size).toBe(21) })
  it('allows exchange after playing, then replaces the table card and returns it to hand', () => {
    const {state,privatePlayers} = setup(); let own = privatePlayers.a
    const original = own.hand[0]; const exchanged = own.hand[1]
    own = selectCard(state,'a',own,original.id)
    own = exchangeCard(state,'a',own,exchanged.id)
    const replacement = own.hand.find(c => !privatePlayers.a.hand.some(old => old.id === c.id))!
    expect(own.selectedCardId).toBe(original.id)
    own = selectCard(state,'a',own,replacement.id)
    expect(own.hand.some(c => c.id === original.id)).toBe(true); expect(own.selectedCardId).toBe(replacement.id); expect(own.hand).toHaveLength(4)
    expect(() => exchangeCard(state,'a',own,original.id)).toThrow('использован')
  })
  it('permits exchange before selection, forbids exchanging the table card or a forged card', () => {
    const {state,privatePlayers} = setup(); let own = privatePlayers.a
    own = exchangeCard(state,'a',own,own.hand[0].id); expect(own.exchanged).toBe(true)
    own = selectCard(state,'a',own,own.hand[0].id)
    const fresh = selectCard(state,'a',privatePlayers.a,privatePlayers.a.hand[0].id)
    expect(() => exchangeCard(state,'a',fresh,fresh.selectedCardId!)).toThrow('на руке')
    expect(() => selectCard(state,'a',own,'forged')).toThrow()
  })
  it('keeps choices private until everyone finishes, then reveals exactly one per player', () => {
    let {state,privatePlayers} = setup(); selectAll(state, privatePlayers)
    const first = finishTurn(state,'b',privatePlayers); state = first.state; privatePlayers = first.privatePlayers
    expect(state.phase).toBe('playing'); expect(state.lastReveal).toBeNull(); expect(JSON.stringify(state)).not.toContain('selectedCardId')
    expect(() => selectCard(state,'b',privatePlayers.b,privatePlayers.b.hand[1].id)).toThrow()
    expect(() => exchangeCard(state,'b',privatePlayers.b,privatePlayers.b.hand[1].id)).toThrow()
    const last = finishTurn(state,'a',privatePlayers)
    expect(last.state.phase).toBe('reveal'); expect(last.state.lastReveal?.cards).toHaveLength(2)
    expect(last.privatePlayers.a.hand).toHaveLength(3); expect(last.privatePlayers.a.discard).toHaveLength(1)
  })
  it('requires a played card and locks changes outside the influence stage', () => {
    const {state,privatePlayers} = setup(); expect(() => finishTurn(state,'a',privatePlayers)).toThrow('выложите')
    state.players[0].stage='trading'; expect(() => selectCard(state,'a',privatePlayers.a,privatePlayers.a.hand[0].id)).toThrow()
  })
  it('refills four cards and refreshes trade and exchange limits next round', () => {
    let {state,privatePlayers} = setup(); selectAll(state,privatePlayers)
    ;({state,privatePlayers} = finishTurn(state,'a',privatePlayers)); ({state,privatePlayers} = finishTurn(state,'b',privatePlayers))
    privatePlayers.a.exchanged = true; state.players[0].tradesUsed = 3
    const next = nextRound(state,privatePlayers)
    expect(next.state.round).toBe(2); expect(next.state.lastReveal).toBeNull(); expect(next.state.players[0].tradesUsed).toBe(0)
    expect(next.privatePlayers.a.hand).toHaveLength(4); expect(next.privatePlayers.a.exchanged).toBe(false)
  })
  it('supports five independent hands and reveals five cards', () => {
    let state = createLobby('a','А'); for (let i=1;i<5;i++) state=addPlayer(state,String(i),`Имя ${i}`)
    state=startGame(state); let privatePlayers: PrivatePlayers = {}
    for (const p of state.players) { state=endTrading(state,p.id); privatePlayers[p.id]=createPrivateState() }
    selectAll(state,privatePlayers)
    for (const p of state.players) ({state,privatePlayers}=finishTurn(state,p.id,privatePlayers))
    expect(state.lastReveal?.cards).toHaveLength(5)
  })
  it('keeps 21 total cards through eight rounds of play and exchange', () => {
    let {state,privatePlayers}=setup()
    for (let round=1;round<=8;round++) {
      for (const p of state.players) {
        if (p.stage==='trading') state=endTrading(state,p.id)
        let own=privatePlayers[p.id]; if (round<=5) own=exchangeCard(state,p.id,own,own.hand[1].id); own=selectCard(state,p.id,own,own.hand[0].id); privatePlayers[p.id]=own
        ;({state,privatePlayers}=finishTurn(state,p.id,privatePlayers))
      }
      for (const own of Object.values(privatePlayers)) expect(new Set([...own.hand,...own.deck,...own.discard].map(c=>c.id)).size).toBe(21)
      ;({state,privatePlayers}=nextRound(state,privatePlayers))
    }
    expect(state.phase).toBe('finished')
  })
})
