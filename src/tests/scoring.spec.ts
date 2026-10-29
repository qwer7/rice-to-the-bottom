import { describe, expect, it } from 'vitest'
import { addPlayer, createLobby, startGame, endTrading, createPrivateState, selectCard, finishTurn, nextRound, totalCapital, determineWinners, type PrivatePlayers } from '../../supabase/functions/_shared/game'
describe('Prices and scoring', () => {
  it('clamps prices and applies only the two companies on each card', () => {
    let state=startGame(addPlayer(createLobby('a','А'),'b','Б'))
    state=endTrading(endTrading(state,'a'),'b')
    const privatePlayers: PrivatePlayers={a:createPrivateState(),b:createPrivateState()}
    for (const id of ['a','b']) {
      privatePlayers[id].hand=[{id:'same',kind:'pair',up:'REDSTONE',down:'BLUEWELL',gain:2,loss:1}]
      privatePlayers[id]=selectCard(state,id,privatePlayers[id],'same')
    }
    state.companies[0].price=8; state.companies[1].price=2
    let result=finishTurn(state,'a',privatePlayers); result=finishTurn(result.state,'b',result.privatePlayers)
    expect(result.state.companies.map(c=>c.price)).toEqual([9,1,4]); expect(result.state.lastReveal?.deltas).toEqual({REDSTONE:1,BLUEWELL:-1,GOLDSPARK:0})
  })
  it('continues after the eighth reveal without a victory card', () => {
    const state=startGame(addPlayer(createLobby('a','А'),'b','Б')); state.round=8; state.phase='reveal'
    const result=nextRound(state,{a:createPrivateState(),b:createPrivateState()})
    expect(result.state.phase).toBe('playing'); expect(result.state.round).toBe(9); expect(result.state.winnerIds).toBeNull()
  })
  it('counts money and portfolio using current prices', () => {
    const state=startGame(addPlayer(createLobby('a','А'),'b','Б')); state.players[0].portfolio.REDSTONE=2; state.players[0].balance=25
    expect(totalCapital(state.players[0],state.companies)).toBe(33); expect(determineWinners(state)).toEqual(['a'])
  })
})
