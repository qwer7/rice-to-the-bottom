import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createLobby, addPlayer, startGame, createPrivateState, playerView } from '../../supabase/functions/_shared/game'
const mocked = vi.hoisted(()=>({ invoke:vi.fn(), onUpdate:null as null | ((payload:any)=>void) }))
vi.mock('../lib/supabase',()=>({hasSupabase:true,supabase:{auth:{getSession:async()=>({data:{session:{}}})},functions:{invoke:mocked.invoke},channel:()=>({on(_event:any,_filter:any,callback:any){mocked.onUpdate=callback;return this},subscribe(){return this}}),removeChannel:vi.fn()}}))
import { useGameStore } from '../stores/gameStore'
const memory=new Map<string,string>()
beforeEach(()=>{vi.useFakeTimers();setActivePinia(createPinia());memory.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}); vi.stubGlobal('sessionStorage',{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}); mocked.invoke.mockReset()})
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
describe('Local draft and one turn submission',()=>{
 it('opens the TV board from one combined response without joining it again',async()=>{
  const state={...createLobby('x','Доска'),players:[],lobbyMode:'first-player' as const}
  const hub={id:'hub',code:'HUB234',mode:'display',isDisplayOwner:true,isManager:false,sessionId:'room',roomCode:'ABC234'}
  mocked.invoke.mockResolvedValue({data:{hub,session:{id:'room',code:'ABC234',host_user_id:null,version:1,status:'active',state},playerId:null,isHost:false,private:null},error:null})
  const store=useGameStore();await store.openDisplay()
  expect(mocked.invoke).toHaveBeenCalledTimes(1)
  expect(store.hasRoom).toBe(true);expect(store.role).toBe('board');expect(store.players).toEqual([])
  expect(store.roomCode).toBe('ABC234');expect(store.me).toBeUndefined()
  store.exitHub()
 })

 it('ignores delayed room updates that predate the joining player',async()=>{
  const state=startGame(addPlayer(createLobby('a','А'),'b','Б')), own=playerView(createPrivateState())!
  const session={id:'room',code:'ABC234',host_user_id:'host',version:2,status:'active',state}
  mocked.invoke.mockResolvedValue({data:{session,playerId:'b',isHost:false,private:own},error:null})
  const store=useGameStore();await store.connect('player','ABC234','Б')
  mocked.onUpdate!({new:{...session,version:1,state:{...state,players:state.players.filter(p=>p.id!=='b')}}})
  expect(store.hasRoom).toBe(true);expect(store.me?.name).toBe('Б');expect(store.error).toBeNull()
  store.leave()
 })

 it('returns a restored table card to the hand even when the draft stage is stale',async()=>{
  const state=startGame(addPlayer(createLobby('a','А'),'b','Б')), own=playerView(createPrivateState())!
  own.selectedCardId=own.hand[0].id
  const snapshot={session:{id:'room',code:'ABC234',host_user_id:'host',version:1,status:'active',state},playerId:'b',isHost:false,private:own}
  mocked.invoke.mockResolvedValue({data:snapshot,error:null})
  const store=useGameStore(); await store.connect('player','ABC234','Б')
  expect(store.me?.stage).toBe('influence')
  store.draft!.stage='trading'; store.error='Предыдущая ошибка'; mocked.invoke.mockClear()
  await store.action('unselect-card')
  expect(store.selectedCardId).toBeNull(); expect(store.me?.stage).toBe('influence')
  expect(store.ownCards?.hand).toHaveLength(4); expect(store.error).toBeNull()
  expect(mocked.invoke).not.toHaveBeenCalled()
  store.draft=null
  await store.action('unselect-card'); expect(store.selectedCardId).toBeNull()
  expect(mocked.invoke).not.toHaveBeenCalled()
  store.leave()
 })

 it('cancels a table card locally even when the server remembers it after an exchange',async()=>{
  const state=startGame(addPlayer(createLobby('a','А'),'b','Б')), own=playerView(createPrivateState())!
  const snapshot={session:{id:'room',code:'ABC234',host_user_id:'host',version:1,status:'active',state},playerId:'b',isHost:false,private:own}
  mocked.invoke.mockResolvedValue({data:snapshot,error:null})
  const store=useGameStore(); await store.connect('player','ABC234','Б')
  store.buyShare('REDSTONE'); await store.action('end-trading')
  const card=own.hand[0].id
  await store.action('select-card',{cardId:card})
  mocked.invoke.mockResolvedValue({data:{...snapshot,session:{...snapshot.session,version:2},private:{...own,selectedCardId:card,exchanged:true,exchangesUsed:1}},error:null})
  await store.action('exchange-card',{cardId:own.hand[1].id}); mocked.invoke.mockClear()
  await store.action('unselect-card')
  expect(store.selectedCardId).toBeNull(); expect(store.ownCards?.hand.some(c=>c.id===card)).toBe(true)
  expect(store.ownCards?.exchangesUsed).toBe(1); expect(store.me?.portfolio.REDSTONE).toBe(1)
  await store.action('finish-turn'); expect(mocked.invoke).not.toHaveBeenCalled()
  await store.action('select-card',{cardId:own.hand[2].id}); expect(store.selectedCardId).toBe(own.hand[2].id)
  store.leave()
 })
 it('keeps trading and card selection local while preserving the public board',async()=>{
  const state=startGame(addPlayer(createLobby('a','А'),'b','Б')), own=playerView(createPrivateState())!
  const snapshot={session:{id:'room',code:'ABC234',host_user_id:'host',version:1,status:'active',state},playerId:'b',isHost:false,private:own}
  mocked.invoke.mockResolvedValue({data:snapshot,error:null})
  const store=useGameStore(); await store.connect('player','ABC234','Б'); mocked.invoke.mockClear()
  store.buyShare('BLUEWELL'); store.buyShare('BLUEWELL'); store.sellShare('BLUEWELL'); store.buyShare('REDSTONE')
  expect(mocked.invoke).not.toHaveBeenCalled(); expect(store.me?.balance).toBe(22); expect(store.me?.tradesUsed).toBe(4)
  expect(store.players[1].balance).toBe(30);expect(store.players[1].portfolio.BLUEWELL).toBe(0)
  await store.action('end-trading');await store.action('select-card',{cardId:own.hand[0].id});expect(mocked.invoke).not.toHaveBeenCalled()
  expect(store.me?.stage).toBe('influence'); await store.action('finish-turn')
  expect(mocked.invoke).toHaveBeenCalledTimes(1)
  expect(mocked.invoke.mock.calls[0][1].body).toMatchObject({action:'submit-turn',turn:{round:1,cardId:own.hand[0].id,trades:[{action:'buy',companyId:'BLUEWELL'},{action:'buy',companyId:'BLUEWELL'},{action:'sell',companyId:'BLUEWELL'},{action:'buy',companyId:'REDSTONE'}]}})
  store.leave()
 })
})
