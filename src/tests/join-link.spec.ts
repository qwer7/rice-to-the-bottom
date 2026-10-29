import { afterEach, describe, expect, it, vi } from 'vitest'
import { roomFromSearch, roomJoinUrl } from '../lib/joinLink'
describe('room links', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  it('opens the public phone entry with a room and without TV mode', () => {
    const url = new URL(roomJoinUrl('ABC234'))
    expect(url.origin).toBe('https://race-to-the-bottom.vercel.app')
    expect(roomFromSearch(url.search)).toBe('ABC234')
    expect(url.searchParams.has('screen')).toBe(false)
  })
  it('uses the current hosted site for QR links after a host migration', () => {
    vi.stubEnv('DEV', false)
    vi.stubGlobal('window', { location: { hostname: 'game.vercel.app', origin: 'https://game.vercel.app' } })
    expect(roomJoinUrl('ABC234')).toBe('https://game.vercel.app/?room=ABC234')
  })
  it('normalizes valid codes and ignores malformed links', () => {
    expect(roomFromSearch('?room=abc234')).toBe('ABC234')
    for (const search of ['','?room=ABC','?room=%3Cscript%3E','?room=ABC2347']) expect(roomFromSearch(search)).toBe('')
  })
})
