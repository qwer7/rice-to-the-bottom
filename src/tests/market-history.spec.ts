import { describe, expect, it } from 'vitest'
import { createLobby, addPlayer, startGame } from '../../supabase/functions/_shared/game'
import { updateMarketHistory, readMarketHistory } from '../game/marketHistory'
function game() { return startGame(addPlayer(createLobby('a','А'),'b','Б')) }
const before = { REDSTONE:4, BLUEWELL:4, GOLDSPARK:4 }
const after = { REDSTONE:7, BLUEWELL:2, GOLDSPARK:4 }
describe('Market round results', () => {
  it('keeps the starting prices free of a fictitious round-zero result', () => {
    const lobby=createLobby('a','А')
    expect(updateMarketHistory(game(),updateMarketHistory(lobby,null)).deltas).toBeNull()
  })
  it('keeps the last result after the server clears the reveal and after reloading', () => {
    const state=game()
    state.companies.forEach(c=>{c.price=after[c.id]})
    state.phase='reveal'; state.lastReveal={round:1,cards:[],pricesBefore:before,pricesAfter:after,deltas:{REDSTONE:3,BLUEWELL:-2,GOLDSPARK:0}}
    const revealed=updateMarketHistory(state,null)
    state.round=2; state.phase='playing'; state.lastReveal=null
    const next=updateMarketHistory(state,readMarketHistory(JSON.parse(JSON.stringify(revealed))))
    expect(next.deltas).toEqual({REDSTONE:3,BLUEWELL:-2,GOLDSPARK:0}); expect(next.deltaRound).toBe(1)
    expect(updateMarketHistory(state,next)).toEqual(next)
  })
  it('compares local prices if the reveal snapshot is missing', () => {
    const state=game(), baseline=updateMarketHistory(state,null)
    state.companies.forEach(c=>{c.price=after[c.id]}); state.round=2
    const result=updateMarketHistory(state,baseline)
    expect(result.deltas).toEqual({REDSTONE:3,BLUEWELL:-2,GOLDSPARK:0}); expect(result.deltaRound).toBe(1)
  })
  it('does not replace a completed change with zero on repeated reveal snapshots', () => {
    const state=game(), baseline=updateMarketHistory(state,null)
    state.companies[0].price=8; state.phase='reveal'
    const result=updateMarketHistory(state,baseline)
    expect(result.deltas?.REDSTONE).toBe(4)
    expect(updateMarketHistory(state,result).deltas?.REDSTONE).toBe(4)
  })
  it('does not present changes across skipped rounds as a single round', () => {
    const state=game(), baseline=updateMarketHistory(state,null)
    state.round=4; state.companies[0].price=9
    expect(updateMarketHistory(state,baseline).deltas).toBeNull()
  })
  it('clears results for a new party and rejects invalid cached prices', () => {
    const state=game(), baseline=updateMarketHistory(state,null)
    expect(updateMarketHistory(createLobby('a','А'),{...baseline,round:5,deltas:after,deltaRound:4}).deltas).toBeNull()
    expect(readMarketHistory({round:1,prices:{REDSTONE:'4'}})).toBeNull()
  })
})
