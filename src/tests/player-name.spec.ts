import { afterEach, expect, it, vi } from 'vitest'
import { readPlayerName, rememberPlayerName } from '../lib/playerName'
afterEach(() => vi.unstubAllGlobals())
it('remembers Cyrillic names in a scoped cookie and restores them', () => {
  const doc = { cookie:'' }
  vi.stubGlobal('document',doc)
  vi.stubGlobal('location',{protocol:'https:'})
  vi.stubGlobal('localStorage',{setItem:vi.fn(),getItem:()=>null})
  rememberPlayerName('  Лёша  ')
  expect(doc.cookie).toContain('SameSite=Lax; Secure')
  expect(doc.cookie).toContain('Path=/')
  expect(readPlayerName()).toBe('Лёша')
})
it('uses the previous saved name when cookies are unavailable', () => {
  vi.stubGlobal('document',{cookie:'race_player_name=%invalid'})
  vi.stubGlobal('localStorage',{getItem:()=> 'Саша'})
  expect(readPlayerName()).toBe('Саша')
})
it('allows entry when browser storage is blocked', () => {
  vi.stubGlobal('document',{get cookie(){throw Error('blocked')},set cookie(_value){throw Error('blocked')}})
  vi.stubGlobal('location',{protocol:'https:'})
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}})
  expect(readPlayerName()).toBe('')
  expect(()=>rememberPlayerName('Лена')).not.toThrow()
})
