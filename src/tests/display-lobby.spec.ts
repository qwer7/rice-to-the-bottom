import { describe,it,expect } from 'vitest'
import { createDisplayLobby,addPlayer,startGame } from '../../supabase/functions/_shared/game'
describe('Display-created lobby',()=>{
 it('starts empty without a phantom player and accepts the first named player',()=>{
  const lobby=createDisplayLobby()
  expect(lobby.players).toEqual([]); expect(lobby.lobbyMode).toBe('first-player')
  expect(()=>startGame(lobby)).toThrow('минимум два')
  const first=addPlayer(lobby,'a','Лидер')
  expect(first.players[0].name).toBe('Лидер'); expect(lobby.players).toEqual([])
  const ready=addPlayer(first,'b','Второй')
  expect(startGame(ready).phase).toBe('playing'); expect(ready.players).toHaveLength(2)
 })
})
