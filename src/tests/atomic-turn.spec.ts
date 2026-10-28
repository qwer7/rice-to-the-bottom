import { describe, it, expect } from 'vitest'
import { createLobby, addPlayer, startGame, createPrivateState, submitTurn, previewTurn, nextRound, exchangeCard, type PrivatePlayers, type Turn, type Card } from '../../supabase/functions/_shared/game'
function setup() { return { state:startGame(addPlayer(createLobby('a','А'),'b','Б')), privatePlayers:{a:createPrivateState(),b:createPrivateState()} as PrivatePlayers } }
const order = {companyId:'BLUEWELL' as const,action:'buy' as const}
function turn(id:string,cardId:string,round=1):Turn { return {id:`submission-${id}-${round}`,round,trades:[order,order,order,order],cardId} }
describe('Atomic hidden turns',()=>{
 it('freezes public money and holdings until the last submission, applies every trade exactly once',()=>{
  const initial=setup(); const a=turn('a',initial.privatePlayers.a.hand[0].id),b=turn('b',initial.privatePlayers.b.hand[0].id)
  let r=submitTurn(initial.state,'a',initial.privatePlayers,a)
  expect(r.state.players.map(p=>p.balance)).toEqual([30,30]); expect(r.state.players.map(p=>p.portfolio.BLUEWELL)).toEqual([0,0]); expect(r.state.players.map(p=>p.stage)).toEqual(['ready','trading'])
  expect(JSON.stringify(r.state)).not.toContain('submission-'); expect(r.privatePlayers.a.pending).toEqual(a)
  const duplicate=submitTurn(r.state,'a',r.privatePlayers,a); expect(duplicate).toEqual(r)
  r=submitTurn(r.state,'b',r.privatePlayers,b)
  expect(r.state.phase).toBe('reveal'); expect(r.state.players.map(p=>p.balance)).toEqual([14,14]); expect(r.state.players.map(p=>p.portfolio.BLUEWELL)).toEqual([4,4]); expect(r.state.lastReveal?.cards).toHaveLength(2)
  expect(submitTurn(r.state,'b',r.privatePlayers,b)).toEqual(r)
 })
 it('rejects overtrading, overspending, unowned cards and stale rounds without changing input',()=>{
  const {state,privatePlayers}=setup(), original=structuredClone({state,privatePlayers})
  expect(()=>submitTurn(state,'a',privatePlayers,{...turn('a',privatePlayers.a.hand[0].id),trades:[order,order,order,order,order]})).toThrow('четырёх')
  expect(()=>submitTurn(state,'a',privatePlayers,turn('a','forged'))).toThrow('руке')
  expect(()=>submitTurn(state,'a',privatePlayers,turn('a',privatePlayers.a.hand[0].id,2))).toThrow('раунд')
  expect({state,privatePlayers}).toEqual(original)
  state.players[0].balance=0; expect(()=>previewTurn(state,'a',[order])).toThrow('денег')
 })
 it('enforces a five-share cap on the server and allows selling then rebuying',()=>{
  const {state}=setup(); state.players[0].portfolio.BLUEWELL=5
  expect(()=>previewTurn(state,'a',[order])).toThrow('пяти')
  expect(previewTurn(state,'a',[{...order,action:'sell'},order]).players[0].portfolio.BLUEWELL).toBe(5)
 })
 it('adds and clamps first, then applies swaps in player order',()=>{
  let {state,privatePlayers}=setup(); state.companies[0].price=8; state.companies[1].price=3
  const cards:Card[]=[{id:'red-plus',kind:'single',company:'REDSTONE',delta:3},{id:'swap',kind:'swap',a:'REDSTONE',b:'BLUEWELL'}]
  for(const [i,id] of ['a','b'].entries()) {privatePlayers[id].hand=[cards[i]]; ({state,privatePlayers}=submitTurn(state,id,privatePlayers,{id:`swap-test-${id}`,round:1,trades:[],cardId:cards[i].id}))}
  expect(state.companies.map(c=>c.price)).toEqual([3,9,4])
 })
 it('retains the five-exchange budget across rounds and conserves all 21 cards',()=>{
  let {state,privatePlayers}=setup()
  for(let round=1;round<=8;round++) {
   for(const id of ['a','b']) {
    if(round<=5) privatePlayers[id]=exchangeCard(state,id,privatePlayers[id],privatePlayers[id].hand[0].id)
    else expect(()=>exchangeCard(state,id,privatePlayers[id],privatePlayers[id].hand[0].id)).toThrow('пять')
    ;({state,privatePlayers}=submitTurn(state,id,privatePlayers,{id:`budget-${id}-${round}`,round,trades:[],cardId:privatePlayers[id].hand[0].id}))
   }
   for(const own of Object.values(privatePlayers)) expect(new Set([...own.hand,...own.deck,...own.discard].map(c=>c.id)).size).toBe(21)
   ;({state,privatePlayers}=nextRound(state,privatePlayers))
  }
  expect(state.phase).toBe('finished'); expect(privatePlayers.a.exchangesUsed).toBe(5)
 })
})
